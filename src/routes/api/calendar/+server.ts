import { GOOGLE_KEY_FILE, CALENDAR_ID } from '$env/static/private';
import { google } from 'googleapis';
import type { RequestHandler } from './$types';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export const GET: RequestHandler = async () => {
    const auth = new google.auth.GoogleAuth({
        keyFile: GOOGLE_KEY_FILE,
        scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/calendar.readonly'],
    });

    const calendar = google.calendar({version: 'v3', auth});
    const start = dayjs().startOf('day');
    const res = await calendar.events.list({
        calendarId: CALENDAR_ID,
        timeMin: start.toISOString(),
        timeMax: start.add(6, 'day').endOf('day').toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
    });

    const events = res.data.items;

    return new Response(JSON.stringify(events), {
        headers: {
            'content-type': 'application/json;charset=UTF-8',
        },
    });
};