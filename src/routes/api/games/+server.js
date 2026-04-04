import { json } from '@sveltejs/kit';
import db from '$lib/server/db.js';
import { processCoverImage } from '$lib/server/imageUtils.js';

export async function GET() {
	try {
		const stmt = db.prepare('SELECT * FROM games ORDER BY id DESC');
		const games = stmt.all();
		
		const mappedGames = games.map(g => ({
			...g,
			hidden: g.hidden === 1
		}));
		
		return json(mappedGames);
	} catch (error) {
		console.error(error);
		return json({ error: 'Failed to read database' }, { status: 500 });
	}
}

export async function POST({ request }) {
	try {
		let newGame = await request.json();
		newGame = processCoverImage(newGame);

		const insert = db.prepare(`
			INSERT INTO games (title, developer, year, platform, tags, collections, status, comment, cover, hidden)
			VALUES ($title, $developer, $year, $platform, $tags, $collections, $status, $comment, $cover, $hidden)
			RETURNING *
		`);

		const savedGame = insert.get({
			$title: newGame.title || '',
			$developer: newGame.developer || '',
			$year: newGame.year ? parseInt(newGame.year) : null,
			$platform: newGame.platform || '',
			$tags: newGame.tags || '',
			$collections: newGame.collections || '',
			$status: newGame.status || 'None',
			$comment: newGame.comment || '',
			$cover: newGame.cover || null,
			$hidden: newGame.hidden ? 1 : 0
		});

		savedGame.hidden = savedGame.hidden === 1;

		return json(savedGame, { status: 201 });
	} catch (error) {
		console.error(error);
		return json({ error: 'Failed to save game' }, { status: 500 });
	}
}
