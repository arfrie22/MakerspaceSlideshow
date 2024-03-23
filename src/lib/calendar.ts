import type { ICS } from '@filecage/ical';
import type { DateTime } from '@filecage/ical/ValueTypes';
import { parseString } from '@filecage/ical/parser';
import RRULE from 'rrule';
import tcal from 'tcal';

export function floatingTimestamp(date: Date): string {
	const str = date.toISOString();
	return str.substring(0, str.length - 1);
}

export type EventJSON = {
	title: string;
	description?: string;
	start: string;
	end: string;
	allDay: boolean;
};

export function getOffsetValue(offset: string): number {
	const regex = /([+-]?)(\d{2})(\d{2})(\d{2})?/;
	const match = offset.match(regex);

	if (!match) {
		throw new Error('Invalid offset');
	}

	const sign = match[1] === '-' ? -1 : 1;
	const hours = parseInt(match[2]);
	const minutes = parseInt(match[3]);
	const seconds = parseInt(match[4]) || 0;

	return sign * ((hours * 60 + minutes) * 60 + seconds) * 1000;
}

export class TimezoneTransition {
	public tzoffsetfrom: number;
	public tzoffsetto: number;
	public dtstart: Date;
	public rrule?: RRULE.RRuleSet;

	constructor(transition: ICS.TimezoneDefinition) {
		this.tzoffsetfrom = getOffsetValue(transition.TZOFFSETFROM.value);
		this.tzoffsetto = getOffsetValue(transition.TZOFFSETTO.value);
		this.dtstart = transition.DTSTART.value.date;
		if (transition.RRULE) {
			const rrule = new RRULE.RRuleSet();

			rrule.rrule(
				new RRULE.RRule({
					dtstart: this.dtstart,
					...RRULE.RRule.parseString(transition.RRULE.value)
				})
			);

			this.rrule = rrule;
		} else if (transition.RDATE) {
			throw new Error('RDATE not supported');
		}
	}

	public getLatestTransistion(date: Date): Date {
		if (this.rrule) {
			return this.rrule.before(date, true) || this.dtstart;
		} else {
			return this.dtstart;
		}
	}
}

export class Timezone {
	public tzid: string;
	public standardTransitions: TimezoneTransition[] = [];
	public daylightTransitions: TimezoneTransition[] = [];

	constructor(timezone: ICS.VTIMEZONE) {
		this.tzid = timezone.TZID.value;
		this.daylightTransitions = timezone.DAYLIGHT?.map((t) => new TimezoneTransition(t)) || [];
		this.standardTransitions = timezone.STANDARD?.map((t) => new TimezoneTransition(t)) || [];
	}

	public getUTCTime(date: Date): Date {
		const transitions = this.standardTransitions.concat(this.daylightTransitions).map((t) => {
			return { date: t.getLatestTransistion(date), offset: t.tzoffsetto };
		});

		transitions.sort((a, b) => b.date.getTime() - a.date.getTime());

		return new Date(date.getTime() - transitions[0].offset - date.getTimezoneOffset() * 60 * 1000);
	}
}

export function getDateTimeTimestamp(date: DateTime, timezoneMap: TimezoneMap): string {
	if (date.isUTC) {
		return date.date.toISOString();
	} else {
		if (date.timezoneIdentifier === undefined) {
			return floatingTimestamp(date.date);
		} else {
			const tz = timezoneMap.get(date.timezoneIdentifier);
			if (!tz) {
				throw new Error(`Timezone ${date.timezoneIdentifier} not found`);
			}

			return tz.getUTCTime(date.date).toISOString();
		}
	}
}

export type TimezoneMap = Map<string, Timezone>;

export type EventEndType =
	| {
			type: 'dateTime';
			difference: number;
	  }
	| {
			type: 'duration';
			difference: number;
	  };

export class EventInstance {
	public title: string;
	public description: string;
	public start: DateTime;
	public end: EventEndType;
	public allDay: boolean;

	constructor(event: Event, start: Date) {
		this.title = event.title;
		this.description = event.description || '';
		this.start = {
			date: start,
			isDateOnly: event.start.isDateOnly,
			timezoneIdentifier: event.start.timezoneIdentifier,
			isUTC: event.start.isUTC
		} as DateTime;

		this.end = event.end;
		this.allDay = event.allDay;
	}

	public getEndTime(timezoneMap: TimezoneMap): DateTime {
		if (this.end.type === 'duration' && this.start.timezoneIdentifier) {
			const tz = timezoneMap.get(this.start.timezoneIdentifier);
			if (!tz) {
				throw new Error(`Timezone ${this.start.timezoneIdentifier} not found`);
			}

			const date = new Date(tz.getUTCTime(this.start.date).getTime() + this.end.difference);

			return {
				date,
				isDateOnly: this.start.isDateOnly,
				timezoneIdentifier: undefined,
				isUTC: true
			} as DateTime;
		} else {
			return {
				date: new Date(this.start.date.getTime() + this.end.difference),
				isDateOnly: this.start.isDateOnly,
				timezoneIdentifier: this.start.timezoneIdentifier,
				isUTC: this.start.isUTC
			} as DateTime;
		}
	}

