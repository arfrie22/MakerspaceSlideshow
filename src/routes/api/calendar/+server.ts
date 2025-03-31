import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { CalendarSet } from '$lib/calendar';
import { Cached } from '$lib/cache';
import { error } from '@sveltejs/kit';

let calendar: Cached<CalendarSet> | undefined = undefined;

export const GET: RequestHandler = async ({ fetch, getClientAddress, url }) => {
	if (!calendar) {
		const cacheTime = Number.parseInt(env.GOOGLE_CALENDAR_CACHE_TIME || '');
		if (!Number.isInteger(cacheTime)) error(500, 'Invalid cache time');

		const calendarURL = env.GOOGLE_CALENDAR_LINK;
		if (!calendarURL) error(500, 'No calendar URL provided');

		calendar = new Cached<CalendarSet>(async () => {
			const calendarData = await fetch(calendarURL).then((res) => res.text());
			return CalendarSet.cleanAndParse(calendarData);
		}, cacheTime);
	}

	const start = url.searchParams.get('start');
	if (!start) error(400, 'No start date provided');

	const end = url.searchParams.get('end');
	if (!end) error(400, 'No end date provided');

	const cal = await calendar.get();

	return new Response(JSON.stringify(cal.between(new Date(start || ''), new Date(end || ''))), {
		headers: {
			'content-type': 'application/json;charset=UTF-8'
		}
	});
};
