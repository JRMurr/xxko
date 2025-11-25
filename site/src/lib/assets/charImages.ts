import type { Characters } from '$lib/constants';
import type { Picture } from 'vite-imagetools';
import Ahri from '$lib/assets/chars/Ahri.png?enhanced';
import Blitzcrank from '$lib/assets/chars/Blitzcrank.png?enhanced';
import Braum from '$lib/assets/chars/Braum.png?enhanced';
import Darius from '$lib/assets/chars/Darius.png?enhanced';
import Ekko from '$lib/assets/chars/Ekko.png?enhanced';
import Illaoi from '$lib/assets/chars/Illaoi.png?enhanced';
import Jinx from '$lib/assets/chars/Jinx.png?enhanced';
import Teemo from '$lib/assets/chars/Teemo.png?enhanced';
import Vi from '$lib/assets/chars/Vi.png?enhanced';
import Warwick from '$lib/assets/chars/Warwick.png?enhanced';
import Yasuo from '$lib/assets/chars/Yasuo.png?enhanced';

export const charImages = {
	Ahri,
	Blitzcrank,
	Braum,
	Darius,
	Ekko,
	Illaoi,
	Jinx,
	Teemo,
	Vi,
	Warwick,
	Yasuo
} as const satisfies Record<Characters, Picture>;
