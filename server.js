const express = require("express");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const axios = require("axios");
const dotenv = require("dotenv");

const { sessionMiddleware, requireAuth, authRoutes } = require("./auth");

dotenv.config();

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3000;

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// API Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'https://yourdomain.com/api';

// Helper function to call PHP API
async function callAPI(endpoint, method = 'GET', data = null) {
  try {
    const config = {
      method,
      url: `${API_BASE_URL}${endpoint}`,
      headers: { 
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      if (method === 'GET'|| method === 'PUT' || method === 'DELETE') {
        // For GET and DELETE, use query parameters
        config.params = data;
      } else {
        // For POST, PUT, use request body
        config.data = data;
      }
    }
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    throw error;
  }
}

// Socket.io connection handler
io.on("connection", (socket) => {
  console.log("Connected...");

  socket.on("leaderboard", async (puzzleId) => {
    try {
      const leaderboard = await callAPI('/leaderboard.php', 'GET', { puzzleId });
      socket.emit("leaderboard", leaderboard || []);
    } catch (error) {
      console.error("Error loading leaderboard:", error);
      socket.emit("leaderboard", []);
    }
  });

  // Handle score submission via Socket.IO
  socket.on('scoreUpdate', async (data, callback) => {
    const { username, email, timeSeconds, hintsUsed, puzzleId, puzzleTheme } = data;
    
    // Validation
    if (!username || timeSeconds === undefined) {
      callback(false);
      return;
    }
    
    if (username.length > 32 || username.length < 1) {
      callback(false);
      return;
    }
    
    if (!puzzleId) {
      console.log('ERROR: puzzleId is missing!');
      callback({ success: false, error: 'Puzzle ID is required' });
      return;
    }
    
    if (!puzzleTheme) {
      console.log('ERROR: puzzleTheme is missing!');
      callback({ success: false, error: 'Puzzle Theme is required' });
      return;
    }    
    
    try {
      const result = await callAPI('/leaderboard/save.php', 'POST', {
        puzzleId: puzzleId,
        puzzleTheme: puzzleTheme,
        username,
        email: email || '',
        timeSeconds,
        hintsUsed: hintsUsed || 0
      });
      
      // Emit real-time update to all connected clients
      if (result.leaderboard) {
        io.emit("leaderboardUpdate", { 
          puzzleId, 
          leaderboard: result.leaderboard 
        });
      }
      
      callback(true); // Success
    } catch (error) {
      console.error("Error saving score:", error);
      callback(false); // Error
    }
  });
  
  socket.on("disconnect", () => {
    console.log("Disconnected...");
  });
});

app.use(express.json()); // For parsing JSON bodies

// Authentication middleware
app.use(sessionMiddleware);

// Authentication routes
app.get("/admin/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin-login.html"));
});
app.post("/admin/login", authRoutes.login);
app.post("/admin/logout", authRoutes.logout);
app.get("/admin/status", authRoutes.status);

// Helper endpoint for generating password hashes (for debugging only)
app.post("/admin/generate-hash", (req, res) => {
  const bcrypt = require("bcryptjs");
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: "Password required" });
  }
  const hash = bcrypt.hashSync(password, 10);
  res.json({ hash, password });
});

// Protect admin panel - authentication required
app.get("/create.html", requireAuth, (req, res, next) => next());

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// ============================================
// Puzzle API Endpoints (proxying to PHP API)
// ============================================

