# 🎮 Vocabulary Check - Word Search Puzzle Game

A modern, eye-catching word search puzzle game optimized for WordPress embedding.

## ✨ Features

- **6 Themed Puzzles** across Technology, Food & Drink, Sports, Music, Nature, and Travel
- **Timer System** - Tracks completion time (starts on first click, reset button included)
- **Hint System** - Get hints for non-theme words (marked with asterisk on leaderboard)
- **Email Collection** - Capture player emails on puzzle completion
- **Visual Themes** - 8 different themes including Midnight Dark, Neon Lights, Simple Light
- **Time-Based Leaderboards** - Per-puzzle rankings with fastest times
- **Mobile Optimized** - Responsive design with mobile ad integration
- **Admin Panel** - Full puzzle management with visual grid builder and email export

## 🚀 Quick Start

1. Extract all files to your web server
2. Run `npm install` to install dependencies
3. Copy `.env.example` to `.env` and configure your settings
4. Start the server with `PORT=5000 npm start`
5. Visit your website and start playing!

## 📖 Full Documentation

See **DEPLOYMENT_INSTRUCTIONS.md** for complete deployment guide.

## 🎯 Game Features

- **8x6 letter grid** with enhanced 3D blocks
- **Click-to-select** and **drag-to-select** word input modes
- **Spangram validation** - Every puzzle has a required spangram word
- **Multiple non-theme words** with hints
- **Category/Theme/Puzzle hierarchy** for organized puzzle browsing
- **Firebase backend** for real-time data synchronization

## 🔐 Admin Access

- URL: `/create.html`
- Default credentials: `admin` / `admin123` (change immediately!)
- Features: Create/edit puzzles, view leaderboards, export emails

## 📦 What's Inside

- `server.js` - Express server with Socket.IO
- `auth.js` - Authentication module
- `package.json` - Node.js dependencies
- `public/` - All frontend files
- `.env.example` - Environment configuration template

## 🎨 Visual Themes

Choose from 8 beautiful themes:
- Midnight Dark (true dark mode)
- Neon Lights
- Simple Light
- Ocean Blue
- Sunset Orange
- Forest Green
- Royal Purple
- Default Gradient

## 🏆 Built With

- **Frontend:** Phaser 3, HTML5, CSS3, JavaScript
- **Backend:** Node.js, Express, Socket.IO
- **Database:** Firebase Realtime Database
- **Authentication:** bcrypt, express-session

---

Ready to deploy? Follow the instructions in **DEPLOYMENT_INSTRUCTIONS.md**! 🚀
