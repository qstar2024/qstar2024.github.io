#!/usr/bin/env python3
import json
import random
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import os

class TowerBlasterGame:
    def __init__(self):
        self.reset_game()
        
    def reset_game(self):
        """Reset the entire game to initial state"""
        self.N = 50
        self.player_score = 0
        self.rounds_won = 0
        self.start_new_round()
        
    def start_new_round(self):
        """Start a new round with current N value"""
        if self.N <= 25:
            return False  # Game completed
            
        # Initialize brick pile
        self.pile = list(range(1, self.N + 1))
        random.shuffle(self.pile)
        
        # Deal 10 bricks to each player
        self.player_tower = [self.pile.pop() for _ in range(10)]
        self.computer_tower = [self.pile.pop() for _ in range(10)]
        
        # Draw 2 middle bricks
        self.middle_bricks = [self.pile.pop(), self.pile.pop()]
        
        # Game state
        self.current_player = 'player'  # Player goes first
        self.round_over = False
        self.winner = None
        self.computer_strategy = self.choose_computer_strategy()
        self.move_history = []
        self.last_computer_move = None
        
        return True
        
    def choose_computer_strategy(self):
        """Choose computer strategy based on round difficulty"""
        # Harder strategies for later rounds
        if self.N > 45:
            return 'rookie'  # Easy start
        elif self.N > 40:
            return 'random'  # Mixed difficulty
        elif self.N > 30:
            return 'greedy'  # Medium difficulty
        else:
            return 'smart'   # Hard difficulty
            
    def is_tower_sorted(self, tower):
        """Check if tower is sorted in ascending order"""
        return tower == sorted(tower)
        
    def player_move(self, chosen_brick_index, tower_level):
        """Handle player move"""
        if self.current_player != 'player' or self.round_over:
            return False
            
        if chosen_brick_index not in [0, 1] or tower_level not in range(10):
            return False
            
        # Make the swap
        chosen_brick = self.middle_bricks[chosen_brick_index]
        old_brick = self.player_tower[tower_level]
        self.player_tower[tower_level] = chosen_brick
        
        # Replace unchosen brick
        unchosen_index = 1 - chosen_brick_index
        unchosen_brick = self.middle_bricks[unchosen_index]
        self.pile.append(unchosen_brick)
        random.shuffle(self.pile)
        self.middle_bricks[unchosen_index] = self.pile.pop()
            
        # Update middle bricks
        self.middle_bricks[chosen_brick_index] = old_brick
        
        # Record move
        self.move_history.append({
            'player': 'human',
            'chosen_brick': chosen_brick,
            'tower_level': tower_level,
            'old_brick': old_brick
        })
        
        # Check win condition
        if self.is_tower_sorted(self.player_tower):
            self.round_over = True
            self.winner = 'player'
            self.handle_round_end()
        else:
            self.current_player = 'computer'
            
        return True
        
    def skip_turn(self):
        """Skip current player's turn"""
        if self.round_over:
            return False
            
        if self.current_player == 'player':
            self.current_player = 'computer'
        else:
            self.current_player = 'player'
            
        return True
        
    def computer_move(self):
        """Handle computer move with selected strategy"""
        if self.current_player != 'computer' or self.round_over:
            return False
        strategies = ['smart', 'greedy', 'rookie']
        random.shuffle(strategies)
        if self.computer_strategy == 'random':
            self.computer_strategy = strategies.pop()
        if self.computer_strategy == 'smart':
            chosen_index, tower_level = self.smart_computer_move()
        elif self.computer_strategy == 'greedy':
            chosen_index, tower_level = self.greedy_computer_move()
        else:  # rookie
            chosen_index, tower_level = self.rookie_computer_move()
            
        # Store computer move info for animation
        self.last_computer_move = {
            'brick_index': chosen_index,
            'tower_level': tower_level
        }
            
        # Execute the move
        chosen_brick = self.middle_bricks[chosen_index]
        old_brick = self.computer_tower[tower_level]
        self.computer_tower[tower_level] = chosen_brick
        
        # Replace unchosen brick
        unchosen_index = 1 - chosen_index
        unchosen_brick = self.middle_bricks[unchosen_index]
        self.pile.append(unchosen_brick)
        random.shuffle(self.pile)
        self.middle_bricks[unchosen_index] = self.pile.pop()
            
        # Update middle bricks
        self.middle_bricks[chosen_index] = old_brick
        
        # Record move
        self.move_history.append({
            'player': 'computer',
            'chosen_brick': chosen_brick,
            'tower_level': tower_level,
            'old_brick': old_brick
        })
        
        # Check win condition
        if self.is_tower_sorted(self.computer_tower):
            self.round_over = True
            self.winner = 'computer'
            self.handle_round_end()
        else:
            self.current_player = 'player'
            
        return True
        
    def smart_computer_move(self):
        """Smart strategy: minimize disorder in tower"""
        best_score = float('inf')
        best_move = (0, 0)
        
        for brick_idx in [0, 1]:
            brick = self.middle_bricks[brick_idx]
            for level in range(10):
                # Simulate the move
                temp_tower = self.computer_tower.copy()
                temp_tower[level] = brick
                
                # Calculate disorder (sum of out-of-place positions)
                disorder = sum(abs(temp_tower[i] - sorted(temp_tower)[i]) 
                             for i in range(10))
                
                if disorder < best_score:
                    best_score = disorder
                    best_move = (brick_idx, level)
                    
        return best_move
        
    def greedy_computer_move(self):
        """Greedy strategy: always try to place brick in correct position"""
        for brick_idx in [0, 1]:
            brick = self.middle_bricks[brick_idx]
            # Find where this brick should go in sorted order
            temp_tower = self.computer_tower.copy()
            temp_tower.append(brick)
            sorted_tower = sorted(temp_tower)
            target_pos = sorted_tower.index(brick)
            
            if target_pos < 10:  # Valid position
                return (brick_idx, target_pos)
                
        # Fallback to rookie if no good position
        return self.skip_turn() #rookie_computer_move()
        
    def rookie_computer_move(self):
        """Rookie strategy: completely random moves"""
        return (random.randint(0, 1), random.randint(0, 9))
        
    def handle_round_end(self):
        """Handle end of round scoring and progression"""
        if self.winner == 'player':
            # Calculate score
            base_score = 100 - self.N
            bonus_score = min(self.player_tower)  # Top brick bonus
            round_score = base_score + bonus_score
            self.player_score += round_score
            self.rounds_won += 1
            
            # Reduce N for next round
            self.N -= 6
        else:  # Computer wins
            # Game over - reset N
            self.N = 50
            
    def get_game_state(self):
        """Get current game state for frontend"""
        return {
            'N': self.N,
            'player_score': self.player_score,
            'rounds_won': self.rounds_won,
            'player_tower': self.player_tower,
            'computer_tower': self.computer_tower,  # Always include for structure
            'computer_tower_hidden': ['?' for _ in self.computer_tower],
            'computer_tower_revealed': self.computer_tower if self.round_over else None,
            'middle_bricks': self.middle_bricks,
            'current_player': self.current_player,
            'round_over': self.round_over,
            'winner': self.winner,
            'computer_strategy': self.computer_strategy,
            'move_history': self.move_history[-5:],  # Last 5 moves
            'last_computer_move': getattr(self, 'last_computer_move', None),
            'game_completed': self.N <= 25
        }

