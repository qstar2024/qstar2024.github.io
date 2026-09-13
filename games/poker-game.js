// Texas Hold'em Poker Game - Sophisticated AI Implementation

class PokerGame {
    constructor() {
        this.deck = [];
        this.players = [];
        this.communityCards = [];
        this.pot = 0;
        this.currentBet = 0;

        this.dealerPosition = 0;
        this.currentPlayer = 0;
        this.gamePhase = 'preflop'; // preflop, flop, turn, river, showdown
        this.bettingRound = 0;
        this.smallBlind = 10;
        this.bigBlind = 20;
        // Track current minimum raise increment (starts at big blind each hand)
        this.minRaiseIncrement = this.bigBlind;
        this.roundCount = 0; // Track number of rounds played
        
        this.initializePlayers();
        this.initializeEventListeners();
        this.initializeDeck();
        this.updateUI();
        this.hideNewGameButton();
        this.hideEffects();
        this.gameOverShown = false;
        this.winShown = false;
    }

    initializePlayers() {
        // Human player
        this.players.push({
            id: 'human',
            name: 'You',
            chips: 1000,
            cards: [],
            bet: 0,
            totalBet: 0,
            folded: false,
            allIn: false,
            isHuman: true,
            element: document.getElementById('humanPlayer')
        });

        // AI Player 1: "Sarah The Shark" - Aggressive player
        this.players.push({
            id: 'ai1',
            name: 'Arya',
            chips: 1000,
            cards: [],
            bet: 0,
            totalBet: 0,
            folded: false,
            allIn: false,
            isHuman: false,
            strategy: 'aggressive',
            element: document.getElementById('player1'),
            personality: {
                aggression: 0.55,
                tightness: 0.05,
                bluffFrequency: 0.2,
                mathematical: 0.2
            }
        });

        // AI Player 2: "Mike The Rock" - Conservative player
        this.players.push({
            id: 'ai2',
            name: 'Bran',
            chips: 1000,
            cards: [],
            bet: 0,
            totalBet: 0,
            folded: false,
            allIn: false,
            isHuman: false,
            strategy: 'conservative',
            element: document.getElementById('player2'),
            personality: {
                aggression: 0.2,
                tightness: 0.55,
                bluffFrequency: 0.05,
                mathematical: 0.2
            }
        });

        // AI Player 3: "Alex The Bluffer" - Unpredictable player
        this.players.push({
            id: 'ai3',
            name: 'Cersei',
            chips: 1000,
            cards: [],
            bet: 0,
            totalBet: 0,
            folded: false,
            allIn: false,
            isHuman: false,
            strategy: 'bluffer',
            element: document.getElementById('player3'),
            personality: {
                aggression: 0.2,
                tightness: 0.05,
                bluffFrequency: 0.55,
                mathematical: 0.2
            }
        });

        // AI Player 4: "Emma The Calculator" - Mathematical/Analytical player
        this.players.push({
            id: 'ai4',
            name: 'Dolores',
            chips: 1000,
            cards: [],
            bet: 0,
            totalBet: 0,
            folded: false,
            allIn: false,
            isHuman: false,
            strategy: 'analytical',
            element: document.getElementById('player4'),
            personality: {
                aggression: 0.2,
                tightness: 0.05,
                bluffFrequency: 0.2,
                mathematical: 0.55
            }
        });
    }

    initializeDeck() {
        const suits = ['♠', '♥', '♦', '♣'];
        const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        
        this.deck = [];
        for (let suit of suits) {
            for (let rank of ranks) {
                this.deck.push({
                    suit: suit,
                    rank: rank,
                    value: this.getCardValue(rank),
                    color: (suit === '♥' || suit === '♦') ? 'red' : 'black'
                });
            }
        }
    }

    getCardValue(rank) {
        if (rank === 'A') return 14;
        if (rank === 'K') return 13;
        if (rank === 'Q') return 12;
        if (rank === 'J') return 11;
        return parseInt(rank);
    }

    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    dealCard() {
        return this.deck.pop();
    }

    initializeEventListeners() {
        document.getElementById('foldBtn').addEventListener('click', () => this.playerAction('fold'));
        document.getElementById('checkBtn').addEventListener('click', () => this.playerAction('check'));
        document.getElementById('callBtn').addEventListener('click', () => this.playerAction('call'));
        document.getElementById('raiseBtn').addEventListener('click', () => this.showRaiseControls());
        document.getElementById('allInBtn').addEventListener('click', () => this.playerAction('allin'));
        document.getElementById('newGameBtn').addEventListener('click', () => this.startNewGame());
        
        // Raise controls
        document.getElementById('confirmRaise').addEventListener('click', () => this.confirmRaise());
        document.getElementById('cancelRaise').addEventListener('click', () => this.hideRaiseControls());
        document.getElementById('raiseSlider').addEventListener('input', () => this.updateRaiseAmount());
        
        // Back to Home button functionality
        this.backHomeContainer = document.querySelector('.back-home-container');
        this.hideTimeout = null;
        
        const showBackHome = () => {
            clearTimeout(this.hideTimeout);
            this.backHomeContainer.classList.remove('hiding');
            this.backHomeContainer.classList.add('visible');
            this.hideTimeout = setTimeout(() => {
                this.backHomeContainer.classList.add('hiding');
                setTimeout(() => {
                    this.backHomeContainer.classList.remove('visible', 'hiding');
                }, 500);
            }, 5000);
        };
        
        document.addEventListener('click', (event) => {
            const interactiveElements = ['BUTTON', 'INPUT', 'A', '.card', '.player-cards', '.game-controls', '.raise-controls'];
            const isInteractive = interactiveElements.some(selector => event.target.closest(selector));
            if (!isInteractive) {
                showBackHome();
            }
        });
        
        document.addEventListener('scroll', showBackHome);
    }

    startNewGame() {
        if (this.players[0].chips <= 0 || this.players.slice(1).every(p => p.chips <= 0)) {
            window.location.href = window.location.pathname;
            return;
        }
        this.hideNewGameButton();
        // Clean up community cards immediately
        this.clearCommunityCards();

        // Reset all player card slots (AI and human) to default state
        this.resetAICards();
        
        // Increment round count and blinds if needed
        if (typeof this.roundCount !== 'number') this.roundCount = 1;
        else this.roundCount++;

        // More aggressive blind increments
        const level = Math.floor((this.roundCount - 1) / 3);
        if (level === 0) {
            this.smallBlind = 10;
            this.bigBlind = 20;
        } else if (level === 1) {
            this.smallBlind = 25;
            this.bigBlind = 50;
        } else if (level === 2) {
            this.smallBlind = 50;
            this.bigBlind = 100;
        } else {
            this.smallBlind = Math.min(50 + (level - 2) * 50, 500);
            this.bigBlind = Math.min(100 + (level - 2) * 100, 1000);
        }

        // Reset game state
        this.communityCards = [];
        this.pot = 0;
        this.currentBet = 0;
        this.gamePhase = 'preflop';
        this.bettingRound = 0;
        
        // Reset players
        this.players.forEach(player => {
            player.cards = [];
            player.bet = 0;
            player.totalBet = 0;
            player.folded = false;
            player.allIn = false;
            this.updatePlayerStatus(player, '');
        });

        // Move dealer button
        this.dealerPosition = (this.dealerPosition + 1) % this.players.length;
        this.currentPlayer = (this.dealerPosition + 1) % this.players.length;

        this.initializeDeck();
        this.shuffleDeck();
        this.dealInitialCards();
        this.postBlinds();
        this.updateUI();
        this.updateGameStatus(`New hand started! Blinds posted. (Blinds: $${this.smallBlind}/$${this.bigBlind}, Round ${this.roundCount})`);

        // Update blind level display
        const blindDisplay = document.getElementById('blindLevelDisplay');
        if (blindDisplay) {
            blindDisplay.textContent = `Blinds: $${this.smallBlind}/$${this.bigBlind}\nRound ${this.roundCount}`;
        }
        
        // Start betting round
        setTimeout(() => this.processBettingRound(), 1000);
    }

