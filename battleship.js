// Battleship Game: Human vs Computer

const GRID_SIZES = {
    small: 8,
    standard: 10,
    large: 13
};

const SHIP_CLASSES = [
    { name: 'Carrier', length: 4, count: 1 },
    { name: 'Battleship', length: 3, count: 2 },
    { name: 'Cruiser', length: 2, count: 3 },
    { name: 'Submarine', length: 2, count: 3 },
    { name: 'Patrol Boat', length: 1, count: 8 }
];

let gridSize = GRID_SIZES.standard;

function detectGridSize() {
    if (window.innerWidth <= 600) return GRID_SIZES.small;
    if (window.innerWidth >= 1200) return GRID_SIZES.large;
    return GRID_SIZES.standard;
}

document.addEventListener('DOMContentLoaded', () => {
    gridSize = detectGridSize();
    renderGrids();
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('reset-btn').addEventListener('click', resetGame);
});

function renderGrids() {
    const computerGrid = document.getElementById('computer-grid');
    const humanGrid = document.getElementById('human-grid');
    computerGrid.innerHTML = '';
    humanGrid.innerHTML = '';
    computerGrid.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
    computerGrid.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;
    humanGrid.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
    humanGrid.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;
    for (let i = 0; i < gridSize * gridSize; i++) {
        const cellC = document.createElement('div');
        cellC.className = 'cell';
        cellC.dataset.index = i;
        computerGrid.appendChild(cellC);
        const cellH = document.createElement('div');
        cellH.className = 'cell';
        cellH.dataset.index = i;
        humanGrid.appendChild(cellH);
    }
}

function startGame() {
    // Placeholder: implement ship placement and game logic
    document.getElementById('status').textContent = 'Game started! Place your ships.';
}

function resetGame() {
    renderGrids();
    document.getElementById('status').textContent = '';
}

// TODO: Implement ship placement UI, AI logic, firing, and win condition