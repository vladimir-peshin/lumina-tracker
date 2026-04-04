import { json } from '@sveltejs/kit';

export async function GET({ url, fetch }) {
	const query = url.searchParams.get('query');
	if (!query) return json([]);

	try {
		const response = await fetch(`https://www.steamgriddb.com/api/v2/search/autocomplete/${encodeURIComponent(query)}`, {
			headers: { 'Authorization': `Bearer ${process.env.STEAMGRIDDB_API_KEY}` }
		});
		const data = await response.json();
		return json(data.data || []);
	} catch (err) {
		console.error('SteamGridDB Search error:', err);
		return json({ error: 'Failed to search SteamGridDB' }, { status: 500 });
	}
}
