import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

interface GetImagesResults {
	UID: string;
	Hash: string;
}

export const GET: RequestHandler = async () => {
	let done = false;
	let images: string[] = [];

	while (!done) {
		const response = await fetch(
			`${env.PHOTOPRISM_ENDPOINT}/api/v1/photos?count=1000&quality=0&offset=${images.length}`,
			{
				method: 'GET',
				mode: 'cors',
				headers: {
					Authorization: `Bearer ${env.PHOTOPRISM_TOKEN}`,
					Accepts: 'application/json'
				}
			}
		);

		const result = (await response.json()) as GetImagesResults[];
		images = images.concat(result.map((r) => `/api/image/${r.Hash}`));

		done = result.length == 0;
	}

	return new Response(JSON.stringify({ images }), {
		headers: {
			'content-type': 'application/json;charset=UTF-8'
		}
	});
};