// Get all categories
app.get("/api/categories", async (req, res) => {
  try {
    const categories = await callAPI('/categories.php');
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get themes for a category
app.get("/api/categories/:catId/themes", async (req, res) => {
  try {
    const themes = await callAPI('/themes.php', 'GET', { categoryId: req.params.catId });
    res.json(themes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch themes' });
  }
});

// Get puzzles for a theme
app.get("/api/categories/:catId/themes/:themeId/puzzles", async (req, res) => {
  try {
    const puzzles = await callAPI('/puzzles.php', 'GET', { 
      categoryId: req.params.catId,
      themeId: req.params.themeId 
    });
    res.json(puzzles);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch puzzles' });
  }
});

// Get all puzzles
app.get("/api/puzzles", async (req, res) => {
  try {
    const puzzles = await callAPI('/puzzles/get.php');
    res.json(puzzles);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch puzzles' });
  }
});

// Get single puzzle by ID
app.get("/api/puzzles/:puzzleId", async (req, res) => {
  try {
    const puzzle = await callAPI('/puzzles/single.php', 'GET', { id: req.params.puzzleId });
    if (!puzzle || puzzle.error) {
      return res.status(404).json({ error: "Puzzle not found" });
    }
    res.json(puzzle);
  } catch (error) {
    res.status(404).json({ error: "Puzzle not found" });
  }
});

// Get leaderboard for a puzzle
app.get("/api/puzzles/:puzzleId/leaderboard", async (req, res) => {
  try {
    const leaderboard = await callAPI('/leaderboard.php', 'GET', { 
      puzzleId: req.params.puzzleId 
    });
    res.json(leaderboard || []);
  } catch (error) {
    console.error("Error loading leaderboard:", error);
    res.status(500).json({ error: "Failed to load leaderboard" });
  }
});

// Export emails (admin only)
app.get("/api/export-emails", requireAuth, async (req, res) => {
  try {
    const emailData = await callAPI('/leaderboard/get.php', 'GET');
    res.json(emailData);
  } catch (error) {
    console.error('Error exporting emails:', error);
    res.status(500).json({ error: 'Failed to export emails' });
  }
});

// Create new puzzle (admin only)
app.post("/api/puzzles", requireAuth, async (req, res) => {
  try {
    const result = await callAPI('/puzzles/create.php', 'POST', req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create puzzle' });
  }
});

// Update puzzle (admin only)
app.put("/api/puzzles/:id", requireAuth, async (req, res) => {
  try {
    const result = await callAPI('/puzzles/update.php', 'POST', {
      id: Number(req.params.id),
      ...req.body
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update puzzle' });
  }
});

// Delete puzzle (admin only)
app.delete("/api/puzzles/:id", requireAuth, async (req, res) => {
  try {
    const result = await callAPI('/puzzles/delete.php', 'DELETE', {
      id: req.params.id
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete puzzle' });
  }
});

// Submit score for a puzzle
// app.post("/api/puzzles/:puzzleId/score", async (req, res) => {
//   const puzzleId = parseInt(req.params.puzzleId);
//   const { username, email, timeSeconds, hintsUsed } = req.body;
  
//   // Validation
//   if (!username || !email || timeSeconds === undefined) {
//     return res.status(400).json({ 
//       error: "Missing required fields: username, email, timeSeconds" 
//     });
//   }
  
//   if (username.length > 32 || username.length < 1) {
//     return res.status(400).json({ 
//       error: "Username must be 1-32 characters" 
//     });
//   }
  
//   try {
//     const result = await callAPI('/leaderboard/save.php', 'POST', {
//       puzzleId,
//       username,
//       email,
//       timeSeconds,
//       hintsUsed: hintsUsed || 0
//     });
    
//     // Emit real-time update to all connected clients
//     if (result.leaderboard) {
//       io.emit("leaderboardUpdate", { 
//         puzzleId, 
//         leaderboard: result.leaderboard 
//       });
//     }
    
//     res.status(201).json(result);
//   } catch (error) {
//     console.error("Error saving score:", error);
//     res.status(500).json({ error: "Failed to save score" });
//   }
// });

// Start server
server.listen(port, '0.0.0.0', () => {
  console.log(`✅ Server listening on port ${port}`);
  console.log(`🌐 Server accessible at http://0.0.0.0:${port}`);
  console.log(`🔗 API Base URL: ${API_BASE_URL}`);
});