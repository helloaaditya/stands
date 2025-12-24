const express = require("express");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const { initializeApp } = require("firebase/app");
const {
  getDatabase,
  ref,
  get,
  set,
  update,
  remove,
} = require("firebase/database");
const dotenv = require("dotenv");

const { sessionMiddleware, requireAuth, authRoutes } = require("./auth");
const { migrateToHierarchicalSchema, loadCategories, flattenPuzzles } = require("./migration");

dotenv.config();

const firebase = initializeApp({
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyAiIN4XucR1YemBfqCgGX5zh1Vx3P-7ckU",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "strands-df2e9.firebaseapp.com",
  databaseURL: process.env.FIREBASE_DATABASE_URL || "https://strands-df2e9-default-rtdb.firebaseio.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "strands-df2e9",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "strands-df2e9.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "176795504831",
  appId: process.env.FIREBASE_APP_ID || "1:176795504831:web:71c8fafcbb976c0bf3760a",
});

const db = getDatabase(firebase);

const app = express();

// In-memory storage for puzzles
let puzzles = [
  // 1️⃣ Animals
  {
    id: 1,
    theme: "Animals",
    spangram: "KANGAROO",
    nonThemeWords: [
      "NORSE",
      "BEAR"
    ],
    words: [
      "LION",
      "TIGER",
      "HORSE",
      "SHEEP",
      "GOAT",
      "RABBIT",
      "MONKEY",
      "CAMEL",
    ],
    letters: [
      ["O", "N", "O", "R", "S", "E"], 
      ["M", "K", "H", "Y", "I", "L"], 
      ["T", "B", "E", "O", "N", "G"], 
      ["I", "B", "A", "R", "A", "O"], 
      ["K", "G", "A", "T", "O", "O"], 
      ["A", "N", "C", "R", "E", "R"], 
      ["M", "A", "H", "E", "G", "I"], 
      ["E", "L", "S", "E", "P", "T"], 
    ],
  },

  // 2️⃣ Fruits
  {
    id: 2,
    theme: "Fruits",
    spangram: "ORANGE",
    nonThemeWords: ["BREAD", "NAME", "AGED", "PEEL", "ROAR", "GAP", "ALE"],
    words: ["APPLE", "MANGO", "BANANA", "GRAPE", "LEMON", "PEAR"],
    letters: [
      ["R", "A", "E", "B", "A", "N"], 
      ["O", "N", "G", "A", "N", "O"], 
      ["O", "G", "A", "N", "E", "M"], 
      ["N", "A", "G", "U", "L", "A"], 
      ["V", "M", "C", "A", "A", "V"], 
      ["A", "O", "G", "E", "D", "O"], 
      ["R", "R", "A", "P", "A", "P"], 
      ["A", "E", "P", "E", "L", "P"],
    ],
  },

  // 3️⃣ Trees
  {
    id: 3,
    theme: "Trees",
    spangram: "MULBERRY",
    nonThemeWords: [
      "MILK",
      "WASH",
      "BEAR",
      "TERM",
      "USE", "AID", "BAR", "COW", "MAP", "EAR", "NEW", "ALE", "RAW", "LID", "ACE"
    ],    
    words: [
      "PINE",
      "MAPLE",
      "CEDAR",
      "BIRCH",
      "PALM",
      "TEAK",
      "SEQUOIA",
      "WILLOW",
    ],
    letters: [
      ["T", "M", "A", "I", "U", "Q"], 
      ["E", "U", "B", "O", "S", "E"], 
      ["A", "L", "I", "E", "D", "E"], 
      ["K", "B", "R", "H", "A", "C"], 
      ["A", "P", "E", "C", "O", "W"], 
      ["L", "M", "R", "P", "L", "L"], 
      ["I", "P", "R", "A", "E", "L"], 
      ["N", "E", "Y", "M", "W", "I"], 
    ],
  },

  // 4️⃣ Sea Animals
  {
    id: 4,
    theme: "Sea Animals",
    spangram: "OCTOPUS",
    nonThemeWords: [
      "SEA",
      "FAD", "RIP", "SIC", "HIT", "COOL", "HAW", "ARCH", "DOG", "PINS", "FUN", "PEN", "LAD"
    ], 
    words: [
      "FISH",
      "SHARK",
      "WHALE",
      "CRAB",
      "DOLPHIN",
      "SEAL",
      "SQUID",
      "PENGUIN",
    ],
    letters: [
      ["B", "S", "Q", "S", "E", "A"], 
      ["F", "A", "U", "D", "N", "L"], 
      ["I", "R", "I", "G", "E", "P"], 
      ["S", "C", "I", "U", "U", "S"], 
      ["H", "T", "N", "P", "P", "H"], 
      ["O", "C", "O", "O", "L", "I"], 
      ["E", "L", "D", "R", "A", "N"], 
      ["A", "H", "W", "K", "H", "S"], 
    ],
  },

  // 5️⃣ Birds
  {
    id: 5,
    theme: "Birds",
    spangram: "SPARROW",
    nonThemeWords: [
      "CORN", "BOGS", "PINE", "DOPE", "PACK", "CROP", "WARE", "CORD", "PAIR", "PAGE", "NOPE",
      "TOE", "COW", "BIO", "PAN", "CAP", "RUN", "INK"
    ],     
    words: [
      "EAGLE",
      "PARROT",
      "PEACOCK",
      "PIGEON",
      "DUCK",
      "SWAN",
      "ROBIN",
      "HERON",
    ],
    letters: [
      ["O", "R", "C", "N", "A", "W"],
      ["W", "B", "O", "I", "G", "S"],
      ["N", "I", "R", "P", "E", "N"],
      ["E", "P", "D", "K", "C", "O"],
      ["A", "C", "K", "U", "P", "S"],
      ["C", "O", "R", "R", "A", "P"],
      ["W", "O", "R", "R", "A", "E"],
      ["T", "O", "E", "A", "G", "L"],
    ],
  },

  // 6️⃣ Colors
  {
    id: 6,
    theme: "Colors",
    spangram: "SCARLET",
    nonThemeWords: [
      "PURE", "BEEP", "PIKE", "SALE", "WENT", "HARP", "BOLT", "CALE", "NECK", 
      "PARA", "GRAB", "PEEL", "WILL", "BITE",
      "RUN", "HEN", "NET", "LAY"
    ],  
    words: [
      "BLUE",
      "GREEN",
      "YELLOW",
      "PURPLE",
      "PINK",
      "BLACK",
      "WHITE",
      "ORANGE",
    ],
    letters: [
      ["N", "P", "R", "L", "U", "E"],
      ["E", "U", "P", "E", "L", "B"],
      ["E", "R", "G", "P", "I", "K"],
      ["S", "A", "R", "L", "E", "N"],
      ["C", "N", "G", "E", "W", "T"],
      ["A", "R", "W", "O", "H", "I"],
      ["K", "O", "B", "Y", "L", "T"],
      ["C", "A", "L", "E", "L", "E"],
    ],
  },

  // 7️⃣ Countries
  {
    id: 7,
    theme: "Countries",
    spangram: "GERMANY",
    nonThemeWords: [
      "CHIN", "BARN", "BARM", "CAPE", "JUMP", "CANE", "HILL", "RAZE", "FIRE",
      "AID", "ICE", "FAN", "DAY", "INN", "PIN", "RUB", "CAN"
    ],      
    words: [
      "CANADA",
      "FRANCE",
      "BRAZIL",
      "JAPAN",
      "CHINA",
      "INDIA",
      "CUBA",
      "PERU",
    ],
    letters: [
      ["A", "C", "H", "I", "N", "I"],
      ["D", "A", "I", "A", "D", "A"],
      ["A", "N", "N", "A", "R", "B"],
      ["Y", "C", "I", "Z", "E", "G"],
      ["N", "N", "L", "R", "F", "A"],
      ["A", "A", "M", "R", "B", "U"],
      ["A", "P", "N", "A", "E", "C"],
      ["J", "E", "C", "P", "R", "U"],
    ],
  },
];

