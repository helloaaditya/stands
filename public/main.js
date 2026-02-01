// Responsive cell size: compact on mobile, comfortable on desktop (iframe-friendly)
function getCellDimension() {
  const w = typeof window !== 'undefined' ? window.innerWidth : 400;
  const maxCell = 50;
  const minCell = 32;
  const cols = 6;
  const gap = 4;
  const padding = 24;
  const available = w - padding;
  const cell = Math.floor((available - gap * (cols - 1)) / cols);
  return Math.max(minCell, Math.min(maxCell, cell));
}
let cellDimention = getCellDimension();
let foundedColors = 0x4a90e2;

let puzzles = [];
let currentPuzzleIndex = 0;
let selectedPuzzle;
let theme;
let words;
let letters;
let nonthemewordCount;
let nonThemeWordsFound = [];

let hintTimes = 2;
let hintsUsed = 0; // Track how many hints were used
let clickSelectMode = false; // For click-to-select functionality
let game; // Declare game variable early to avoid TDZ issues
let pauses = 2;
let isPaused = false;

// Timer variables
let puzzleStartTime = null;
let timerInterval = null;
let elapsedSeconds = 0;
let timerStarted = false;

async function loadPuzzles() {
  try {
    const response = await fetch("/api/puzzles");
    const rawPuzzles = await response.json();
    
    // Parse JSON string fields into actual arrays/objects
    puzzles = rawPuzzles.map(puzzle => ({
      ...puzzle,
      letters: typeof puzzle.letters === 'string' ? JSON.parse(puzzle.letters) : puzzle.letters,
      words: typeof puzzle.words === 'string' ? JSON.parse(puzzle.words) : puzzle.words,
      nonThemeWords: typeof puzzle.non_theme_words === 'string' ? JSON.parse(puzzle.non_theme_words) : puzzle.non_theme_words
    }));
    
    if (puzzles.length > 0) {
      currentPuzzleIndex = 0;
      selectedPuzzle = puzzles[0];
      theme = selectedPuzzle.theme;
      words = selectedPuzzle.words;
      letters = selectedPuzzle.letters;
      spangram = selectedPuzzle.spangram;
      nonThemeWords = selectedPuzzle.nonThemeWords;
      nonthemewordCount = nonThemeWords.length;
      document.getElementById("theme-text").textContent = theme;

      localStorage.setItem('puzzleID',currentPuzzleIndex);
      localStorage.setItem('puzzleTheme',theme);
      
      initializeGame();
    }
  } catch (error) {
    console.error("Error loading puzzles:", error);
  }
}

document.getElementById("hint-button").innerHTML = `Get a hint (${hintTimes})`;

function updatePuzzle(index) {
  if (puzzles.length === 0) return;
  currentPuzzleIndex = index;
  selectedPuzzle = puzzles[currentPuzzleIndex];
  theme = selectedPuzzle.theme;
  words = selectedPuzzle.words;
  letters = selectedPuzzle.letters;
  spangram = selectedPuzzle.spangram;
  nonThemeWords = selectedPuzzle.nonThemeWords;
  nonthemewordCount = nonThemeWords.length;
  document.getElementById("theme-text").textContent = theme;
  
  // Reset timer for new puzzle (don't start automatically)
  resetTimer();
  hintsUsed = 0;
  hintTimes = 2;
  document.getElementById("hint-button").innerHTML = `Get a hint (${hintTimes})`;
  
  // Update found words text after loading new puzzle
  if (game && game.scene && game.scene.scenes[0]) {
    game.scene.scenes[0].updateFoundWordsText(words);
    // Load persisted found words for this puzzle
    game.scene.scenes[0].loadPersistedFoundWords();
  }
}

