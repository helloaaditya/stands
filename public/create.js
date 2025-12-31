let words = [];
let nonThemeWords = [];
let grid = Array(8).fill().map(() => Array(6).fill(''));
let selectedCell = null;

function initializeGrid() {
    const container = document.getElementById('gridContainer');
    container.innerHTML = '';
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 6; col++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.textContent = grid[row][col] || '';
            
            cell.addEventListener('click', () => selectCell(row, col));
            
            container.appendChild(cell);
        }
    }
}

function selectCell(row, col) {
    const cells = document.querySelectorAll('.grid-cell');
    cells.forEach(c => c.classList.remove('active'));
    
    selectedCell = { row, col };
    const cellIndex = row * 6 + col;
    cells[cellIndex].classList.add('active');
    
    document.addEventListener('keydown', handleCellInput);
}

function handleCellInput(e) {
    if (!selectedCell) return;
    
    const { row, col } = selectedCell;
    
    if (e.key.length === 1 && e.key.match(/[a-z]/i)) {
        grid[row][col] = e.key.toUpperCase();
        updateGridDisplay();
        
        if (col < 5) {
            selectCell(row, col + 1);
        } else if (row < 7) {
            selectCell(row + 1, 0);
        }
    } else if (e.key === 'Backspace') {
        grid[row][col] = '';
        updateGridDisplay();
        
        if (col > 0) {
            selectCell(row, col - 1);
        } else if (row > 0) {
            selectCell(row - 1, 5);
        }
    } else if (e.key === 'ArrowLeft' && col > 0) {
        selectCell(row, col - 1);
    } else if (e.key === 'ArrowRight' && col < 5) {
        selectCell(row, col + 1);
    } else if (e.key === 'ArrowUp' && row > 0) {
        selectCell(row - 1, col);
    } else if (e.key === 'ArrowDown' && row < 7) {
        selectCell(row + 1, col);
    }
}

function updateGridDisplay() {
    const cells = document.querySelectorAll('.grid-cell');
    grid.forEach((row, r) => {
        row.forEach((letter, c) => {
            const cellIndex = r * 6 + c;
            cells[cellIndex].textContent = letter || '';
        });
    });
    updateStats();
}

function updateStats() {
    const letterCount = grid.flat().filter(l => l).length;
    document.getElementById('letterCount').textContent = `${letterCount}/48`;
    document.getElementById('wordCount').textContent = words.length;
}

function addWord() {
    const input = document.getElementById('wordInput');
    const word = input.value.trim().toUpperCase();
    
    if (!word) return;
    
    if (word.length < 4) {
        showError('Words must be at least 4 letters long');
        return;
    }
    
    if (words.includes(word)) {
        showError('Word already added');
        return;
    }
    
    words.push(word);
    input.value = '';
    updateWordTags();
    updateStats();
}

function removeWord(word) {
    words = words.filter(w => w !== word);
    updateWordTags();
    updateStats();
}

function addNonThemeWord() {
    const input = document.getElementById('nonThemeWordInput');
    const word = input.value.trim().toUpperCase();
    
    if (!word) return;
    
    if (word.length < 4) {
        showError('Words must be at least 4 letters long');
        return;
    }
    
    if (nonThemeWords.includes(word)) {
        showError('Non-theme word already added');
        return;
    }
    
    nonThemeWords.push(word);
    input.value = '';
    updateNonThemeWordTags();
}

function removeNonThemeWord(word) {
    nonThemeWords = nonThemeWords.filter(w => w !== word);
    updateNonThemeWordTags();
}

function updateNonThemeWordTags() {
    const container = document.getElementById('nonThemeWordTags');
    container.innerHTML = '';
    
    nonThemeWords.forEach(word => {
        const tag = document.createElement('div');
        tag.className = 'word-tag';
        tag.innerHTML = `
            ${word}
            <span class="remove" onclick="removeNonThemeWord('${word}')">×</span>
        `;
        container.appendChild(tag);
    });
}

function updateWordTags() {
    const container = document.getElementById('wordTags');
    container.innerHTML = '';
    
    words.forEach(word => {
        const tag = document.createElement('div');
        tag.className = 'word-tag';
        tag.innerHTML = `
            ${word}
            <span class="remove" onclick="removeWord('${word}')">×</span>
        `;
        container.appendChild(tag);
    });
}

