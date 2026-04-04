import { Database } from 'bun:sqlite';
import path from 'node:path';

const API_KEY = process.env.STEAM_API_KEY;
const STEAM_ID = process.env.STEAM_ID;
const DB_FILE = path.join(import.meta.dir, '..', 'games.sqlite');

if (!API_KEY || !STEAM_ID) {
  console.error('Error: STEAM_API_KEY and STEAM_ID must be set in .env file.');
  process.exit(1);
}

const db = new Database(DB_FILE);

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchGameDetails(appId, gameName) {
  try {
    const titleYearMatch = gameName?.match(/\((\d{4})\)/);
    let extratedYear = titleYearMatch ? parseInt(titleYearMatch[1]) : null;

    let sgdbYear = null;
    const sgdbKey = process.env.STEAMGRIDDB_API_KEY;
    if (sgdbKey) {
      try {
        const sgdbResponse = await fetch(`https://www.steamgriddb.com/api/v2/games/steam/${appId}`, {
          headers: { 'Authorization': `Bearer ${sgdbKey}` }
        });
        if (sgdbResponse.ok) {
          const sgdbData = await sgdbResponse.json();
          if (sgdbData.success && sgdbData.data.release_date) {
            sgdbYear = new Date(sgdbData.data.release_date * 1000).getFullYear();
          }
        }
      } catch (e) { /* ignore sgdb errors */ }
    }

    const url = `https://store.steampowered.com/api/appdetails?appids=${appId}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data[appId] && data[appId].success) {
      const details = data[appId].data;
      if (details.type !== 'game') {
        return null;
      }

      const developer = details.developers ? details.developers.join(', ') : 'Unknown';
      const releaseDate = details.release_date ? details.release_date.date : '';
      let steamApiYear = releaseDate ? parseInt(releaseDate.split(',').pop().trim()) : null;
      if (isNaN(steamApiYear)) steamApiYear = null;

      const finalYear = extratedYear || sgdbYear || steamApiYear;

      return {
        developer,
        year: finalYear
      };
    }
  } catch (err) {
    console.error(`Error fetching details for appid ${appId}:`, err.message);
  }
  return null;
}

async function importSteamGames() {
  console.log('--- Steam Import Script ---');
  
  console.log('Fetching owned games list...');
  const ownedGamesUrl = `http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${API_KEY}&steamid=${STEAM_ID}&format=json&include_appinfo=1`;
  
  const response = await fetch(ownedGamesUrl);
  const data = await response.json();
  const steamGames = data.response.games || [];

  console.log(`Found ${steamGames.length} games in your Steam library.`);

  let importedCount = 0;
  let skippedCount = 0;
  
  const getGame = db.prepare('SELECT id, title, platform FROM games WHERE LOWER(title) = ?');
  const updatePlatform = db.prepare('UPDATE games SET platform = ? WHERE id = ?');
  const insertGame = db.prepare(`
    INSERT INTO games (title, developer, year, platform, tags, collections, status, comment, cover, hidden)
    VALUES ($title, $developer, $year, $platform, '', '', 'None', '', null, 0)
  `);

  for (const game of steamGames) {
    const existingGame = getGame.get(game.name.toLowerCase());

    if (existingGame) {
      const platforms = (existingGame.platform || '').split(',').map(p => p.trim()).filter(Boolean);
      if (!platforms.includes('Steam')) {
        platforms.push('Steam');
        updatePlatform.run(platforms.join(', '), existingGame.id);
        console.log(`[Update] Added Steam platform to: ${game.name}`);
      } else {
        console.log(`[Skip] Already has Steam platform: ${game.name}`);
      }
      continue;
    }

    console.log(`[Fetch] Details for: ${game.name} (${game.appid})...`);
    const details = await fetchGameDetails(game.appid, game.name);
    
    if (details) {
      insertGame.run({
        $title: game.name,
        $developer: details.developer,
        $year: details.year,
        $platform: 'Steam'
      });
      importedCount++;
      console.log(`[Success] Added: ${game.name}`);
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