// Timer Functions
function startTimer() {
  // Only start if not already started
  if (timerStarted) return;
  
  timerStarted = true;
  puzzleStartTime = Date.now();
  elapsedSeconds = 0;
  updateTimerDisplay();
  
  timerInterval = setInterval(() => {
    elapsedSeconds = Math.floor((Date.now() - puzzleStartTime) / 1000);
    updateTimerDisplay();
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function resumeTimer() {
  if (timerInterval) return;

  puzzleStartTime = Date.now() - elapsedSeconds * 1000;

  timerInterval = setInterval(() => {
    elapsedSeconds = Math.floor((Date.now() - puzzleStartTime) / 1000);
    updateTimerDisplay();
  }, 1000);
}

function resetTimer() {
  // Stop any existing timer
  stopTimer();
  
  // Reset all timer variables
  timerStarted = false;
  puzzleStartTime = null;
  elapsedSeconds = 0;
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const timerElement = document.getElementById("timer-display");
  if (timerElement) {
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Don't load puzzles immediately - wait for game to be ready

class Game extends Phaser.Scene {
  constructor() {
    super({
      key: "Game",
      physics: {
        default: "arcade",
        arcade: {
          debug: false,
        },
      },
    });
  }

  updateSelectedTextLive() {
    const el = document.getElementById("show-selected");
    if (!el) return;

    const word = this.selectedCells
      .map(cell => this.grid[cell.row][cell.col])
      .join("")
      .toUpperCase();

    el.textContent = word;
  }

  cancelSelection() {
    this.selectedCells.forEach(cell =>
      this.highlightCell(cell.row, cell.col, false)
    );
    this.selectedCells = [];
    this.isSelecting = false;
    this.lineGraphics.clear();
  }

  updateColors() {
    const body = document.body;
    
    // Default Light Mode - Simple black/white puzzle
    this.bgColor = 0xffffff;
    this.cellBg = 0xf5f5f5;
    this.cellText = "#000000";
    this.foundColor = 0xd1d5db;
    this.selectionColor = 0xe5e7eb;
    this.lineColor = 0x9ca3af;
    this.hintColor = 0x6b7280;

    // Midnight Dark Theme - TRUE dark mode with dark puzzle area
    if (body.classList.contains("midnight-theme")) {
      this.bgColor = 0x0a0a0f;
      this.cellBg = 0x1e293b;
      this.cellText = "#e2e8f0";
      this.foundColor = 0x334155;
      this.selectionColor = 0x475569;
      this.lineColor = 0x64748b;
      this.hintColor = 0xfbbf24;
    }
    // Ocean Theme - keep existing ocean colors
    else if (body.classList.contains("ocean-theme")) {
      this.bgColor = 0xe0f2fe;
      this.cellBg = 0xbae6fd;
      this.cellText = "#0c4a6e";
      this.foundColor = 0x06b6d4;
      this.selectionColor = 0x7dd3fc;
      this.lineColor = 0x38bdf8;
      this.hintColor = 0xf97316;
    }
    // Sunset Theme
    else if (body.classList.contains("sunset-theme")) {
      this.bgColor = 0xfff7ed;
      this.cellBg = 0xfed7aa;
      this.cellText = "#7c2d12";
      this.foundColor = 0xfb923c;
      this.selectionColor = 0xfef3c7;
      this.lineColor = 0xfdba74;
      this.hintColor = 0xdc2626;
    }
    // Forest Theme
    else if (body.classList.contains("forest-theme")) {
      this.bgColor = 0xf0fdf4;
      this.cellBg = 0xa7f3d0;
      this.cellText = "#064e3b";
      this.foundColor = 0x10b981;
      this.selectionColor = 0xd1fae5;
      this.lineColor = 0x6ee7b7;
      this.hintColor = 0xf59e0b;
    }
    // Royal Theme
    else if (body.classList.contains("royal-theme")) {
      this.bgColor = 0xfaf5ff;
      this.cellBg = 0xe9d5ff;
      this.cellText = "#4c1d95";
      this.foundColor = 0xa78bfa;
      this.selectionColor = 0xddd6fe;
      this.lineColor = 0xc084fc;
      this.hintColor = 0xf59e0b;
    }
    // Neon Theme - Bright neon colors on dark background
    else if (body.classList.contains("neon-theme")) {
      this.bgColor = 0x0f0f23;
      this.cellBg = 0x1a1a2e;
      this.cellText = "#00ff88";
      this.foundColor = 0xff00ff;
      this.selectionColor = 0x00ffff;
      this.lineColor = 0xff00ff;
      this.hintColor = 0xffff00;
    }
    // Simple Light Theme - Minimal black/white
    else if (body.classList.contains("light-theme")) {
      this.bgColor = 0xffffff;
      this.cellBg = 0xf5f5f5;
      this.cellText = "#000000";
      this.foundColor = 0xd1d5db;
      this.selectionColor = 0xe5e7eb;
      this.lineColor = 0x9ca3af;
      this.hintColor = 0x6b7280;
    }
    // Default Purple Dream Theme
    else if (body.className === "" || body.classList.contains("purple-theme")) {
      this.bgColor = 0xf5f7fa;
      this.cellBg = 0xe8ecf0;
      this.cellText = "#2c3e50";
      this.foundColor = 0x667eea;
      this.selectionColor = 0xcce7ff;
      this.lineColor = 0xbdc3c7;
      this.hintColor = 0xe74c3c;
    }

    this.cameras.main.setBackgroundColor(this.bgColor);

    // Update cell blocks and texts
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 6; c++) {
        const isFound = this.foundCells.some(
          (cell) => cell.row === r && cell.col === c
        );
        const isSelected = this.selectedCells.some(
          (cell) => cell.row === r && cell.col === c
        );
        
        if (isFound) {
          this.cellBlocks[r][c].setFillStyle(this.cellColors[r][c], 1.0);
          this.cellShadows[r][c].setFillStyle(0x000000, 0.3);
        } else if (isSelected) {
          this.cellBlocks[r][c].setFillStyle(this.selectionColor, 1.0);
          this.cellShadows[r][c].setFillStyle(0x000000, 0.2);
        } else {
          this.cellBlocks[r][c].setFillStyle(this.cellBg, 1.0);
          this.cellShadows[r][c].setFillStyle(0x000000, 0.15);
        }
        this.cellBlocks[r][c].setAlpha(1);
        this.cellShadows[r][c].setAlpha(1);
        if (this.cellHighlights && this.cellHighlights[r][c]) {
          this.cellHighlights[r][c].setAlpha(isFound ? 0 : 0.6);
        }
        this.cellTexts[r][c].setColor(this.cellText);
      }
    }

    // Update global foundedColors for future use
    foundedColors = this.foundColor;

    // Redraw lines
    this.drawLine();
    this.drawFoundLine();
    if (this.hintPositions) {
      this.drawHintLine(this.hintPositions);
    }
  }

  preload() {
    this.load.setBaseURL("assets");
    this.load.image("logo", "loader.png");
  }

  create() {
    document.getElementById("loader").innerHTML = "";
    
    // Timer will start on first user interaction (don't auto-start)

    // Grid settings
    const rows = 8;
    const cols = 6;
    const cellSize = cellDimention;
    const cellGap = 4;
    const edgePadding = 10;

    this.grid = [];
    this.selectedCells = [];
    this.foundCells = [];
    this.foundWords = [];
    this.foundWordPositions = [];
    this.cellColors = Array(8)
      .fill()
      .map(() => Array(6).fill(foundedColors));
    this.wordColors = [];
    this.updateFoundWordsText(words);
    this.currentHint = null;
    this.isSelecting = false;
    this.startCell = null;
    this.lineGraphics = this.add.graphics();
    this.foundLineGraphics = this.add.graphics();
    this.hintLineGraphics = this.add.graphics();
    
    // Store grid settings for later use
    this.cellGap = cellGap;
    this.cellSize = cellSize;
    this.edgePadding = edgePadding;

    // Generate letters for the grid
    for (let r = 0; r < rows; r++) {
      this.grid[r] = [];
      for (let c = 0; c < cols; c++) {
        const letter = letters[r][c];
        this.grid[r][c] = letter;
      }
    }

    // Create dimensional tile graphics: shadow, block, top highlight, and text
    this.cellShadows = [];
    this.cellBlocks = [];
    this.cellHighlights = [];
    this.cellTexts = [];
    
    for (let r = 0; r < rows; r++) {
      this.cellShadows[r] = [];
      this.cellBlocks[r] = [];
      this.cellHighlights[r] = [];
      this.cellTexts[r] = [];
      
      for (let c = 0; c < cols; c++) {
        const x = edgePadding + c * (cellSize + cellGap);
        const y = edgePadding + r * (cellSize + cellGap);
        const blockWidth = cellSize * 0.88;
        const blockHeight = cellSize * 0.92;
        const offsetX = (cellSize - blockWidth) / 2;
        const offsetY = (cellSize - blockHeight) / 2;
        const centerX = x + offsetX + blockWidth / 2;
        const centerY = y + offsetY + blockHeight / 2;
        const shadowOffset = 4;

        // Strong shadow for clearly dimensional 3D tile
        const shadow = this.add.rectangle(
          centerX + shadowOffset,
          centerY + shadowOffset,
          blockWidth,
          blockHeight,
          0x000000,
          0.38
        );
        shadow.setStrokeStyle(0, 0x000000);
        this.cellShadows[r][c] = shadow;

        // Main tile with visible edge (dimensional block)
        const block = this.add.rectangle(
          centerX,
          centerY,
          blockWidth,
          blockHeight,
          0xe8ecf0,
          1.0
        );
        block.setStrokeStyle(3, 0xb0b5bc, 1);
        this.cellBlocks[r][c] = block;

        // Top highlight strip for obvious bevel / letter-tile look
        const highlightHeight = Math.max(3, Math.floor(blockHeight * 0.16));
        const highlight = this.add.rectangle(
          centerX,
          centerY - blockHeight / 2 + highlightHeight / 2,
          blockWidth - 2,
          highlightHeight,
          0xffffff,
          0.65
        );
        highlight.setDepth(1);
        this.cellHighlights[r][c] = highlight;

        shadow.setAlpha(0);
        block.setAlpha(0);
        highlight.setAlpha(0);

        const circle = this.add.circle(
          x + cellSize / 2,
          y + cellSize / 2,
          cellSize * 0.42,
          0x4a90e2,
          0
        ).setDepth(5);

        this.selectionCircles ??= [];
        this.selectionCircles[r] ??= [];
        this.selectionCircles[r][c] = circle;

        // Letter text: bold with dimensional shadow for tile look
        const text = this.add
          .text(
            x + cellSize / 2,
            y + cellSize / 2,
            this.grid[r][c],
            {
              fontSize: `${Math.floor(cellDimention * 0.58)}px`,
              color: "#1a1a2e",
              fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
              fontStyle: "900",
              stroke: "#ffffff",
              strokeThickness: 2,
            }
          )
          .setOrigin(0.5)
          .setDepth(10);
        text.setShadow(2, 2, 'rgba(0,0,0,0.45)', 0, true);
        this.cellTexts[r][c] = text;
      }
    }

    // Enhanced touch/click interaction with larger hit area for mobile
    const touchRadius = cellDimention * 0.5; // 30% larger hit area for better mobile UX
    
    this.input.on("pointerdown", (pointer) => {
      if (isPaused) return;

      // Start timer on first user interaction
      startTimer();
      
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const centerX = edgePadding + c * (cellSize + cellGap) + cellSize / 2;
          const centerY = edgePadding + r * (cellSize + cellGap) + cellSize / 2;
          const distance = Phaser.Math.Distance.Between(
            pointer.x,
            pointer.y,
            centerX,
            centerY
          );
          
          if (distance <= touchRadius) {
            const isFound = this.foundCells.some(
              (cell) => cell.row === r && cell.col === c
            );
            
            if (!isFound) {
              // Check if this is a click (not drag start)
              const alreadySelected = this.selectedCells.some(
                (cell) => cell.row === r && cell.col === c
              );
              
              if (this.selectedCells.length > 0 && !this.isSelecting) {
                // Click mode: add to or start new selection
                if (!alreadySelected) {
                  // Check if adjacent to last selected cell
                  const lastCell = this.selectedCells[this.selectedCells.length - 1];
                  const dr = Math.abs(r - lastCell.row);
                  const dc = Math.abs(c - lastCell.col);
                  
                  if ((dr === 0 && dc === 1) || (dr === 1 && dc === 0) || (dr === 1 && dc === 1)) {
                    // Adjacent: add to current selection
                    this.selectedCells.push({ row: r, col: c });
                    this.highlightCell(r, c, true);
                  } else {
                    // Not adjacent: validate current word and start new
                    this.validateAndMarkWord();
                    this.selectedCells = [{ row: r, col: c }];
                    this.highlightCell(r, c, true);
                  }
                } else {
                  // Clicking same cell: validate current selection
                  this.validateAndMarkWord();
                }
              } else {
                // Start new selection
                this.isSelecting = true;
                this.selectedCells = [{ row: r, col: c }];
                this.highlightCell(r, c, true);
              }
              return;
            }
          }
        }
      }
    });

    // Enhanced drag to select with smooth mobile interaction
    this.input.on("pointermove", (pointer) => {
      if (isPaused) return;

      if (!this.isSelecting) return;
      
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const centerX = edgePadding + c * (cellSize + cellGap) + cellSize / 2;
          const centerY = edgePadding + r * (cellSize + cellGap) + cellSize / 2;
          const distance = Phaser.Math.Distance.Between(
            pointer.x,
            pointer.y,
            centerX,
            centerY
          );
          
          if (distance <= touchRadius) {
            const alreadySelected = this.selectedCells.some(
              (cell) => cell.row === r && cell.col === c
            );
            const isFound = this.foundCells.some(
              (cell) => cell.row === r && cell.col === c
            );
            
            const lastIndex = this.selectedCells.length - 1;
            const lastCell = this.selectedCells[lastIndex];
            const prevCell = this.selectedCells[lastIndex - 1];

            // 🔙 BACKTRACK: drag back to previous cell → deselect last
            if (
              alreadySelected &&
              prevCell &&
              prevCell.row === r &&
              prevCell.col === c
            ) {
              const removed = this.selectedCells.pop();
              this.highlightCell(removed.row, removed.col, false);
              return;
            }

            // ➕ NORMAL FORWARD SELECTION
            if (!alreadySelected && !isFound) {
              const dr = Math.abs(r - lastCell.row);
              const dc = Math.abs(c - lastCell.col);

              if ((dr <= 1 && dc <= 1)) {
                this.selectedCells.push({ row: r, col: c });
                this.highlightCell(r, c, true);
                return;
              }
            }

          }
        }
      }
    });

    this.input.on("pointerup", () => {
      if (isPaused) return;

      if (this.isSelecting && this.selectedCells.length > 1) {
        this.validateAndMarkWord();
        this.isSelecting = false;
      } else {
        this.isSelecting = false;
      }
    });

    const canvas = this.sys.game.canvas;
    canvas.addEventListener("mouseleave", () => {
      if (this.isSelecting && this.selectedCells.length > 1) {
        this.validateAndMarkWord();
        this.isSelecting = false;
      }
    });

    // Update colors based on current theme
    this.updateColors();
  }

  validateAndMarkWord() {
    const showSelectedText = document.getElementById("show-selected");
    showSelectedText.textContent = "";

    let showSelectedTextLater = "";

    // Build selected word
    const rawWord = this.selectedCells
      .map((cell) => this.grid[cell.row][cell.col])
      .join("");

    const word = rawWord.trim().toUpperCase();
    const spangramWord = spangram.trim().toUpperCase();

    showSelectedText.textContent = word;

    // Too short
    if (word.length < 4) {
      showSelectedTextLater = "Too short!";
    }

    const isThemeWord = words && words.includes(word);
    const isSpangram = word === spangramWord;
    const alreadyFound = this.foundWords.includes(word);
    const isNonThemeWord = nonThemeWords.includes(word);
    const nonThemeAlreadyFound = nonThemeWordsFound.includes(word);

    if(alreadyFound){
      showSelectedTextLater = "Word already found!";
    }

    if(isNonThemeWord){
      if(!nonThemeAlreadyFound) {
        hintTimes += 1;
        document.getElementById("hint-button").innerHTML = `Get a hint (${hintTimes})`;
        showSelectedTextLater = '👍 Non-theme word found! Hint +1';
        nonThemeWordsFound.push(word);

        const element = document.getElementById("found-nonthemewords-text");
        if (element) {
          element.textContent = `Found ${nonThemeWordsFound.length} of ${nonthemewordCount} non-theme words`;
          element.style.paddingTop = "4px";
        }

      } else {
        showSelectedTextLater = 'Word already found!';
      }
    }    

    // ✅ VALID WORD (theme word OR spangram)
    if (word.length >= 4 && (isThemeWord || isSpangram) && !alreadyFound) {
      // Mark as found
      this.foundCells.push(...this.selectedCells);
      this.foundWords.push(word);
      this.foundWordPositions.push([...this.selectedCells]);

      // Decide highlight color
      let highlightColor = 0xC3B1E1;
      showSelectedTextLater = "Excellent!";

      if (isSpangram) {
        highlightColor = 0xFFFAA0; // Yellow for spangram
        showSelectedTextLater = "🎉 Spangram Found! 🎉";
      } 
      // else if (nonThemeWords.includes(word)) {
      //   hintTimes += 1;
      //   document.getElementById("hint-button").innerHTML = `Get a hint (${hintTimes})`;
      //   highlightColor = 0x9e9e9e; // non-theme
      //   showSelectedTextLater = '👍 Non-theme word found! Hint +1';
      // }

      this.wordColors.push(highlightColor);

      // Apply visuals (circles + optional text color)
      this.selectedCells.forEach((cell) => {
        const circle = this.selectionCircles[cell.row][cell.col];
        circle.setFillStyle(highlightColor, 0.9);
        circle.setAlpha(1);

        if (isSpangram) {
          this.cellTexts[cell.row][cell.col].setColor("#000000");
        }
      });

      this.drawFoundLine();
      this.updateFoundWordsText(words);
      this.saveFoundWords();

      // Clear hint if this word was hinted
      const hintDisplay = document.getElementById("hint-display");
      if (hintDisplay.textContent === word) {
        hintDisplay.textContent = "";
        this.currentHint = null;
        this.hintLineGraphics.clear();
      }

    } else {
      // ❌ Invalid word → clear selection circles
      this.selectedCells.forEach((cell) =>
        this.highlightCell(cell.row, cell.col, false)
      );
      this.lineGraphics.clear();

      if (!showSelectedTextLater) {
        showSelectedTextLater = "Not in word list";
      }
    }

    // Reset selection
    this.selectedCells = [];

    // Delayed feedback message
    setTimeout(() => {
      showSelectedText.textContent = showSelectedTextLater;
    }, 1000);
  }

  highlightCell(row, col, highlight) {
    const circle = this.selectionCircles[row][col];

    if (highlight) {
      circle.setFillStyle(this.selectionColor, 1);
      circle.setAlpha(1);
    } else {
      const isFound = this.foundCells.some(
        (cell) => cell.row === row && cell.col === col
      );

      if (!isFound) {
        circle.setAlpha(0);
      }
    }

    this.drawLine();
    this.updateSelectedTextLive();
  }

  drawLine() {
    this.lineGraphics.clear();
    this.lineGraphics.setDepth(-1);
    if (this.selectedCells.length > 1) {
      this.lineGraphics.lineStyle(
        Math.floor(cellDimention * 0.2),
        0x4a90e2,
        0.6
      );
      this.lineGraphics.beginPath();
      const firstCell = this.selectedCells[0];
      const startX = this.edgePadding + firstCell.col * (this.cellSize + this.cellGap) + this.cellSize / 2;
      const startY = this.edgePadding + firstCell.row * (this.cellSize + this.cellGap) + this.cellSize / 2;
      this.lineGraphics.moveTo(startX, startY);
      for (let i = 1; i < this.selectedCells.length; i++) {
        const cell = this.selectedCells[i];
        const lineX = this.edgePadding + cell.col * (this.cellSize + this.cellGap) + this.cellSize / 2;
        const lineY = this.edgePadding + cell.row * (this.cellSize + this.cellGap) + this.cellSize / 2;
        this.lineGraphics.lineTo(lineX, lineY);
      }
      this.lineGraphics.strokePath();
    }
  }

  drawFoundLine() {
    this.foundLineGraphics.clear();
    this.foundLineGraphics.setDepth(-1);
    for (let i = 0; i < this.foundWordPositions.length; i++) {
      const positions = this.foundWordPositions[i];
      const color = this.wordColors[i];
      if (positions && positions.length > 0) {
        this.foundLineGraphics.lineStyle(
          Math.floor(cellDimention * 0.2),
          color,
          0.6
        );
        this.foundLineGraphics.beginPath();
        const firstCell = positions[0];
        const startX = this.edgePadding + firstCell.col * (this.cellSize + this.cellGap) + this.cellSize / 2;
        const startY = this.edgePadding + firstCell.row * (this.cellSize + this.cellGap) + this.cellSize / 2;
        this.foundLineGraphics.moveTo(startX, startY);
        for (let j = 1; j < positions.length; j++) {
          const cell = positions[j];
          const lineX = this.edgePadding + cell.col * (this.cellSize + this.cellGap) + this.cellSize / 2;
          const lineY = this.edgePadding + cell.row * (this.cellSize + this.cellGap) + this.cellSize / 2;
          this.foundLineGraphics.lineTo(lineX, lineY);
        }
        this.foundLineGraphics.strokePath();
      }
    }
  }

  drawHintLine(positions) {
    this.hintLineGraphics.clear();
    this.hintLineGraphics.setDepth(-1);
    this.hintLineGraphics.lineStyle(Math.floor(cellDimention * 0.2), 0xe74c3c, 0.8);
    this.hintLineGraphics.beginPath();
    const firstCell = positions[0];
    const startX = this.edgePadding + firstCell.col * (this.cellSize + this.cellGap) + this.cellSize / 2;
    const startY = this.edgePadding + firstCell.row * (this.cellSize + this.cellGap) + this.cellSize / 2;
    this.hintLineGraphics.moveTo(startX, startY);
    for (let i = 1; i < positions.length; i++) {
      const cell = positions[i];
      const lineX = this.edgePadding + cell.col * (this.cellSize + this.cellGap) + this.cellSize / 2;
      const lineY = this.edgePadding + cell.row * (this.cellSize + this.cellGap) + this.cellSize / 2;
      this.hintLineGraphics.lineTo(lineX, lineY);
    }
    this.hintLineGraphics.strokePath();
  }

  updateFoundWordsText(words) {
    if (!words || !Array.isArray(words) || words.length === 0) return;
    const foundCount = this.foundWords ? this.foundWords.length : 0;
    const totalCount = words.length;
    const element = document.getElementById("found-words-text");
    if (element) {
      element.textContent = `Found ${foundCount} of ${totalCount} theme words`;
      element.style.paddingTop = "4px";
    }

    const element1 = document.getElementById("found-nonthemewords-text");
    if (element1) {
      element1.textContent = `Found ${nonThemeWordsFound.length} of ${nonthemewordCount} non-theme words`;
      element1.style.paddingTop = "4px";
    }    
    
    // Check if puzzle is complete
    if (foundCount === totalCount && foundCount > 0) {
      this.onPuzzleComplete();
    }
  }
  
  onPuzzleComplete() {
    // Stop timer and calculate final time
    stopTimer();
    const completionTime = elapsedSeconds;
    
    // Delay showing modal slightly for better UX
    setTimeout(() => {
      if (typeof window.showCompletionModal === 'function') {
        window.showCompletionModal(completionTime, hintsUsed);
      }
    }, 800);
  }

  findWord(word) {
    const rows = this.grid.length;
    const cols = this.grid[0].length;
    const directions = [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        for (let dir of directions) {
          let positions = [];
          let match = true;
          for (let i = 0; i < word.length; i++) {
            const nr = r + i * dir[0];
            const nc = c + i * dir[1];
            if (
              nr < 0 ||
              nr >= rows ||
              nc < 0 ||
              nc >= cols ||
              this.grid[nr][nc] !== word[i]
            ) {
              match = false;
              break;
            }
            positions.push({ row: nr, col: nc });
          }
          if (match) {
            return positions;
          }
        }
      }
    }
    return null;
  }

  getHint(words) {
    if (hintTimes > 0) {
      if (this.currentHint && !this.foundWords.includes(this.currentHint)) {
        return;
      }

      hintTimes -= 1;
      hintsUsed += 1; // Track hint usage for leaderboard
      document.getElementById("hint-button").innerHTML = `Get a hint (${hintTimes})`;

      document.getElementById("hint-display").textContent = "";
      this.hintLineGraphics.clear();
      this.hintPositions = [];

      const unfoundWords = words.filter(
        (word) =>
          !this.foundWords.includes(word) &&
          word !== spangram
      );
      if (unfoundWords.length > 0) {
        const hintWord =
          unfoundWords[Math.floor(Math.random() * unfoundWords.length)];
        this.currentHint = hintWord;
        document.getElementById("hint-display").textContent = hintWord;
        const positions = this.findWord(hintWord);
        if (positions) {
          this.hintPositions = positions;
        }
      }
    }
  }

  saveFoundWords() {
    const key = `puzzle_${currentPuzzleIndex}_foundWords`;
    const data = {
      foundWords: this.foundWords,
      foundWordPositions: this.foundWordPositions,
      wordColors: this.wordColors,
      cellColors: this.cellColors,
      foundCells: this.foundCells,
    };
    localStorage.setItem(key, JSON.stringify(data));
  }

  loadPersistedFoundWords() {
    const key = `puzzle_${currentPuzzleIndex}_foundWords`;
    const data = localStorage.getItem(key);
    if (data) {
      const parsed = JSON.parse(data);
      this.foundWords = parsed.foundWords || [];
      this.foundWordPositions = parsed.foundWordPositions || [];
      this.wordColors = parsed.wordColors || [];
      this.cellColors =
        parsed.cellColors ||
        Array(8)
          .fill()
          .map(() => Array(6).fill(foundedColors));
      this.foundCells = parsed.foundCells || [];
      
      // Restore cell colors and draw lines
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 6; c++) {
          if (this.cellColors[r][c] !== foundedColors) {
            this.cellBlocks[r][c].setFillStyle(this.cellColors[r][c], 1.0);
            this.cellShadows[r][c].setFillStyle(0x000000, 0.3);
          }
        }
      }
      this.drawFoundLine();
      this.updateFoundWordsText(words);
      this.updateColors();
    }
  }

  resetGame() {
    // Clear found words
    this.foundWords = [];
    this.foundCells = [];
    this.foundWordPositions = [];
    this.wordColors = [];
    this.selectedCells = [];
    this.cellColors = Array(8)
      .fill()
      .map(() => Array(6).fill(foundedColors));

    pauses = 2;
    isPaused = false;
    this.input.enabled = true;
    document.getElementById("pause-btn").textContent = `Pause (${pauses})`;
    
    // Update grid with new puzzle letters
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 6; c++) {
        this.grid[r][c] = letters[r][c];
        this.cellTexts[r][c].setText(letters[r][c]);
        this.cellBlocks[r][c].setFillStyle(0xe8ecf0, 1.0);
        this.cellShadows[r][c].setFillStyle(0x000000, 0.15);
        this.cellTexts[r][c].setColor("#2c3e50");
      }
    }
    
    this.lineGraphics.clear();
    this.foundLineGraphics.clear();
    this.hintLineGraphics.clear();
    
    // Clear hint
    document.getElementById("hint-display").textContent = "";
    this.currentHint = null;

    const showSelectedText = document.getElementById("show-selected");
    showSelectedText.textContent = "BEGIN!";
    showSelectedText.style.paddingBottom = "4px";

    hintsUsed = 0;
    hintTimes = 2;
    document.getElementById("hint-button").innerHTML = `Get a hint (${hintTimes})`; 
    
    // Clear ALL selection circles
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 6; c++) {
        const circle = this.selectionCircles?.[r]?.[c];
        if (circle) {
          circle.setAlpha(0);
        }
      }
    }    
    
    this.updateFoundWordsText(words);
    this.updateColors();
  }

  update() {}
}