const server = http.createServer(app);

const port = process.env.PORT || 3000;

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

let categories = {};

async function initializeDatabase() {
  console.log("🔄 Initializing database...");
  
  const existingCategories = await loadCategories(db);
  
  if (existingCategories) {
    console.log("✅ Loaded existing hierarchical schema from Firebase");
    categories = existingCategories;
  } else {
    console.log("🔄 No hierarchical schema found - checking for legacy puzzles...");
    
    let puzzlesToMigrate = puzzles;
    let firebaseKeys = [];
    
    try {
      const legacySnapshot = await get(ref(db, "puzzles"));
      if (legacySnapshot.exists()) {
        const legacyData = legacySnapshot.val();
        firebaseKeys = Object.keys(legacyData);
        const legacyPuzzles = Object.values(legacyData);
        console.log(`📦 Found ${legacyPuzzles.length} legacy puzzles in Firebase - migrating...`);
        console.log("🔐 BACKUP: Before migration, legacy puzzles are at /puzzles");
        console.log("🔐 To manually backup: Use Firebase console to export /puzzles node");
        puzzlesToMigrate = legacyPuzzles;
      } else {
        console.log("📦 No legacy puzzles found - using default puzzles");
      }
    } catch (error) {
      console.error("⚠️  Error reading legacy puzzles:", error);
      console.log("📦 Using default puzzles as fallback");
    }
    
    categories = await migrateToHierarchicalSchema(db, puzzlesToMigrate, firebaseKeys);
  }
  
  console.log(`✅ Database ready - ${Object.keys(categories).length} categories loaded`);
}

