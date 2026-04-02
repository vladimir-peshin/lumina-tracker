const express = require('express');
const fs = require('fs');
require('dotenv').config();
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, 'data.json');

// Increase limit for base64 image uploads
app.use(express.json({ limit: '50mb' }));

// Serve the /covers directory statically
app.use('/covers', express.static(path.join(__dirname, 'public', 'covers')));


// Initialize empty data file if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, '[]');
}

// Function to extract base64 image and save it to public/covers directory
function processCoverImage(game) {
  if (game.cover && game.cover.startsWith('data:image/')) {
    const matches = game.cover.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
      const buffer = Buffer.from(matches[2], 'base64');
      const filename = `cover_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
      const coversDir = path.join(__dirname, 'public', 'covers');
      
      if (!fs.existsSync(coversDir)) {
        fs.mkdirSync(coversDir, { recursive: true });
      }
      
      fs.writeFileSync(path.join(coversDir, filename), buffer);
      game.cover = `/covers/${filename}`;
    }
  }
}

// Read games
app.get('/api/games', (req, res) => {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    res.status(500).json({ error: 'Failed to read data' });
  }
});

// Create new game
app.post('/api/games', (req, res) => {
  try {
    const games = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const newGame = req.body;
    
    // Generate sequential ID
    const maxId = games.length > 0 ? Math.max(...games.map(g => g.id)) : 0;
    newGame.id = maxId + 1;
    
    processCoverImage(newGame);
    
    games.unshift(newGame);
    fs.writeFileSync(DATA_FILE, JSON.stringify(games, null, 2));
    res.status(201).json(newGame);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save game' });
  }
});

// Update existing game
app.put('/api/games/:id', (req, res) => {
  try {
    const games = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const id = parseInt(req.params.id);
    const index = games.findIndex(g => g.id === id);
    
    if (index !== -1) {
      const updatedGame = req.body;
      const oldCover = games[index].cover;
      
      processCoverImage(updatedGame);
      
      // If cover was changed from a local file, delete the old file
      if (oldCover && oldCover.startsWith('/covers/') && oldCover !== updatedGame.cover) {
        const oldCoverPath = path.join(__dirname, 'public', oldCover);
        if (fs.existsSync(oldCoverPath)) {
          fs.unlinkSync(oldCoverPath);
        }
      }
      
      games[index] = updatedGame;
      fs.writeFileSync(DATA_FILE, JSON.stringify(games, null, 2));
      res.json(games[index]);
    } else {
      res.status(404).json({ error: 'Game not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update game' });
  }
});

// Delete game
app.delete('/api/games/:id', (req, res) => {
  try {
    const games = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const id = parseInt(req.params.id);
    
    const gameToDelete = games.find(g => g.id === id);
    if (gameToDelete && gameToDelete.cover && gameToDelete.cover.startsWith('/covers/')) {
      const coverPath = path.join(__dirname, 'public', gameToDelete.cover);
      if (fs.existsSync(coverPath)) {
        fs.unlinkSync(coverPath);
      }
    }
    
    const updatedGames = games.filter(g => g.id !== id);
    
    fs.writeFileSync(DATA_FILE, JSON.stringify(updatedGames, null, 2));
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete game' });
  }
});

// SteamGridDB Search
app.get('/api/search-games', async (req, res) => {
  const query = req.query.query;
  if (!query) return res.json([]);
  
  try {
    const response = await fetch(`https://www.steamgriddb.com/api/v2/search/autocomplete/${encodeURIComponent(query)}`, {
      headers: { 'Authorization': `Bearer ${process.env.STEAMGRIDDB_API_KEY}` }
    });
    const data = await response.json();
    res.json(data.data || []);
  } catch (err) {
    console.error('SteamGridDB Search error:', err);
    res.status(500).json({ error: 'Failed to search SteamGridDB' });
  }
});

// SteamGridDB Grids
app.get('/api/game-grids/:gameId', async (req, res) => {
  try {
    const response = await fetch(`https://www.steamgriddb.com/api/v2/grids/game/${req.params.gameId}`, {
      headers: { 'Authorization': `Bearer ${process.env.STEAMGRIDDB_API_KEY}` }
    });
    const data = await response.json();
    res.json(data.data || []);
  } catch (err) {
    console.error('SteamGridDB Grids error:', err);
    res.status(500).json({ error: 'Failed to fetch grids' });
  }
});

// Proxy image to bypass CORS for canvas cropping
app.get('/api/proxy-image', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send('No url');
  try {
    const response = await fetch(url);
    const contentType = response.headers.get('content-type');
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    res.setHeader('Content-Type', contentType);
    res.send(buffer);
  } catch (err) {
    console.error('Image proxy error:', err);
    res.status(500).send('Proxy failed');
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