	public getEndTimeTimestamp(timezoneMap: TimezoneMap): string {
		return getDateTimeTimestamp(this.getEndTime(timezoneMap), timezoneMap);
	}

	public getJSON(timezoneMap: TimezoneMap): EventJSON {
		return {
			title: this.title,
			description: this.description,
			start: getDateTimeTimestamp(this.start, timezoneMap),
			end: this.getEndTimeTimestamp(timezoneMap),
			allDay: this.allDay
		};
	}
}

export class Event {
	public title: string;
	public description?: string;
	public start: DateTime;
	public end: EventEndType;
	public allDay: boolean;

	public rrules?: RRULE.RRuleSet;

	constructor(event: ICS.VEVENT.Published) {
		this.title = event.SUMMARY.value;
		this.description = event.DESCRIPTION?.value;
		this.start = event.DTSTART.value;

		if (event.DTEND) {
			this.end = {
				type: 'dateTime',
				difference: event.DTEND.value.date.getTime() - event.DTSTART.value.date.getTime()
			};
		} else if (event.DURATION) {
			const dur = event.DURATION.value;
			let difference = dur.weeks || 0;
			difference *= 7;

			difference += dur.days || 0;
			difference *= 24;

			difference += dur.hours || 0;
			difference *= 60;

			difference += dur.minutes || 0;
			difference *= 60;

			difference += dur.seconds || 0;
			difference *= 1000;

			difference *= dur.inverted ? -1 : 1;

			this.end = {
				type: 'duration',
				difference
			};
		} else {
			throw new Error('Event must have either DTEND or DURATION');
		}

		this.allDay = event.DTSTART.value.isDateOnly;

		const rrules = new RRULE.RRuleSet();
		let useRrule = false;

		if (event.RRULE) {
			useRrule = true;
			rrules.rrule(
				new RRULE.RRule({
					dtstart: this.start.date,
					...RRULE.RRule.parseString(event.RRULE.value)
				})
			);
		}

		if (event.RDATE) {
			useRrule = true;
			throw new Error('RDATE not supported');
		}

		if (event.EXDATE) {
			useRrule = true;
			event.EXDATE.forEach((exdates) => {
				exdates.value.forEach((exdate) => {
					if (exdate) {
						rrules.exdate(new Date(exdate.date));
					}
				});
			});
		}

		this.rrules = useRrule ? rrules : undefined;
	}

	public between(start: Date, end: Date): EventInstance[] {
		if (!this.rrules) {
			return [new EventInstance(this, this.start.date)];
		}

		const instances = this.rrules.between(
			new Date(start.getTime() - this.end.difference - 24 * 60 * 60 * 1000),
			new Date(end.getTime() + 24 * 60 * 60 * 1000),
			true
		);

		return instances.map((i) => new EventInstance(this, i));
	}
}

export class Calendar {
	public timezoneMap: TimezoneMap;
	public events: Event[];

	constructor(calendar: ICS.VCALENDAR) {
		this.timezoneMap = new Map();
		this.events = [];

		(calendar.VTIMEZONE || []).forEach((timezone) => {
			const tz = new Timezone(timezone);
			this.timezoneMap.set(timezone.TZID.value, tz);
		});

		this.events = (calendar.VEVENT || []).map((e) => new Event(e));
	}

	public between(start: Date, end: Date): EventJSON[] {
		return this.events.flatMap((e) => {
			return e.between(start, end).map((d) => d.getJSON(this.timezoneMap));
		});
	}
}

export class CalendarSet {
	public calendars: Calendar[];

	constructor(calendars: { VCALENDAR: ICS.VCALENDAR[] }) {
		this.calendars = calendars.VCALENDAR.map((c) => new Calendar(c));
	}

	public between(start: Date, end: Date): EventJSON[] {
		return this.calendars.flatMap((c) => c.between(start, end));
	}

	static cleanAndParse(input: string): CalendarSet {
		return new CalendarSet(parseString(cleanCalendar(input)));
	}
}

export function cleanCalendar(input: string): string {
	input = input.replace(/;FILENAME=/g, ';X-FILENAME='); // Fix non-standard FILENAME parameter from Google Calendar
	const data = tcal.parse(input);
	if (typeof data === 'string') {
		throw new Error('Invalid calendar');
	}

	data[2].forEach((component) => {
		if (component[0] === 'vevent') {
			if (component[1].find((property) => property[0] === 'summary') === undefined) {
				component[1].push(tcal.parse.property('SUMMARY:'));
			}
		}
	});

	return tcal.stringify(data);
}