document.getElementById("theme-text").textContent = theme;

// Hint button event listener
document.getElementById("hint-button").addEventListener("click", () => {
  const gameScene = game.scene.scenes[0];
  gameScene.getHint(words);
});

// New Puzzle button event listener - opens the puzzle menu
document.getElementById("new-puzzle-button").addEventListener("click", () => {
  // Open the puzzle menu modal (handled by navbar.js)
  const puzzleModal = document.getElementById("puzzle-menu-modal");
  const menuBtn = document.getElementById("menu-btn");
  if (menuBtn) {
    menuBtn.click(); // Trigger the menu button which handles the modal display
  }
});

// Reset Timer button event listener
document.getElementById("reset-timer-btn").addEventListener("click", () => {
  resetTimer();
  const scene = game.scene.scenes[0];
  scene.resetGame();
});

// Pause button event listener
document.getElementById("pause-btn").addEventListener("click", () => {
  const scene = game.scene.scenes[0];

  // ⏸ PAUSE
  if (!isPaused) {
    if (pauses <= 0) return;

    isPaused = true;
    pauses--;

    scene.cancelSelection(); // 🔥 critical
    scene.input.enabled = false;
    stopTimer();

    document.getElementById("pause-btn").textContent = "Resume";
    return;
  }

  // ▶ RESUME
  isPaused = false;
  scene.input.enabled = true;

  if (timerStarted) {
    resumeTimer();
  }

  document.getElementById("pause-btn").textContent = `Pause (${pauses})`;
});

