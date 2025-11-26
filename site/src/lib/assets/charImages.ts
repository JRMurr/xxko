import type { Picture } from 'vite-imagetools';
import type { Characters } from '$lib/constants';

import Ahri from '$lib/assets/chars/Ahri.png?enhanced&w=192;384&as=picture';
import Blitzcrank from '$lib/assets/chars/Blitzcrank.png?enhanced&w=192;384&as=picture';
import Braum from '$lib/assets/chars/Braum.png?enhanced&w=192;384&as=picture';
import Darius from '$lib/assets/chars/Darius.png?enhanced&w=192;384&as=picture';
import Ekko from '$lib/assets/chars/Ekko.png?enhanced&w=192;384&as=picture';
import Illaoi from '$lib/assets/chars/Illaoi.png?enhanced&w=192;384&as=picture';
import Jinx from '$lib/assets/chars/Jinx.png?enhanced&w=192;384&as=picture';
import Teemo from '$lib/assets/chars/Teemo.png?enhanced&w=192;384&as=picture';
import Vi from '$lib/assets/chars/Vi.png?enhanced&w=192;384&as=picture';
import Warwick from '$lib/assets/chars/Warwick.png?enhanced&w=192;384&as=picture';
import Yasuo from '$lib/assets/chars/Yasuo.png?enhanced&w=192;384&as=picture';

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
