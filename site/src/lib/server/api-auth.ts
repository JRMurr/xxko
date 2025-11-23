import { error, type RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export function requireAdmin(event: RequestEvent) {
	const header = event.request.headers.get('authorization');
	if (!header) {
		throw error(401, 'Missing Authorization header');
	}

	const [scheme, token] = header.split(' ');

	if (scheme !== 'Bearer' || !token) {
		throw error(400, 'Invalid Authorization header');
	}

	if (token !== env.ADMIN_TOKEN) {
		throw error(403, 'Forbidden');
	}
}
