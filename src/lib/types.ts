export interface RoomStatus {
	open: boolean;
	until: string;
}

export interface ScheduleRanges {
	day: Date;
	ranges: string[];
}

export interface DaySchedule {
	ranges: DateRange[];
	day: Date;
}

export interface DateRange {
	start: Date;
	end: Date;
}