    resetAICards() {
        // Reset all AI and human card slots to default state (remove folded, winning, and color styles)
        this.players.forEach(player => {
            const cardElements = player.element.querySelectorAll('.card');
            cardElements.forEach(cardEl => {
                cardEl.innerHTML = '';
                cardEl.style.color = '';
                cardEl.classList.add('card-back');
                cardEl.classList.remove('winning', 'folded-card');
            });
        });
        // Also reset human cards by ID for extra safety
        const humanCard1 = document.getElementById('humanCard1');
        const humanCard2 = document.getElementById('humanCard2');
        if (humanCard1) {
            humanCard1.innerHTML = '';
            humanCard1.style.color = '';
            humanCard1.classList.add('card-back');
            humanCard1.classList.remove('winning', 'folded-card');
        }
        if (humanCard2) {
            humanCard2.innerHTML = '';
            humanCard2.style.color = '';
            humanCard2.classList.add('card-back');
            humanCard2.classList.remove('winning', 'folded-card');
        }
    }

    clearCommunityCards() {
        const cardSlots = ['flop1', 'flop2', 'flop3', 'turn', 'river'];
        cardSlots.forEach(slotId => {
            const cardElement = document.getElementById(slotId);
            cardElement.innerHTML = '';
            cardElement.classList.remove('has-card');
        });
    }

    dealInitialCards() {
        // Deal 2 cards to each player with animation
        for (let i = 0; i < 2; i++) {
            this.players.forEach((player, index) => {
                setTimeout(() => {
                    const card = this.dealCard();
                    player.cards.push(card);
                    this.animateCardDeal(player, i);
                }, (index * 4 + i) * 200);
            });
        }
    }

    animateCardDeal(player, cardIndex) {
        const cardElement = player.isHuman ? 
            document.getElementById(`humanCard${cardIndex + 1}`) :
            player.element.querySelectorAll('.card')[cardIndex];
        
        if (cardElement) {
            cardElement.classList.add('dealing');
            if (player.isHuman) {
                this.displayCard(cardElement, player.cards[cardIndex]);
            }
            setTimeout(() => cardElement.classList.remove('dealing'), 800);
        }
    }

    displayCard(element, card) {
        element.textContent = card.rank + card.suit;
        element.style.color = card.color;
        element.classList.remove('card-back');
    }

    postBlinds() {
        const smallBlindPlayer = this.players[(this.dealerPosition + 1) % this.players.length];
        const bigBlindPlayer = this.players[(this.dealerPosition + 2) % this.players.length];
        
        let actualSmall = 0;
        let actualBig = 0;
        if (smallBlindPlayer.chips > 0) {
            actualSmall = Math.min(this.smallBlind, smallBlindPlayer.chips);
            smallBlindPlayer.bet = actualSmall;
            smallBlindPlayer.chips -= actualSmall;
        }
        if (bigBlindPlayer.chips > 0) {
            actualBig = Math.min(this.bigBlind, bigBlindPlayer.chips);
            bigBlindPlayer.bet = actualBig;
            bigBlindPlayer.chips -= actualBig;
        }
        
        this.pot = actualSmall + actualBig;
        this.currentBet = Math.max(actualSmall, actualBig);
        // Reset minimum raise increment at the start of every hand
        this.minRaiseIncrement = this.bigBlind;
        this.currentPlayer = (this.dealerPosition + 3) % this.players.length;
        this.updateUI(); // Immediate update after blinds
    }

    processBettingRound() {
        if (this.isRoundComplete()) {
            this.completeBettingRound();
            return;
        }

        const found = this.nextPlayer();
        if (!found) {
            this.completeBettingRound();
            return;
        }

        const player = this.players[this.currentPlayer];
        if (player.isHuman) {
            this.enablePlayerControls();
        } else {
            this.processAITurn(player);
        }
    }

    completeBettingRound() {
        // Update pot display immediately
        this.updateUI();
        
        // Reset player actions for next phase
        this.players.forEach(player => {
            if (!player.folded && !player.allIn) {
                player.hasActed = false;
            }
        });
        
        this.nextPhase();
    }

    processAITurn(player) {
        this.disablePlayerControls();
        
        setTimeout(() => {
            const action = this.getAIAction(player);
            this.executeAIAction(player, action);
            setTimeout(() => this.processBettingRound(), 1000);
        }, 1500);
    }

    getAIAction(player) {
        if (player.chips <= 0) {
            return { type: 'fold' };
        }
        const handStrength = this.evaluateHand(player.cards, this.communityCards).rank / 10; // Normalize rank to 0-1 scale
        const potOdds = this.calculatePotOdds();
        const position = this.getPlayerPosition(player);
        
        const personalities = [
            {type: 'aggressive', prob: player.personality.aggression},
            {type: 'conservative', prob: player.personality.tightness},
            {type: 'bluffer', prob: player.personality.bluffFrequency},
            {type: 'analytical', prob: player.personality.mathematical}
        ];
        const total = personalities.reduce((sum, p) => sum + p.prob, 0);
        if (total === 0) return { type: 'fold' };
        const rand = Math.random() * total;
        let cumulative = 0;
        let selected = 'aggressive';
        for (let p of personalities) {
            cumulative += p.prob;
            if (rand < cumulative) {
                selected = p.type;
                break;
            }
        }
        switch (selected) {
            case 'aggressive':
                return this.getAggressiveAction(player, handStrength, potOdds, position, this.gamePhase);
            case 'conservative':
                return this.getConservativeAction(player, handStrength, potOdds, position, this.gamePhase);
            case 'bluffer':
                return this.getBlufferAction(player, handStrength, potOdds, position, this.gamePhase);
            case 'analytical':
                return this.getAnalyticalAction(player, handStrength, potOdds, position, this.gamePhase);
            default:
                return { type: 'fold' };
        }
    }

