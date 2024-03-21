import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

interface GetImagesResults {
	success: boolean;
	status: number;
	timestamp: string;
	timeMs: number;
	data: {
		results: {
			id: string;
			user_id: string;
			created: string;
			file_name: string;
		}[];
		total: number;
		page: number;
		pages: number;
	}
}

export const GET: RequestHandler = async () => {
	let page = 0;
	let done = false;
	let images: string[] = [];

	while (!done) {
		const response = await fetch(`${env.PICSUR_ENDPOINT}/api/image/list`,
			{
				method: 'POST',
				mode: 'cors',
				headers: {
					"Authorization": `Api-Key ${env.PICSUR_APIKEY}`,
					"Content-Type": "application/json"
				},

				body: JSON.stringify({
					page: page,
					count: 100,
				})
			}
		);

		const result = await response.json() as GetImagesResults;
		images = images.concat(result.data.results.map(r => `/api/image/${r.id}`));

		done = ++page >= result.data.pages;
	}
	
	return new Response(JSON.stringify({ images }), {
        headers: {
            'content-type': 'application/json;charset=UTF-8',
        },
    });
};