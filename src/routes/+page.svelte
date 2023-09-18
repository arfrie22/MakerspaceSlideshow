<script lang="ts">
    import { fade } from 'svelte/transition';
    import { page } from '$app/stores'
    import { DEFAULT_FADE_IN_DURATION, DEFAULT_FADE_OUT_DURATION, DEFAULT_HOLD_DURATION } from '$lib/defaults'
    import dayjs from 'dayjs';
    import utc from 'dayjs/plugin/utc';
    import timezone from 'dayjs/plugin/timezone';
    import isBetween from 'dayjs/plugin/isBetween'

    dayjs.extend(utc);
    dayjs.extend(timezone);
    dayjs.extend(isBetween)

    const fadeInTime = Number.parseFloat($page.url.searchParams.get('fadeIn') || '') || DEFAULT_FADE_IN_DURATION;
    const fadeOutTime = Number.parseFloat($page.url.searchParams.get('fadeOut') || '') || DEFAULT_FADE_OUT_DURATION;
    const holdTime = Number.parseFloat($page.url.searchParams.get('hold') || '') || DEFAULT_HOLD_DURATION;
    const minimumLoop = Number.parseFloat($page.url.searchParams.get('loop') || '') || 10;
    const refreshEvery = Number.parseFloat($page.url.searchParams.get('refresh') || '') || 30;
    const calendarUpdate = Number.parseFloat($page.url.searchParams.get('calendar') || '') || 300000;

    

    async function getImages(): Promise<string[]> {
        const res = await fetch('/api/images');
        const data = await res.json();
        return data.images;
    }

    interface DateInfo {
        ranges: DateRange[];
        day: dayjs.Dayjs;
    }

    let images: string[] = [];
    let imageCount = 0;
    let imagesDelay = new Map<string, number>();
    let imageA = '';
    let imageB = '';
    let selected = false;
    let hours: DateInfo[] = [];

    async function nextImage() {
        if (imageCount >= refreshEvery) {
            await load();
            return;
        }

        imageCount = imageCount++;
        const validImages: string[] = [];
        imagesDelay.forEach((v, k) => {
            if (v <= 0) {
                validImages.push(k);
            } else {
                imagesDelay.set(k, v - 1);
            }
        });
        
        const image = validImages[Math.floor(Math.random() * validImages.length)];
        
        try {
            let res = await fetch(image);
            let blob = await res.blob();
            imagesDelay.set(image, minimumLoop);

            imageB = URL.createObjectURL(blob);
            selected = false;
        } catch (e) {
            console.error(e);
            await nextImage();
        }
    }

    function setNext() {
        URL.revokeObjectURL(imageA);
        imageA = imageB;
        selected = true;
    }

    async function updateHours() {
        hours = await getOpenHours();
        window.setTimeout(updateHours, calendarUpdate);
    }

    async function load() {
        images = await getImages();
        imageCount = 0;
        imagesDelay = new Map<string, number>();
        images.forEach(i => imagesDelay.set(i, 0));
        await nextImage();
        setNext();
        updateHours();
    }

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

    interface DateRange {
        start: dayjs.Dayjs;
        end: dayjs.Dayjs;
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

    async function getOpenHours(): Promise<DateInfo[]> {
        const res = await fetch('/api/calendar');
        const data = await res.json() as CalendarEvent[];

        const now = dayjs();
        const startTime = now.startOf('day');
        const endTime = now.add(6, 'day').endOf('day');
        
        const ranges = Array<DateRange[]>(7);
        for (let i = 0; i < 7; i++) {
            ranges[i] = [];
        }
        
        return data.filter(e => {
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
                ranges: e,
                day: dayjs().startOf('day').add(i, 'day')
            } as DateInfo;
        });
    }

    interface OpenResult {
        open: boolean;
        until?: dayjs.Dayjs;
    }

    function isOpen(info: DateInfo[]): OpenResult {
        const now = dayjs();

        for (let i = 0; i < info.length; i++) {
            for (let j = 0; j < info[i].ranges.length; j++) {
                const range = info[i].ranges[j];
                if (now.isBetween(range.start, range.end)) {
                    return {
                        open: true,
                        until: range.end
                    };
                } else if (now.isBefore(range.start)) {
                    return {
                        open: false,
                        until: range.start
                    };
                }
            }
        }

        return {
            open: false
        };
    }

    function openTextSubtitle(result: OpenResult) {
        if (result.until) {
            if (result.until.isSame(dayjs(), 'day')) {
                return `until ${result.until.format('h:mm A')}`;
            } else if (result.until.isSame(dayjs().add(1, 'day'), 'day')) {
                return `until ${result.until.format('h:mm A')} tomorrow`;
            } else {
                return `until ${result.until.format('dddd h:mm A')}`;
            }
        } else {
            return null;
        }
    }

    interface OpenRangeResult {
        day: dayjs.Dayjs;
        ranges: string[];
    }

    function getOpenRanges(ranges: DateInfo[]): OpenRangeResult[] {
        return ranges.map(e => {
            if (e.ranges.length === 0) {
                return {day: e.day, ranges: ['Closed']} as OpenRangeResult;
            }

            return {day: e.day, ranges: e.ranges.map(e => {
                return `${e.start.format('h:mm A')} - ${e.end.format('h:mm A')}`;
            })} as OpenRangeResult;
        });
    }

    const delayedNext = () => window.setTimeout(nextImage, holdTime);

    load();