    getAggressiveAction(player, handStrength, potOdds, position, gamePhase) {
        const callAmount = this.currentBet - player.bet;
        let phaseMultiplier;
        switch (gamePhase) {
            case 'preflop': phaseMultiplier = 0.8; break;
            case 'flop': phaseMultiplier = 1.0; break;
            case 'turn': phaseMultiplier = 1.2; break;
            case 'river': phaseMultiplier = 1.4; break;
            default: phaseMultiplier = 1.0;
        }
        
        if (callAmount > player.chips) {
            if (handStrength >= 0.3) {
                return { type: 'call' };
            } else {
                return { type: 'fold' };
            }
        }
        
        if (handStrength >= 0.5) {
            const raiseFactor = 0.4 + handStrength * 0.6;
            const raiseAmount = Math.floor(this.pot * raiseFactor * phaseMultiplier);
            const maxRaise = player.chips - callAmount;
            if (maxRaise > 0 && Math.random() < 0.8 + (handStrength - 0.5) * 0.4) {
                return { type: 'raise', amount: Math.min(raiseAmount, maxRaise) };
            }
            return { type: 'call' };
        } else if (handStrength >= 0.25) {
            if (Math.random() < 0.6) {
                const raiseAmount = Math.floor(this.currentBet * (1.5 + Math.random() * 0.5));
                const maxRaise = player.chips - callAmount;
                if (maxRaise > 0) {
                    return { type: 'raise', amount: Math.min(raiseAmount, maxRaise) };
                }
            } else if (callAmount <= player.chips * 0.15) {
                return { type: 'call' };
            } else {
                return callAmount === 0 ? { type: 'check' } : { type: 'fold' };
            }
        } else if (Math.random() < player.personality.bluffFrequency * 1.2) {
            const bluffAmount = Math.floor(this.pot * (0.25 + Math.random() * 0.35));
            const maxRaise = player.chips - callAmount;
            if (maxRaise > 0) {
                return { type: 'raise', amount: Math.min(bluffAmount, maxRaise) };
            }
        }
        
        if (callAmount === 0 || (callAmount <= this.bigBlind * 2 && handStrength >= 0.15)) {
            return callAmount === 0 ? { type: 'check' } : { type: 'call' };
        }
        return { type: 'fold' };
    }

    getPhaseMultiplier() {
        // Adjust betting based on game phase
        switch (this.gamePhase) {
            case 'preflop': return 0.8;
            case 'flop': return 1.0;
            case 'turn': return 1.2;
            case 'river': return 1.4;
            default: return 1.0;
        }
    }

    getConservativeAction(player, handStrength, potOdds, position, gamePhase) {
        const callAmount = this.currentBet - player.bet;
        
        if (callAmount > player.chips) {
            if (handStrength >= 0.5) {
                return { type: 'call' };
            } else {
                return { type: 'fold' };
            }
        }
        
        let phaseMultiplier;
        switch (gamePhase) {
            case 'preflop': phaseMultiplier = 0.8; break;
            case 'flop': phaseMultiplier = 1.0; break;
            case 'turn': phaseMultiplier = 1.2; break;
            case 'river': phaseMultiplier = 1.4; break;
            default: phaseMultiplier = 1.0;
        }
        
        if (handStrength >= 0.7) {
            const raiseAmount = Math.floor(this.pot * (0.2 + handStrength * 0.1) * phaseMultiplier);
            const maxRaise = player.chips - callAmount;
            if (maxRaise > 0 && Math.random() < 0.4 + (handStrength - 0.7) * 0.5) {
                return { type: 'raise', amount: Math.min(raiseAmount, maxRaise) };
            }
            return { type: 'call' };
        } else if (handStrength >= 0.4) {
            if (callAmount <= player.chips * 0.1 && Math.random() < 0.6) {
                return { type: 'call' };
            } else if (callAmount === 0) {
                return { type: 'check' };
            } else {
                return { type: 'fold' };
            }
        } else if (handStrength >= 0.2 && potOdds > 4 && callAmount <= this.bigBlind * 1.5) {
            return { type: 'call' };
        } else if (callAmount === 0) {
            return { type: 'check' };
        }
        return { type: 'fold' };
    }

    getBlufferAction(player, handStrength, potOdds, position, gamePhase) {
        const callAmount = this.currentBet - player.bet;
        let phaseMultiplier;
        switch (gamePhase) {
            case 'preflop': phaseMultiplier = 0.8; break;
            case 'flop': phaseMultiplier = 1.0; break;
            case 'turn': phaseMultiplier = 1.2; break;
            case 'river': phaseMultiplier = 1.4; break;
            default: phaseMultiplier = 1.0;
        }
        const activePlayers = this.players.filter(p => !p.folded).length;
        const unpredictability = Math.random();
        
        if (callAmount > player.chips) {
            if ((handStrength >= 0.4 && unpredictability < 0.7) || unpredictability < 0.3) {
                return { type: 'call' };
            } else {
                return { type: 'fold' };
            }
        }
        
        if (unpredictability < 0.1 && handStrength >= 0.6) {
            return { type: 'fold' }; // Unpredictable fold on strong hand
        } else if (handStrength >= 0.6) {
            if (unpredictability < 0.5) {
                return { type: 'call' }; // Sometimes slowplay
            } else {
                const raiseAmount = Math.floor(this.pot * (0.2 + unpredictability * 0.4) * phaseMultiplier);
                const maxRaise = player.chips - callAmount;
                if (maxRaise > 0) {
                    return { type: 'raise', amount: Math.min(raiseAmount, maxRaise) };
                }
            }
        } else if (handStrength < 0.3 && unpredictability < player.personality.bluffFrequency * 1.5 && activePlayers <= 3) {
            const bluffSize = Math.random() < 0.5 ? 'small' : (Math.random() < 0.7 ? 'medium' : 'large');
            let raiseAmount = Math.floor(this.pot * (bluffSize === 'small' ? 0.2 : bluffSize === 'medium' ? 0.4 : 0.6));
            const maxRaise = player.chips - callAmount;
            if (maxRaise > 0) {
                return { type: 'raise', amount: Math.min(raiseAmount, maxRaise) };
            }
        } else if (handStrength >= 0.3) {
            if (unpredictability < 0.4) {
                return callAmount === 0 ? { type: 'check' } : { type: 'fold' }; // Unpredictable fold on decent hand
            } else if (callAmount <= player.chips * 0.12) {
                return { type: 'call' };
            }
        }
        
        if (callAmount === 0) {
            return Math.random() < 0.2 ? { type: 'raise', amount: Math.min(Math.floor(this.pot * 0.2), player.chips) } : { type: 'check' };
        } else if (callAmount <= this.bigBlind * 1.5 && unpredictability < 0.6) {
            return { type: 'call' };
        }
        return { type: 'fold' };
    }

