import type { ClientInit } from '@sveltejs/kit';
import { init as initPlausible } from '@plausible-analytics/tracker';

export const init: ClientInit = async () => {
	initPlausible({
		domain: 'xxko.video',
		captureOnLocalhost: false
	});
};