// Initialize game - called after puzzles are loaded
function initializeGame() {
  const showSelectedText = document.getElementById("show-selected");
  showSelectedText.textContent = "BEGIN!";
  showSelectedText.style.paddingBottom = "4px";

  document.getElementById("pause-btn").textContent = `Pause (${pauses})`;

  let initialBgColor = 0xf5f7fa;
  if (document.body.classList.contains("midnight-theme") || document.body.classList.contains("neon-theme")) {
    initialBgColor = 0x0a0a0f;
  } else if (document.body.classList.contains("light-theme")) {
    initialBgColor = 0xffffff;
  }

  const cellGap = 4; // Gap between cells
  const edgePadding = 8; // Padding around edges for consistent spacing
  const cols = 6;
  const rows = 8;
  
  game = new Phaser.Game({
    parent: "game",
    type: Phaser.AUTO,
    width: cellDimention * cols + cellGap * (cols - 1) + edgePadding * 2,
    height: cellDimention * rows + cellGap * (rows - 1) + edgePadding * 2,
    scale: {
      autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
    },
    backgroundColor: initialBgColor,
    dom: {
      createContainer: true,
    },
    input: {
      activePointers: 3,
    },
    scene: [Game],
  });
}

// Load puzzles first, then initialize game
loadPuzzles();

// Update initial background color after theme is loaded
const updateInitialBgColor = () => {
  if (game && game.scene && game.scene.scenes[0]) {
    if (document.body.classList.contains("dark-theme")) {
      game.config.backgroundColor = 0x1a1a2e;
      game.scene.scenes[0].cameras.main.setBackgroundColor(0x1a1a2e);
    } else {
      game.config.backgroundColor = 0xf5f7fa;
      game.scene.scenes[0].cameras.main.setBackgroundColor(0xf5f7fa);
    }
  }
};
