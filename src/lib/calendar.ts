import dayjs from "dayjs";
import type { CalendarEvent, CalendarTime, DateRange, DaySchedule, RoomStatus, ScheduleRanges } from "./types";

function getRoomStatusSubTitle(until?: dayjs.Dayjs): string {
    if (until) {
        if (until.isSame(dayjs(), 'day')) {
            return `until ${until.format('h:mm A')}`;
        } else if (until.isSame(dayjs().add(1, 'day'), 'day')) {
            return `until ${until.format('h:mm A')} tomorrow`;
        } else {
            return `until ${until.format('dddd h:mm A')}`;
        }
    } else {
        return '';
    }
}

export function getRoomStatus(schedule: DaySchedule[]): RoomStatus {
    const now = dayjs();

    for (let i = 0; i < schedule.length; i++) {
        for (let j = 0; j < schedule[i].ranges.length; j++) {
            const range = schedule[i].ranges[j];
            if (now.isBetween(range.start, range.end)) {
                return {
                    open: true,
                    until: getRoomStatusSubTitle(range.end)
                };
            } else if (now.isBefore(range.start)) {
                return {
                    open: false,
                    until: getRoomStatusSubTitle(range.start)
                };
            }
        }
    }

    return {
        open: false,
        until: ''
    };
}



export function getScheduleRanges(schedule: DaySchedule[]): ScheduleRanges[] {
    return schedule.map(e => {
        if (e.ranges.length === 0) {
            return {day: e.day, ranges: ['Closed']} as ScheduleRanges;
        }

        return {day: e.day, ranges: e.ranges.map(e => {
            return `${e.start.format('h:mm A')} - ${e.end.format('h:mm A')}`;
        })} as ScheduleRanges;
    });
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

export function getDaySchedule(data: CalendarEvent[]): DaySchedule[] {
    const now = dayjs();
    const startTime = now.startOf('day');
    const endTime = now.add(6, 'day').endOf('day');
    
    const ranges = Array<DateRange[]>(7);
    for (let i = 0; i < 7; i++) {
        ranges[i] = [];
    }
    
    return data.filter(e => {
        return e.summary.toLowerCase().includes('open');
    }).filter(e => {
        const start = parseCalendarTime(e.start);
        const end = parseCalendarTime(e.end);

        if (end.isBefore(startTime)) {
            return false;
        }

        if (start.isAfter(endTime)) {
            return false;
        }

        return true;
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
                    start: e.start,
                    end: e.end
                } as DateRange;
            }),
            day: dayjs().startOf('day').add(i, 'day')
        } as DaySchedule;
    });
}