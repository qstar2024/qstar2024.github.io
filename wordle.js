document.addEventListener('DOMContentLoaded', () => {
    const gameBoard = document.getElementById('game-board');
    const keyboardContainer = document.getElementById('keyboard');
    const messageArea = document.getElementById('message-area');

    let wordList = { 4: [], 5: [], 6: [], 7: [] };
    let targetWord = '';
    let wordLength = 5; // Default word length
    let maxGuesses = 6; // Default: wordLength + 1
    let currentRow = 0;
    let currentCol = 0;
    let guesses = [];
    let gameOver = false;

    async function fetchAndProcessWords() {
        try {
            const response = await fetch('words.csv');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const csvText = await response.text();
            const allWords = csvText.split(',').map(word => word.trim().toUpperCase());
            
            const uniqueWords = [...new Set(allWords)]; // Remove duplicates

            wordList = { 4: [], 5: [], 6: [], 7: [] }; // Reset wordList

            uniqueWords.forEach(word => {
                const len = word.length;
                if (len >= 4 && len <= 7) {
                    if (wordList[len]) {
                        wordList[len].push(word);
                    }
                }
            });

            // Check if any word list is empty and provide defaults if so
            for (const len in wordList) {
                if (wordList[len].length === 0) {
                    console.warn(`No words of length ${len} found in words.csv. Using defaults.`);
                    // Add some default words to prevent errors if a category is empty
                    if (len === "4") wordList[len] = ["FAKE", "NEWS", "VOTE", "WALL"];
                    if (len === "5") wordList[len] = ["GREAT", "CHINA", "MONEY", "TRADE"];
                    if (len === "6") wordList[len] = ["BORDER", "POLICY", "SECURE", "LEADER"];
                    if (len === "7") wordList[len] = ["AMERICA", "COUNTRY", "FREEDOM", "BELIEVE"];
                }
            }
            return true; // Indicate success
        } catch (error) {
            console.error('Failed to fetch or process word list:', error);
            messageArea.textContent = 'Error loading word list. Using default words.';
            // Fallback to default placeholder words if fetch fails
            wordList = {
                4: ["FAKE", "NEWS", "VOTE", "WALL"],
                5: ["GREAT", "CHINA", "MONEY", "TRADE", "RIGGD"],
                6: ["BORDER", "POLICY", "SECURE", "LEADER"],
                7: ["AMERICA", "COUNTRY", "FREEDOM", "BELIEVE"]
            };
            return false; // Indicate failure
        }
    }

    const keysLayout = [
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
        ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE']
    ];

    function initializeGame() {
        // Randomly select word length (4 to 7)
        const availableLengths = Object.keys(wordList).map(Number);
        wordLength = availableLengths[Math.floor(Math.random() * availableLengths.length)];
        
        const wordsOfSelectedLength = wordList[wordLength];
        if (!wordsOfSelectedLength || wordsOfSelectedLength.length === 0) {
            messageArea.textContent = 'Error: No words of selected length available.';
            gameOver = true;
            return;
        }
        targetWord = wordsOfSelectedLength[Math.floor(Math.random() * wordsOfSelectedLength.length)].toUpperCase();
        maxGuesses = wordLength + 1;
        currentRow = 0;
        currentCol = 0;
        guesses = Array(maxGuesses).fill(null).map(() => Array(wordLength).fill(''));
        gameOver = false;
        messageArea.textContent = '';
        createGameBoard();
        createKeyboard();
        updateKeyboardColors({}); // Reset keyboard colors
    }

    function createGameBoard() {
        gameBoard.innerHTML = '';
        gameBoard.style.gridTemplateRows = `repeat(${maxGuesses}, 1fr)`;
        for (let i = 0; i < maxGuesses; i++) {
            const row = document.createElement('div');
            row.classList.add('row');
            row.style.gridTemplateColumns = `repeat(${wordLength}, 1fr)`;
            for (let j = 0; j < wordLength; j++) {
                const tile = document.createElement('div');
                tile.classList.add('tile');
                tile.id = `tile-${i}-${j}`;
                row.appendChild(tile);
            }
            gameBoard.appendChild(row);
        }
    }

    function createKeyboard() {
        keyboardContainer.innerHTML = '';
        keysLayout.forEach(rowKeys => {
            const rowDiv = document.createElement('div');
            rowDiv.classList.add('keyboard-row'); // For potential styling
            rowKeys.forEach(key => {
                const keyButton = document.createElement('button');
                keyButton.classList.add('key');
                keyButton.textContent = key;
                if (key === 'ENTER' || key === 'BACKSPACE') {
                    keyButton.classList.add('large');
                }
                keyButton.addEventListener('click', () => handleKeyPress(key));
                rowDiv.appendChild(keyButton);
            });
            keyboardContainer.appendChild(rowDiv);
        });
    }

    function handleKeyPress(key) {
        if (gameOver) return;

        if (key === 'ENTER') {
            if (currentCol === wordLength) {
                submitGuess();
            }
        } else if (key === 'BACKSPACE') {
            if (currentCol > 0) {
                currentCol--;
                guesses[currentRow][currentCol] = '';
                updateBoard();
            }
        } else if (currentCol < wordLength && key.length === 1 && key.match(/[A-Z]/i)) {
            guesses[currentRow][currentCol] = key.toUpperCase();
            currentCol++;
            updateBoard();
        }
    }

    function updateBoard() {
        for (let i = 0; i < maxGuesses; i++) {
            for (let j = 0; j < wordLength; j++) {
                const tile = document.getElementById(`tile-${i}-${j}`);
                if (tile) {
                    tile.textContent = guesses[i][j];
                    if (guesses[i][j]) {
                        tile.classList.add('filled');
                    } else {
                        tile.classList.remove('filled');
                    }
                }
            }
        }
    }

    function submitGuess() {
        const guess = guesses[currentRow].join('');
        const result = checkGuess(guess);
        animateGuess(result);
        updateKeyboardColors(result);

        if (guess === targetWord) {
            messageArea.textContent = 'Congratulations! You guessed it!';
            gameOver = true;
            return;
        }

        currentRow++;
        currentCol = 0;

        if (currentRow === maxGuesses) {
            messageArea.textContent = `Game Over! The word was ${targetWord}.`;
            gameOver = true;
        }
    }

    function checkGuess(guess) {
        const result = {}; // { 'A': 'correct', 'B': 'present', 'C': 'absent' }
        const targetArray = targetWord.split('');
        const guessArray = guess.split('');
        const tempTargetArray = [...targetArray]; // Use a copy for checking 'present'

        // First pass: check for 'correct' letters
        for (let i = 0; i < wordLength; i++) {
            if (guessArray[i] === targetArray[i]) {
                result[guessArray[i]] = 'correct';
                tempTargetArray[i] = null; // Mark as used
            } 
        }
        
        // Second pass: check for 'present' and 'absent' letters
        for (let i = 0; i < wordLength; i++) {
            if (guessArray[i] !== targetArray[i]) { // Only if not already 'correct'
                if (tempTargetArray.includes(guessArray[i])) {
                     // If letter is present elsewhere and not already marked more strongly (correct > present)
                    if (result[guessArray[i]] !== 'correct') {
                        result[guessArray[i]] = 'present';
                    }
                    tempTargetArray[tempTargetArray.indexOf(guessArray[i])] = null; // Mark as used for 'present'
                } else {
                    // If letter is absent and not already marked more strongly
                    if (!result[guessArray[i]]) {
                         result[guessArray[i]] = 'absent';
                    }
                }
            }
        }
        return result;
    }

    function animateGuess(result) {
        const rowTiles = gameBoard.children[currentRow].children;
        const guessArray = guesses[currentRow];

        for (let i = 0; i < wordLength; i++) {
            const tile = rowTiles[i];
            const letter = guessArray[i];
            setTimeout(() => {
                tile.classList.add('reveal');
                if (targetWord[i] === letter) {
                    tile.classList.add('correct');
                } else if (targetWord.includes(letter)) {
                    tile.classList.add('present');
                } else {
                    tile.classList.add('absent');
                }
            }, i * 300); // Stagger animation
        }
    }

    function updateKeyboardColors(result) {
        const keys = keyboardContainer.querySelectorAll('.key');
        keys.forEach(keyButton => {
            const letter = keyButton.textContent;
            if (result[letter]) {
                // Remove previous states before adding new one
                keyButton.classList.remove('correct', 'present', 'absent'); 
                keyButton.classList.add(result[letter]);
            }
            // If no result for this letter yet, ensure no color class is applied (e.g. for new game)
            else if (Object.keys(result).length === 0) { 
                 keyButton.classList.remove('correct', 'present', 'absent');
            }
        });
    }

    // Handle physical keyboard input
    document.addEventListener('keydown', (e) => {
        if (gameOver) return;
        const key = e.key.toUpperCase();
        if (key === 'ENTER') {
            handleKeyPress('ENTER');
        } else if (key === 'BACKSPACE') {
            handleKeyPress('BACKSPACE');
        } else if (key.length === 1 && key.match(/[A-Z]/i)) {
            handleKeyPress(key);
        }
    });

    async function startGame() {
        const wordsLoaded = await fetchAndProcessWords();
        // Ensure game initializes even if fetch fails (it will use defaults)
        initializeGame(); 
    }

    startGame();

    // Attempt to focus the hidden input for mobile keyboard
    const mobileInput = document.getElementById('mobile-input');
    if (mobileInput) {
        mobileInput.focus();

        // Handle input from the hidden field
        mobileInput.addEventListener('input', (e) => {
            const input = e.data;
            if (input && input.length === 1 && input.match(/[A-Z]/i)) {
                handleKeyPress(input.toUpperCase());
            }
            // Clear the input field after processing
            mobileInput.value = '';
        });

        // Handle backspace and enter from physical/mobile keyboard
        mobileInput.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace') {
                handleKeyPress('BACKSPACE');
                e.preventDefault(); // Prevent default backspace behavior
            } else if (e.key === 'Enter') {
                handleKeyPress('ENTER');
                e.preventDefault(); // Prevent default enter behavior
            }
        });

         // Keep focus on the input field, especially on mobile
         document.body.addEventListener('click', () => {
            mobileInput.focus();
         });
         // Also try to focus on load
         window.addEventListener('load', () => {
            mobileInput.focus();
        });
    }

    // Prevent duplicate input: only process physical keyboard if mobile input is not focused
    document.addEventListener('keydown', (e) => {
        if (document.activeElement === mobileInput) return;
        if (gameOver) return;
        let key = e.key.toUpperCase();
        if (key === 'ENTER') key = 'ENTER';
        else if (key === 'BACKSPACE') key = 'BACKSPACE';
        else if (key.length === 1 && key.match(/[A-Z]/i)) key = key;
        else return;
        handleKeyPress(key);
    });
});