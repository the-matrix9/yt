const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

console.log('🚀 Installing yt-dlp...');

// Create bin directory if it doesn't exist
const binDir = path.join(__dirname, 'bin');
if (!fs.existsSync(binDir)) {
  fs.mkdirSync(binDir, { recursive: true });
}

const ytdlpPath = path.join(binDir, 'yt-dlp');

// Function to download yt-dlp
function downloadYtDlp() {
  return new Promise((resolve, reject) => {
    const url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';
    const file = fs.createWriteStream(ytdlpPath);
    
    console.log('📥 Downloading yt-dlp binary...');
    
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirect
        https.get(response.headers.location, (redirectResponse) => {
          redirectResponse.pipe(file);
          
          file.on('finish', () => {
            file.close();
            // Make executable
            fs.chmodSync(ytdlpPath, '755');
            console.log('✅ yt-dlp downloaded and made executable');
            resolve();
          });
        }).on('error', reject);
      } else {
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          // Make executable
          fs.chmodSync(ytdlpPath, '755');
          console.log('✅ yt-dlp downloaded and made executable');
          resolve();
        });
      }
    }).on('error', reject);
  });
}

// Function to check if yt-dlp is already installed system-wide
function checkSystemYtDlp() {
  return new Promise((resolve) => {
    exec('which yt-dlp', (error, stdout) => {
      if (!error && stdout.trim()) {
        console.log('✅ yt-dlp found in system PATH:', stdout.trim());
        resolve(true);
      } else {
        console.log('❌ yt-dlp not found in system PATH');
        resolve(false);
      }
    });
  });
}

// Function to try installing via pip
function installViaPip() {
  return new Promise((resolve) => {
    console.log('🐍 Trying to install yt-dlp via pip...');
    exec('pip install yt-dlp', (error, stdout, stderr) => {
      if (!error) {
        console.log('✅ yt-dlp installed via pip');
        resolve(true);
      } else {
        console.log('❌ pip installation failed:', stderr);
        resolve(false);
      }
    });
  });
}

// Main installation process
async function installYtDlp() {
  try {
    // Check if already installed system-wide
    const systemInstalled = await checkSystemYtDlp();
    if (systemInstalled) {
      return;
    }

    // Try pip installation first
    const pipInstalled = await installViaPip();
    if (pipInstalled) {
      return;
    }

    // Download binary as fallback
    await downloadYtDlp();
    
    // Test the installation
    const testCommand = fs.existsSync(ytdlpPath) ? ytdlpPath : 'yt-dlp';
    exec(`${testCommand} --version`, (error, stdout) => {
      if (!error) {
        console.log('🎉 yt-dlp installation successful! Version:', stdout.trim());
      } else {
        console.log('⚠️  yt-dlp installation may have issues:', error.message);
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to install yt-dlp:', error.message);
    console.log('📝 Manual installation may be required');
  }
}

// Run installation
installYtDlp();