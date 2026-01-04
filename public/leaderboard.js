// Leaderboard System
(function () {
  const socket = io();
  
  // Modal elements
  const leaderboardModal = document.getElementById('leaderboard-modal');
  const usernameModal = document.getElementById('username-modal');
  const leaderboardBtn = document.getElementById('leaderboard-btn');
  const closeLeaderboard = document.getElementById('close-leaderboard');
  
  // Username modal elements
  const usernameInput = document.getElementById('username-input');
  const submitScoreBtn = document.getElementById('submit-score');
  const skipScoreBtn = document.getElementById('skip-score');
  const completionScore = document.getElementById('completion-score');
  
  // Leaderboard state
  let currentTime = 0;
  let currentHints = 0;
  let currentUsername = localStorage.getItem('vocab-username') || '';
  let currentEmail = localStorage.getItem('vocab-email') || '';
  
  // Set saved username and email if exists
  if (currentUsername) {
    usernameInput.value = currentUsername;
  }
  
  const emailInput = document.getElementById('email-input');
  if (currentEmail && emailInput) {
    emailInput.value = currentEmail;
  }
  
  // Open leaderboard modal
  leaderboardBtn.addEventListener('click', () => {
    openLeaderboard();
  });
  
  // Close leaderboard modal
  closeLeaderboard.addEventListener('click', () => {
    leaderboardModal.style.display = 'none';
  });
  
  // Close on outside click
  leaderboardModal.addEventListener('click', (e) => {
    if (e.target === leaderboardModal) {
      leaderboardModal.style.display = 'none';
    }
  });
  
  usernameModal.addEventListener('click', (e) => {
    if (e.target === usernameModal) {
      usernameModal.style.display = 'none';
    }
  });
  
  // Submit score
  submitScoreBtn.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    const email = emailInput ? emailInput.value.trim() : '';
    
    if (!username) {
      alert('Please enter your name');
      return;
    }
    
    if (username.length > 32) {
      alert('Name must be 32 characters or less');
      return;
    }
    
    // Validate email if provided
    if (email && !isValidEmail(email)) {
      alert('Please enter a valid email address or leave it blank');
      return;
    }
    
    // Submit score to backend (before updating currentUsername)
    submitScore(username, email, currentTime, currentHints);
    
    // Save username and email for future
    localStorage.setItem('vocab-username', username);
    if (email) {
      localStorage.setItem('vocab-email', email);
    }
    currentUsername = username;
    currentEmail = email;
    
    // Close modal
    usernameModal.style.display = 'none';
  });
  
  // Helper function to validate email
  function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }
  
  // Skip score
  skipScoreBtn.addEventListener('click', () => {
    usernameModal.style.display = 'none';
  });
  
  // Enter key submits
  usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      submitScoreBtn.click();
    }
  });
  
  // Open leaderboard and load scores
  function openLeaderboard() {
    leaderboardModal.style.display = 'flex';
    loadLeaderboard();
  }
  
  // Load leaderboard from server
  function loadLeaderboard() {
    const leaderboardList = document.getElementById('leaderboard-list');
    leaderboardList.innerHTML = '<div class="loading-leaderboard">Loading scores...</div>';

    const puzzleID = localStorage.getItem('puzzleID');
    
    socket.emit('leaderboard', puzzleID);
  }
  
  // Receive leaderboard data
  socket.on('leaderboard', (scoresData) => {
    const leaderboardList = document.getElementById('leaderboard-list');
    
    if (!scoresData || Object.keys(scoresData).length === 0) {
      leaderboardList.innerHTML = '<div class="loading-leaderboard">No scores yet. Be the first!</div>';
      return;
    }
    
    // Convert to array and sort by time (lower is better)
    // const scores = Object.values(scoresData).sort((a, b) => {
    //   // Handle both old score-based and new time-based entries
    //   const aTime = a.timeSeconds || a.score || 999999;
    //   const bTime = b.timeSeconds || b.score || 999999;
    //   return aTime - bTime;
    // });
    
    // Build leaderboard HTML
    let html = '';
    scoresData.forEach((entry, index) => {
      const rank = index + 1;
      const isTopRank = rank <= 3;
      const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
      
      // // Format time display
      // const timeValue = entry.timeSeconds || entry.score || 0;
      // const minutes = Math.floor(timeValue / 60);
      // const seconds = timeValue % 60;
      // const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      
      // Add asterisk if hints were used
      const hintIndicator = (entry.hintsUsed && entry.hintsUsed > 0) ? '*' : '';
      
      html += `
        <div class="leaderboard-item ${isTopRank ? 'top-rank' : ''}">
          <div class="leaderboard-rank">${rankEmoji}</div>
          <div class="leaderboard-username">${escapeHtml(entry.username)}</div>
          <div class="leaderboard-score">${entry.time_formatted}</div>
        </div>
      `;
    });
    
    leaderboardList.innerHTML = html;
  });
  
  // Submit score to server
  function submitScore(username, email, timeSeconds, hintsUsed) {
    // Check if this is a new user BEFORE currentUsername is updated
    const isNewUser = !currentUsername || currentUsername !== username;
    const puzzleId = localStorage.getItem('puzzleID');
    const puzzleTheme = localStorage.getItem('puzzleTheme');
        
    if (!puzzleId) {
      alert('Error: Puzzle ID not found');
      return;
    }

    const data = {
      puzzleId: puzzleId,
      puzzleTheme: puzzleTheme,
      username: username,
      timeSeconds: timeSeconds,
      email: email || '',
      hintsUsed: hintsUsed || 0,
      news: false,
      newUser: isNewUser
    };
    
    socket.emit('scoreUpdate', data, (response) => {
      if (response === false) {
        // Username taken
        alert('This username is already taken. Please choose another.');
        usernameModal.style.display = 'flex';
      } else {
        // Success - show leaderboard
        setTimeout(() => {
          openLeaderboard();
        }, 500);
      }
    });
  }
  
  // Show completion modal when puzzle is finished
  window.showCompletionModal = function(timeSeconds, hintsUsed) {
    currentTime = timeSeconds;
    currentHints = hintsUsed;
    
    const minutes = Math.floor(timeSeconds / 60);
    const seconds = timeSeconds % 60;
    const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    const hintText = hintsUsed > 0 ? ` (${hintsUsed} hint${hintsUsed > 1 ? 's' : ''} used)` : '';
    
    completionScore.textContent = `Time: ${timeDisplay}${hintText}`;
    usernameModal.style.display = 'flex';
    usernameInput.focus();
  };
  
  // Helper function to escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // Load user data if username exists
  if (currentUsername) {
    socket.emit('userData', { username: currentUsername });
  }
  
  socket.on('userData', (user) => {
    // User data received - could show current score somewhere
    console.log('User data:', user);
  });
  
  socket.on('usernameTaken', () => {
    alert('This username is already taken. Please choose another.');
    usernameModal.style.display = 'flex';
  });
})();
