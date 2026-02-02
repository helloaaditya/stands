// Theme configuration: names and icons
const themes = [
  {
    id: '',
    name: 'Lavender Mist',
    icon: '●',
    gradient: 'linear-gradient(135deg, #BFA2FC 0%, #a78bfa 100%)'
  },
  {
    id: 'ocean-theme',
    name: 'Sea Glass',
    icon: '◐',
    gradient: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)'
  },
  {
    id: 'sunset-theme',
    name: 'Peach Glow',
    icon: '◑',
    gradient: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)'
  },
  {
    id: 'forest-theme',
    name: 'Moss Garden',
    icon: '◒',
    gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
  },
  {
    id: 'royal-theme',
    name: 'Amethyst',
    icon: '◈',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)'
  },
  {
    id: 'midnight-theme',
    name: 'Night Owl',
    icon: '◔',
    gradient: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
  },
  {
    id: 'neon-theme',
    name: 'Electric',
    icon: '⚡',
    gradient: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%)'
  },
  {
    id: 'light-theme',
    name: 'Paper White',
    icon: '○',
    gradient: 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)'
  }
];

// Load saved theme from localStorage immediately
const savedTheme = localStorage.getItem("theme") || "";
document.body.className = savedTheme;

// Navigation and theme functionality
document.addEventListener("DOMContentLoaded", function () {
  // Theme selector modal
  const themeToggle = document.getElementById("theme-toggle");
  const themeModal = document.getElementById("theme-selector-modal");
  const closeThemeMenu = document.getElementById("close-theme-menu");
  const themeGrid = document.getElementById("theme-grid");
  const body = document.body;

  // Populate theme grid
  function populateThemeGrid() {
    themeGrid.innerHTML = "";
    themes.forEach((theme) => {
      const themeCard = document.createElement("div");
      themeCard.className = "theme-card";
      if (theme.id === body.className) {
        themeCard.classList.add("active");
      }
      
      themeCard.innerHTML = `
        <div class="theme-preview" style="background: ${theme.gradient};"></div>
        <p class="theme-name">${theme.icon} ${theme.name}</p>
      `;
      
      themeCard.addEventListener("click", function () {
        // Update body class
        body.className = theme.id;
        
        // Update background gradient
        body.style.background = theme.gradient;
        body.style.backgroundAttachment = "fixed";
        
        // Save theme to localStorage
        localStorage.setItem("theme", theme.id);
        localStorage.setItem("puzzleID", theme.id);
        localStorage.setItem("puzzleTheme", theme.name);
        
        // Update game colors
        if (typeof game !== 'undefined' && game.scene && game.scene.scenes[0]) {
          const gameScene = game.scene.scenes[0];
          if (gameScene.updateColors) {
            gameScene.updateColors();
          }
        }
        
        // Close modal
        themeModal.style.display = "none";
        
        // Update all active states
        document.querySelectorAll('.theme-card').forEach(card => {
          card.classList.remove('active');
        });
        themeCard.classList.add('active');
      });
      
      themeGrid.appendChild(themeCard);
    });
  }

  themeToggle.addEventListener("click", function () {
    populateThemeGrid();
    themeModal.style.display = "flex";
  });

  closeThemeMenu.addEventListener("click", function () {
    themeModal.style.display = "none";
  });

  // Close modal when clicking outside
  themeModal.addEventListener("click", function (e) {
    if (e.target === themeModal) {
      themeModal.style.display = "none";
    }
  });

  // Set initial background based on saved theme
  const currentTheme = themes.find(t => t.id === savedTheme);
  if (currentTheme) {
    body.style.background = currentTheme.gradient;
    body.style.backgroundAttachment = "fixed";
  }

  // Puzzle menu modal - NOW WITH CATEGORY SELECTION
  const menuBtn = document.getElementById("menu-btn");
  const puzzleModal = document.getElementById("puzzle-menu-modal");
  const closeMenu = document.getElementById("close-menu");
  const puzzleList = document.getElementById("puzzle-list");

  // Store current view state
  let currentCategory = null;

  // Extract unique categories from puzzles
  function getUniqueCategories() {
    if (typeof puzzles === 'undefined' || !Array.isArray(puzzles)) {
      return [];
    }
    const categories = [...new Set(puzzles.map(p => p.category))];
    return categories.sort();
  }

  // Get puzzles for a specific category
  function getPuzzlesByCategory(category) {
    if (typeof puzzles === 'undefined' || !Array.isArray(puzzles)) {
      return [];
    }
    return puzzles.filter(p => p.category === category);
  }

  // Display categories
  function displayCategories() {
    currentCategory = null;
    puzzleList.innerHTML = "";
    
    const categories = getUniqueCategories();
    
    if (categories.length === 0) {
      puzzleList.innerHTML = '<p style="text-align: center; padding: 20px;">No puzzles available</p>';
      return;
    }
    
    categories.forEach((category) => {
      const categoryItem = document.createElement("div");
      categoryItem.className = "puzzle-item";
      const puzzleCount = getPuzzlesByCategory(category).length;
      
      categoryItem.innerHTML = `
        <h3>📁 ${category}</h3>
        <p>${puzzleCount} puzzle${puzzleCount !== 1 ? 's' : ''}</p>
      `;
      
      categoryItem.addEventListener("click", function () {
        displayThemesForCategory(category);
      });
      
      puzzleList.appendChild(categoryItem);
    });
  }

  // Display themes for a specific category
  function displayThemesForCategory(category) {
    currentCategory = category;
    puzzleList.innerHTML = "";
    
    // Add back button
    const backButton = document.createElement("div");
    backButton.className = "puzzle-item";
    backButton.style.cursor = "pointer";
    backButton.style.borderColor = "#6366f1";
    backButton.innerHTML = `
      <h3>← Back to Categories</h3>
    `;
    backButton.addEventListener("click", function () {
      displayCategories();
    });
    puzzleList.appendChild(backButton);
    
    // Add category header
    const header = document.createElement("div");
    header.style.padding = "10px 0";
    header.style.textAlign = "center";
    header.innerHTML = `<h2 style="margin: 0; font-size: 1.5em;">Category: ${category}</h2>`;
    puzzleList.appendChild(header);
    
    // Get and display themes for this category
    const categoryPuzzles = getPuzzlesByCategory(category);
    
    categoryPuzzles.forEach((puzzle, index) => {
      // Find the actual index in the full puzzles array
      const actualIndex = puzzles.findIndex(p => p.id === puzzle.id);
      
      const puzzleItem = document.createElement("div");
      puzzleItem.className = "puzzle-item";
      puzzleItem.innerHTML = `
        <h3>🎯 ${puzzle.theme}</h3>
        <p>${puzzle.words.length} words</p>
        <p style="font-size: 0.9em; opacity: 0.8;">Spangram: ${puzzle.spangram}</p>
      `;
      
      puzzleItem.addEventListener("click", function () {
        if (actualIndex !== -1) {
          updatePuzzle(actualIndex);
          puzzleModal.style.display = "none";
          
          // Reset game state
          if (typeof game !== 'undefined' && game.scene && game.scene.scenes[0]) {
            const gameScene = game.scene.scenes[0];
            if (gameScene && gameScene.resetGame) {
              gameScene.resetGame();
            }
          }
        }
      });
      
      puzzleList.appendChild(puzzleItem);
    });
  }

  // Open puzzle menu - show categories first
  menuBtn.addEventListener("click", function () {
    displayCategories();
    puzzleModal.style.display = "flex";
  });

  closeMenu.addEventListener("click", function () {
    puzzleModal.style.display = "none";
  });

  // Close modal when clicking outside
  puzzleModal.addEventListener("click", function (e) {
    if (e.target === puzzleModal) {
      puzzleModal.style.display = "none";
    }
  });
});