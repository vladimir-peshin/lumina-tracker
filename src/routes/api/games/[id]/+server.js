import { json } from '@sveltejs/kit';
import fs from 'node:fs';
import path from 'node:path';
import db from '$lib/server/db.js';
import { processCoverImage } from '$lib/server/imageUtils.js';

export async function PUT({ params, request }) {
	try {
		const id = parseInt(params.id);
		let updatedGame = await request.json();
		
		// verify game exists to delete old cover if changed
		const existingQuery = db.prepare('SELECT cover FROM games WHERE id = ?');
		const existingGame = existingQuery.get(id);
		
		if (!existingGame) {
			return json({ error: 'Game not found' }, { status: 404 });
		}

		updatedGame = processCoverImage(updatedGame);

		const oldCover = existingGame.cover;
		
		// If cover was changed from a local file, delete old file
		if (oldCover && oldCover.startsWith('/covers/') && oldCover !== updatedGame.cover) {
			const oldCoverPath = path.join(process.cwd(), 'static', oldCover);
			if (fs.existsSync(oldCoverPath)) {
				fs.unlinkSync(oldCoverPath);
			}
		}

		const update = db.prepare(`
			UPDATE games
			SET title = $title,
			    developer = $developer,
			    year = $year,
			    platform = $platform,
			    tags = $tags,
			    collections = $collections,
			    status = $status,
			    comment = $comment,
			    cover = $cover,
			    hidden = $hidden
			WHERE id = $id
			RETURNING *
		`);

		const savedGame = update.get({
			$title: updatedGame.title || '',
			$developer: updatedGame.developer || '',
			$year: updatedGame.year ? parseInt(updatedGame.year) : null,
			$platform: updatedGame.platform || '',
			$tags: updatedGame.tags || '',
			$collections: updatedGame.collections || '',
			$status: updatedGame.status || 'None',
			$comment: updatedGame.comment || '',
			$cover: updatedGame.cover || null,
			$hidden: updatedGame.hidden ? 1 : 0,
			$id: id
		});

		savedGame.hidden = savedGame.hidden === 1;

		return json(savedGame);
	} catch (error) {
		console.error(error);
		return json({ error: 'Failed to update game' }, { status: 500 });
	}
}

export async function DELETE({ params }) {
	try {
		const id = parseInt(params.id);
		
		const existingQuery = db.prepare('SELECT cover FROM games WHERE id = ?');
		const existingGame = existingQuery.get(id);
		
		if (existingGame && existingGame.cover && existingGame.cover.startsWith('/covers/')) {
			const coverPath = path.join(process.cwd(), 'static', existingGame.cover);
			if (fs.existsSync(coverPath)) {
				fs.unlinkSync(coverPath);
			}
		}

		const del = db.prepare('DELETE FROM games WHERE id = ?');
		del.run(id);

		return new Response(null, { status: 204 });
	} catch (error) {
		console.error(error);
		return json({ error: 'Failed to delete game' }, { status: 500 });
	}
}
