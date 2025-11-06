import type { Characters } from '$lib/constants';

import Ahri from '$lib/assets/chars/Ahri.png';
import Blitzcrank from '$lib/assets/chars/Blitzcrank.png';
import Braum from '$lib/assets/chars/Braum.png';
import Darius from '$lib/assets/chars/Darius.png';
import Ekko from '$lib/assets/chars/Ekko.png';
import Illaoi from '$lib/assets/chars/Illaoi.png';
import Jinx from '$lib/assets/chars/Jinx.png';
import Teemo from '$lib/assets/chars/Teemo.png';
import Vi from '$lib/assets/chars/Vi.png';
import Warwick from '$lib/assets/chars/Warwick.png';
import Yasuo from '$lib/assets/chars/Yasuo.png';

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
} as const satisfies Record<Characters, string>;
