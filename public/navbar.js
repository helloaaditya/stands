// Theme configuration
const themes = [
  {
    id: '',
    name: 'Purple Dream',
    icon: '💜',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  {
    id: 'ocean-theme',
    name: 'Ocean Breeze',
    icon: '🌊',
    gradient: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)'
  },
  {
    id: 'sunset-theme',
    name: 'Sunset Glow',
    icon: '🌅',
    gradient: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)'
  },
  {
    id: 'forest-theme',
    name: 'Forest Dream',
    icon: '🌲',
    gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
  },
  {
    id: 'royal-theme',
    name: 'Royal Purple',
    icon: '👑',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)'
  },
  {
    id: 'midnight-theme',
    name: 'Midnight Dark',
    icon: '🌙',
    gradient: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
  },
  {
    id: 'neon-theme',
    name: 'Neon Lights',
    icon: '⚡',
    gradient: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%)'
  },
  {
    id: 'light-theme',
    name: 'Simple Light',
    icon: '☀️',
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

  // Puzzle menu modal
  const menuBtn = document.getElementById("menu-btn");
  const puzzleModal = document.getElementById("puzzle-menu-modal");
  const closeMenu = document.getElementById("close-menu");
  const puzzleList = document.getElementById("puzzle-list");

  menuBtn.addEventListener("click", function () {
    // Populate puzzle list
    puzzleList.innerHTML = "";
    puzzles.forEach((puzzle, index) => {
      const puzzleItem = document.createElement("div");
      puzzleItem.className = "puzzle-item";
      puzzleItem.innerHTML = `
        <h3>${puzzle.theme}</h3>
        <p>${puzzle.words.length} words</p>
      `;
      puzzleItem.addEventListener("click", function () {
        updatePuzzle(index);
        puzzleModal.style.display = "none";
        // Reset game state
        if (typeof game !== 'undefined' && game.scene && game.scene.scenes[0]) {
          const gameScene = game.scene.scenes[0];
          if (gameScene && gameScene.resetGame) {
            gameScene.resetGame();
          }
        }
      });
      puzzleList.appendChild(puzzleItem);
    });
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
