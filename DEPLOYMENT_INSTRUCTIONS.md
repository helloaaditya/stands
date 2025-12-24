# 🚀 Vocabulary Check - Deployment Instructions

## 📦 What's Included

This package contains everything you need to deploy the Vocabulary Check word puzzle game to InMotion shared hosting:

- `server.js` - Main Express server
- `auth.js` - Authentication module
- `package.json` - Node.js dependencies
- `.env.example` - Environment variables template
- `public/` - All frontend files (HTML, CSS, JavaScript, assets)

## 🔧 Step-by-Step Deployment to InMotion Hosting

### 1. **Upload Files**
- Upload all files to your InMotion hosting account via FTP/cPanel File Manager
- Recommended location: `/home/yourusername/public_html/strands/` or similar

### 2. **Install Node.js Dependencies**
SSH into your InMotion server and run:
```bash
cd /path/to/your/app
npm install
```

### 3. **Configure Environment Variables**
- Copy `.env.example` to `.env`:
  ```bash
  cp .env.example .env
  ```
- Edit `.env` file with your production credentials:
  ```bash
  nano .env
  ```
- **IMPORTANT:** Update these values:
  - `SESSION_SECRET` - Change to a random string (32+ characters)
  - `ADMIN_PASSWORD_HASH` - Generate a new bcrypt hash for your admin password
  - Firebase credentials are already configured for `strands-df2e9` project

### 4. **Generate Admin Password Hash**
Run this one-time script to generate a secure password hash:
```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('YOUR_PASSWORD_HERE', 10, (err, hash) => console.log('ADMIN_PASSWORD_HASH=' + hash));"
```
Copy the output and paste it into your `.env` file.

### 5. **Start the Server**
```bash
PORT=5000 npm start
```

For production with process manager (recommended):
```bash
# Install PM2 globally (one time)
npm install -g pm2

# Start the app
pm2 start server.js --name "vocabulary-check"

# Make it auto-start on server reboot
pm2 startup
pm2 save
```

### 6. **Configure Nginx/Apache Reverse Proxy**
If using InMotion's cPanel, set up a reverse proxy to forward requests to port 5000:

**Apache (.htaccess):**
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ http://localhost:5000/$1 [P,L]
```

### 7. **Verify Deployment**
Visit your website:
- Main game: `https://strands.nytstrands.org/`
- Admin panel: `https://strands.nytstrands.org/create.html`
- Default admin login: `admin` / `admin123` (change immediately!)

## 🎮 6 Pre-Loaded Puzzles

The game includes 6 brand new puzzles across different categories:

1. **Technology - Smart Devices** (Spangram: SMARTWATCH)
2. **Food & Drink - Coffee Shop** (Spangram: CAPPUCCINO)
3. **Sports - Basketball** (Spangram: BASKETBALL)
4. **Music - Instruments** (Spangram: SAXOPHONE)
5. **Nature - Weather** (Spangram: THUNDERSTORM)
6. **Travel - Beach Vacation** (Spangram: BEACHFRONT)

All puzzles are stored in Firebase and will load automatically.

## 🔐 Security Checklist

- [ ] Change `SESSION_SECRET` to a random string
- [ ] Generate new `ADMIN_PASSWORD_HASH` with your password
- [ ] Verify Firebase credentials are correct
- [ ] Set proper file permissions (644 for files, 755 for directories)
- [ ] Enable HTTPS/SSL on your domain
- [ ] Keep `.env` file secure (never commit to Git)

## 📊 Admin Panel Features

Access at `/create.html`:
- Create/edit/delete puzzles with visual grid builder
- View leaderboards for each puzzle
- Export emails to CSV
- View all collected user emails with stats

## 🆘 Troubleshooting

**Server won't start:**
- Check Node.js version (v14+ required)
- Verify all dependencies installed: `npm install`
- Check `.env` file exists and is properly formatted

**Firebase errors:**
- Verify Firebase credentials in `.env`
- Check Firebase database rules allow read/write
- Ensure database URL is correct

**Admin login fails:**
- Verify `ADMIN_PASSWORD_HASH` is properly formatted bcrypt hash
- Check session configuration in `.env`

## 📞 Support

For issues with:
- InMotion hosting setup → Contact InMotion support
- Game features/bugs → Check console logs in browser DevTools
- Firebase connection → Verify credentials and database rules

## 🎉 You're All Set!

Your Vocabulary Check game is now deployed and ready for players to enjoy!
