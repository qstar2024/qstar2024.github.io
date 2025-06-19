// 羊了个羊游戏 - JavaScript 核心逻辑

class SheepGame {
    constructor() {
        this.gameBoard = document.getElementById('tile-stack');
        this.bottomSlots = document.querySelectorAll('.slot');
        this.scoreElement = document.getElementById('score');
        this.levelElement = document.getElementById('level');
        this.movesElement = document.getElementById('tiles-left');
        this.gameStatus = document.getElementById('game-status');
        this.loadingScreen = document.getElementById('loading-screen');
        this.liquidGlassMenu = document.getElementById('liquid-glass-menu');
        
        // 游戏状态
        this.score = 0;
        this.level = 1;
        this.moves = 30;
        this.tiles = [];
        this.selectedTiles = [];
        this.slotContents = new Array(7).fill(null);
        this.gameRunning = false;
        
        // 表情符号池
        this.emojiPool = [
            '🐑', '🐮', '🐰', '🐺', '🦊', '🐻', '🐯', '🦁',
            '🐵', '🐔', '🦆', '🐷', '🐠', '🐸', '🐙', '🐡', 
            '🦋', '🐝', '🐞', '🦉', '🐧', '🐨', '🦝'
        ];
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.showLoadingScreen();
        
        // 模拟加载时间
        setTimeout(() => {
            this.hideLoadingScreen();
            this.showMenu();
            this.startNewGame();
        }, 2000);
    }
    
