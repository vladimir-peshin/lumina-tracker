const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const GOG_USERNAME = process.env.GOG_USERNAME;
const DATA_FILE = path.join(__dirname, '..', 'data.json');

if (!GOG_USERNAME) {
  console.error('Error: GOG_USERNAME must be set in .env file.');
  process.exit(1);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchGOGProductDetails(productId) {
  try {
    const url = `https://api.gog.com/products/${productId}`;
    const response = await fetch(url);
    const data = await response.json();
    
    const developer = data.developer || 'Unknown';
    const releaseDate = data.release_date || '';
    const year = releaseDate ? parseInt(releaseDate.split('-')[0]) : 0;
    
    return { developer, year: isNaN(year) ? 0 : year };
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

      // Re-read data.json to get the absolute latest state
      const currentData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      const existingGameIndex = currentData.findIndex(g => g.title.toLowerCase() === gogGame.title.toLowerCase());

      if (existingGameIndex !== -1) {
        // Game exists, update platform
        const existingGame = currentData[existingGameIndex];
        const platforms = existingGame.platform.split(',').map(p => p.trim());
        if (!platforms.includes('GOG')) {
          platforms.push('GOG');
          existingGame.platform = platforms.join(', ');
          updatedCount++;
          console.log(`[Update] Added GOG platform to: ${gogGame.title}`);
          fs.writeFileSync(DATA_FILE, JSON.stringify(currentData, null, 2));
        } else {
          console.log(`[Skip] Already has GOG platform: ${gogGame.title}`);
        }
        continue;
      }

      console.log(`[Fetch] Details for: ${gogGame.title}...`);
      const details = await fetchGOGProductDetails(gogGame.id);
      const newMaxId = currentData.length > 0 ? Math.max(...currentData.map(g => g.id)) : 0;

      const newGame = {
        id: newMaxId + 1,
        title: gogGame.title,
        developer: details ? details.developer : 'Unknown',
        year: details ? details.year : 0,
        platform: 'GOG',
        tags: '',
        comment: '',
        cover: ''
      };

      currentData.push(newGame);
      importedCount++;
      console.log(`[Success] Added: ${gogGame.title}`);
      
      fs.writeFileSync(DATA_FILE, JSON.stringify(currentData, null, 2));
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
