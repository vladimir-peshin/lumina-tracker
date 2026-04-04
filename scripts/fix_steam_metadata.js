import { Database } from 'bun:sqlite';
import path from 'node:path';

const DB_FILE = path.join(import.meta.dir, '..', 'games.sqlite');
const sgdbKey = process.env.STEAMGRIDDB_API_KEY;

const db = new Database(DB_FILE);

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchCorrectYear(title) {
  // 1. Try to extract year from title first (e.g. "Game (2007)")
  const titleYearMatch = title?.match(/\((\d{4})\)/);
  if (titleYearMatch) {
    return parseInt(titleYearMatch[1]);
  }

  // 2. Try SteamGridDB search by title if API key is available
  if (sgdbKey) {
    try {
      const searchUrl = `https://www.steamgriddb.com/api/v2/search/autocomplete/${encodeURIComponent(title)}`;
      const response = await fetch(searchUrl, {
        headers: { 'Authorization': `Bearer ${sgdbKey}` }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.data && data.data.length > 0) {
        // Take the first result that has a release date
        for (const game of data.data) {
          if (game.release_date) {
            return new Date(game.release_date * 1000).getFullYear();
          }
        }
      }
    } catch (e) {
      console.error(`Error searching SteamGridDB for "${title}":`, e.message);
    }
  }

  return null;
}

async function fixSteamMetadata() {
  console.log(`--- Fixing Steam Year Metadata ---`);
  
  // Find games that are on Steam
  const steamGames = db.prepare("SELECT id, title, year FROM games WHERE platform LIKE '%Steam%'").all();
  console.log(`Found ${steamGames.length} Steam games to check.`);

  let fixCount = 0;

  for (const game of steamGames) {
    const correctYear = await fetchCorrectYear(game.title);
    
    if (correctYear && correctYear !== game.year) {
      console.log(`[Fix] ${game.title}: ${game.year} -> ${correctYear}`);
      db.prepare('UPDATE games SET year = ? WHERE id = ?').run(correctYear, game.id);
      fixCount++;
    } else {
      // Small delay if we're hitting the API
      if (sgdbKey && !game.title.match(/\((\d{4})\)/)) {
        await sleep(500); 
      }
    }
  }

  console.log('--- Finished ---');
  console.log(`Updated years for: ${fixCount} games`);
}

fixSteamMetadata().catch(err => {
  console.error('Fatal error during fix:', err);
  process.exit(1);
});