    setupEventListeners() {
        // 菜单按钮
        document.getElementById('restart-button').addEventListener('click', () => this.restartGame());
        document.getElementById('hint-button').addEventListener('click', () => this.showHint());
        
        // 游戏状态按钮
        document.getElementById('continue-btn').addEventListener('click', () => this.hideGameStatus());
        document.getElementById('restart-game-btn').addEventListener('click', () => this.restartGame());
        
        // 键盘支持
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.showMenu();
            } else if (e.key === 'r' || e.key === 'R') {
                this.restartGame();
            }
        });

        // 新增：菜单显示的多事件触发
        window.addEventListener('scroll', () => this.showMenu());
        window.addEventListener('mousemove', () => this.showMenu());
        window.addEventListener('click', (e) => {
            // 排除菜单自身点击
            if (!this.liquidGlassMenu.contains(e.target) && 
                !this.gameBoard.contains(e.target) && 
                !this.bottomSlots.contains(e.target)) {
                this.showMenu();
            }
        });

        // 触摸支持
        this.gameBoard.addEventListener('touchstart', (e) => {
            e.preventDefault();
        });
    }
    
    showLoadingScreen() {
        this.loadingScreen.classList.remove('hidden');
    }
    
    hideLoadingScreen() {
        this.loadingScreen.classList.add('hidden');
    }
    
    showMenu() {
        this.liquidGlassMenu.classList.add('visible');
        
        setTimeout(() => {
            this.liquidGlassMenu.classList.remove('visible');
        }, 3000);
    }
    
    startNewGame() {
        this.score = 0;
        this.level = 1;
        this.tiles = [];
        this.selectedTiles = [];
        this.slotContents = new Array(7).fill(null);
        this.gameRunning = true;
        
        this.updateUI();
        this.clearBoard();
        this.clearSlots();
        this.generateLevel();
    }
    
    restartGame() {
        this.hideGameStatus();
        this.startNewGame();
    }
    
    generateLevel() {
        // 第一关特殊处理：九宫格18块，3种emoji，错位两层
        if (this.level === 1) {
            const tileCount = 18;
            const emojiTypes = 3;
            const selectedEmojis = this.emojiPool.slice(0, emojiTypes);
            // 每种emoji 6个
            let tileEmojis = [];
            for (let i = 0; i < tileCount; i++) {
                tileEmojis.push(selectedEmojis[i % emojiTypes]);
            }
            tileEmojis = this.shuffleArray(tileEmojis);
            // 九宫格错位两层
            this.createFirstLevelTiles(tileEmojis);
            return;
        }
        // 其它关卡：方块总数和emoji数量均为3的倍数
        let tileCount = Math.min(21 + this.level * 6, 60);
        let emojiTypes = Math.min(6 + this.level * 2, this.emojiPool.length);
        const selectedEmojis = this.shuffleArray([...this.emojiPool]).slice(0, emojiTypes);
        // 每种emoji数量为3的倍数
        let tileEmojis = [];
        const perEmoji = Math.floor(tileCount / emojiTypes);
        for (let i = 0; i < emojiTypes; i++) {
            for (let j = 0; j < perEmoji; j++) {
                tileEmojis.push(selectedEmojis[i]);
            }
        }
        tileEmojis = this.shuffleArray(tileEmojis);
        this.createTiles(tileEmojis);
    }
    
    createTiles(emojiArray) {
        // Validate total tiles count
        if (emojiArray.length % 3 !== 0) {
            alert('Total number of tiles must be divisible by 3!');
            return;
        }
    
        // Validate individual emoji counts
        const emojiCounts = {};
        emojiArray.forEach(emoji => {
            emojiCounts[emoji] = (emojiCounts[emoji] || 0) + 1;
        });
        
        for (const [emoji, count] of Object.entries(emojiCounts)) {
            if (count % 3 !== 0) {
                alert(`Each emoji must appear 3 times! Problem with ${emoji}`);
                return;
            }
        }
        const boardRect = this.gameBoard.getBoundingClientRect();
        const maxWidth = boardRect.width - 60;
        const maxHeight = boardRect.height - 60;
        
        emojiArray.forEach((emoji, index) => {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.textContent = emoji;
            tile.dataset.emoji = emoji;
            tile.dataset.id = index;
            
            // 随机位置，但确保不会重叠太多
            const layer = Math.floor(index / 10);
            const x = Math.random() * (maxWidth - 100) + 50;
            const y = Math.random() * (maxHeight - 100) + 50;
            
            tile.style.left = `${x}px`;
            tile.style.top = `${y}px`;
            tile.style.zIndex = layer + 1;
            
            // 添加点击事件
            tile.addEventListener('click', () => this.selectTile(tile));
            
            this.gameBoard.appendChild(tile);
            this.tiles.push(tile);
        });
        
        // 更新可点击状态
        this.updateTileStates();
    }

    // 第一关九宫格错位两层
    createFirstLevelTiles(emojiArray) {
        // 居中九宫格，动态计算 tile-stack 尺寸
        const boardRect = this.gameBoard.getBoundingClientRect();
        const tileSize = 60; // px，和css变量一致
        const gridSize = 3;
        const gap = 20;
        // 第一层九宫格左上角起点
        const totalGrid = tileSize * gridSize + gap * (gridSize - 1);
        const offsetX = (boardRect.width - totalGrid) / 2;
        const offsetY = (boardRect.height - totalGrid) / 2;
        // 第二层九宫格错位起点
        const offsetX2 = offsetX + tileSize / 2;
        const offsetY2 = offsetY + tileSize / 2;
        const positions = [];
        // 第一层
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                positions.push({
                    x: offsetX + col * (tileSize + gap),
                    y: offsetY + row * (tileSize + gap)
                });
            }
        }
        // 第二层
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                positions.push({
                    x: offsetX2 + col * (tileSize + gap),
                    y: offsetY2 + row * (tileSize + gap)
                });
            }
        }
        this.clearBoard();
        emojiArray.forEach((emoji, index) => {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.textContent = emoji;
            tile.dataset.emoji = emoji;
            tile.dataset.id = index;
            const pos = positions[index];
            tile.style.left = `${pos.x}px`;
            tile.style.top = `${pos.y}px`;
            tile.style.zIndex = Math.floor(index / 9) + 1;
            tile.addEventListener('click', () => this.selectTile(tile));
            this.gameBoard.appendChild(tile);
            this.tiles.push(tile);
        });
        this.updateTileStates();
    }
    
    selectTile(tile) {
        if (!this.gameRunning || tile.classList.contains('disabled')) {
            return;
        }
        const emoji = tile.dataset.emoji;
        // 检查是否已选中
        if (tile.classList.contains('selected')) {
            this.deselectTile(tile);
            return;
        }
        // 添加到选中列表
        tile.classList.add('selected');
        this.selectedTiles.push(tile);
        // 移动到底部槽位
        this.moveToSlot(tile);
        // 立即从tile-stack移除并显露下层方块
        if (tile.parentNode) {
            tile.parentNode.removeChild(tile);
        }
        const tileIndex = this.tiles.indexOf(tile);
        if (tileIndex > -1) {
            this.tiles.splice(tileIndex, 1);
        }
        // 更新可点击状态（显露被覆盖方块）
        this.updateTileStates();
        // 检查消除
        this.checkForMatches();
        // 更新UI
        this.updateUI();
        // 检查游戏结束条件
        this.checkGameEnd();
    }
    
    deselectTile(tile) {
        tile.classList.remove('selected');
        const index = this.selectedTiles.indexOf(tile);
        if (index > -1) {
            this.selectedTiles.splice(index, 1);
        }
        
        // 从槽位移除
        this.removeFromSlot(tile);
    }
    
    moveToSlot(tile) {
        // 找到第一个空槽位
        for (let i = 0; i < this.slotContents.length; i++) {
            if (this.slotContents[i] === null) {
                this.slotContents[i] = tile;
                const slot = this.bottomSlots[i];
                slot.textContent = tile.dataset.emoji;
                slot.classList.add('filled');
                break;
            }
        }
    }
    
    removeFromSlot(tile) {
        for (let i = 0; i < this.slotContents.length; i++) {
            if (this.slotContents[i] === tile) {
                this.slotContents[i] = null;
                const slot = this.bottomSlots[i];
                slot.textContent = '';
                slot.classList.remove('filled');
                break;
            }
        }
    }
    
    checkForMatches() {
        const emojiCount = {};
        const filledSlots = this.slotContents.filter(tile => tile !== null);
        
        // 计算每种表情符号的数量
        filledSlots.forEach(tile => {
            const emoji = tile.dataset.emoji;
            emojiCount[emoji] = (emojiCount[emoji] || 0) + 1;
        });
        
        // 检查是否有3个相同的
        for (const [emoji, count] of Object.entries(emojiCount)) {
            if (count >= 3) {
                this.removeMatches(emoji);
                return;
            }
        }
    }
    
    removeMatches(emoji) {
        const tilesToRemove = [];
        // 找到要移除的方块
        for (let i = 0; i < this.slotContents.length; i++) {
            const tile = this.slotContents[i];
            if (tile && tile.dataset.emoji === emoji) {
                tilesToRemove.push({ tile, slotIndex: i });
                if (tilesToRemove.length === 3) break;
            }
        }
        // 移除动画
        tilesToRemove.forEach(({ tile, slotIndex }, index) => {
            setTimeout(() => {
                this.slotContents[slotIndex] = null;
                const slot = this.bottomSlots[slotIndex];
                slot.textContent = '';
                slot.classList.remove('filled');
                tile.classList.add('removing');
                setTimeout(() => {
                    if (tile.parentNode) {
                        tile.parentNode.removeChild(tile);
                    }
                    const tileIndex = this.tiles.indexOf(tile);
                    if (tileIndex > -1) {
                        this.tiles.splice(tileIndex, 1);
                    }
                    const selectedIndex = this.selectedTiles.indexOf(tile);
                    if (selectedIndex > -1) {
                        this.selectedTiles.splice(selectedIndex, 1);
                    }
                    // 动画后立即检测胜利
                    if (index === tilesToRemove.length - 1) {
                        setTimeout(() => {
                            this.reorganizeSlots();
                            this.updateTileStates();
                        }, 2500);
                        setTimeout(() => {
                            this.checkGameEnd();
                        }, 2500);
                    }
                }, 500);
            }, index * 100);
        });
        this.score += 100 * this.level;
        this.updateUI();
    }
    
    reorganizeSlots() {
        const filledTiles = this.slotContents.filter(tile => tile !== null);
        this.slotContents = new Array(7).fill(null);
        
        // 清空所有槽位显示
        this.bottomSlots.forEach(slot => {
            slot.textContent = '';
            slot.classList.remove('filled');
        });
        
        // 重新排列
        filledTiles.forEach((tile, index) => {
            this.slotContents[index] = tile;
            const slot = this.bottomSlots[index];
            slot.textContent = tile.dataset.emoji;
            slot.classList.add('filled');
        });
    }
    
    updateTileStates() {
        this.tiles.forEach(tile => {
            const isTopTile = this.isTopTile(tile);
            if (isTopTile) {
                tile.classList.remove('disabled');
            } else {
                tile.classList.add('disabled');
            }
        });
    }
    
    isTopTile(targetTile) {
        const targetRect = targetTile.getBoundingClientRect();
        const targetZ = parseInt(targetTile.style.zIndex) || 0;
        
        for (const tile of this.tiles) {
            if (tile === targetTile) continue;
            
            const tileRect = tile.getBoundingClientRect();
            const tileZ = parseInt(tile.style.zIndex) || 0;
            
            // 检查是否重叠且在上层
            if (tileZ > targetZ &&
                targetRect.left < tileRect.right &&
                targetRect.right > tileRect.left &&
                targetRect.top < tileRect.bottom &&
                targetRect.bottom > tileRect.top) {
                return false;
            }
        }
        
        return true;
    }
    
    checkGameEnd() {
        // 检查胜利条件
        if (this.tiles.length === 0) {
            this.gameWin();
            return;
        }
        // 检查失败条件
        if (this.slotContents.filter(tile => tile !== null).length >= 7) {
            this.gameOver();
            return;
        }
        // 检查是否还有可移动的方块
        const availableTiles = this.tiles.filter(tile => !tile.classList.contains('disabled'));
        if (availableTiles.length === 0 && this.tiles.length > 0) {
            this.gameOver();
        }
    }
    
    gameWin() {
        this.gameRunning = false;
        
        this.showGameStatus(
            '🎉Congrats!',
            `'Well done! You passed Level ${this.level} !\n Ready for Level ${this.level + 1} ?'`,
            () => {
                this.level++;
                this.hideGameStatus();
                this.generateLevel();
                this.gameRunning = true;
            }
        );
    }
    
    gameOver() {
        this.gameRunning = false;
        
        this.showGameStatus(
            '😢Game Over',
            `'Unfortunately you lost! \n Your final score ${this.score}\n Reached Level ${this.level}'`,
            () => {
                this.hideGameStatus();
                this.startNewGame();
            }
        );
    }
    
    showHint() {
        const availableTiles = this.tiles.filter(tile => !tile.classList.contains('disabled'));
        if (availableTiles.length === 0) return;
        
        // 找到可以匹配的方块
        const emojiCount = {};
        availableTiles.forEach(tile => {
            const emoji = tile.dataset.emoji;
            if (!emojiCount[emoji]) {
                emojiCount[emoji] = [];
            }
            emojiCount[emoji].push(tile);
        });
        
        // 找到有多个的表情符号
        for (const [emoji, tiles] of Object.entries(emojiCount)) {
            if (tiles.length >= 2) {
                // 高亮显示前两个
                tiles.slice(0, 2).forEach((tile, index) => {
                    setTimeout(() => {
                        tile.style.boxShadow = '0 0 20px #ffff00';
                        setTimeout(() => {
                            tile.style.boxShadow = '';
                        }, 1000);
                    }, index * 200);
                });
                break;
            }
        }
    }
    
    showGameStatus(title, message, continueCallback) {
        document.getElementById('status-title').textContent = title;
        document.getElementById('status-message').textContent = message;
        
        const continueBtn = document.getElementById('continue-btn');
        continueBtn.onclick = continueCallback;
        
        this.gameStatus.classList.remove('hidden');
    }
    
    hideGameStatus() {
        this.gameStatus.classList.add('hidden');
    }
    
    updateUI() {
        this.scoreElement.textContent = this.score;
        this.levelElement.textContent = this.level;
        this.movesElement.textContent = this.tiles.length;
    }
    
    clearBoard() {
        this.gameBoard.innerHTML = '';
    }
    
    clearSlots() {
        this.bottomSlots.forEach(slot => {
            slot.textContent = '';
            slot.classList.remove('filled');
        });
    }
    
    shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }
}

// 页面加载完成后初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    new SheepGame();
});

// 防止页面滚动
document.addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });

// 处理页面可见性变化
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // 页面隐藏时暂停游戏
        console.log('Game paused');
    } else {
        // 页面显示时恢复游戏
        console.log('Game resumed');
    }
});

// 处理窗口大小变化
window.addEventListener('resize', () => {
    // 重新计算布局
    setTimeout(() => {
        const game = window.sheepGame;
        if (game && game.gameRunning) {
            game.updateTileStates();
        }
    }, 100);
});