import { json } from '@sveltejs/kit';
import { STEAMGRIDDB_API_KEY } from '$env/static/private';

export async function GET({ params, fetch }) {
	try {
		const response = await fetch(`https://www.steamgriddb.com/api/v2/grids/game/${params.gameId}`, {
			headers: { 'Authorization': `Bearer ${STEAMGRIDDB_API_KEY}` }
		});
		const data = await response.json();
		return json(data.data || []);
	} catch (err) {
		console.error('SteamGridDB Grids error:', err);
		return json({ error: 'Failed to fetch grids' }, { status: 500 });
	}
}