async function loadPuzzles() {
    try {
        const response = await fetch('/api/puzzles');
        const puzzles = await response.json();
        const container = document.getElementById('puzzleList');
        container.innerHTML = '';
        
        if (puzzles.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: #64748b; padding: 20px;">No puzzles yet</div>';
            return;
        }
        
        puzzles.forEach(puzzle => {
            const item = document.createElement('div');
            item.className = 'puzzle-item';
            
            // Safely get word count and letter count
            const wordCount = puzzle.words ? puzzle.words.length : 0;
            const letterCount = puzzle.letters ? puzzle.letters.flat().length : 0;
            const category = puzzle.category ? `${puzzle.category} • ` : '';
            
            item.innerHTML = `
                <h3>${puzzle.theme}</h3>
                <div class="info">
                    ${category}${wordCount} words • ${letterCount} letters
                </div>
                <div class="puzzle-actions">
                    <button class="btn btn-secondary" onclick="editPuzzle(${puzzle.id})">Edit</button>
                    <button class="btn btn-danger" onclick="deletePuzzle(${puzzle.id})">Delete</button>
                </div>
            `;
            container.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading puzzles:', error);
        showError('Failed to load puzzles');
    }
}

async function editPuzzle(id) {
    try {
        const response = await fetch(`/api/puzzles/${id}`);
        if (!response.ok) throw new Error('Puzzle not found');
        
        const puzzle = await response.json();
        
        // Load basic fields
        document.getElementById('category').value = puzzle.category || '';
        document.getElementById('theme').value = puzzle.theme;
        document.getElementById('spangram').value = puzzle.spangram || '';
        
        // Load theme words
        words = puzzle.words;
        updateWordTags();
        
        // Load non-theme words (handle both array and legacy single string)
        if (Array.isArray(puzzle.non_theme_words)) {
            nonThemeWords = puzzle.non_theme_words;
        } else if (puzzle.non_theme_words) {
            // Legacy format - convert single nonThemeWord to array
            nonThemeWords = [puzzle.non_theme_words];
        } else {
            nonThemeWords = [];
        }
        updateNonThemeWordTags();
        
        // Load grid
        grid = puzzle.letters;
        updateGridDisplay();
        
        // Set form to edit mode
        const form = document.getElementById('createForm');
        form.dataset.editId = id;
        form.querySelector('button[type="submit"]').textContent = 'Update Puzzle';
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
        console.error('Error loading puzzle:', error);
        showError('Failed to load puzzle');
    }
}

async function deletePuzzle(id) {
    if (!confirm('Are you sure you want to delete this puzzle?')) return;
    
    try {
        const response = await fetch(`/api/puzzles/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showSuccess('Puzzle deleted successfully');
            loadPuzzles();
        } else {
            throw new Error('Delete failed');
        }
    } catch (error) {
        console.error('Error deleting puzzle:', error);
        showError('Failed to delete puzzle');
    }
}

function showSuccess(message) {
    const el = document.getElementById('successMessage');
    el.textContent = message;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 3000);
}

function showError(message) {
    const el = document.getElementById('errorMessage');
    el.textContent = message;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 3000);
}

async function logout() {
    try {
        await fetch('/admin/logout', { method: 'POST' });
        window.location.href = '/';
    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = '/';
    }
}

document.getElementById('createForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const category = document.getElementById('category').value.trim().toUpperCase();
    const theme = document.getElementById('theme').value.trim().toUpperCase();
    const spangram = document.getElementById('spangram').value.trim().toUpperCase();
    
    if (!category) {
        showError('Category is required');
        return;
    }
    
    if (!theme) {
        showError('Theme is required');
        return;
    }
    
    if (!spangram) {
        showError('Spangram is required');
        return;
    }
    
    if (words.length === 0) {
        showError('Add at least one word');
        return;
    }
    
    const letterCount = grid.flat().filter(l => l).length;
    if (letterCount !== 48) {
        showError('Grid must contain exactly 48 letters');
        return;
    }
    
    const invalidWords = words.filter(w => w.length < 4);
    if (invalidWords.length > 0) {
        showError('All words must be at least 4 letters');
        return;
    }
    
    const isEdit = e.target.dataset.editId;
    const method = isEdit ? 'PUT' : 'POST';
    const url = isEdit ? `/api/puzzles/${e.target.dataset.editId}` : '/api/puzzles';
    
    try {
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                category,
                theme,
                spangram,
                nonThemeWords: nonThemeWords.length > 0 ? nonThemeWords : undefined,
                words,
                letters: grid
            })
        });
        
        if (response.ok) {
            showSuccess(isEdit ? 'Puzzle updated!' : 'Puzzle created!');
            
            if (isEdit) {
                delete e.target.dataset.editId;
                e.target.querySelector('button[type="submit"]').textContent = 'Create Puzzle';
            }
            
            document.getElementById('category').value = '';
            document.getElementById('theme').value = '';
            document.getElementById('spangram').value = '';
            document.getElementById('wordInput').value = '';
            document.getElementById('nonThemeWordInput').value = '';
            words = [];
            nonThemeWords = [];
            grid = Array(8).fill().map(() => Array(6).fill(''));
            updateWordTags();
            updateNonThemeWordTags();
            updateGridDisplay();
            
            loadPuzzles();
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to save puzzle');
        }
    } catch (error) {
        console.error('Error:', error);
        showError('An error occurred');
    }
});

document.getElementById('wordInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        addWord();
    }
});

document.getElementById('nonThemeWordInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        addNonThemeWord();
    }
});

// Email Viewer Functions
async function toggleEmailViewer() {
    const viewer = document.getElementById('emailViewer');
    const isVisible = viewer.style.display !== 'none';
    
    if (isVisible) {
        viewer.style.display = 'none';
    } else {
        viewer.style.display = 'block';
        await loadEmails();
    }
}

async function loadEmails() {
    try {
        const response = await fetch('/api/export-emails', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            showError('Failed to fetch emails from database');
            return;
        }

        const data = await response.json();
        const emails = data.emails || data || [];
        
        // Update stats
        const uniqueEmails = new Set(emails.map(entry => entry.email)).size;
        document.getElementById('totalEmails').textContent = emails.length;
        document.getElementById('uniqueEmails').textContent = uniqueEmails;
        
        // Populate table
        const tbody = document.getElementById('emailTableBody');
        if (emails.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #94a3b8;">No emails collected yet</td></tr>';
            return;
        }
        
        tbody.innerHTML = emails.map(entry => {
            const timeFormatted = entry.time || formatTime(entry.timeSeconds || 0);
            const dateFormatted = new Date(entry.timestamp || entry.completedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const puzzleName = entry.puzzle || entry.theme || 'Unknown';
            const hintDisplay = (entry.hintsUsed || 0) > 0 
                ? `<span class="hint-badge">${entry.hintsUsed} hints</span>` 
                : '—';
            
            return `
                <tr>
                    <td style="font-weight: 600;">${entry.email}</td>
                    <td>${entry.username}</td>
                    <td>${puzzleName}</td>
                    <td><span class="time-badge">${timeFormatted}</span></td>
                    <td>${hintDisplay}</td>
                    <td style="font-size: 13px; color: #64748b;">${dateFormatted}</td>
                </tr>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Load emails error:', error);
        showError('Failed to load emails');
    }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

async function exportEmails() {
    try {
        const response = await fetch('/api/export-emails', {
            credentials: 'include'
        });
        if (!response.ok) {
            showError('Failed to fetch emails from database');
            return;
        }
        
        const data = await response.json();
        if (!data.emails || data.emails.length === 0) {
            showError('No emails found in database');
            return;
        }
        
        // Create CSV content
        const csvContent = 'Email,Username,Puzzle,Time,Hints Used,Timestamp\n' +
            data.emails.map(entry => 
                `${entry.email},${entry.username},${entry.puzzle},${entry.time},${entry.hintsUsed},${entry.timestamp}`
            ).join('\n');
        
        // Download CSV file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `user-emails-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showSuccess(`Exported ${data.emails.length} email entries!`);
    } catch (error) {
        console.error('Export error:', error);
        showError('Failed to export emails');
    }
}

async function logout() {
    try {
        const response = await fetch('/admin/logout', {
            method: 'POST'
        });
        if (response.ok) {
            window.location.href = '/admin-login.html';
        }
    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = '/admin-login.html';
    }
}

initializeGrid();
loadPuzzles();
updateStats();
