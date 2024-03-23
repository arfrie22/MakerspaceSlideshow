import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, fetch }) => {
	const data = await fetch(`${env.PICSUR_ENDPOINT}/i/${params.id}.jpg`);
	
	return new Response(data.body, {
        headers: {
			'content-type': 'image/jpeg',
        },
    });
};