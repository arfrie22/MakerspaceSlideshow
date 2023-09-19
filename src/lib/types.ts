import type dayjs from "dayjs";

export interface RoomStatus {
    open: boolean;
    until: string;
}

export interface ScheduleRanges {
    day: dayjs.Dayjs;
    ranges: string[];
}

export interface DaySchedule {
    ranges: DateRange[];
    day: dayjs.Dayjs;
}

export interface DateRange {
    start: dayjs.Dayjs;
    end: dayjs.Dayjs;
}

export interface CalendarEvent {
    summary: string;
    start: CalendarTime;
    end: CalendarTime;
}

export interface CalendarTime {
    date?: string;
    dateTime?: string;
    timeZone?: string;
}