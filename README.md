# 🎉 Zeren - Premium Real-Time Voice & Text Chat

A luxurious, modern real-time voice and text chat application built with WebRTC for seamless peer-to-peer communication. Perfect for teams, friends, or communities who want a premium chat experience without server costs.

![Zeren Preview](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![GitHub Pages](https://img.shields.io/badge/Deployment-GitHub%20Pages-blue)
![WebRTC](https://img.shields.io/badge/Technology-WebRTC-orange)

## ✨ Features

### 🎯 Core Features
- **Real-time Voice Chat** - Crystal clear peer-to-peer voice communication
- **Instant Text Messaging** - Fast, responsive text chat with rich formatting
- **Room Management** - Create and join private rooms with unique codes
- **Multi-User Support** - Connect with multiple participants simultaneously
- **Cross-Platform** - Works on desktop, tablet, and mobile browsers

### 🎨 Premium UI/UX
- **Modern Luxury Design** - Sleek, professional interface with premium aesthetics
- **Dark/Light Themes** - Toggle between beautiful dark and light themes
- **Responsive Layout** - Optimized for all screen sizes and devices
- **Smooth Animations** - Polished transitions and micro-interactions
- **Accessibility** - WCAG compliant with proper ARIA labels

### 🔧 Advanced Features
- **WebRTC P2P Connection** - Direct peer-to-peer communication (no server required)
- **LocalStorage Signaling** - Clever signaling solution for GitHub Pages
- **Voice Controls** - Mute/unmute, join/leave voice channels
- **Participant Management** - See who's online and in voice chat
- **Real-time Notifications** - Toast notifications for chat events
- **Message History** - Persistent chat history during sessions
- **Global Domain Chat** - Automatic domain-wide chat room (max 6 users)
- **Room Codes** - Easy-to-share 6-character room codes

## 🚀 Quick Start

### Online Demo
Visit the live demo: **[Your GitHub Pages URL]**

### Local Development
1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/luxchat.git
   cd luxchat
   ```

2. **Start local server** (choose one option)
   ```bash
   # Option 1: Using Node.js (recommended)
   node server.js
   
   # Option 2: Using Python
   python -m http.server 8000
   
   # Option 3: Using PHP
   php -S localhost:8000
   ```

3. **Open your browser**
   Navigate to `http://localhost:8000`

### Multi-User Testing
To test multi-user functionality locally:
1. Open multiple browser tabs/windows to `http://localhost:8000`
2. Create a room in one tab and note the room code
3. Join the same room from other tabs using the room code
4. Start chatting and test voice features!

## 🔧 How It Works

### Architecture Overview
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Browser A     │    │   LocalStorage  │    │   Browser B     │
│                 │    │   (Signaling)   │    │                 │
│  ┌───────────┐  │    │                 │    │  ┌───────────┐  │
│  │ LuxChat   │◄─┼────┤  Room Data      ├────┼─►│ LuxChat   │  │
│  │ Instance  │  │    │  Peer Info      │    │  │ Instance  │  │
│  └───────────┘  │    │  Messages       │    │  └───────────┘  │
│       │         │    └─────────────────┘    │       │         │
│       ▼         │                           │       ▼         │
│  WebRTC P2P ◄───┼───────────────────────────┼──────► WebRTC P2P │
│  Connection     │         Direct Link       │     Connection  │
└─────────────────┘                           └─────────────────┘
```

### Key Components
- **WebRTCManager** - Handles all peer-to-peer connections and voice streaming
- **RoomManager** - Manages room creation, joining, and participant coordination
- **LuxChatFull** - Main application controller integrating all features
- **LocalStorage Signaling** - Uses browser localStorage for WebRTC signaling

## 📦 Deployment to GitHub Pages

### Automatic Deployment
1. **Fork this repository**
2. **Enable GitHub Pages**
   - Go to Settings → Pages
   - Select "Deploy from a branch"
   - Choose "main" branch and "/ (root)" folder
3. **Your app will be live at:** `https://yourusername.github.io/luxchat/`

### Manual Deployment
1. **Prepare files** - All files are already optimized for static hosting
2. **Upload to GitHub** - Push all files to your repository
3. **Configure Pages** - Enable GitHub Pages in repository settings
4. **Access your app** - Visit your GitHub Pages URL

### Deployment Checklist
- ✅ All files are static (HTML, CSS, JS)
- ✅ No server-side dependencies
- ✅ WebRTC works over HTTPS (GitHub Pages default)
- ✅ LocalStorage signaling compatible
- ✅ Cross-browser tested
- ✅ Mobile responsive

## 🌐 Browser Compatibility

### Fully Supported
- ✅ **Chrome 80+** - Full feature support
- ✅ **Firefox 75+** - Full feature support  
- ✅ **Safari 14+** - Full feature support
- ✅ **Edge 80+** - Full feature support

### Mobile Support
- ✅ **Chrome Mobile** - Excellent performance
- ✅ **Safari iOS** - Full compatibility
- ✅ **Firefox Mobile** - Good performance
- ⚠️ **Samsung Internet** - Basic functionality

### Requirements
- HTTPS connection (automatically provided by GitHub Pages)
- Modern browser with WebRTC support
- Microphone access for voice features
- LocalStorage enabled

## 🛠️ Technical Details

### Technology Stack
- **Frontend:** Vanilla JavaScript ES6+, HTML5, CSS3
- **Communication:** WebRTC for P2P, LocalStorage for signaling
- **Styling:** Modern CSS with custom properties, Flexbox/Grid
- **Icons:** Font Awesome 6
- **Fonts:** Inter (Google Fonts)

### File Structure
```
luxchat/
├── index.html              # Main application HTML
├── styles.css              # Modern CSS styling
├── js/
│   ├── luxchat-full.js     # Main application controller
│   ├── webrtc.js           # WebRTC connection manager
│   ├── room-manager.js     # Room and participant management
│   └── simple-app.js       # Fallback simulation mode
├── server.js               # Local development server (Node.js)
├── README.md               # This file
├── LICENSE                 # MIT License
└── .github/
    └── copilot-instructions.md  # Development guidelines
```

### Performance Optimizations
- Lazy loading of WebRTC connections
- Efficient DOM manipulation
- Optimized CSS with minimal repaints
- Compressed assets and fonts
- Mobile-first responsive design

## 🎯 Usage Guide

### Global Domain Chat (Recommended)
1. When you first visit the site, you'll see a "Join Global Chat" option
2. This automatically connects you with anyone else on the same domain
3. Maximum 6 users per domain for optimal performance
4. Perfect for team collaboration or community chat

### Creating a Private Room
1. Click "Create Room" tab in the room selection
2. Enter an optional room name
3. Share the generated room code with others
4. Enter your username and start chatting!

### Joining a Private Room
1. Click "Join Room" tab in the room selection
2. Enter the room code shared with you
3. Enter your username
4. You're connected and ready to chat!

### Voice Chat
1. Click "Join Voice" to enable your microphone
2. Grant microphone permissions when prompted
3. Use "Mute/Unmute" to control your microphone
4. Click "Leave Voice" to disconnect from voice chat

### Text Chat
1. Type your message in the input field
2. Press Enter or click Send
3. Messages support basic formatting and emojis
4. View participant list and online status

## 🔒 Privacy & Security

### Data Handling
- **No Server Storage** - All data stays in your browser
- **Peer-to-Peer** - Direct communication between users
- **No Registration** - No accounts or personal data required
- **Local Storage Only** - Room data stored locally for signaling

### Security Features
- WebRTC encryption for all voice and data
- No data transmission to external servers
- HTTPS enforcement on GitHub Pages
- Input validation and XSS protection

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch:** `git checkout -b feature/amazing-feature`
3. **Make your changes** following the coding guidelines in `.github/copilot-instructions.md`
4. **Test thoroughly** across different browsers
5. **Commit your changes:** `git commit -m 'Add amazing feature'`
6. **Push to branch:** `git push origin feature/amazing-feature`
7. **Open a Pull Request**

### Development Guidelines
- Follow the coding standards in `.github/copilot-instructions.md`
- Test on multiple browsers and devices
- Maintain the luxury design aesthetic
- Ensure accessibility compliance
- Add appropriate documentation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **WebRTC Community** - For the amazing peer-to-peer technology
- **Font Awesome** - For the beautiful icons
- **Google Fonts** - For the elegant Inter font family
- **GitHub Pages** - For free, reliable hosting

## 📞 Support

Having issues? Here are some solutions:

### Common Issues
1. **Voice not working?** - Ensure HTTPS and microphone permissions
2. **Can't connect to room?** - Check if others are in the same room
3. **LocalStorage signaling not working?** - Try refreshing all tabs
4. **Mobile issues?** - Ensure you're using a supported browser

### Getting Help
- 📖 Check this README for common solutions
- 🐛 Open an issue for bugs
- 💡 Request features via GitHub issues
- 📧 Contact: [Your Email]

---

<div align="center">

**Made with ❤️ for seamless communication**

[Live Demo](#) | [Documentation](#) | [Contributing](#) | [License](#)

</div>