// initializeDatabase().catch(err => {
//   console.error("❌ Database initialization failed:", err);
// });

const getCodes = (score, codes = "[]") => {
  let unlocked = null;
  let newCodes = [];
  try {
    const _codes = JSON.parse(codes);
    if (Array.isArray(_codes)) {
      newCodes = _codes;
    }
  } catch (err) {
    console.log(err);
  }

  if (score >= 500) {
    const cd5h = newCodes.find((cd) => cd.points == "500");
    if (!cd5h) {
      const code = Math.floor(Math.random() * 900000) + 100000;
      unlocked = {
        points: "500",
        code: code,
      };
      newCodes.push(unlocked);
    }
  }

  if (score >= 1000) {
    const cd1k = newCodes.find((cd) => cd.points == "1000");
    if (!cd1k) {
      const code = Math.floor(Math.random() * 900000) + 100000;
      unlocked = {
        points: "1000",
        code: code,
      };
      newCodes.push(unlocked);
    }
  }

  if (score >= 5000) {
    const cd5k = newCodes.find((cd) => cd.points == "5000");
    if (!cd5k) {
      const code = Math.floor(Math.random() * 900000) + 100000;
      unlocked = {
        points: "5000",
        code: code,
      };
      newCodes.push(unlocked);
    }
  }

  return { codes: JSON.stringify(newCodes), unlocked };
};

const storeData = async (data, codes) => {
  try {
    await set(ref(db, `scores/${data.username}`), {
      username: data.username,
      email: data.email,
      score: data.score,
      news: data.news ? "Yes" : "No",
      codes: codes,
    }).then(() => {
      get(ref(db, "scores")).then((scoreValue) => {
        const dataValue = scoreValue.val();

        if (Object.keys(dataValue).length > 100) {
          const scores = Object.entries(dataValue)
            .map((score) => {
              return score[1];
            })
            .sort((a, b) => b.score - a.score);

          scores.splice(-1, 1);

          const scoreData = {};

          scores.forEach((score) => {
            scoreData[score.username] = score;
          });

          set(ref(db, "scores"), scores);
        }
      });
    });
  } catch (err) {
    console.log(err);
  }
};

const deleteData = async (username) => {
  try {
    remove(ref(db, `scores/${username}`)).then((value) => {});
  } catch (err) {
    console.log(err);
  }
};

const sendUserData = async (socket, username) => {
  try {
    get(ref(db, `scores/${username}`)).then((value) => {
      if (value.exists()) {
        const user = value.val();
        socket.emit("userData", user);
      }
    });
  } catch (err) {
    console.log(err);
  }
};

// OLD: Puzzle Firebase functions - REMOVED (now using hierarchical schema via migration.js)

