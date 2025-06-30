# 🚀 Media Downloader Pro with Cookies Support

A complete, production-ready web application for downloading YouTube videos and extracting Instagram reel links using yt-dlp with YouTube cookies support for enhanced access to private/restricted content.

## ✨ Features

- 🎥 **YouTube Downloads**: Download videos in best quality or audio-only (MP3)
- 🍪 **Cookies Support**: Upload YouTube cookies for private/restricted videos
- 📱 **Instagram Reels**: Extract direct video links from Instagram reels
- 🎨 **Beautiful UI**: Modern, responsive design with smooth animations and glassmorphism effects
- 🔧 **Auto Setup**: Automatic yt-dlp installation and configuration
- 📊 **Comprehensive Logging**: Download logging with timestamps and client IPs
- 🧹 **Smart Cleanup**: Automatic temporary file deletion and periodic cleanup
- 🚀 **Production Ready**: Deployable on Render, Vercel, and other platforms
- 💪 **Robust Error Handling**: Detailed error messages and fallback mechanisms
- 📱 **Mobile Responsive**: Works perfectly on all devices

## 🍪 YouTube Cookies Support

### Why Use Cookies?
- Access private/unlisted videos you have permission to view
- Bypass age restrictions and regional blocks
- Improve download success rates for restricted content
- Access your own private playlists and videos

### How to Get YouTube Cookies:

#### Method 1: Browser Extension (Recommended)
1. Install "Get cookies.txt LOCALLY" extension for Chrome/Firefox
2. Go to YouTube.com and login to your account
3. Click the extension icon and download cookies.txt
4. Upload the file using the cookies manager in the app

#### Method 2: Manual Export
1. Login to YouTube in your browser
2. Open Developer Tools (F12)
3. Go to Application/Storage → Cookies → https://youtube.com
4. Export cookies in Netscape format and save as .txt file

### Cookies Management:
- ✅ Upload cookies.txt files through web interface
- ✅ Real-time cookies status display
- ✅ Easy deletion of cookies when no longer needed
- ✅ Automatic cookies usage for YouTube downloads
- ✅ Secure local storage (cookies never leave your server)

## 🛠️ Prerequisites

- Node.js 18+ 
- Internet connection for yt-dlp installation

## 🚀 Quick Start

1. **Clone and Install**:
```bash
git clone <repository-url>
cd media-downloader
npm install
```

2. **Start the Application**:
```bash
npm start
```

3. **Access the Web Interface**:
   Open your browser and navigate to `http://localhost:3000`

The application will automatically install yt-dlp on first run!

## 📋 API Endpoints

### Cookies Management
```
POST /upload-cookies
```
Upload YouTube cookies file (multipart/form-data with 'cookies' field)

```
GET /cookies-status
```
Check current cookies status and information

```
DELETE /cookies
```
Delete uploaded cookies file

### YouTube Download
```
GET /youtube?url=<youtube_url>&audio=<0|1>
```
- `url`: YouTube video URL (required)
- `audio`: Set to `1` for audio-only download (optional)
- Returns: Direct file download
- **Note**: Automatically uses uploaded cookies if available

### Instagram Reel
```
GET /instagram?url=<instagram_reel_url>
```
- `url`: Instagram reel URL (required)
- Returns: JSON with direct video link

### Health Check
```
GET /health
```
Returns server status, timestamp, yt-dlp availability, and cookies status.

### Logs
```
GET /logs
```
Returns recent download logs (last 50 entries).

## 🔧 Installation Details

The application includes an automatic yt-dlp installer (`install-ytdlp.js`) that:

1. **Checks for system installation** of yt-dlp
2. **Attempts pip installation** if available
3. **Downloads binary** as fallback
4. **Verifies installation** and reports status

### Manual yt-dlp Installation

If automatic installation fails:

**Linux/macOS:**
```bash
# Using pip (recommended)
pip install yt-dlp

# Using homebrew (macOS)
brew install yt-dlp

# Direct binary download
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

**Windows:**
```bash
# Using pip
pip install yt-dlp

# Or download yt-dlp.exe and add to PATH
```

## 🌐 Deployment

### Render (Recommended)
1. Connect your repository to Render
2. The `render.yaml` file handles everything automatically
3. Includes persistent disk for temporary files and cookies

### Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Deploy: `vercel`
3. Note: May have limitations with binary installations

### Manual Deployment
1. Set `NODE_ENV=production`
2. Run: `npm install && npm run install-ytdlp`
3. Start: `npm start`

## 📁 Project Structure

```
├── server.js              # Main Express server with all routes
├── install-ytdlp.js       # Automatic yt-dlp installer
├── public/
│   └── index.html         # Beautiful frontend interface with cookies support
├── bin/                   # yt-dlp binary (auto-created)
├── cookies/               # YouTube cookies storage (auto-created)
├── logs/                  # Download logs (auto-created)
├── temp/                  # Temporary download files (auto-created)
├── package.json           # Dependencies and scripts
├── render.yaml            # Render deployment config
├── vercel.json            # Vercel deployment config
└── README.md              # This file
```

## ⚙️ Environment Variables

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode (development/production)

## 📊 Logging & Monitoring

All downloads are logged to `logs/downloads.log` with:
- Timestamp
- Client IP address
- Requested URL
- Download type (audio/video/instagram/cookies)
- Status (success/error)
- Error details (if applicable)

## 🔒 Security Features

- Input validation for all URLs and file uploads
- File type validation for cookies (only .txt files)
- File size limits (1MB for cookies)
- Automatic file cleanup (5 seconds after download + periodic cleanup)
- Client IP logging for monitoring
- Error handling to prevent crashes
- Secure cookies storage (local only, never transmitted)

## 🎯 Performance Optimizations

- **Smart File Management**: Automatic cleanup prevents disk space issues
- **Efficient Downloads**: Streams files directly to client
- **Periodic Cleanup**: Removes old temporary files every 30 minutes
- **Error Recovery**: Robust error handling with detailed logging
- **Resource Limits**: Configurable download quality limits
- **Cookies Caching**: Reuses uploaded cookies for multiple downloads

## 🐛 Troubleshooting

### "yt-dlp not found" error:
```bash
# Run the installer manually
npm run install-ytdlp

# Or install system-wide
pip install yt-dlp
```

### Downloads fail or timeout:
- Check internet connection
- Verify URL is accessible and valid
- Upload YouTube cookies if content is restricted
- Some videos may be geo-restricted or private
- Try updating yt-dlp: `pip install --upgrade yt-dlp`

### Cookies not working:
- Ensure cookies.txt is in proper Netscape format
- Make sure you're logged into YouTube when exporting cookies
- Try re-exporting cookies if they're old (cookies expire)
- Check that the cookies file is properly uploaded (check status)

### Instagram extraction fails:
- Instagram frequently changes their API
- Update yt-dlp to latest version
- Some private/restricted content may not be accessible

### Server won't start:
- Ensure Node.js 18+ is installed
- Check if port 3000 is available
- Run `npm install` to ensure dependencies are installed

## 🔄 Updates & Maintenance

To update yt-dlp:
```bash
# If installed via pip
pip install --upgrade yt-dlp

# Or re-run the installer
npm run install-ytdlp
```

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 🆘 Support

If you encounter issues:
1. Check the logs at `/logs` endpoint
2. Verify yt-dlp installation at `/health` endpoint
3. Check cookies status at `/cookies-status` endpoint
4. Ensure URLs are valid and accessible
5. Try uploading fresh YouTube cookies
6. Check server console for detailed error messages

---

**Made with ❤️ for seamless media downloading with enhanced privacy support**