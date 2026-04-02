const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const API_KEY = process.env.STEAM_API_KEY;
const STEAM_ID = process.env.STEAM_ID;
const DATA_FILE = path.join(__dirname, '..', 'data.json');

if (!API_KEY || !STEAM_ID) {
  console.error('Error: STEAM_API_KEY and STEAM_ID must be set in .env file.');
  process.exit(1);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchGameDetails(appId) {
  try {
    const url = `https://store.steampowered.com/api/appdetails?appids=${appId}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data[appId] && data[appId].success) {
      const details = data[appId].data;
      if (details.type !== 'game') {
        return null; // Skip DLCs, soundtracks, etc.
      }

      const developer = details.developers ? details.developers.join(', ') : 'Unknown';
      const releaseDate = details.release_date ? details.release_date.date : '';
      const year = releaseDate ? parseInt(releaseDate.split(',').pop().trim()) : 0;

      return {
        developer,
        year: isNaN(year) ? 0 : year
      };
    }
  } catch (err) {
    console.error(`Error fetching details for appid ${appId}:`, err.message);
  }
  return null;
}

async function importSteamGames() {
  console.log('--- Steam Import Script ---');
  
  // 1. Read existing games to avoid duplicates
  let existingGames = [];
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    existingGames = JSON.parse(data);
  } catch (err) {
    console.log('Could not read data.json, starting fresh.');
  }

  const existingTitles = new Set(existingGames.map(g => g.title.toLowerCase()));

  // 2. Fetch owned games
  console.log('Fetching owned games list...');
  const ownedGamesUrl = `http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${API_KEY}&steamid=${STEAM_ID}&format=json&include_appinfo=1`;
  
  const response = await fetch(ownedGamesUrl);
  const data = await response.json();
  const steamGames = data.response.games || [];

  console.log(`Found ${steamGames.length} games in your Steam library.`);

  let importedCount = 0;
  let skippedCount = 0;
  let maxId = existingGames.length > 0 ? Math.max(...existingGames.map(g => g.id)) : 0;

  for (const game of steamGames) {
    // 1. Re-read data.json to get the absolute latest state
    const currentData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const existingGameIndex = currentData.findIndex(g => g.title.toLowerCase() === game.name.toLowerCase());

    if (existingGameIndex !== -1) {
      // Game exists, check platform
      const existingGame = currentData[existingGameIndex];
      const platforms = existingGame.platform.split(',').map(p => p.trim());
      if (!platforms.includes('Steam')) {
        platforms.push('Steam');
        existingGame.platform = platforms.join(', ');
        console.log(`[Update] Added Steam platform to: ${game.name}`);
        fs.writeFileSync(DATA_FILE, JSON.stringify(currentData, null, 2));
      } else {
        console.log(`[Skip] Already has Steam platform: ${game.name}`);
      }
      continue;
    }

    console.log(`[Fetch] Details for: ${game.name} (${game.appid})...`);
    const details = await fetchGameDetails(game.appid);
    
    if (details) {
      const newMaxId = currentData.length > 0 ? Math.max(...currentData.map(g => g.id)) : 0;
      
      const newGame = {
        id: newMaxId + 1,
        title: game.name,
        developer: details.developer,
        year: details.year,
        platform: 'Steam',
        tags: '',
        comment: '',
        cover: ''
      };
      
      currentData.push(newGame);
      importedCount++;
      console.log(`[Success] Added: ${game.name}`);
      
      fs.writeFileSync(DATA_FILE, JSON.stringify(currentData, null, 2));
    } else {
      console.log(`[Skip] Not a game (DLC/etc): ${game.name}`);
      skippedCount++;
    }

    await sleep(2000); 
  }

  console.log('--- Finished ---');
  console.log(`Imported: ${importedCount}`);
  console.log(`Skipped: ${skippedCount}`);
}

importSteamGames().catch(err => {
  console.error('Fatal error during import:', err);
  process.exit(1);
});
