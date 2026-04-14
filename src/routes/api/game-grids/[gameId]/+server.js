import { json } from '@sveltejs/kit';
import { STEAMGRIDDB_API_KEY } from '$env/static/private';

export async function GET({ params, fetch }) {
	try {
		// Start both requests in parallel
		const gridsPromise = fetch(`https://www.steamgriddb.com/api/v2/grids/game/${params.gameId}`, {
			headers: { 'Authorization': `Bearer ${STEAMGRIDDB_API_KEY}` }
		});

		const infoPromise = fetch(`https://www.steamgriddb.com/api/public/game/${params.gameId}`, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
				'Referer': 'https://www.steamgriddb.com/'
			}
		});

		// Wait for both to complete
		const [gridsResponse, infoResponse] = await Promise.all([gridsPromise, infoPromise]);
		
		const gridsData = await gridsResponse.json();
		let grids = gridsData.data || [];

		// Try to extract Steam AppID and check for CDN asset
		try {
			const infoData = await infoResponse.json();
			const steamId = infoData?.data?.platforms?.steam?.id;

			if (steamId) {
				const steamCapsuleUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${steamId}/library_600x900_2x.jpg`;
				
				// Verify if the image exists (some games might not have it)
				const headCheck = await fetch(steamCapsuleUrl, { method: 'HEAD' });
				if (headCheck.ok) {
					grids.unshift({
						id: `steam-cdn-${steamId}`,
						url: steamCapsuleUrl,
						thumb: steamCapsuleUrl,
						style: 'official',
						author: { name: 'Steam CDN' }
					});
				}
			}
		} catch (infoErr) {
			console.warn('Failed to fetch Steam AppID:', infoErr);
		}

		return json(grids);
	} catch (err) {
		console.error('SteamGridDB Grids error:', err);
		return json({ error: 'Failed to fetch grids' }, { status: 500 });
	}
}