    getAnalyticalAction(player, handStrength, potOdds, position, gamePhase) {
        const callAmount = this.currentBet - player.bet;
        const expectedValue = this.calculateExpectedValue(player, handStrength, potOdds);
        const activePlayers = this.players.filter(p => !p.folded).length;
        let phaseMultiplier;
        switch (gamePhase) {
            case 'preflop': phaseMultiplier = 0.8; break;
            case 'flop': phaseMultiplier = 1.0; break;
            case 'turn': phaseMultiplier = 1.2; break;
            case 'river': phaseMultiplier = 1.4; break;
            default: phaseMultiplier = 1.0;
        }
        const avgOpponentChips = this.players.filter(p => p !== player && !p.folded).reduce((sum, p) => sum + p.chips, 0) / (activePlayers - 1 || 1);
        const stackToPotRatio = player.chips / this.pot;
        
        if (callAmount > player.chips) {
            if (expectedValue > 0.7 || handStrength >= 0.45) {
                return { type: 'call' };
            } else {
                return { type: 'fold' };
            }
        }
        
        if (handStrength >= 0.65 && expectedValue > 1.2) {
            const optimalRaise = Math.floor(this.pot * (0.3 + handStrength * 0.3) * phaseMultiplier * Math.min(1, stackToPotRatio));
            const maxRaise = player.chips - callAmount;
            if (maxRaise > 0 && optimalRaise > this.bigBlind) {
                return { type: 'raise', amount: Math.min(optimalRaise, maxRaise, avgOpponentChips * 0.5) };
            }
            return { type: 'call' };
        } else if (expectedValue > 1.0 && handStrength >= 0.4) {
            const raiseAmount = Math.floor(this.pot * 0.35 * phaseMultiplier);
            const maxRaise = player.chips - callAmount;
            if (maxRaise > 0 && raiseAmount < avgOpponentChips * 0.3) {
                return { type: 'raise', amount: Math.min(raiseAmount, maxRaise) };
            }
            return { type: 'call' };
        } else if (expectedValue > 0.85 && potOdds > 2.8 && callAmount <= player.chips * 0.15) {
            return { type: 'call' };
        } else if (handStrength >= 0.3 && potOdds > 3.5 && callAmount <= this.bigBlind * 2.5) {
            return { type: 'call' };
        } else if (callAmount === 0 && handStrength >= 0.2) {
            return { type: 'check' };
        } else if (Math.random() < player.personality.bluffFrequency * 0.8 && activePlayers <= 2 && this.gamePhase === 'river' && stackToPotRatio > 1) {
            const bluffAmount = Math.floor(this.pot * 0.45 * Math.min(1, player.chips / avgOpponentChips));
            const maxRaise = player.chips - callAmount;
            if (maxRaise > 0) {
                return { type: 'raise', amount: Math.min(bluffAmount, maxRaise) };
            }
        }
        return callAmount === 0 ? { type: 'check' } : { type: 'fold' };
    }

    calculateExpectedValue(player, handStrength, potOdds) {
        // Simplified EV calculation
        const winProbability = handStrength;
        const potSize = this.pot;
        const callAmount = this.currentBet - player.bet;
        
        if (callAmount === 0) return 1;
        
        const expectedWin = winProbability * potSize;
        const expectedLoss = (1 - winProbability) * callAmount;
        
        return expectedWin / (expectedWin + expectedLoss);
    }

    executeAIAction(player, action) {
        // Mark that this player has acted in this round
        player.hasActed = true;
        
        switch (action.type) {
            case 'fold':
                player.folded = true;
                this.updatePlayerStatus(player, 'Folded');
                break;
            case 'check':
                this.updatePlayerStatus(player, 'Checked');
                break;
            case 'call':
                const callAmount = this.currentBet - player.bet;
                const actualCall = Math.min(callAmount, player.chips);
                player.bet += actualCall;
                player.chips -= actualCall;
                this.pot += actualCall;
                if (player.chips === 0) {
                    player.allIn = true;
                    // If AI goes all-in with a call that creates a new higher bet, reset hasActed for others
                    if (player.bet > this.currentBet) {
                        this.currentBet = player.bet;
                        this.players.forEach(p => {
                            if (p !== player && !p.folded && !p.allIn) {
                                p.hasActed = false;
                            }
                        });
                    }
                    this.updatePlayerStatus(player, `All In ($${player.bet})`);
                } else {
                    this.updatePlayerStatus(player, `Called $${actualCall}`);
                }
                break;
            case 'raise':
                let desiredIncrement = action.amount;
                if (desiredIncrement < this.minRaiseIncrement && player.chips > (this.currentBet - player.bet)) {
                    desiredIncrement = this.minRaiseIncrement;
                }
                const totalBet = this.currentBet + desiredIncrement;
                const raiseAmount = Math.min(totalBet - player.bet, player.chips);
                const previousBet = this.currentBet;
                player.bet += raiseAmount;
                player.chips -= raiseAmount;
                this.pot += raiseAmount;
                this.currentBet = player.bet;

                if (player.chips > 0 && (this.currentBet - previousBet) >= this.minRaiseIncrement) {
                    this.minRaiseIncrement = this.currentBet - previousBet;
                }
                
                // Reset hasActed for all other players since there's a new bet to match
                this.players.forEach(p => {
                    if (p !== player && !p.folded && !p.allIn) {
                        p.hasActed = false;
                    }
                });
                
                if (player.chips === 0) {
                    player.allIn = true;
                    this.updatePlayerStatus(player, `All In ($${player.bet})`);
                } else {
                    this.updatePlayerStatus(player, `Raised to $${player.bet}`);
                }
                break;
        }
        
        this.animateChips(player);
        this.updateUI(); // Immediate update after AI action
    }

    playerAction(action) {
        const player = this.players[0]; // Human player is always index 0
        
        // Mark that this player has acted in this round
        player.hasActed = true;
        
        switch (action) {
            case 'fold':
                player.folded = true;
                this.updatePlayerStatus(player, 'Folded');
                break;
            case 'check':
                if (this.currentBet === player.bet) {
                    this.updatePlayerStatus(player, 'Checked');
                }
                break;
            case 'call': {
                const callAmount = this.currentBet - player.bet;
                if (callAmount > player.chips) {
                    // Can't fully call, but must be offered all-in (never forced to fold)
                    if (player.chips > 0) {
                        // Go all-in as a call to remaining chips
                        const allInAmount = player.chips;
                        player.bet += allInAmount;
                        player.chips = 0;
                        this.pot += allInAmount;
                        player.allIn = true;
                        if (player.bet > this.currentBet) {
                            this.currentBet = player.bet;
                            this.players.forEach(p => {
                                if (p !== player && !p.folded && !p.allIn) {
                                    p.hasActed = false;
                                }
                            });
                        }
                        this.updatePlayerStatus(player, `All In ($${player.bet})`);
                        this.disablePlayerControls();
                        setTimeout(() => this.processBettingRound(), 100);
                        return;
                    } else {
                        // No chips left, but should NOT auto-fold; should be treated as all-in with 0 chips (already at all-in)
                        player.allIn = true;
                        this.updatePlayerStatus(player, `All In ($${player.bet})`);
                        this.disablePlayerControls();
                        setTimeout(() => this.processBettingRound(), 100);
                        return;
                    }
                } else if (callAmount > 0) {
                    player.bet += callAmount;
                    player.chips -= callAmount;
                    this.pot += callAmount;
                    this.updatePlayerStatus(player, `Called $${callAmount}`);
                    if (player.chips === 0) {
                        player.allIn = true;
                        this.updatePlayerStatus(player, `All In ($${player.bet})`);
                    }
                }
                break;
            }
            case 'allin':
                // All-in is treated as a raise to all chips
                const allInAmount = player.chips;
                player.bet += allInAmount;
                player.chips = 0;
                this.pot += allInAmount;
                player.allIn = true;

                if (player.bet > this.currentBet) {
                    this.currentBet = player.bet;
                    // Reset hasActed for all other active players
                    this.players.forEach(p => {
                        if (p !== player && !p.folded && !p.allIn) {
                            p.hasActed = false;
                        }
                    });
                }
                this.updatePlayerStatus(player, `All In ($${player.bet})`);
                // After human all-in, immediately continue betting round so all AIs act
                this.disablePlayerControls();
                setTimeout(() => this.processBettingRound(), 100);
                return;
        }
        
        this.animateChips(player);
        this.disablePlayerControls();
        this.updateUI(); // Immediate update after player action
        setTimeout(() => this.processBettingRound(), 1000);
    }

