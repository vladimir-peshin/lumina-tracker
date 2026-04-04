import db from '$lib/server/db.js';

export async function load() {
	const stmt = db.prepare('SELECT * FROM games ORDER BY id DESC');
	const games = stmt.all().map(g => ({
		...g,
		hidden: g.hidden === 1
	}));
	return { games };
}
