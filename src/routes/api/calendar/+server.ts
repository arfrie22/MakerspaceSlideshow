import { env } from '$env/dynamic/private';
import { google } from 'googleapis';
import type { RequestHandler } from './$types';
import dayjs from 'dayjs';
import type { CalendarEvent } from '$lib/types';

export const GET: RequestHandler = async () => {
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

    return new Response(JSON.stringify(data), {
        headers: {
            'content-type': 'application/json;charset=UTF-8',
        },
    });
};