</script>

<div class="page">
    <div class="content">
        <div class="hours">
            <div class="title">Hours</div>
            <div class="schedule">
                {#each getOpenRanges(hours) as days}
                    <div class="range">
                        <div class="day">{days.day.format('dddd')}</div>
                        <div class="times">
                            {#each days.ranges as time}
                                <div class="time">{time}</div>
                            {/each}
                        </div>
                    </div>
                {/each}
            </div>
        </div>

        <div class="slideshow">
            {#if selected}
                <img src={imageA} alt="" class="image" in:fade={{duration: fadeInTime}} out:fade={{duration: fadeOutTime}} on:introend={delayedNext} on:outroend={setNext}/>
            {/if}
        </div>
    </div>
    
    <div class="footer">
        <div class="logos">
            <img src="/logo.svg" class="gear" alt="Makerspace Logo"/>
            <img src="/makerspace.png" class="logo" alt="UMass Amherst | Makerspace"/>
        </div>
        <div class="now">
            {#if isOpen(hours).open}
                <div class="open nowText">Open</div>
                <div class="subtitle">{openTextSubtitle(isOpen(hours))}</div>
            {:else}
                <div class="closed nowText">Closed</div>
                <div class="subtitle">{openTextSubtitle(isOpen(hours))}</div>
            {/if}
        </div>
    </div>
</div>

<style lang="scss">
    @font-face {
        font-family: InclusiveSans;
        src: url(/fonts/InclusiveSans-Regular.ttf);
    }

    .title {
        font-family: InclusiveSans;
        font-size: 10vh;
        color: white;
    }

    .page {
        position: absolute;
        top: 0;
        left: 0;
        
        width: 100dvw;
        height: 100dvh;
        background-color: #111213;
        font-family: InclusiveSans;

        display: flex;
        flex-direction: column;
    }

    .content {
        box-sizing: border-box;
        display: flex;
        justify-content: center;
        align-items: stretch;
        flex: 1;
        height: 85dvh;
        gap: 20vh;
        padding: 5vh 5vw;
    }
    
    .footer {
        color: #111213;
        font-family: InclusiveSans;

        height: 15dvh;
        background-color: #f1f3f9;
        padding: 0 10vmin;
        display: flex;
    }

    .footer > * {
        flex: 1;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .logos {
        display: flex;
        flex-direction: row;
        justify-content: left;
        gap: 1vw;
    }

    .gear {
        object-fit: contain;
        height: 100%;
    }

    .logo {
        object-fit: contain;
        height: 100%;
        width: 100%;
        flex: 1;
    }

    .now {
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
        gap: 2vw;
    }

    .nowText {
        font-size: 8vh;
    }

    .open {
        color: #28a745;
    }

    .closed {
        color: #dc3545;
    }

    .subtitle {
        font-size: 4vh;
    }

    .hours {
        color: #f1f3f9;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 6vh;
        
        min-width: 40vmin;
    }

    .schedule {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 3vh;
    }

    .range {
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: top;
        gap: 1vmin;
    }

    .day {
        font-size: 4vh;
    }

    .times {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 0.75vh;
    }

    .slideshow {
        flex: 1;
        display: flex;
        justify-content: stretch;
        align-items: stretch;
    }

    .image {
        height: 100%;
        width: 100%;
        object-fit: contain;
    }
</style>