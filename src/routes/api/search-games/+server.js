import { json } from '@sveltejs/kit';
import { STEAMGRIDDB_API_KEY } from '$env/static/private';

export async function GET({ url, fetch }) {
	const query = url.searchParams.get('query');
	if (!query) return json([]);

	try {
		const response = await fetch(`https://www.steamgriddb.com/api/v2/search/autocomplete/${encodeURIComponent(query)}`, {
			headers: { 'Authorization': `Bearer ${STEAMGRIDDB_API_KEY}` }
		});
		const data = await response.json();
		return json(data.data || []);
	} catch (err) {
		console.error('SteamGridDB Search error:', err);
		return json({ error: 'Failed to search SteamGridDB' }, { status: 500 });
	}
}
