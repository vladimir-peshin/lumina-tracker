export async function GET({ url, fetch }) {
	const imageUrl = url.searchParams.get('url');
	if (!imageUrl) return new Response('No url', { status: 400 });

	try {
		const parsed = new URL(imageUrl);
		const allowedDomains = ['steamgriddb.com', 'steamstatic.com'];
		if (!allowedDomains.some(domain => parsed.hostname.endsWith(domain))) {
			return new Response('Domain not allowed', { status: 403 });
		}
	} catch {
		return new Response('Invalid url', { status: 400 });
	}

	try {
		const response = await fetch(imageUrl);
		const contentType = response.headers.get('content-type');
		const arrayBuffer = await response.arrayBuffer();
		
		return new Response(arrayBuffer, {
			headers: {
				'Content-Type': contentType
			}
		});
	} catch (err) {
		console.error('Image proxy error:', err);
		return new Response('Proxy failed', { status: 500 });
	}
}
