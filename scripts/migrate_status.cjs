const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data.json');

try {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  console.log(`[Migration] Processing ${data.length} games...`);
  
  let updatedCount = 0;
  const migratedData = data.map(game => {
    // Set status to "None" if it's missing or empty
    if (!game.status) {
      game.status = 'None';
      updatedCount++;
    }
    // Also initialize collections if missing
    if (game.collections === undefined) {
      game.collections = '';
    }
    return game;
  });

  fs.writeFileSync(DATA_FILE, JSON.stringify(migratedData, null, 2));
  console.log(`[Success] Migration complete! Updated ${updatedCount} games.`);
} catch (err) {
  console.error('[Error] Migration failed:', err);
}
