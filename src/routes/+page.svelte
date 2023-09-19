<script lang="ts">
    import { fade } from 'svelte/transition';
    import { page } from '$app/stores'
    import { DEFAULT_FADE_IN_DURATION, DEFAULT_FADE_OUT_DURATION, DEFAULT_HOLD_DURATION } from '$lib/defaults'
    import dayjs from 'dayjs';
    import utc from 'dayjs/plugin/utc';
    import timezone from 'dayjs/plugin/timezone';
    import isBetween from 'dayjs/plugin/isBetween'
    import { env } from '$env/dynamic/public';
	import type { DaySchedule, DayScheduleAPI, RoomStatus } from '$lib/types';
	import { getRoomStatus, getScheduleRanges } from '$lib/calendar';

    dayjs.extend(utc);
    dayjs.extend(timezone);
    dayjs.extend(isBetween)

    const fadeInTime = Number.parseFloat($page.url.searchParams.get('fadeIn') || '') || DEFAULT_FADE_IN_DURATION;
    const fadeOutTime = Number.parseFloat($page.url.searchParams.get('fadeOut') || '') || DEFAULT_FADE_OUT_DURATION;
    const holdTime = Number.parseFloat($page.url.searchParams.get('hold') || '') || DEFAULT_HOLD_DURATION;
    const minimumLoop = Number.parseFloat($page.url.searchParams.get('loop') || '') || 10;
    const refreshEvery = Number.parseFloat($page.url.searchParams.get('refresh') || '') || 30;
    const calendarUpdate = Number.parseFloat($page.url.searchParams.get('calendar') || '') || 300000;
    const reverseContent = ($page.url.searchParams.get('reverse') || env.PUBLIC_REVERSE_CONTENT || '') === 'true';

    

    async function getImages(): Promise<string[]> {
        const res = await fetch('/api/images');
        const data = await res.json();
        return data.images;
    }

    let images: string[] = [];
    let imagesShown = 0;
    let imageLoopDelayMap = new Map<string, number>();

    let currentImageURL = '';
    let nextImageURL = '';
    let showImage = false;

    let schedule: DaySchedule[] = [];
    let roomStatus: RoomStatus = {open: false, until: ''};

    async function queueNextImage() {
        if (imagesShown >= refreshEvery) {
            await load();
            return;
        }

        imagesShown++;
        const validImages: string[] = [];
        imageLoopDelayMap.forEach((v, k) => {
            if (v <= 0) {
                validImages.push(k);
            } else {
                imageLoopDelayMap.set(k, v - 1);
            }
        });
        
        const image = validImages[Math.floor(Math.random() * validImages.length)];
        
        try {
            let res = await fetch(image);
            let blob = await res.blob();
            imageLoopDelayMap.set(image, minimumLoop);

            nextImageURL = URL.createObjectURL(blob);
            showImage = false;
        } catch (e) {
            console.error(e);
            await queueNextImage();
        }
    }

    const delayedQueueNextImage = () => window.setTimeout(queueNextImage, holdTime);

    function fadeInNextImage() {
        URL.revokeObjectURL(currentImageURL);
        currentImageURL = nextImageURL;
        showImage = true;
    }

    async function updateHours() {
        const res = await fetch('/api/calendar');
        const data = await res.json() as DayScheduleAPI[];

        schedule = data.map(e => {
            return {
                day: dayjs(e.day),
                ranges: e.ranges.map(r => {
                    return {
                        start: dayjs(r.start),
                        end: dayjs(r.end)
                    }
                })
            }
        });

        roomStatus = getRoomStatus(schedule);

        window.setTimeout(updateHours, calendarUpdate);
    }

    async function load() {
        images = await getImages();
        imagesShown = 0;
        imageLoopDelayMap = new Map<string, number>();
        images.forEach(i => imageLoopDelayMap.set(i, 0));
        await queueNextImage();
        fadeInNextImage();
        updateHours();
    }

    load();
</script>

<div class="page">
    <div class="content" class:reverse={reverseContent}>
        <div class="hours">
            <div class="title">Hours</div>
            <div class="schedule">
                {#each getScheduleRanges(schedule) as days}
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
            {#if imagesShown}
                <img src={currentImageURL} alt="" class="image" in:fade={{duration: fadeInTime}} out:fade={{duration: fadeOutTime}} on:introend={delayedQueueNextImage} on:outroend={fadeInNextImage}/>
            {/if}
        </div>
    </div>
    
    <div class="footer">
        <div class="logos">
            <img src="/logo.svg" class="gear" alt="Makerspace Logo"/>
            <img src="/makerspace.png" class="logo" alt="UMass Amherst | Makerspace"/>
        </div>
        <div class="nowWrapper">
            <div class="now">
                {#if roomStatus.open}
                    <div class="open nowText">OPEN</div>
                    <div class="subtitle">{roomStatus.until}</div>
                {:else}
                    <div class="closed nowText">CLOSED</div>
                    <div class="subtitle">{roomStatus.until}</div>
                {/if}
            </div>
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
        flex-direction: row;
        justify-content: center;
        align-items: stretch;
        flex: 1;
        height: 85dvh;
        gap: 20vh;
        padding: 5vh 5vw;
    }

    .content.reverse {
        flex-direction: row-reverse;
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
        gap: 1vh;
        
        min-width: 40vmin;
    }


    .schedule:before {
        content: "";
        border: 1px solid #f1f3f9;
        align-self: stretch;
    }

    .schedule {
        display: flex;
        flex-direction: column;
        justify-content: stretch;
        align-items: center;
        gap: 2vh;
    }

    .range {
        display: flex;
        flex-direction: row;
        justify-content: stretch;
        align-items: top;
        width: 100%;
        gap: 2vw;
    }

    .day {
        font-size: 4vh;
        justify-self: left;
    }

    .times {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: end;
        flex: 1;
        gap: 0.75vh;
        font-size: 2vh;
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