class GameHandler(BaseHTTPRequestHandler):
    game = TowerBlasterGame()
    
    def do_GET(self):
        parsed_path = urlparse(self.path)
        
        if parsed_path.path == '/tower-blaster':
            self.serve_html()
        elif parsed_path.path == '/api/game-state':
            self.serve_json(self.game.get_game_state())
        elif parsed_path.path == '/api/new-game':
            self.game.reset_game()
            self.serve_json({'success': True, 'state': self.game.get_game_state()})
        elif parsed_path.path == '/api/new-round':
            success = self.game.start_new_round()
            self.serve_json({'success': success, 'state': self.game.get_game_state()})
        else:
            self.send_error(404)
            
    def do_POST(self):
        parsed_path = urlparse(self.path)
        
        if parsed_path.path == '/api/player-move':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            success = self.game.player_move(data['brick_index'], data['tower_level'])
            
            # Auto-trigger computer move if it's computer's turn
            if success and self.game.current_player == 'computer' and not self.game.round_over:
                self.game.computer_move()
                
            self.serve_json({'success': success, 'state': self.game.get_game_state()})
        elif parsed_path.path == '/api/skip-turn':
            success = self.game.skip_turn()
            
            # Auto-trigger computer move if it's computer's turn after skip
            if success and self.game.current_player == 'computer' and not self.game.round_over:
                self.game.computer_move()
                
            self.serve_json({'success': success, 'state': self.game.get_game_state()})
        else:
            self.send_error(404)
            
    def serve_html(self):
        try:
            with open('tower_blaster.html', 'r', encoding='utf-8') as f:
                content = f.read()
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(content.encode('utf-8'))
        except FileNotFoundError:
            self.send_error(404, 'tower_blaster.html not found')
            
    def serve_json(self, data):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))
        
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

if __name__ == '__main__':
    server = HTTPServer(('localhost', 8080), GameHandler)
    print("Tower Blaster server running on http://localhost:8080/tower-blaster")
    server.serve_forever()