    showRaiseControls() {
        const raiseControls = document.getElementById('raiseControls');
        const slider = document.getElementById('raiseSlider');
        const player = this.players[0];
        
        const minTotalBet = this.currentBet + this.minRaiseIncrement;
        const maxTotalBet = player.bet + player.chips; // all-in upper bound

        slider.min = Math.min(minTotalBet, maxTotalBet);
        slider.max = maxTotalBet;
        slider.value = slider.min;
        
        this.updateRaiseAmount();
        raiseControls.style.display = 'block';
    }

    hideRaiseControls() {
        document.getElementById('raiseControls').style.display = 'none';
    }

    updateRaiseAmount() {
        const slider = document.getElementById('raiseSlider');
        const amountDisplay = document.getElementById('raiseAmount');
        amountDisplay.textContent = `$${slider.value}`;
    }

    confirmRaise() {
        const slider = document.getElementById('raiseSlider');
        const raiseAmount = parseInt(slider.value);
        const player = this.players[0];
        
        // Mark that this player has acted in this round
        player.hasActed = true;
        
        const previousBet = this.currentBet;
        let desiredTotal = raiseAmount; // supplied by slider (absolute total)
        let desiredIncrement = desiredTotal - previousBet;

        // Enforce minimum raise increment unless this is an all-in below requirement
        if (player.chips !== desiredTotal - player.bet && desiredIncrement < this.minRaiseIncrement) {
            desiredIncrement = this.minRaiseIncrement;
            desiredTotal = previousBet + desiredIncrement;
        }
        // Cap by available chips (all-in)
        desiredTotal = Math.min(desiredTotal, player.bet + player.chips);
        const actualRaise = desiredTotal - player.bet;

        player.bet += actualRaise;
        player.chips -= actualRaise;
        this.pot += actualRaise;
        this.currentBet = player.bet;

        // Update minimum increment tracker if raise qualifies
        if (player.chips > 0 && (this.currentBet - previousBet) >= this.minRaiseIncrement) {
            this.minRaiseIncrement = this.currentBet - previousBet;
        }
        
        // Reset hasActed for all other players since there's a new bet to match
        this.players.forEach(p => {
            if (p !== player && !p.folded && !p.allIn) {
                p.hasActed = false;
            }
        });
        
        if (player.chips === 0) {
            player.allIn = true;
            if (player.bet > this.currentBet) {
                this.currentBet = player.bet;
                // Reset hasActed for all other active players
                this.players.forEach(p => {
                    if (p !== player && !p.folded && !p.allIn) {
                        p.hasActed = false;
                    }
                });
            }
            this.updatePlayerStatus(player, `All In ($${player.bet})`);
        } else {
            this.updatePlayerStatus(player, `Raised to $${player.bet}`);
        }
        
        this.hideRaiseControls();
        this.animateChips(player);
        this.disablePlayerControls();
        this.updateUI(); // Immediate update after raise
        setTimeout(() => this.processBettingRound(), 1000);
    }

    nextPlayer() {
        const start = this.currentPlayer;
        do {
            const player = this.players[this.currentPlayer];
            const needsToAct = !player.folded && !player.allIn && player.chips > 0 && (player.bet < this.currentBet || !player.hasActed);
            if (needsToAct) {
                return true;
            }
            this.currentPlayer = (this.currentPlayer + 1) % this.players.length;
        } while (this.currentPlayer !== start);
        return false;
    }

    isRoundComplete() {
        // Players who can still act (not folded, not all-in, chips > 0)
        const canAct = this.players.filter(p => !p.folded && !p.allIn && p.chips > 0);
        if (canAct.length < 1) return true;

        // Highest bet among all players (including all-in players)
        const maxBet = this.currentBet;

        // Check if all players who can act have either:
        // 1. Matched the highest bet AND have acted, OR
        // 2. Cannot afford to match the bet (should have been handled as all-in or fold)
        return canAct.every(p => {
            const hasMatchedBet = p.bet === maxBet;
            const hasActed = p.hasActed === true;
            const canAffordCall = p.chips >= (maxBet - p.bet);
            
            // Player must have acted and either matched the bet or gone all-in
            return hasActed && (hasMatchedBet || !canAffordCall);
        });
    }

    nextPhase() {
        // Reset betting round - clear individual bets but keep pot total
        this.players.forEach(player => {
            player.totalBet = (player.totalBet || 0) + player.bet;
            player.bet = 0;
            player.hasActed = false; // Reset action tracking for new phase
            if (!player.folded) {
                this.updatePlayerStatus(player, '');
            }
        });
        this.currentBet = 0;
        // Reset minimum raise increment for new betting phase
        this.minRaiseIncrement = this.bigBlind;
        
        // Check if there are any players who can still bet
        const activePlayers = this.players.filter(p => !p.folded && !p.allIn && p.chips > 0).length;
        if (activePlayers <= 1) {
        // No one can bet meaningfully - deal remaining cards and go to showdown
            while (this.gamePhase !== 'showdown' && this.gamePhase !== 'river') {
                switch (this.gamePhase) {
                    case 'preflop':
                        this.gamePhase = 'flop';
                        this.dealFlop();
                        break;
                    case 'flop':
                        this.gamePhase = 'turn';
                        this.dealTurn();
                        break;
                    case 'turn':
                        this.gamePhase = 'river';
                        this.dealRiver();
                        break;
                }
            }
            this.gamePhase = 'showdown';
            this.showdown();
            return;
        }
        
        // Find first active player after dealer for new betting round
        this.currentPlayer = (this.dealerPosition + 1) % this.players.length;
        while (this.players[this.currentPlayer].folded || this.players[this.currentPlayer].allIn) {
            this.currentPlayer = (this.currentPlayer + 1) % this.players.length;
        }
        
        switch (this.gamePhase) {
            case 'preflop':
                this.gamePhase = 'flop';
                this.dealFlop();
                break;
            case 'flop':
                this.gamePhase = 'turn';
                this.dealTurn();
                break;
            case 'turn':
                this.gamePhase = 'river';
                this.dealRiver();
                break;
            case 'river':
                this.gamePhase = 'showdown';
                this.showdown();
                return;
        }
        
        // Update UI to show current pot after phase transition
        this.updateUI();
        
        setTimeout(() => this.processBettingRound(), 1500);
    }

    dealFlop() {
        this.dealCard(); // Burn card
        for (let i = 0; i < 3; i++) {
            const card = this.dealCard();
            this.communityCards.push(card);
            setTimeout(() => {
                this.animateCommunityCard(i, card);
            }, i * 300);
        }
        this.updateGameStatus('Flop dealt!');
        this.updateUI(); // Update after flop
    }

