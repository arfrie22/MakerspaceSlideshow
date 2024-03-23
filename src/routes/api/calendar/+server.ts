import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { CalendarSet } from '$lib/calendar';
import { Cached } from '$lib/cache';

let calendar: Cached<CalendarSet> | undefined = undefined;

export const GET: RequestHandler = async ({fetch, getClientAddress, url}) => {
    if (!calendar) {
        const cacheTime = Number.parseInt(env.GOOGLE_CALENDAR_CACHE_TIME || '');
        if (!Number.isInteger(cacheTime)) throw new Error('Invalid cache time');

        const calendarURL = env.GOOGLE_CALENDAR_LINK;
        if (!calendarURL) throw new Error('No calendar URL provided');

        calendar = new Cached<CalendarSet>(async () => {
            const calendarData = await fetch(calendarURL).then((res) => res.text());
            return CalendarSet.cleanAndParse(calendarData);
        }, cacheTime);
    }

    console.log(`GET /api/calendar from ${getClientAddress()}`);

    const start = url.searchParams.get('start');
    if (!start) throw new Error('No start date provided');

    const end = url.searchParams.get('end');
    if (!end) throw new Error('No end date provided');
    
    const cal = await calendar.get();
    
    return new Response(JSON.stringify(cal.between(new Date(start), new Date(end))), {
        headers: {
            'content-type': 'application/json;charset=UTF-8',
        },
    });
};