io.on("connection", (socket) => {
  console.log("Connected...");

  socket.on("leaderboard", async (puzzleId) => {
    try {
      const allPuzzles = flattenPuzzles(categories);
      const puzzle = allPuzzles.find(p => p.id === puzzleId);
      
      if (!puzzle) {
        socket.emit("leaderboard", []);
        return;
      }
      
      const leaderboardPath = `categories/${puzzle.categoryId}/themes/${puzzle.themeId}/puzzles/${puzzleId}/leaderboard`;
      const snapshot = await get(ref(db, leaderboardPath));
      
      if (!snapshot.exists()) {
        socket.emit("leaderboard", []);
        return;
      }
      
      const entries = Object.values(snapshot.val()).sort((a, b) => a.timeSeconds - b.timeSeconds);
      socket.emit("leaderboard", entries.slice(0, 100));
    } catch (error) {
      console.error("Error loading leaderboard:", error);
      socket.emit("leaderboard", []);
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

// Hierarchical Puzzle API endpoints

app.get("/api/categories", (req, res) => {
  const categoriesResponse = Object.values(categories).map(cat => ({
    id: cat.id,
    name: cat.name,
    description: cat.description,
    order: cat.order,
    themeCount: cat.themes ? Object.keys(cat.themes).length : 0
  }));
  res.json(categoriesResponse);
});

app.get("/api/categories/:catId/themes", (req, res) => {
  const category = categories[req.params.catId];
  if (!category) {
    return res.status(404).json({ error: "Category not found" });
  }
  const themesResponse = Object.values(category.themes || {}).map(theme => ({
    id: theme.id,
    name: theme.name,
    description: theme.description,
    order: theme.order,
    puzzleCount: theme.puzzles ? Object.keys(theme.puzzles).length : 0
  }));
  res.json(themesResponse);
});

app.get("/api/categories/:catId/themes/:themeId/puzzles", (req, res) => {
  const category = categories[req.params.catId];
  if (!category) {
    return res.status(404).json({ error: "Category not found" });
  }
  const theme = category.themes?.[req.params.themeId];
  if (!theme) {
    return res.status(404).json({ error: "Theme not found" });
  }
  const puzzlesResponse = Object.values(theme.puzzles || {}).map(puzzle => ({
    id: puzzle.id,
    spangram: puzzle.spangram,
    wordCount: (puzzle.themeWords?.length || 0) + (puzzle.nonThemeWords?.length || 0) + 1,
    createdAt: puzzle.createdAt,
    categoryId: req.params.catId,
    categoryName: category.name,
    themeId: req.params.themeId,
    themeName: theme.name
  }));
  res.json(puzzlesResponse);
});

// app.get("/api/puzzles", (req, res) => {
//   const allPuzzles = flattenPuzzles(categories);
//   res.json(allPuzzles);
// });

app.get("/api/puzzles", (req, res) => {
  res.json(puzzles);
});

// app.get("/api/puzzles/:puzzleId", (req, res) => {
//   const puzzleId = parseInt(req.params.puzzleId);
//   const allPuzzles = flattenPuzzles(categories);
//   const puzzle = allPuzzles.find(p => p.id === puzzleId);
//   if (!puzzle) {
//     return res.status(404).json({ error: "Puzzle not found" });
//   }
//   res.json(puzzle);
// });

app.get("/api/puzzles/:puzzleId", (req, res) => {
  const puzzleId = parseInt(req.params.puzzleId);
  const puzzle = puzzles.find(p => p.id === puzzleId);
  if (!puzzle) {
    return res.status(404).json({ error: "Puzzle not found" });
  }
  res.json(puzzle);
});

app.get("/api/puzzles/:puzzleId/leaderboard", async (req, res) => {
  const puzzleId = parseInt(req.params.puzzleId);
  const allPuzzles = flattenPuzzles(categories);
  const puzzle = allPuzzles.find(p => p.id === puzzleId);
  
  if (!puzzle) {
    return res.status(404).json({ error: "Puzzle not found" });
  }
  
  try {
    const leaderboardPath = `categories/${puzzle.categoryId}/themes/${puzzle.themeId}/puzzles/${puzzleId}/leaderboard`;
    const snapshot = await get(ref(db, leaderboardPath));
    
    if (!snapshot.exists()) {
      return res.json([]);
    }
    
    const entries = Object.values(snapshot.val()).sort((a, b) => a.timeSeconds - b.timeSeconds);
    res.json(entries.slice(0, 100));
  } catch (error) {
    console.error("Error loading leaderboard:", error);
    res.status(500).json({ error: "Failed to load leaderboard" });
  }
});

app.get("/api/export-emails", requireAuth, async (req, res) => {
  try {
    const allPuzzles = flattenPuzzles(categories);
    const emailEntries = [];
    
    // Fetch leaderboard data for all puzzles using hierarchical schema
    for (const puzzle of allPuzzles) {
      const leaderboardPath = `categories/${puzzle.categoryId}/themes/${puzzle.themeId}/puzzles/${puzzle.id}/leaderboard`;
      const snapshot = await get(ref(db, leaderboardPath));
      
      if (snapshot.exists()) {
        const leaderboard = snapshot.val();
        for (const entry of Object.values(leaderboard)) {
          if (entry.email) {
            emailEntries.push({
              email: entry.email,
              username: entry.username,
              puzzle: puzzle.theme,
              time: entry.timeSeconds,
              hintsUsed: entry.hintsUsed || 0,
              timestamp: entry.completedAt || 'N/A'
            });
          }
        }
      }
    }
    
    res.json({ emails: emailEntries });
  } catch (error) {
    console.error('Error exporting emails:', error);
    res.status(500).json({ error: 'Failed to export emails' });
  }
});

app.post("/api/puzzles", requireAuth, async (req, res) => {
  const { category, theme, spangram, nonThemeWords, words, letters } = req.body;
  
  // Server-side validation
  if (!category || !theme || !spangram) {
    return res.status(400).json({ error: "Category, theme, and spangram are required" });
  }
  
  if (!words || words.length === 0) {
    return res.status(400).json({ error: "At least one word is required" });
  }
  
  if (!letters || letters.length !== 8 || letters[0].length !== 6) {
    return res.status(400).json({ error: "Grid must be 8x6" });
  }
  
  try {
    // Find or create category
    const categoryKey = category.toLowerCase().replace(/\s+/g, '_');
    let categoryId = Object.values(categories).find(c => c.name === category)?.id;
    
    if (!categoryId) {
      categoryId = Object.keys(categories).length + 1;
      categories[categoryKey] = {
        id: categoryId,
        name: category,
        themes: {}
      };
    }
    
    // Find or create theme
    const themeKey = theme.toLowerCase().replace(/\s+/g, '_');
    const targetCategory = categories[categoryKey];
    let themeId = Object.values(targetCategory.themes || {}).find(t => t.name === theme)?.id;
    
    if (!themeId) {
      const existingThemes = Object.values(targetCategory.themes || {});
      themeId = existingThemes.length + 1;
      targetCategory.themes[themeKey] = {
        id: themeId,
        name: theme,
        puzzles: {}
      };
    }
    
    // Create new puzzle
    const targetTheme = targetCategory.themes[themeKey];
    const existingPuzzles = Object.values(targetTheme.puzzles || {});
    const puzzleId = existingPuzzles.length > 0 
      ? Math.max(...existingPuzzles.map(p => p.id)) + 1
      : 1;
    
    const puzzle = {
      id: puzzleId,
      theme,
      spangram,
      nonThemeWords: nonThemeWords || [],
      words,
      letters
    };
    
    targetTheme.puzzles[puzzleId] = puzzle;
    
    // Save to Firebase
    const puzzlePath = `categories/${categoryKey}/themes/${themeKey}/puzzles/${puzzleId}`;
    await set(ref(db, puzzlePath), puzzle);
    
    res.status(201).json({ success: true, puzzle });
  } catch (error) {
    console.error("Error creating puzzle:", error);
    res.status(500).json({ error: "Failed to create puzzle" });
  }
});

app.put("/api/puzzles/:id", requireAuth, async (req, res) => {
  const puzzleId = parseInt(req.params.id);
  const { category, theme, spangram, nonThemeWords, words, letters } = req.body;
  
  // Server-side validation with trimming
  const trimmedCategory = category?.trim();
  const trimmedTheme = theme?.trim();
  const trimmedSpangram = spangram?.trim();
  
  if (!trimmedCategory || !trimmedTheme || !trimmedSpangram) {
    return res.status(400).json({ error: "Category, theme, and spangram are required and cannot be empty" });
  }
  
  if (!words || words.length === 0) {
    return res.status(400).json({ error: "At least one word is required" });
  }
  
  try {
    // Find existing puzzle to get its current location
    const allPuzzles = flattenPuzzles(categories);
    const existingPuzzle = allPuzzles.find(p => p.id === puzzleId);
    
    if (!existingPuzzle) {
      return res.status(404).json({ error: "Puzzle not found" });
    }
    
    // Find the actual category key in Firebase (not the slugged version)
    const categoryKey = Object.keys(categories).find(key => 
      categories[key].id === existingPuzzle.categoryId
    );
    
    if (!categoryKey) {
      return res.status(500).json({ error: "Category not found in hierarchy" });
    }
    
    // Find the actual theme key in Firebase
    const themeKey = Object.keys(categories[categoryKey].themes).find(key =>
      categories[categoryKey].themes[key].id === existingPuzzle.themeId
    );
    
    if (!themeKey) {
      return res.status(500).json({ error: "Theme not found in hierarchy" });
    }
    
    // Update puzzle object
    const puzzle = {
      id: puzzleId,
      theme: trimmedTheme,
      spangram: trimmedSpangram,
      nonThemeWords: nonThemeWords || [],
      words,
      letters
    };
    
    // Update in Firebase
    const puzzlePath = `categories/${categoryKey}/themes/${themeKey}/puzzles/${puzzleId}`;
    await update(ref(db, puzzlePath), puzzle);
    
    // Reload categories from Firebase to keep in sync
    categories = await loadCategories(db);
    
    res.json({ success: true, puzzle });
  } catch (error) {
    console.error("Error updating puzzle:", error);
    res.status(500).json({ error: "Failed to update puzzle" });
  }
});

app.post("/api/puzzles/:puzzleId/score", async (req, res) => {
  const puzzleId = parseInt(req.params.puzzleId);
  const { username, email, timeSeconds, hintsUsed } = req.body;
  
  if (!username || !email || timeSeconds === undefined) {
    return res.status(400).json({ error: "Missing required fields: username, email, timeSeconds" });
  }
  
  if (username.length > 32 || username.length < 1) {
    return res.status(400).json({ error: "Username must be 1-32 characters" });
  }
  
  const allPuzzles = flattenPuzzles(categories);
  const puzzle = allPuzzles.find(p => p.id === puzzleId);
  
  if (!puzzle) {
    return res.status(404).json({ error: "Puzzle not found" });
  }
  
  try {
    const entryId = `${username}_${Date.now()}`;
    const leaderboardPath = `categories/${puzzle.categoryId}/themes/${puzzle.themeId}/puzzles/${puzzleId}/leaderboard/${entryId}`;
    
    const entry = {
      username,
      email,
      timeSeconds,
      hintsUsed: hintsUsed || 0,
      completedAt: Date.now()
    };
    
    await set(ref(db, leaderboardPath), entry);
    
    const leaderboardSnapshot = await get(ref(db, `categories/${puzzle.categoryId}/themes/${puzzle.themeId}/puzzles/${puzzleId}/leaderboard`));
    const leaderboard = leaderboardSnapshot.exists() 
      ? Object.values(leaderboardSnapshot.val()).sort((a, b) => a.timeSeconds - b.timeSeconds).slice(0, 100)
      : [];
    
    io.emit("leaderboardUpdate", { puzzleId, leaderboard });
    
    res.status(201).json({ success: true, entry, leaderboard });
  } catch (error) {
    console.error("Error saving score:", error);
    res.status(500).json({ error: "Failed to save score" });
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Listening to port ${port}...`);
  console.log(`Server is ready and accessible at http://0.0.0.0:${port}`);
});