    dealTurn() {
        this.dealCard(); // Burn card
        const card = this.dealCard();
        this.communityCards.push(card);
        this.animateCommunityCard(3, card);
        this.updateGameStatus('Turn dealt!');
        this.updateUI(); // Update after turn
    }

    dealRiver() {
        this.dealCard(); // Burn card
        const card = this.dealCard();
        this.communityCards.push(card);
        this.animateCommunityCard(4, card);
        this.updateGameStatus('River dealt!');
        this.updateUI(); // Update after river
    }

    animateCommunityCard(index, card) {
        const cardSlots = ['flop1', 'flop2', 'flop3', 'turn', 'river'];
        const cardElement = document.getElementById(cardSlots[index]);
        
        cardElement.innerHTML = `<div class="card dealing">${card.rank}${card.suit}</div>`;
        cardElement.classList.add('has-card');
        
        const cardDiv = cardElement.querySelector('.card');
        cardDiv.style.color = card.color;
        
        setTimeout(() => cardDiv.classList.remove('dealing'), 800);
    }

    showdown() {
        const activePlayers = this.players.filter(p => !p.folded);
        // If only one active player remains and they are an AI, do not reveal cards
        if (activePlayers.length === 1 && !activePlayers[0].isHuman) {
            this.determineWinnerAndDistributePot();
            this.showNewGameButton();
            // Do not revealAllCards();
            return;
        }
        this.determineWinnerAndDistributePot();
        this.revealAllCards();
        this.showNewGameButton();
    }

    determineWinnerAndDistributePot() {
        // 1. Before showdown, fold any player who has not matched the final bet and is not all-in
        const maxBet = Math.max(...this.players.map(p => (p.folded ? 0 : (p.totalBet || 0) + (p.bet || 0))));
        this.players.forEach(p => {
            const contributed = (p.totalBet || 0) + (p.bet || 0);
            if (!p.folded && !p.allIn && contributed < maxBet) {
                p.folded = true;
                this.updatePlayerStatus(p, 'Folded');
            }
        });

        // 2. Only non-folded players go to showdown
        const involvedPlayers = this.players.filter(p => !p.folded);
        if (involvedPlayers.length === 1) {
            const winner = involvedPlayers[0];
            winner.chips += this.pot;
            this.updateGameStatus(`${winner.name} wins $${this.pot}.`);
            this.updateUI();
            this.checkGameOutcome();
            return;
        }

        // 3. Evaluate hands for all involved players
        involvedPlayers.forEach(p => {
            p.hand = this.evaluateHand(p.cards, this.communityCards);
        });

        // 4. Build side pots at each unique all-in (or bet) level
        // Gather all unique bet levels (all-in and non-all-in)
        let betLevels = involvedPlayers.map(p => p.totalBet);
        betLevels = Array.from(new Set(betLevels)).sort((a, b) => a - b);
        let pots = [];
        let lastLevel = 0;
        let remainingPlayers = [...involvedPlayers];
        let totalPot = this.pot;

        for (let i = 0; i < betLevels.length; i++) {
            const level = betLevels[i];
            // Only include players who contributed at least this much
            const potPlayers = remainingPlayers.filter(p => p.totalBet >= level);
            const potAmount = potPlayers.length * (level - lastLevel);
            if (potAmount > 0) {
                pots.push({
                    amount: potAmount,
                    eligiblePlayers: [...potPlayers],
                    level: level
                });
            }
            lastLevel = level;
            // Remove players who are all-in at this level for next pots
            remainingPlayers = remainingPlayers.filter(p => p.totalBet > level);
        }

        // If there's any rounding error, add remainder to the last pot
        let potsTotal = pots.reduce((sum, pot) => sum + pot.amount, 0);
        if (pots.length && potsTotal < totalPot) {
            pots[pots.length - 1].amount += (totalPot - potsTotal);
        }

        // 5. Award each pot to the best eligible hand(s)
        let finalMessage = '';
        pots.forEach((pot, index) => {
            pot.eligiblePlayers.sort((a, b) => this.compareHands(a.hand, b.hand));
            const bestHand = pot.eligiblePlayers[0].hand;
            const winners = pot.eligiblePlayers.filter(p => this.compareHands(p.hand, bestHand) === 0);
            const prize = Math.floor(pot.amount / winners.length);

            const winnerNames = winners.map(w => w.name).join(', ');
            const potName = index === 0 ? 'Main Pot' : `Side Pot ${index}`;
            finalMessage += `${winnerNames} wins the ${potName} ($${pot.amount}) with ${bestHand.name}. `;

            winners.forEach(winner => {
                winner.chips += prize;
                this.animateWin(winner);
            });
        });

        this.updateGameStatus(finalMessage);
        this.updateUI();
        this.checkGameOutcome();
    }

    revealAllCards() {
        this.players.forEach(player => {
            if (player.folded) {
                const cardElements = player.element.querySelectorAll('.card');
                cardElements.forEach(cardEl => {
                    cardEl.innerHTML = '';
                    cardEl.classList.add('card-back', 'folded-card');
                });
            } else if (!player.isHuman) {
                const cardElements = player.element.querySelectorAll('.card');
                cardElements.forEach((cardEl, index) => {
                    if (player.cards[index]) {
                        setTimeout(() => {
                            cardEl.classList.add('flipping');
                            setTimeout(() => {
                                this.displayCard(cardEl, player.cards[index]);
                                cardEl.classList.remove('flipping');
                            }, 250);
                        }, index * 150);
                    }
                });
            }
        });
    }

    evaluateHand(playerCards, communityCards) {
        const allCards = [...playerCards, ...communityCards];
        if (allCards.length < 5) return this.estimateStartingHand(playerCards);

        const cardCombinations = this.getCombinations(allCards, 5);
        let bestHand = { rank: -1, name: 'High Card', values: [] };

        for (const hand of cardCombinations) {
            const evaluatedHand = this.evaluate5CardHand(hand);
            if (evaluatedHand.rank > bestHand.rank) {
                bestHand = evaluatedHand;
            } else if (evaluatedHand.rank === bestHand.rank) {
                // Tie-breaker logic
                for (let i = 0; i < evaluatedHand.values.length; i++) {
                    if (evaluatedHand.values[i] > bestHand.values[i]) {
                        bestHand = evaluatedHand;
                        break;
                    } else if (evaluatedHand.values[i] < bestHand.values[i]) {
                        break;
                    }
                }
            }
        }
        return bestHand;
    }

