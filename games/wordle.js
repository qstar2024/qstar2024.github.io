document.addEventListener('DOMContentLoaded', function() {
    const keyboardContainer = document.getElementById('keyboard');
    const messageArea = document.getElementById('message-area');
    const currentWordDisplay = document.getElementById('current-word-display');
    const hangmanBackground = document.getElementById('hangman-background');
    const liquidGlassMenu = document.getElementById('liquid-glass-menu');

    let wordList = { 4: [], 5: [], 6: [], 7: [] };
    let targetWord = '';
    let wordLength = 5; // Default word length
    let maxWrongGuesses = 6; // Maximum wrong guesses before game over
    let currentGuess = [];
    let wrongGuesses = 0;
    let correctGuesses = new Set();
    let gameOver = false;
    let allGuessedLetters = new Set();

    // Game state to background image mapping
    const getBackgroundImage = (wrongGuesses, wordLength) => {
        const imageMap = {
            4: ['bgp_hang_1.png', 'bgp_hang_2.png', 'bgp_hang_3.png', 'bgp_hang_4.png', 'bgp_hang_5.png'],
            5: ['bgp_hang_1.png', 'bgp_hang_2.png', 'bgp_hang_2.png', 'bgp_hang_3.png', 'bgp_hang_4.png', 'bgp_hang_5.png'],
            6: ['bgp_hang_1.png', 'bgp_hang_2.png', 'bgp_hang_2.png', 'bgp_hang_3.png', 'bgp_hang_3.png', 'bgp_hang_4.png', 'bgp_hang_5.png'],
            7: ['bgp_hang_1.png', 'bgp_hang_2.png', 'bgp_hang_2.png', 'bgp_hang_3.png', 'bgp_hang_3.png', 'bgp_hang_4.png', 'bgp_hang_4.png', 'bgp_hang_5.png']
        };
        
        const images = imageMap[wordLength] || imageMap[5];
        return images[Math.min(wrongGuesses, images.length - 1)];
    };

    // Update background image based on game state
    const updateBackgroundImage = () => {
        const newImage = getBackgroundImage(wrongGuesses, wordLength);
        hangmanBackground.src = newImage;
    };

    // Show/hide liquid glass menu on interaction
    let menuTimeout;
    const showMenu = () => {
        liquidGlassMenu.classList.add('visible');
        clearTimeout(menuTimeout);
        menuTimeout = setTimeout(() => {
            liquidGlassMenu.classList.remove('visible');
        }, 3000);
    };

    // Event listeners for menu visibility
    document.addEventListener('mousemove', showMenu);
    document.addEventListener('scroll', showMenu);
    document.addEventListener('click', showMenu);
    document.addEventListener('keydown', showMenu);

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
        ['Clear', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Enter']
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
        
        // Reset game state
        currentGuess = Array(wordLength).fill('');
        wrongGuesses = 0;
        correctGuesses.clear();
        allGuessedLetters.clear();
        gameOver = false;
        round = 0;
        maxRounds = wordLength + 1;
        guesses = [];
        messageArea.textContent = `Guess the ${wordLength}-letter word! (${maxRounds} rounds)`;
        
        createWordDisplay();
        createKeyboard();
        updateKeyboardColors({}); // Reset keyboard colors
        updateBackgroundImage();
    }

    function createWordDisplay() {
        currentWordDisplay.innerHTML = '';
        for (let i = 0; i < wordLength; i++) {
            const letterDiv = document.createElement('div');
            letterDiv.classList.add('word-letter');
            letterDiv.id = `letter-${i}`;
            currentWordDisplay.appendChild(letterDiv);
        }
        updateWordDisplay();
    }

    function updateWordDisplay() {
    for (let i = 0; i < wordLength; i++) {
        const letterDiv = document.getElementById(`letter-${i}`);
        // Show the letter only if the correct letter was guessed for this slot
        if (currentGuess[i] && currentGuess[i].toUpperCase() === targetWord[i]) {
            letterDiv.textContent = targetWord[i];
            letterDiv.classList.add('correct');
        } else {
            letterDiv.textContent = currentGuess[i] || '';
            letterDiv.classList.remove('correct');
        }
    }
}
    function createKeyboard() {
        keyboardContainer.innerHTML = '';
        const extendedKeysLayout = [
            ...keysLayout.slice(0, 2),
            [...keysLayout[2].filter(k => k !== 'BACKSPACE')]
        ];
        extendedKeysLayout.forEach(rowKeys => {
            const rowDiv = document.createElement('div');
            rowDiv.classList.add('keyboard-row');
            rowKeys.forEach(key => {
                const keyButton = document.createElement('button');
                keyButton.classList.add('key');
                keyButton.textContent = key;
                keyButton.addEventListener('click', () => handleKeyPress(key));
                rowDiv.appendChild(keyButton);
            });
            keyboardContainer.appendChild(rowDiv);
        });
    }

    let round = 0;
    let maxRounds = 0;
    let guesses = [];

    function handleKeyPress(key) {
        if (gameOver) return;
        if (key === 'Clear') {
            // Only clear non-correct slots
            for (let i = 0; i < wordLength; i++) {
                if (!correctGuesses.has(targetWord[i])) {
                    currentGuess[i] = '';
                }
            }
            updateWordInputDisplay();
            messageArea.textContent = 'Cleared! Enter a new guess.';
            return;
        }
        if (key === 'Enter') {
            if (currentGuess.join('').length !== wordLength || currentGuess.includes('')) {
                messageArea.textContent = `Please enter a ${wordLength}-letter word.`;
                return;
            }
            submitWordGuess();
            return;
        }
        if (key.length !== 1 || !key.match(/[A-Z]/i)) return;
        // Fill next empty slot that is not locked by a correct letter in the correct position
        for (let i = 0; i < wordLength; i++) {
            // Only lock the slot if it already contains the correct letter in the correct position
            if (!(currentGuess[i] && currentGuess[i].toUpperCase() === targetWord[i]) && currentGuess[i] === '') {
                currentGuess[i] = key.toUpperCase();
                break;
            }
        }
        updateWordInputDisplay();
    }

    function updateWordInputDisplay() {
        for (let i = 0; i < wordLength; i++) {
            const letterDiv = document.getElementById(`letter-${i}`);
            // During input, only show the letter, do not apply color classes
            if (currentGuess[i]) {
                letterDiv.textContent = currentGuess[i];
                letterDiv.classList.remove('correct', 'present', 'absent');
                letterDiv.classList.add('filled');
            } else {
                letterDiv.textContent = '';
                letterDiv.classList.remove('filled', 'correct', 'present', 'absent');
            }
        }
    }

    function submitWordGuess() {
        let guessArr = [];
        for (let i = 0; i < wordLength; i++) {
            // Use currentGuess for all slots, correctGuesses will be updated based on this submission
            guessArr[i] = currentGuess[i] || '';
        }
        const guess = guessArr.join('').toUpperCase();
        if (guess.length !== wordLength) {
            messageArea.textContent = `Please enter a ${wordLength}-letter word.`;
            return;
        }

        guesses.push(guess);
        round++;

        // Store the state of letters for coloring the input display and keyboard
        // States: 0 for not checked, 1 for absent, 2 for present, 3 for correct
        let letterStates = new Array(wordLength).fill(0);
        let targetLetterCounts = {};
        for (let char of targetWord) {
            targetLetterCounts[char] = (targetLetterCounts[char] || 0) + 1;
        }

        // First pass: Mark correct letters
        for (let i = 0; i < wordLength; i++) {
            if (guess[i] === targetWord[i]) {
                letterStates[i] = 3; // correct
                correctGuesses.add(targetWord[i]); // Add to overall correct letters for the game
                targetLetterCounts[guess[i]]--;
            }
        }

        // Second pass: Mark present letters
        for (let i = 0; i < wordLength; i++) {
            if (letterStates[i] === 3) continue; // Already marked as correct
            if (targetWord.includes(guess[i]) && targetLetterCounts[guess[i]] > 0) {
                letterStates[i] = 2; // present
                targetLetterCounts[guess[i]]--;
            } else {
                letterStates[i] = 1; // absent
            }
        }

        // Update current-word-display based on letterStates
        for (let i = 0; i < wordLength; i++) {
            const letterDiv = document.getElementById(`letter-${i}`);
            letterDiv.textContent = guess[i];
            letterDiv.classList.remove('correct', 'present', 'absent', 'filled');
            if (letterStates[i] === 3) {
                letterDiv.classList.add('correct');
            } else if (letterStates[i] === 2) {
                letterDiv.classList.add('present');
            } else if (letterStates[i] === 1) {
                letterDiv.classList.add('absent');
            }
        }
        
        // Create result for keyboard update (this might need adjustment based on overall game logic for keyboard)
        let keyboardResult = {};
        for (let i = 0; i < wordLength; i++) {
            const char = guess[i];
            if (letterStates[i] === 3) {
                keyboardResult[char] = 'correct';
            } else if (letterStates[i] === 2) {
                if (keyboardResult[char] !== 'correct') {
                    keyboardResult[char] = 'present';
                }
            } else if (letterStates[i] === 1) {
                if (keyboardResult[char] !== 'correct' && keyboardResult[char] !== 'present') {
                    keyboardResult[char] = 'absent';
                }
            }
        }
        updateKeyboardColors(keyboardResult);
        // updateWordInputDisplay(); // This is now handled by the loop above using letterStates

        if (guess === targetWord) {
            messageArea.textContent = 'Congratulations! You guessed the word!';
            gameOver = true;
            hangmanBackground.src = 'bgp_hang_6.png'; // Win image
            return;
        }
        if (round >= maxRounds) {
            messageArea.textContent = `Game Over! The word was '${targetWord}'.`;
            gameOver = true;
            hangmanBackground.src = 'bgp_hang_7.png'; // Loss image
            // Reveal the word
            for (let i = 0; i < wordLength; i++) {
                const letterDiv = document.getElementById(`letter-${i}`);
                letterDiv.textContent = targetWord[i];
                letterDiv.classList.add('correct');
            }
            return;
        }
        // Prepare for next round: keep only correct letters, clear others (including present/wrong-slot letters)
        for (let i = 0; i < wordLength; i++) {
            if (currentGuess[i] && currentGuess[i].toUpperCase() === targetWord[i]) {
                // Keep correct letter in correct slot
                continue;
            } else {
                currentGuess[i] = '';
            }
        }
        setTimeout(() => {
            updateWordInputDisplay();
            messageArea.textContent = `Try again! ${maxRounds - round} rounds left.`;
        }, 800);
        // Update background for each round
        wrongGuesses = round;
        updateBackgroundImage();
    }
    
    function isWordComplete() {
        for (let letter of targetWord) {
            if (!correctGuesses.has(letter)) {
                return false;
            }
        }
        return true;
    }

    function updateKeyboardColors(result) {
    const keys = keyboardContainer.querySelectorAll('.key');
    // Count occurrences of each letter in the target word
    const targetCounts = {};
    for (let i = 0; i < targetWord.length; i++) {
        const l = targetWord[i];
        targetCounts[l] = (targetCounts[l] || 0) + 1;
    }
    // Count correct positions for each letter in the guess
    const guessCounts = {};
    for (let i = 0; i < currentGuess.length; i++) {
        const g = currentGuess[i];
        if (g && g.toUpperCase() === targetWord[i]) {
            guessCounts[g.toUpperCase()] = (guessCounts[g.toUpperCase()] || 0) + 1;
        }
    }
    keys.forEach(keyButton => {
        const letter = keyButton.textContent;
        if (result[letter]) {
            keyButton.classList.remove('correct', 'present', 'absent');
            // If the letter is in the target word and all its slots are correctly guessed, turn green
            if (targetCounts[letter] && guessCounts[letter] === targetCounts[letter]) {
                keyButton.classList.add('correct');
            } else if (targetCounts[letter]) {
                keyButton.classList.add('present');
            } else {
                keyButton.classList.add(result[letter]);
            }
        } else if (Object.keys(result).length === 0) {
            keyButton.classList.remove('correct', 'present', 'absent');
        }
    });
}


    async function startGame() {
        const wordsLoaded = await fetchAndProcessWords();
        // Ensure game initializes even if fetch fails (it will use defaults)
        initializeGame(); 
    }

    startGame();

    // Add event listener for the restart button
    const restartButton = document.getElementById('restart-button');
    if (restartButton) {
        restartButton.addEventListener('click', initializeGame);
    }

    // Disable mobile keyboard and handle physical keyboard input
    const mobileInput = document.getElementById('mobile-input');
    if (mobileInput) {
        // Prevent mobile keyboard from appearing
        mobileInput.setAttribute('readonly', true);
        mobileInput.style.opacity = '0';
        mobileInput.style.pointerEvents = 'none';
        
        // Prevent focus on mobile input
        mobileInput.addEventListener('focus', (e) => {
            e.target.blur();
        });
    }

    // Handle physical keyboard input
    document.addEventListener('keydown', (e) => {
        if (gameOver) return;
        const key = e.key.toUpperCase();
        if (key.length === 1 && key.match(/[A-Z]/i)) {
            handleKeyPress(key);
            e.preventDefault(); // Prevent any default behavior
        }
    });
    
    // Prevent context menu on long press (mobile)
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
    
    // Prevent zoom on double tap (mobile)
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
});