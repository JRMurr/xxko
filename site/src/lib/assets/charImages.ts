import type { Picture } from 'vite-imagetools';
import type { Characters } from '$lib/constants';

import Ahri from '$lib/assets/chars/Ahri.png?enhanced&w=192;384';
import Blitzcrank from '$lib/assets/chars/Blitzcrank.png?enhanced&w=192;384';
import Braum from '$lib/assets/chars/Braum.png?enhanced&w=192;384';
import Darius from '$lib/assets/chars/Darius.png?enhanced&w=192;384';
import Ekko from '$lib/assets/chars/Ekko.png?enhanced&w=192;384';
import Illaoi from '$lib/assets/chars/Illaoi.png?enhanced&w=192;384';
import Jinx from '$lib/assets/chars/Jinx.png?enhanced&w=192;384';
import Teemo from '$lib/assets/chars/Teemo.png?enhanced&w=192;384';
import Vi from '$lib/assets/chars/Vi.png?enhanced&w=192;384';
import Warwick from '$lib/assets/chars/Warwick.png?enhanced&w=192;384';
import Yasuo from '$lib/assets/chars/Yasuo.png?enhanced&w=192;384';

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
