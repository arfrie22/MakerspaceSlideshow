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


export interface DayScheduleAPI {
    ranges: DateRangeAPI[];
    day: string;
}

export interface DateRangeAPI {
    start: string;
    end: string;
}