    evaluate5CardHand(hand) {
        const values = hand.map(c => this.getCardValue(c.rank)).sort((a, b) => b - a);
        const suits = hand.map(c => c.suit);

        const isFlush = suits.every(s => s === suits[0]);
        const isStraight = this.isStraight(values);

        if (isStraight && isFlush) {
            if (values[0] === 14 && values[4] === 10) return { rank: 9, name: 'Royal Flush', values };
            return { rank: 8, name: 'Straight Flush', values };
        }

        const counts = values.reduce((acc, val) => { acc[val] = (acc[val] || 0) + 1; return acc; }, {});
        const valueCounts = Object.values(counts).sort((a, b) => b - a);
        const primaryRanks = Object.keys(counts).map(Number).sort((a, b) => counts[b] - counts[a] || b - a);

        if (valueCounts[0] === 4) {
            return { rank: 7, name: 'Four of a Kind', values: primaryRanks };
        }

        if (valueCounts[0] === 3 && valueCounts[1] === 2) {
            return { rank: 6, name: 'Full House', values: primaryRanks };
        }

        if (isFlush) {
            return { rank: 5, name: 'Flush', values };
        }

        if (isStraight) {
            return { rank: 4, name: 'Straight', values };
        }

        if (valueCounts[0] === 3) {
            return { rank: 3, name: 'Three of a Kind', values: primaryRanks };
        }

        if (valueCounts[0] === 2 && valueCounts[1] === 2) {
            return { rank: 2, name: 'Two Pair', values: primaryRanks };
        }

        if (valueCounts[0] === 2) {
            return { rank: 1, name: 'One Pair', values: primaryRanks };
        }

        return { rank: 0, name: 'High Card', values: primaryRanks };
    }

    isStraight(values) {
        // Handle Ace-low straight (A, 2, 3, 4, 5)
        const isAceLow = values.length === 5 && values[0] === 14 && values[1] === 5 && values[2] === 4 && values[3] === 3 && values[4] === 2;
        if (isAceLow) return true;

        for (let i = 0; i < values.length - 1; i++) {
            if (values[i] !== values[i+1] + 1) {
                return false;
            }
        }
        return true;
    }

    getCardValue(rank) {
        if (rank === 'A') return 14;
        if (rank === 'K') return 13;
        if (rank === 'Q') return 12;
        if (rank === 'J') return 11;
        return parseInt(rank, 10);
    }

    getCombinations(array, size) {
        const result = [];
        function combination(startIndex, currentCombo) {
            if (currentCombo.length === size) {
                result.push([...currentCombo]);
                return;
            }
            if (startIndex === array.length) return;
            currentCombo.push(array[startIndex]);
            combination(startIndex + 1, currentCombo);
            currentCombo.pop();
            combination(startIndex + 1, currentCombo);
        }
        combination(0, []);
        return result;
    }

    compareHands(handA, handB) {
        if (handA.rank !== handB.rank) {
            return handB.rank - handA.rank;
        }
        for (let i = 0; i < handA.values.length; i++) {
            if (handA.values[i] !== handB.values[i]) {
                return handB.values[i] - handA.values[i];
            }
        }
        return 0; // Hands are identical
    }

    calculatePotOdds() {
        const callAmount = this.currentBet - this.players[0].bet;
        return callAmount > 0 ? this.pot / callAmount : 0;
    }

    getPlayerPosition(player) {
        const playerIndex = this.players.indexOf(player);
        const dealerIndex = this.dealerPosition;
        return (playerIndex - dealerIndex + this.players.length) % this.players.length;
    }

    enablePlayerControls() {
        const player = this.players[0];
        const callAmount = this.currentBet - player.bet;
        
        document.getElementById('foldBtn').disabled = false;
        document.getElementById('checkBtn').disabled = callAmount > 0;
        document.getElementById('callBtn').disabled = callAmount === 0 || player.chips < callAmount;
        document.getElementById('raiseBtn').disabled = player.chips <= callAmount;
        document.getElementById('allInBtn').disabled = player.chips === 0;
        
        document.getElementById('callBtn').textContent = callAmount > 0 ? `Call $${callAmount}` : 'Call';
        
        this.updateHandStrength();
    }

    disablePlayerControls() {
        document.getElementById('foldBtn').disabled = true;
        document.getElementById('checkBtn').disabled = true;
        document.getElementById('callBtn').disabled = true;
        document.getElementById('raiseBtn').disabled = true;
        document.getElementById('allInBtn').disabled = true;
    }

    updateHandStrength() {
        const player = this.players[0];
        if (player.cards.length === 2) {
            const hand = this.evaluateHand(player.cards, this.communityCards);
            document.getElementById('strengthValue').textContent = hand.name;
        }
    }

    updatePlayerStatus(player, status) {
        const statusElement = player.element.querySelector('.player-status');
        if (statusElement) {
            statusElement.textContent = status;
            statusElement.className = 'player-status';
            if (status.includes('Folded')) statusElement.classList.add('folded');
            else if (status.includes('Called')) statusElement.classList.add('called');
            else if (status.includes('Raised')) statusElement.classList.add('raised');
            else if (status.includes('All In')) statusElement.classList.add('all-in');
        }
    }

    animateChips(player) {
        const chipsElement = player.element.querySelector('.player-chips');
        if (chipsElement) {
            chipsElement.classList.add('chip-animation');
            setTimeout(() => chipsElement.classList.remove('chip-animation'), 500);
        }
    }

    animateWin(player) {
        player.element.classList.add('winner');
        setTimeout(() => player.element.classList.remove('winner'), 3000);
    }

    // ===== Special Effects =====
    showFireworks() {
        const container = document.getElementById('fireworksContainer');
        if (!container) return;
        container.style.display = 'block';
        for (let i = 0; i < 15; i++) {
            this.launchFirework(container);
        }
        setTimeout(() => {
            container.style.display = 'none';
            container.innerHTML = '';
        }, 3000);
    }

    launchFirework(container) {
        const firework = document.createElement('div');
        firework.className = 'firework';
        firework.style.left = Math.random() * 100 + '%';
        firework.style.top = 20 + Math.random() * 40 + '%';
        const color = `hsl(${Math.floor(Math.random() * 360)}, 100%, 50%)`;
        firework.style.backgroundColor = color;
        container.appendChild(firework);
        for (let i = 0; i < 20; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            p.style.left = '0';
            p.style.top = '0';
            const angle = Math.random() * Math.PI * 2;
            const distance = 30 + Math.random() * 20;
            p.style.setProperty('--tx', Math.cos(angle) * distance + 'px');
            p.style.setProperty('--ty', Math.sin(angle) * distance + 'px');
            p.style.backgroundColor = color;
            firework.appendChild(p);
        }
        setTimeout(() => firework.remove(), 1000);
    }

    showStorm() {
        const container = document.getElementById('stormContainer');
        if (!container) return;
        container.style.display = 'block';
        // Clouds
        for (let i = 0; i < 5; i++) {
            const cloud = document.createElement('div');
            cloud.className = 'cloud';
            cloud.style.top = Math.random() * 30 + '%';
            cloud.style.animationDuration = 10 + Math.random() * 10 + 's';
            container.appendChild(cloud);
        }
        // Lightning interval
        this.lightningInterval = setInterval(() => this.summonLightning(container), 800);
        setTimeout(() => this.hideEffects(), 5000);
    }

    summonLightning(container) {
        const bolt = document.createElement('div');
        bolt.className = 'lightning';
        bolt.style.left = Math.random() * 100 + '%';
        bolt.style.top = '40%';
        bolt.style.setProperty('--angle', (-10 + Math.random() * 20) + 'deg');
        bolt.style.setProperty('--scale', (0.8 + Math.random() * 0.4).toString());
        container.appendChild(bolt);
        setTimeout(() => bolt.remove(), 500);
    }

