import type { PageLoad } from './$types';
import { PUBLIC_DEFAULT_CALENDAR_UPDATE_TIME, PUBLIC_DEFAULT_IMAEG_HOLD_DURATION, PUBLIC_DEFAULT_IMAGE_FADE_IN_DURATION, PUBLIC_DEFAULT_IMAGE_FADE_OUT_DURATION, PUBLIC_DEFAULT_IMAGE_LOOP_DELAY, PUBLIC_DEFAULT_IMAGE_RELOAD_EVERY, PUBLIC_DEFAULT_REVERSE_CONTENT } from '$env/static/public';

export const ssr = false;
export const load: PageLoad = ({ url }) => {
    const imageFadeInTime = Number.parseFloat(url.searchParams.get('fadeIn') || PUBLIC_DEFAULT_IMAGE_FADE_IN_DURATION);
    if (!Number.isInteger(imageFadeInTime)) throw new Error('Invalid fade in time');
    
    const imageFadeOutTime = Number.parseFloat(url.searchParams.get('fadeOut') || PUBLIC_DEFAULT_IMAGE_FADE_OUT_DURATION);
    if (!Number.isInteger(imageFadeOutTime)) throw new Error('Invalid fade out time');

    const imageHoldTime = Number.parseFloat(url.searchParams.get('hold') || PUBLIC_DEFAULT_IMAEG_HOLD_DURATION);
    if (!Number.isInteger(imageHoldTime)) throw new Error('Invalid hold time');

    const imageLoopDelay = Number.parseFloat(url.searchParams.get('loop') || PUBLIC_DEFAULT_IMAGE_LOOP_DELAY);
    if (!Number.isInteger(imageLoopDelay)) throw new Error('Invalid loop delay');

    const imageReloadEvery = Number.parseFloat(url.searchParams.get('reload') || PUBLIC_DEFAULT_IMAGE_RELOAD_EVERY);
    if (!Number.isInteger(imageReloadEvery)) throw new Error('Invalid reload every');

    const calendarUpdateTime = Number.parseFloat(url.searchParams.get('calendar') || PUBLIC_DEFAULT_CALENDAR_UPDATE_TIME);
    if (!Number.isInteger(calendarUpdateTime)) throw new Error('Invalid calendar update time');

    const reverseContent = (url.searchParams.get('reverse') || PUBLIC_DEFAULT_REVERSE_CONTENT || '') === 'true';

	return {
		imageFadeInTime,
        imageFadeOutTime,
        imageHoldTime,
        imageLoopDelay,
        imageReloadEvery,
        calendarUpdateTime,
        reverseContent
	};
};