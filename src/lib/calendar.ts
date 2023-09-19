import dayjs from "dayjs";
import type { DaySchedule, RoomStatus, ScheduleRanges } from "./types";

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