// Elements from the DOM
const grid = document.getElementById('grid');
const guessInput = document.getElementById('guessInput');
const guessButton = document.getElementById('guessButton');
const helpButton = document.getElementById('helpButton');
const newGameButton = document.getElementById('newGameButton');
const helpSection = document.getElementById('helpSection');

let currentAttempt = 0;
let answer = "";

function initializeGame() {
    currentAttempt = 0;
    answer = wordList[Math.floor(Math.random() * wordList.length)].toUpperCase();
    grid.innerHTML = '';
    for (let i = 0; i < 30; i++) { // Adjust the number based on rows x columns
        const square = document.createElement('div');
        square.classList.add('grid-square');
        grid.appendChild(square);
    }
    guessInput.value = '';
    updateTips();
    console.log('Game initialized with the word:', answer);
}

function updateGrid(guess) {
    const squares = document.querySelectorAll('.grid-square');
    let start = currentAttempt * 5;  // Start index for the current row in the grid

    for (let i = 0; i < 5; i++) {
        squares[start + i].textContent = guess[i];
        if (guess[i] === answer[i]) {
            squares[start + i].classList.add('correct'); // Correct letter in correct position
        } else if (answer.includes(guess[i])) {
            squares[start + i].classList.add('present'); // Correct letter in wrong position
        } else {
            squares[start + i].classList.add('absent'); // Letter is not in the word at all
        }
    }
    currentAttempt++;
}

async function handleGuess() {
    let guess = guessInput.value.trim().toUpperCase();

    // Validate the length of the guess
    if (guess.length !== 5) {
        alert("Guesses must be 5 letters.");
        return;
    }

    // Convert guess to lowercase for validation
    let guessLowerCase = guess.toLowerCase();

    // Validate if the word is a real word using the Datamuse API
    const isValidWord = await validateWord(guessLowerCase);
    if (!isValidWord) {
        alert("Not a valid word.");
        return;
    }

    updateGrid(guess);
    checkGameOver(guess);

    guessInput.value = ''; // Clear the input field
}

function checkGameOver(guess) {
    if (guess.toUpperCase() === answer) {
        // Player guessed correctly
        highlightAllCorrect(); // Display the correct word
        setTimeout(() => { 
            alert("Congratulations! You've guessed the word!");
            initializeGame(); // Reset the game after the player clicks "OK"
        }, 500);
    } else if (currentAttempt >= 6) {
        // Player used all attempts
        highlightLastAttempt(guess); // Display the last attempt
        setTimeout(() => { 
            alert(`Game over! The word was ${answer}.`);
            initializeGame(); // Reset the game after the player clicks "OK"
        }, 500);
    }
}

function updateGridWithAnswer(finalWord, attempt) {
    const squares = document.querySelectorAll('.grid-square');
    let start = attempt * 5; // Calculate the starting index for the current attempt

    for (let i = 0; i < 5; i++) {
        squares[start + i].textContent = finalWord[i];
        squares[start + i].classList.add('correct'); // Add the 'correct' class for styling
    }
}

function validateWord(word) {
    return fetch(`https://api.datamuse.com/words?sp=${word}`)
        .then(response => response.json())
        .then(data => data.length > 0)
        .catch(() => false);
}


function highlightAllCorrect() {
    const squares = document.querySelectorAll('.grid-square');
    let start = (currentAttempt >= 6 ? 5 : currentAttempt - 1) * 5;

    for (let i = 0; i < 5; i++) {
        squares[start + i].textContent = answer[i];
        squares[start + i].classList.add('correct');
    }
}

function highlightLastAttempt(guess) {
    const squares = document.querySelectorAll('.grid-square');
    let start = (currentAttempt - 1) * 5; // Start index for the last row

    for (let i = 0; i < 5; i++) {
        squares[start + i].textContent = guess[i];
        // Apply appropriate class based on letter correctness
        if (guess[i] === answer[i]) {
            squares[start + i].classList.add('correct');
        } else if (answer.includes(guess[i])) {
            squares[start + i].classList.add('present');
        }
    }
}

function toggleHelp() {
    console.log("Help button clicked");
    if (helpSection.style.display === "none" || helpSection.style.display === "") {
        helpSection.style.display = "block";
    } else {
        helpSection.style.display = "none";
    }
}

function updateTips() {
    const tipsContainer = document.getElementById('tipsContainer');
    tipsContainer.innerHTML = ''; // Clear existing tips

    const usedTips = new Set(); // Keep track of tips that have been used

    for (let i = 0; i < answer.length; i++) {
        let letter = answer[i];
        let tipsForLetter = tipsTemplate[letter];

        if (tipsForLetter) {
            let tipIndex;
            let tip;

            // Find a tip that hasn't been used yet
            do {
                tipIndex = Math.floor(Math.random() * tipsForLetter.length);
                tip = tipsForLetter[tipIndex];
            } while (usedTips.has(tip)); // Keep looking if this tip has been used

            usedTips.add(tip); // Mark this tip as used

            let tipElement = document.createElement('p');
            tipElement.textContent = tip;
            tipsContainer.appendChild(tipElement);
        }
    }
}


// Event listeners
guessButton.addEventListener('click', handleGuess);
helpButton.addEventListener('click', toggleHelp);
newGameButton.addEventListener('click', initializeGame);

window.onload = initializeGame;

guessInput.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        handleGuess();
    }
});

