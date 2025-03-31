import { env } from '$env/dynamic/private';
import { Cached } from '$lib/cache';
import type { RequestHandler } from './$types';

let downloadToken: Cached<string> | undefined = undefined;

export const GET: RequestHandler = async ({ params, fetch }) => {
    if (!downloadToken) {
            downloadToken = new Cached<string>(async () => {
                const response = await fetch(`${env.PHOTOPRISM_ENDPOINT}/api/v1/session`, {
                    method: 'GET',
                    mode: 'cors',
                    headers: {
                        Authorization: `Bearer ${env.PHOTOPRISM_TOKEN}`,
                        'Accepts': 'application/json'
                    },
                });
            

                return (await response.json()).config.downloadToken;
            }, 60 * 1000);
    }

	const data = await fetch(`${env.PHOTOPRISM_ENDPOINT}/api/v1/photos/${params.id}/dl?t=${await downloadToken.get()}`);
	return new Response(data.body, {
		headers: {
			'content-type': 'image/jpeg'
		}
	});
};
