import { env } from '$env/dynamic/private';
import { google } from 'googleapis';
import type { RequestHandler } from './$types';
import dayjs from 'dayjs';
import type { CalendarEvent } from '$lib/types';

let cached: CalendarEvent[] = [];
let lastCached = 0;
let fetchInProcess = false;

export const GET: RequestHandler = async () => {
    const cacheTime = Number.parseInt(env.GOOGLE_CALENDAR_CACHE_TIME);
    if (!Number.isInteger(cacheTime)) throw new Error('Invalid cache time');

    if (fetchInProcess) {
        console.log('Waiting for calendar events to be fetched...');
        while (fetchInProcess) {
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        console.log('Using cached calendar events');
        return new Response(JSON.stringify(cached), {
            headers: {
                'content-type': 'application/json;charset=UTF-8',
            },
        });
    }

    if (dayjs().valueOf() - lastCached < cacheTime) {
        console.log('Using cached calendar events');
        return new Response(JSON.stringify(cached), {
            headers: {
                'content-type': 'application/json;charset=UTF-8',
            },
        });
    }

    console.log('Fetching calendar events...');
    fetchInProcess = true;

    const auth = new google.auth.GoogleAuth({
        keyFile: env.GOOGLE_KEY_FILE,
        scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/calendar.readonly'],
    });

    const calendar = google.calendar({version: 'v3', auth});
    const res = await calendar.events.list({
        calendarId: env.GOOGLE_CALENDAR_ID,
        timeMin: dayjs().add(-1, 'day').toISOString(),
        timeMax: dayjs().add(7, 'day').toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
    });

    const data = res.data.items as CalendarEvent[];
    cached = data;
    lastCached = dayjs().valueOf();
    fetchInProcess = false;

    return new Response(JSON.stringify(data), {
        headers: {
            'content-type': 'application/json;charset=UTF-8',
        },
    });
};