import { Database } from 'bun:sqlite';
import path from 'node:path';

const GOG_USERNAME = process.env.GOG_USERNAME;
const DB_FILE = path.join(import.meta.dir, '..', 'games.sqlite');

if (!GOG_USERNAME) {
  console.error('Error: GOG_USERNAME must be set in .env file.');
  process.exit(1);
}

const db = new Database(DB_FILE);

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchGOGProductDetails(productId) {
  try {
    const url = `https://api.gog.com/v2/games/${productId}`;
    const response = await fetch(url);
    const data = await response.json();
    
    let developer = 'Unknown';
    if (data._embedded && data._embedded.developers && data._embedded.developers.length > 0) {
      developer = data._embedded.developers.map(d => d.name).join(', ');
    } else if (data._embedded && data._embedded.product && data._embedded.product.developers && data._embedded.product.developers.length > 0) {
      developer = data._embedded.product.developers.map(d => d.name).join(', ');
    }
    
    let releaseDate = '';
    if (data._embedded && data._embedded.product) {
      releaseDate = data._embedded.product.globalReleaseDate || data._embedded.product.gogReleaseDate || '';
    }
    
    let year = null;
    if (releaseDate) {
      const parsedYear = parseInt(releaseDate.split('-')[0]);
      if (!isNaN(parsedYear)) year = parsedYear;
    }
    
    return { developer, year };
  } catch (err) {
    console.error(`Error fetching GOG details for ${productId}:`, err.message);
  }
  return null;
}

async function importGOGGames() {
  console.log(`--- GOG Import Script for ${GOG_USERNAME} ---`);
  
  let importedCount = 0;
  let updatedCount = 0;
  let page = 1;
  let totalPages = 1;

  const getGame = db.prepare('SELECT id, title, platform FROM games WHERE LOWER(title) = ?');
  const updatePlatform = db.prepare('UPDATE games SET platform = ? WHERE id = ?');
  const insertGame = db.prepare(`
    INSERT INTO games (title, developer, year, platform, tags, collections, status, comment, cover, hidden)
    VALUES ($title, $developer, $year, $platform, '', '', 'None', '', null, 0)
  `);

  do {
    console.log(`Fetching page ${page}...`);
    const statsUrl = `https://www.gog.com/u/${GOG_USERNAME}/games/stats?sort=title&order=asc&page=${page}`;
    
    const statsResponse = await fetch(statsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });

    if (!statsResponse.ok) {
       console.error(`Failed to fetch GOG stats (Status: ${statsResponse.status}).`);
       process.exit(1);
    }

    const statsData = await statsResponse.json();
    totalPages = statsData.pages || 1;
    const items = (statsData._embedded && statsData._embedded.items) || [];

    for (const item of items) {
      const gogGame = item.game;
      if (!gogGame || !gogGame.title) continue;

      const existingGame = getGame.get(gogGame.title.toLowerCase());

      if (existingGame) {
        const platforms = (existingGame.platform || '').split(',').map(p => p.trim()).filter(Boolean);
        if (!platforms.includes('GOG')) {
          platforms.push('GOG');
          updatePlatform.run(platforms.join(', '), existingGame.id);
          updatedCount++;
          console.log(`[Update] Added GOG platform to: ${gogGame.title}`);
        } else {
          console.log(`[Skip] Already has GOG platform: ${gogGame.title}`);
        }
        continue;
      }

      console.log(`[Fetch] Details for: ${gogGame.title}...`);
      const details = await fetchGOGProductDetails(gogGame.id);

      insertGame.run({
        $title: gogGame.title,
        $developer: details ? details.developer : 'Unknown',
        $year: details ? details.year : null,
        $platform: 'GOG'
      });

      importedCount++;
      console.log(`[Success] Added: ${gogGame.title}`);
      
      await sleep(1000); // Respect GOG API
    }

    page++;
  } while (page <= totalPages);

  console.log('--- Finished ---');
  console.log(`Imported: ${importedCount}`);
  console.log(`Updated platforms: ${updatedCount}`);
}

importGOGGames().catch(err => {
  console.error('Fatal error during GOG import:', err);
  process.exit(1);
});
