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

export const GET: RequestHandler = async ({ params, fetch }) => {
	const data = await fetch(`${env.PICSUR_ENDPOINT}/i/${params.id}.jpg`);
	
	return new Response(data.body, {
        headers: {
			'content-type': 'image/jpeg',
        },
    });
};