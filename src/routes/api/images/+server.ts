import { APIKEY, ENDPOINT } from '$env/static/private';
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
		const response = await fetch(`${ENDPOINT}/api/image/list`,
			{
				method: 'POST',
				// no cors
				mode: 'cors',
				headers: {
					"Authorization": `Api-Key ${APIKEY}`,
					"Content-Type": "application/json"
				},

				body: JSON.stringify({
					page: page,
					count: 100,
					// user_id: "7b2dea86-3484-4c17-bd78-7f76dd874526"
				})
			}
		);

		const result = await response.json() as GetImagesResults;
		console.log(result);
		images = images.concat(result.data.results.map(r => `${ENDPOINT}/i/${r.id}.jpg`));

		done = ++page >= result.data.pages;
	}
	
	return new Response(JSON.stringify({ images }), {
        headers: {
            'content-type': 'application/json;charset=UTF-8',
        },
    });
};