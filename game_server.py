#!/usr/bin/env python3
"""
2048 Game Server
A web-based 2048 game with Python backend logic and responsive frontend.
"""

import json
import random
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import os
import mimetypes

class Game2048:
    """Core 2048 game logic implemented in Python."""
    
    def __init__(self, size=4):
        self.size = size
        self.grid = [[0 for _ in range(size)] for _ in range(size)]
        self.score = 0
        self.game_over = False
        self.won = False
        self.add_random_tile()
        self.add_random_tile()
    
    def add_random_tile(self):
        """Add a random tile (2 or 4) to an empty cell."""
        empty_cells = [(i, j) for i in range(self.size) for j in range(self.size) if self.grid[i][j] == 0]
        if empty_cells:
            i, j = random.choice(empty_cells)
            self.grid[i][j] = 2 if random.random() < 0.9 else 4
    
    def move_left(self):
        """Move tiles left and merge."""
        moved = False
        for i in range(self.size):
            # Filter out zeros
            row = [cell for cell in self.grid[i] if cell != 0]
            
            # Merge adjacent equal tiles
            j = 0
            while j < len(row) - 1:
                if row[j] == row[j + 1]:
                    row[j] *= 2
                    self.score += row[j]
                    if row[j] == 2048:
                        self.won = True
                    del row[j + 1]
                j += 1
            
            # Pad with zeros
            row.extend([0] * (self.size - len(row)))
            
            # Check if row changed
            if row != self.grid[i]:
                moved = True
                self.grid[i] = row
        
        return moved
    
    def move_right(self):
        """Move tiles right and merge."""
        # Reverse, move left, reverse back
        for i in range(self.size):
            self.grid[i].reverse()
        moved = self.move_left()
        for i in range(self.size):
            self.grid[i].reverse()
        return moved
    
    def move_up(self):
        """Move tiles up and merge."""
        # Transpose, move left, transpose back
        self.transpose()
        moved = self.move_left()
        self.transpose()
        return moved
    
    def move_down(self):
        """Move tiles down and merge."""
        # Transpose, move right, transpose back
        self.transpose()
        moved = self.move_right()
        self.transpose()
        return moved
    
    def transpose(self):
        """Transpose the grid."""
        self.grid = [[self.grid[j][i] for j in range(self.size)] for i in range(self.size)]
    
    def can_move(self):
        """Check if any move is possible."""
        # Check for empty cells
        for i in range(self.size):
            for j in range(self.size):
                if self.grid[i][j] == 0:
                    return True
        
        # Check for possible merges
        for i in range(self.size):
            for j in range(self.size):
                current = self.grid[i][j]
                # Check right neighbor
                if j < self.size - 1 and self.grid[i][j + 1] == current:
                    return True
                # Check bottom neighbor
                if i < self.size - 1 and self.grid[i + 1][j] == current:
                    return True
        
        return False
    
    def make_move(self, direction):
        """Make a move in the specified direction."""
        if self.game_over:
            return False
        
        moved = False
        if direction == 'left':
            moved = self.move_left()
        elif direction == 'right':
            moved = self.move_right()
        elif direction == 'up':
            moved = self.move_up()
        elif direction == 'down':
            moved = self.move_down()
        
        if moved:
            self.add_random_tile()
            if not self.can_move():
                self.game_over = True
        
        return moved
    
    def get_state(self):
        """Get current game state as dictionary."""
        return {
            'grid': self.grid,
            'score': self.score,
            'game_over': self.game_over,
            'won': self.won
        }
    
    def reset(self):
        """Reset the game to initial state."""
        self.__init__(self.size)

class GameHandler(BaseHTTPRequestHandler):
    """HTTP request handler for the 2048 game server."""
    
    # Class variable to store game instances
    games = {}
    
    def do_GET(self):
        """Handle GET requests."""
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        if path == '/' or path == '/2048':
            self.serve_file('2048.html')
        elif path == '/api/new_game':
            self.handle_new_game()
        elif path.startswith('/api/game_state'):
            self.handle_game_state(parsed_path.query)
        else:
            self.serve_file(path[1:])  # Remove leading slash
    
    def do_POST(self):
        """Handle POST requests."""
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        if path == '/api/move':
            self.handle_move()
        else:
            self.send_error(404)
    
    def serve_file(self, filename):
        """Serve static files."""
        try:
            if not filename or filename == '2048':
                filename = '2048.html'
            
            with open(filename, 'rb') as f:
                content = f.read()
            
            # Get MIME type
            mime_type, _ = mimetypes.guess_type(filename)
            if mime_type is None:
                mime_type = 'text/html' if filename.endswith('.html') else 'text/plain'
            
            self.send_response(200)
            self.send_header('Content-Type', mime_type)
            self.send_header('Content-Length', str(len(content)))
            self.end_headers()
            self.wfile.write(content)
            
        except FileNotFoundError:
            self.send_error(404, f"File '{filename}' not found")
        except Exception as e:
            self.send_error(500, f"Server error: {str(e)}")
    
    def handle_new_game(self):
        """Create a new game instance."""
        game_id = f"game_{len(self.games)}"
        self.games[game_id] = Game2048()
        
        response = {
            'game_id': game_id,
            'state': self.games[game_id].get_state()
        }
        
        self.send_json_response(response)
    
    def handle_game_state(self, query_string):
        """Get current game state."""
        params = parse_qs(query_string)
        game_id = params.get('game_id', [''])[0]
        
        if game_id in self.games:
            response = self.games[game_id].get_state()
            self.send_json_response(response)
        else:
            self.send_error(404, "Game not found")
    
    def handle_move(self):
        """Handle move requests."""
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            game_id = data.get('game_id')
            direction = data.get('direction')
            
            if game_id not in self.games:
                self.send_error(404, "Game not found")
                return
            
            if direction not in ['left', 'right', 'up', 'down']:
                self.send_error(400, "Invalid direction")
                return
            
            game = self.games[game_id]
            moved = game.make_move(direction)
            
            response = {
                'moved': moved,
                'state': game.get_state()
            }
            
            self.send_json_response(response)
            
        except json.JSONDecodeError:
            self.send_error(400, "Invalid JSON")
        except Exception as e:
            self.send_error(500, f"Server error: {str(e)}")
    
    def send_json_response(self, data):
        """Send JSON response."""
        response = json.dumps(data).encode('utf-8')
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(response)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(response)
    
    def log_message(self, format, *args):
        """Override to customize logging."""
        print(f"[{self.address_string()}] {format % args}")

def run_server(port=8080):
    """Run the game server."""
    server_address = ('', port)
    httpd = HTTPServer(server_address, GameHandler)
    
    print(f"\n🎮 2048 Game Server Starting...")
    print(f"📍 Server running at: http://localhost:{port}")
    print(f"🎯 Game URL: http://localhost:{port}/2048")
    print(f"⚡ Python backend with responsive web frontend")
    print(f"📱 Works on desktop and mobile devices")
    print(f"\n🎮 Game Controls:")
    print(f"   Desktop: Arrow keys or WASD")
    print(f"   Mobile: Swipe gestures")
    print(f"\n🛑 Press Ctrl+C to stop the server\n")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
        httpd.server_close()

if __name__ == '__main__':
    # Change to the directory containing the HTML file
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    # Run the server
    run_server(8080)