    hideEffects() {
        const fire = document.getElementById('fireworksContainer');
        if (fire) { fire.style.display = 'none'; fire.innerHTML = ''; }
        const storm = document.getElementById('stormContainer');
        if (storm) { storm.style.display = 'none'; storm.innerHTML = ''; }
        if (this.lightningInterval) {
            clearInterval(this.lightningInterval);
            this.lightningInterval = null;
        }
    }

    updateUI() {
        // Update pot
        document.getElementById('potAmount').textContent = `$${this.pot}`;
        
        // Update player chips
        this.players.forEach(player => {
            const chipsElement = player.element.querySelector('.player-chips');
            if (chipsElement) {
                chipsElement.textContent = `$${player.chips}`;
            }
        });
        
        // Update dealer button position
        this.updateDealerButton();
        this.updateBlindButtons();
        

    }

    updateBlindButtons() {
        const smallBlindIndex = (this.dealerPosition + 1) % this.players.length;
        const bigBlindIndex = (this.dealerPosition + 2) % this.players.length;
        
        const smallBlindPlayer = this.players[smallBlindIndex];
        const bigBlindPlayer = this.players[bigBlindIndex];
        
        const smallBlindButton = document.getElementById('smallBlindButton');
        const bigBlindButton = document.getElementById('bigBlindButton');
        
        if (smallBlindPlayer.chips > 0) {
            const rect = smallBlindPlayer.element.getBoundingClientRect();
            const position = smallBlindPlayer.element.getAttribute('data-position');
            let leftOffset, topOffset;
            
            // Adjust position based on player's table position
            switch (position) {
                case 'left':
                    leftOffset = rect.width + 5;
                    topOffset = rect.height / 2 - 12;
                    break;
                case 'top-left':
                    leftOffset = rect.width / 2;
                    topOffset = rect.height + 5;
                    break;
                case 'top-right':
                    leftOffset = rect.width / 2;
                    topOffset = rect.height + 5;
                    break;
                case 'right':
                    leftOffset = -30;
                    topOffset = rect.height / 2 - 12;
                    break;
                case 'bottom':
                default:
                    leftOffset = rect.width / 2;
                    topOffset = -30;
                    break;
            }
            
            smallBlindButton.style.left = `${rect.left + leftOffset}px`;
            smallBlindButton.style.top = `${rect.top + topOffset}px`;
            smallBlindButton.style.display = 'flex';
        } else {
            smallBlindButton.style.display = 'none';
        }
        
        if (bigBlindPlayer.chips > 0) {
            const rect = bigBlindPlayer.element.getBoundingClientRect();
            const position = bigBlindPlayer.element.getAttribute('data-position');
            let leftOffset, topOffset;
            
            // Adjust position based on player's table position
            switch (position) {
                case 'left':
                    leftOffset = rect.width + 5;
                    topOffset = rect.height / 2 + 12;
                    break;
                case 'top-left':
                    leftOffset = rect.width / 2 + 24;
                    topOffset = rect.height + 5;
                    break;
                case 'top-right':
                    leftOffset = rect.width / 2 - 24;
                    topOffset = rect.height + 5;
                    break;
                case 'right':
                    leftOffset = -30;
                    topOffset = rect.height / 2 + 12;
                    break;
                case 'bottom':
                default:
                    leftOffset = rect.width / 2 + 24;
                    topOffset = -30;
                    break;
            }
            
            bigBlindButton.style.left = `${rect.left + leftOffset}px`;
            bigBlindButton.style.top = `${rect.top + topOffset}px`;
            bigBlindButton.style.display = 'flex';
        } else {
            bigBlindButton.style.display = 'none';
        }
    }

    updateDealerButton() {
        const dealerButton = document.getElementById('dealerButton');
        const dealerPlayer = this.players[this.dealerPosition];
        const playerElement = dealerPlayer.element;

        const rect = playerElement.getBoundingClientRect();
        const position = playerElement.getAttribute('data-position');
        let leftOffset, topOffset;

        switch (position) {
            case 'left':
                leftOffset = rect.width + 5;
                topOffset = rect.height / 2 - 20;
                break;
            case 'top-left':
                leftOffset = rect.width / 2;
                topOffset = rect.height + 5;
                break;
            case 'top-right':
                leftOffset = rect.width / 2;
                topOffset = rect.height + 5;
                break;
            case 'right':
                leftOffset = -30;
                topOffset = rect.height / 2 - 20;
                break;
            case 'bottom':
            default:
                leftOffset = rect.width / 2;
                topOffset = -30;
                break;
        }

        dealerButton.style.left = `${rect.left + leftOffset}px`;
        dealerButton.style.top = `${rect.top + topOffset}px`;
    }

    updateGameStatus(message) {
        document.getElementById('gameStatus').querySelector('.status-text').textContent = message;
    }

    // Show the "New Game" button after a short delay so community-card animations have time to finish
    showNewGameButton(delay = 2000) {
        const container = document.querySelector('.new-game-container');
        if (!container) return;
        // Ensure it is hidden first
        container.style.display = 'none';
        setTimeout(() => {
            container.style.display = 'block';
        }, delay);
    }

    hideNewGameButton() {
        document.querySelector('.new-game-container').style.display = 'none';
    }

    // Centralised end-of-round outcome checks (run only after chips have been redistributed)
    checkGameOutcome() {
        if (this.players[0].chips <= 0 && !this.gameOverShown) {
            this.updateGameStatus('Game Over! You have no chips left.');
            this.showNewGameButton();
            this.showStorm();
            this.gameOverShown = true;
            return;
        }
        if (this.players.slice(1).every(p => p.chips <= 0) && this.players[0].chips > 0 && !this.winShown) {
            this.updateGameStatus('Congratulations! You win the tournament!');
            this.showNewGameButton();
            this.showFireworks();
            this.winShown = true;
        }
    }

    // Estimate pre-flop strength when only two hole cards are available
    estimateStartingHand(cards) {
        const [c1, c2] = cards;
        if (!c1 || !c2) return { rank: -1, name: 'Unknown', values: [] };
        const v1 = this.getCardValue(c1.rank);
        const v2 = this.getCardValue(c2.rank);
        const suited = c1.suit === c2.suit;
        const diff = Math.abs(v1 - v2);
        let name = 'Off-suit Hand';
        if (c1.rank === c2.rank) {
            if (v1 === 14) name = 'Pocket Aces';
            else if (v1 >= 11) name = 'Premium Pocket Pair';
            else if (v1 >= 7) name = 'Strong Pocket Pair';
            else name = 'Pocket Pair';
        } else if (suited && (v1 === 14 || v2 === 14)) {
            name = 'Suited Ace';
        } else if (suited && diff === 1) {
            name = 'Suited Connectors';
        } else if (diff === 1) {
            name = 'Connectors';
        } else if (suited) {
            name = 'Suited Hand';
        }
        const values = [Math.max(v1, v2), Math.min(v1, v2)];
        return { rank: -1, name, values };
    }
}

// Initialize game when page loads
    document.addEventListener('DOMContentLoaded', () => {
    const game = new PokerGame();
    
    // Auto-start first game
    setTimeout(() => {
        game.startNewGame();
    }, 1000);
});


