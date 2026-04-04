/* src/lib/server/db.js */
import { Database } from 'bun:sqlite'

const db = new Database('games.sqlite')

// Убедимся, что таблица готова
db.run(`
	CREATE TABLE IF NOT EXISTS games (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		title TEXT NOT NULL,
		developer TEXT,
		year INTEGER,
		platform TEXT,
		tags TEXT,
		collections TEXT,
		status TEXT DEFAULT 'None',
		comment TEXT,
		cover TEXT,
		hidden INTEGER DEFAULT 0
	)
`)

export default db
