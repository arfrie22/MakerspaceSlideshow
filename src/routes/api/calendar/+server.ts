import { GOOGLE_KEY_FILE, GOOGLE_CALENDAR_ID } from '$env/static/private';
import { google } from 'googleapis';
import type { RequestHandler } from './$types';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isBetween from 'dayjs/plugin/isBetween'
import type { DateRange, DateRangeAPI, DaySchedule, DayScheduleAPI } from '$lib/types';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);

export const GET: RequestHandler = async () => {
    const auth = new google.auth.GoogleAuth({
        keyFile: GOOGLE_KEY_FILE,
        scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/calendar.readonly'],
    });

    const calendar = google.calendar({version: 'v3', auth});
    const start = dayjs().startOf('day');
    const res = await calendar.events.list({
        calendarId: GOOGLE_CALENDAR_ID,
        timeMin: start.toISOString(),
        timeMax: start.add(6, 'day').endOf('day').toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
    });

    const data = res.data.items as CalendarEvent[];
    
    const now = dayjs();
    const startTime = now.startOf('day');
    const endTime = now.add(6, 'day').endOf('day');
    
    const ranges = Array<DateRange[]>(7);
    for (let i = 0; i < 7; i++) {
        ranges[i] = [];
    }
    
    const result = data.filter(e => {
        return e.summary.toLowerCase().includes('open');
    }).map(e => {
        let start = parseCalendarTime(e.start);
        let end = parseCalendarTime(e.end);

        if (start.isBefore(startTime)) {
            start = startTime;
        }

        if (end.isAfter(endTime)) {
            end = endTime;
        }

        return {
            start: parseCalendarTime(e.start),
            end: end
        } as DateRange;
    }).flatMap(e => {
        let start = e.start;
        const results = [];

        while (start.day() !== e.end.day()) {
            results.push({
                start: start,
                end: start.endOf('day')
            } as DateRange);
            start = start.add(1, 'day').startOf('day');
        }

        results.push({
            start: start,
            end: e.end
        } as DateRange);

        return results;
    }).reduce((acc, e) => {
        const offset = (e.start.day() - now.day() + 7) % 7;
        acc[offset].push(e);

        return acc;
    }, ranges).map(e => {
        e = e.sort((a, b) => {
            return a.start.isBefore(b.start) ? -1 : 1;
        });

        if (e.length <= 1) {
            return e;
        }

        let index = 0;

        while (index < e.length) {
            for (let i = index + 1; i < e.length; i++) {
                if (e[index].end.isAfter(e[i].start)) {
                    if (e[index].end.isBefore(e[i].end)) {
                        e[index].end = e[i].end;
                    }

                    e.splice(i, 1);
                    i--;
                }
            }

            index++;
        }

        return e;
    }).map((e, i) => {
        return {
            ranges: e.map(e => {
                return {
                    start: e.start.toISOString(),
                    end: e.end.toISOString()
                } as DateRangeAPI;
            }),
            day: dayjs().startOf('day').add(i, 'day').toISOString()
        } as DayScheduleAPI;
    });

    return new Response(JSON.stringify(result), {
        headers: {
            'content-type': 'application/json;charset=UTF-8',
        },
    });
};

interface CalendarEvent {
    summary: string;
    start: CalendarTime;
    end: CalendarTime;
}

interface CalendarTime {
    date?: string;
    dateTime?: string;
    timeZone?: string;
}

function parseCalendarTime(time: CalendarTime | undefined): dayjs.Dayjs {
    if (!time) {
        return dayjs();
    }

    const t = time as CalendarTime;
    if (t.dateTime) {
        const d = dayjs(t.dateTime);
        if (t.timeZone) {
            return d.tz(t.timeZone, true);
        }
    }

    if (t.date) {
        return dayjs(t.date);
    }

    return dayjs();
}