const bcrypt = require("bcryptjs");
const session = require("express-session");

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || bcrypt.hashSync("admin123", 10);

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "vocabulary-game-secret-key-change-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
});

function requireAuth(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  if (req.path.endsWith('.html')) {
    return res.redirect('/admin-login.html');
  }
  res.status(401).json({ error: "Unauthorized" });
}

const authRoutes = {
  async login(req, res) {
    const { username, password } = req.body;
    
    if (username === ADMIN_USERNAME && await bcrypt.compare(password, ADMIN_PASSWORD_HASH)) {
      req.session.isAdmin = true;
      res.json({ success: true });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  },
  
  logout(req, res) {
    req.session.destroy();
    res.json({ success: true });
  },
  
  status(req, res) {
    res.json({ isAdmin: !!req.session.isAdmin });
  }
};

module.exports = { sessionMiddleware, requireAuth, authRoutes };
