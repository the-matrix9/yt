const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cors = require('cors');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure multer for cookies file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const cookiesDir = path.join(__dirname, 'cookies');
    if (!fs.existsSync(cookiesDir)) {
      fs.mkdirSync(cookiesDir, { recursive: true });
    }
    cb(null, cookiesDir);
  },
  filename: function (req, file, cb) {
    cb(null, 'youtube_cookies.txt');
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.txt')) {
      cb(null, true);
    } else {
      cb(new Error('Only .txt files are allowed for cookies'));
    }
  },
  limits: {
    fileSize: 1024 * 1024 // 1MB limit
  }
});

// Ensure required directories exist
const logsDir = path.join(__dirname, 'logs');
const tempDir = path.join(__dirname, 'temp');
const cookiesDir = path.join(__dirname, 'cookies');

[logsDir, tempDir, cookiesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Get yt-dlp path (system or local binary)
function getYtDlpPath() {
  // Check for common pip installation path on Linux (from user feedback)
  const linuxPipPath = '/root/project/venv/bin/yt-dlp';
  if (fs.existsSync(linuxPipPath)) {
    return linuxPipPath;
  }

  // Fallback to common pip installation path on Windows
  // Fallback to common pip installation path on Windows
  if (process.env.APPDATA) {
    const windowsPipPath = path.join(process.env.APPDATA, 'Python', 'Python313', 'Scripts', 'yt-dlp.exe');
    if (fs.existsSync(windowsPipPath)) {
      return windowsPipPath;
    }
  }

  // Fallback to system installation (requires yt-dlp in PATH)
  return 'yt-dlp'; 
}

// Get YouTube cookies file path if exists
function getYouTubeCookiesPath() {
  const cookiesPath = path.join(cookiesDir, 'youtube_cookies.txt');
  return fs.existsSync(cookiesPath) ? cookiesPath : null;
}

// Get Instagram cookies file path if exists
function getInstagramCookiesPath() {
  const cookiesPath = path.join(cookiesDir, 'instergram_cookies.txt'); // Note: using 'instergram_cookies.txt' as provided by user
  return fs.existsSync(cookiesPath) ? cookiesPath : null;
}

// Logging function
function logDownload(clientIP, downloadUrl, type, status, error = null) {
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} | IP: ${clientIP} | URL: ${downloadUrl} | Type: ${type} | Status: ${status}${error ? ` | Error: ${error}` : ''}\n`;
  
  fs.appendFile(path.join(logsDir, 'downloads.log'), logEntry, (err) => {
    if (err) console.error('Failed to write to log:', err);
  });
}

// Clean up temporary files
function cleanupFile(filePath) {
  if (fs.existsSync(filePath)) {
    setTimeout(() => {
      fs.unlink(filePath, (err) => {
        if (err) console.error('Failed to delete temp file:', err);
        else console.log('Cleaned up temp file:', path.basename(filePath));
      });
    }, 5000); // 5 second delay to ensure download completes
  }
}

// Get client IP
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         '127.0.0.1';
}

// Validate URL
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

// Upload cookies route
app.post('/upload-cookies', upload.single('cookies'), (req, res) => {
  const clientIP = getClientIP(req);
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No cookies file uploaded' });
    }

    console.log(`🍪 Cookies file uploaded by ${clientIP}: ${req.file.filename}`);
    logDownload(clientIP, 'cookies-upload', 'cookies', 'success');
    
    res.json({ 
      success: true, 
      message: 'Cookies file uploaded successfully',
      filename: req.file.filename,
      size: req.file.size
    });
  } catch (error) {
    console.error('Cookies upload error:', error);
    logDownload(clientIP, 'cookies-upload', 'cookies', 'error', error.message);
    res.status(500).json({ error: 'Failed to upload cookies file' });
  }
});

// Get cookies status (for YouTube)
app.get('/cookies-status', (req, res) => {
  const cookiesPath = getYouTubeCookiesPath();
  const hasCookies = cookiesPath !== null;
  
  let cookiesInfo = null;
  if (hasCookies) {
    const stats = fs.statSync(cookiesPath);
    cookiesInfo = {
      exists: true,
      size: stats.size,
      uploaded: stats.mtime.toISOString(),
      path: 'youtube_cookies.txt'
    };
  }
  
  res.json({
    hasCookies,
    cookies: cookiesInfo || { exists: false }
  });
});

// Delete cookies route (for YouTube)
app.delete('/cookies', (req, res) => {
  const clientIP = getClientIP(req);
  const cookiesPath = getYouTubeCookiesPath();
  
  if (cookiesPath && fs.existsSync(cookiesPath)) {
    try {
      fs.unlinkSync(cookiesPath);
      console.log(`🗑️ YouTube cookies file deleted by ${clientIP}`);
      logDownload(clientIP, 'youtube-cookies-delete', 'cookies', 'success');
      res.json({ success: true, message: 'YouTube cookies file deleted successfully' });
    } catch (error) {
      console.error('Failed to delete YouTube cookies:', error);
      logDownload(clientIP, 'youtube-cookies-delete', 'cookies', 'error', error.message);
      res.status(500).json({ error: 'Failed to delete YouTube cookies file' });
    }
  } else {
    res.status(404).json({ error: 'No YouTube cookies file found' });
  }
});

// YouTube download route
app.get('/youtube', async (req, res) => {
  const { url: videoUrl, audio } = req.query;
  const clientIP = getClientIP(req);
  
  if (!videoUrl || !isValidUrl(videoUrl)) {
    logDownload(clientIP, videoUrl || 'N/A', 'youtube', 'error', 'Invalid URL provided');
    return res.status(400).json({ error: 'Valid YouTube URL is required' });
  }

  const isAudio = audio === '1';
  const type = isAudio ? 'audio' : 'video';
  const tempId = crypto.randomUUID();
  const outputTemplate = path.join(tempDir, `${tempId}.%(ext)s`);
  
  try {
    const ytdlpPath = getYtDlpPath();
    const cookiesPath = getYouTubeCookiesPath(); // Use YouTube specific cookies
    
    // yt-dlp command arguments
    const args = [
      videoUrl,
      '--no-playlist',
      '--no-warnings',
      '--output', outputTemplate,
      '--restrict-filenames'
    ];

    // Add cookies if available
    if (cookiesPath) {
      args.push('--cookies', cookiesPath);
      console.log(`🍪 Using YouTube cookies file for enhanced access`);
    }

    if (isAudio) {
      args.push(
        '--extract-audio', 
        '--audio-format', 'mp3', 
        '--audio-quality', '192K',
        '--embed-metadata'
      );
    } else {
      args.push(
        '--format', 'best[height<=720][ext=mp4]/best[ext=mp4]/best',
        '--merge-output-format', 'mp4'
      );
    }

    console.log(`🎬 Starting ${type} download for: ${videoUrl}`);
    console.log(`📍 Using yt-dlp at: ${ytdlpPath}`);
    
    const ytDlp = spawn(ytdlpPath, args);
    let outputFile = null;
    let errorOutput = '';
    
    ytDlp.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`[yt-dlp stdout]: ${output.trim()}`);
    });
    
    ytDlp.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.error(`[yt-dlp stderr]: ${data.toString().trim()}`);
    });
    
    ytDlp.on('close', (code) => {
      console.log(`[yt-dlp] process exited with code: ${code}`);
      
      if (code === 0) {
        // Find the downloaded file
        const files = fs.readdirSync(tempDir).filter(file => file.startsWith(tempId));
        console.log(`[yt-dlp] Files in tempDir starting with ${tempId}:`, files);
        
        if (files.length > 0) {
          outputFile = path.join(tempDir, files[0]);
          const fileExtension = path.extname(files[0]);
          const fileName = `youtube_${type}_${Date.now()}${fileExtension}`;
          
          console.log(`📁 Found downloaded file: ${files[0]}`);
          
          // Set appropriate headers
          res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
          res.setHeader('Content-Type', isAudio ? 'audio/mpeg' : 'video/mp4');
          res.setHeader('Cache-Control', 'no-cache');
          
          const fileStream = fs.createReadStream(outputFile);
          
          fileStream.on('error', (err) => {
            console.error('File stream error:', err);
            cleanupFile(outputFile);
            logDownload(clientIP, videoUrl, type, 'error', `Stream error: ${err.message}`);
            if (!res.headersSent) {
              res.status(500).json({ error: 'File streaming failed' });
            }
          });
          
          fileStream.on('end', () => {
            console.log(`✅ ${type} download completed successfully`);
            cleanupFile(outputFile);
            logDownload(clientIP, videoUrl, type, 'success');
          });
          
          fileStream.pipe(res);
          
        } else {
          const error = 'No output file found after download';
          console.error(error);
          logDownload(clientIP, videoUrl, type, 'error', error);
          res.status(500).json({ error });
        }
      } else {
        const error = `Download failed with exit code ${code}: ${errorOutput}`;
        console.error(error);
        logDownload(clientIP, videoUrl, type, 'error', error);
        res.status(500).json({ 
          error: 'Download failed', 
          details: errorOutput || `Process exited with code ${code}`
        });
      }
    });
    
    ytDlp.on('error', (err) => {
      console.error('yt-dlp spawn error:', err);
      logDownload(clientIP, videoUrl, type, 'error', err.message);
      
      if (err.code === 'ENOENT') {
        res.status(500).json({ 
          error: 'yt-dlp not found. Please ensure yt-dlp is installed.',
          details: 'Run: npm run install-ytdlp'
        });
      } else {
        res.status(500).json({ error: 'Failed to start download process' });
      }
    });
    
  } catch (error) {
    console.error('YouTube download error:', error);
    logDownload(clientIP, videoUrl, type, 'error', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Instagram route
app.get('/instagram', async (req, res) => {
  const { url: reelUrl } = req.query;
  const clientIP = getClientIP(req);
  
  if (!reelUrl || !isValidUrl(reelUrl)) {
    logDownload(clientIP, reelUrl || 'N/A', 'instagram', 'error', 'Invalid URL provided');
    return res.status(400).json({ error: 'Valid Instagram URL is required' });
  }

  const type = 'video';
  const tempId = crypto.randomUUID();
  const outputTemplate = path.join(tempDir, `${tempId}.%(ext)s`);

  try {
    const ytdlpPath = getYtDlpPath();
    const instagramCookiesPath = getInstagramCookiesPath(); // Use Instagram specific cookies
    
    // yt-dlp command arguments for downloading Instagram video
    const args = [
      reelUrl,
      '--no-playlist',
      '--no-warnings',
      '--output', outputTemplate,
      '--restrict-filenames',
      '--format', 'best[ext=mp4]/best', // Prioritize mp4, then best available
      '--merge-output-format', 'mp4'
    ];

    // Add Instagram cookies if available
    if (instagramCookiesPath) {
      args.push('--cookies', instagramCookiesPath);
      console.log(`🍪 Using Instagram cookies file for enhanced access`);
    }

    console.log(`🎬 Starting Instagram ${type} download for: ${reelUrl}`);
    console.log(`📍 Using yt-dlp at: ${ytdlpPath}`);
    
    const ytDlp = spawn(ytdlpPath, args);
    let outputFile = null;
    let errorOutput = '';
    
    ytDlp.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`[yt-dlp stdout]: ${output.trim()}`);
    });
    
    ytDlp.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.error(`[yt-dlp stderr]: ${data.toString().trim()}`);
    });
    
    ytDlp.on('close', (code) => {
      console.log(`[yt-dlp] process exited with code: ${code}`);
      
      if (code === 0) {
        // Find the downloaded file
        const files = fs.readdirSync(tempDir).filter(file => file.startsWith(tempId));
        console.log(`[yt-dlp] Files in tempDir starting with ${tempId}:`, files);
        
        if (files.length > 0) {
          outputFile = path.join(tempDir, files[0]);
          const fileExtension = path.extname(files[0]);
          const fileName = `instagram_${type}_${Date.now()}${fileExtension}`;
          
          console.log(`📁 Found downloaded file: ${files[0]}`);
          
          // Set appropriate headers
          res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
          res.setHeader('Content-Type', 'video/mp4'); // Assuming mp4 for Instagram
          res.setHeader('Cache-Control', 'no-cache');
          
          const fileStream = fs.createReadStream(outputFile);
          
          fileStream.on('error', (err) => {
            console.error('File stream error:', err);
            cleanupFile(outputFile);
            logDownload(clientIP, reelUrl, type, 'error', `Stream error: ${err.message}`);
            if (!res.headersSent) {
              res.status(500).json({ error: 'File streaming failed' });
            }
          });
          
          fileStream.on('end', () => {
            console.log(`✅ Instagram ${type} download completed successfully`);
            cleanupFile(outputFile);
            logDownload(clientIP, reelUrl, type, 'success');
          });
          
          fileStream.pipe(res);
          
        } else {
          const error = 'No output file found after Instagram download';
          console.error(error);
          logDownload(clientIP, reelUrl, type, 'error', error);
          res.status(500).json({ error });
        }
      } else {
        const error = `Instagram download failed with exit code ${code}: ${errorOutput}`;
        console.error(error);
        logDownload(clientIP, reelUrl, type, 'error', error);
        res.status(500).json({ 
          error: 'Instagram download failed', 
          details: errorOutput || `Process exited with code ${code}`
        });
      }
    });
    
    ytDlp.on('error', (err) => {
      console.error('Instagram yt-dlp spawn error:', err);
      logDownload(clientIP, reelUrl, type, 'error', err.message);
      
      if (err.code === 'ENOENT') {
        res.status(500).json({ 
          error: 'yt-dlp not found. Please ensure yt-dlp is installed.',
          details: 'Run: npm run install-ytdlp'
        });
      } else {
        res.status(500).json({ error: 'Failed to start Instagram download process' });
      }
    });
    
  } catch (error) {
    console.error('Instagram route error:', error);
    logDownload(clientIP, reelUrl, 'instagram', 'error', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check route
app.get('/health', (req, res) => {
  const ytdlpPath = getYtDlpPath();
  const ytdlpExists = fs.existsSync(ytdlpPath) || ytdlpPath === 'yt-dlp';
  const cookiesPath = getCookiesPath();
  
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    ytdlp: {
      path: ytdlpPath,
      available: ytdlpExists
    },
    cookies: {
      available: cookiesPath !== null,
      path: cookiesPath ? 'youtube_cookies.txt' : null
    }
  });
});

// Get logs route (for debugging)
app.get('/logs', (req, res) => {
  const logFile = path.join(logsDir, 'downloads.log');
  if (fs.existsSync(logFile)) {
    const logs = fs.readFileSync(logFile, 'utf8');
    res.json({ 
      logs: logs.split('\n').filter(line => line.trim()).slice(-50) // Last 50 entries
    });
  } else {
    res.json({ logs: [] });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Cookies file too large (max 1MB)' });
    }
  }
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Media Downloader server running on port ${PORT}`);
  console.log(`🌐 Access the web interface at: http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🍪 Cookies directory: ${cookiesDir}`);
  
  // Check yt-dlp availability on startup
  const ytdlpPath = getYtDlpPath();
  console.log(`🔧 Using yt-dlp at: ${ytdlpPath}`);
  
  // Check cookies availability
  const youtubeCookiesPath = getYouTubeCookiesPath();
  if (youtubeCookiesPath) {
    console.log(`🍪 YouTube cookies available at: ${youtubeCookiesPath}`);
  } else {
    console.log(`🍪 No YouTube cookies found - upload via web interface`);
  }

  const instagramCookiesPath = getInstagramCookiesPath();
  if (instagramCookiesPath) {
    console.log(`🍪 Instagram cookies available at: ${instagramCookiesPath}`);
  } else {
    console.log(`🍪 No Instagram cookies found - upload via web interface`);
  }
});

// Cleanup temp files on server shutdown
process.on('SIGINT', () => {
  console.log('\n🧹 Cleaning up and shutting down...');
  if (fs.existsSync(tempDir)) {
    const files = fs.readdirSync(tempDir);
    files.forEach(file => {
      const filePath = path.join(tempDir, file);
      fs.unlinkSync(filePath);
      console.log(`🗑️  Deleted: ${file}`);
    });
  }
  process.exit(0);
});

// Periodic cleanup of old temp files (every 30 minutes)
setInterval(() => {
  if (fs.existsSync(tempDir)) {
    const files = fs.readdirSync(tempDir);
    const now = Date.now();
    
    files.forEach(file => {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);
      const ageInMinutes = (now - stats.mtime.getTime()) / (1000 * 60);
      
      if (ageInMinutes > 30) { // Delete files older than 30 minutes
        fs.unlinkSync(filePath);
        console.log(`🧹 Auto-cleaned old temp file: ${file}`);
      }
    });
  }
}, 30 * 60 * 1000); // Run every 30 minutes
