import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function processCoverImage(game) {
	if (game.cover && game.cover.startsWith('data:image/')) {
		const matches = game.cover.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
		if (matches && matches.length === 3) {
			const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
			const buffer = Buffer.from(matches[2], 'base64');
			const filename = `cover_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
			
			const coversDir = path.join(process.cwd(), 'static', 'covers');
			
			if (!fs.existsSync(coversDir)) {
				fs.mkdirSync(coversDir, { recursive: true });
			}
			
			fs.writeFileSync(path.join(coversDir, filename), buffer);
			game.cover = `/covers/${filename}`;
		}
	}
	return game;
}
