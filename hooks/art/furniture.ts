import type { Slot } from '../../types'
import type { ColorName } from '../theme'
import { art } from './types'
import type { PixelArt } from './types'

type Furnishing = { slot: Slot; sprite: PixelArt; colors: Record<string, ColorName> }
const item = (id: string, slot: Slot, rows: string[], colors: Record<string, ColorName>): Furnishing => ({
  slot, sprite: art(`furniture.${id}`, [rows], [0, 0], slot === 'rug' ? 'back' : 'world'), colors,
})

export const FURNITURE_ART: Record<string, Furnishing> = {
  bowl: item('bowl', 'bowl', ['.bbbbbb.', 'bbbbbbbb', '.bffffb.'], { b: 'blue', f: 'peach' }),
  feeder: item('feeder', 'bowl', ['..bbbb..', '..bffb..', '..bffb..', '.bbbbbb.', 'bbbbbbbb'], { b: 'sapphire', f: 'peach' }),
  sushi: item('sushi', 'bowl', ['..rrrr..', '.rwwwwr.', '.rrrrrr.', 'rrrrrrrr'], { r: 'red', w: 'rosewater' }),
  goldbowl: item('goldbowl', 'bowl', ['.yyyyyy.', 'yyyyyyyy', '.yffffy.'], { y: 'yellow', f: 'peach' }),
  box: item('box', 'bed', ['pppppppp', 'p......p', 'p......p', 'pppppppp'], { p: 'peach' }),
  cozy: item('cozy', 'bed', ['.llllll.', 'mmmmmmmm', 'mmmmmmmm', '.mmmmmm.'], { l: 'lavender', m: 'mauve' }),
  heated: item('heated', 'bed', ['.yyyyyy.', 'rrrrrrrr', 'rrrrrrrr', '.rrrrrr.'], { y: 'yellow', r: 'red' }),
  yarn: item('yarn', 'toy', ['.rr.', 'rrrr', 'rrrr', '.rr.'], { r: 'maroon' }),
  wand: item('wand', 'toy', ['...pp', '..pp.', '.ss..', 'ss...'], { p: 'pink', s: 'overlay2' }),
  laser: item('laser', 'toy', ['.r.', 'rRr', '.r.'], { r: 'red', R: 'pink' }),
  tree: item('tree', 'toy', ['ssssss', '......', '...pp.', '...pp.', 'ssssss', '...pp.', '...pp.', '...pp.', '...pp.', '...pp.'], { s: 'surface2', p: 'peach' }),
  beachball: item('beachball', 'toy', ['.yyy.', 'yrrby', 'yrbby', 'ybbby', '.yyy.'], { y: 'yellow', r: 'red', b: 'blue' }),
  rug: item('rug', 'rug', ['.pppppppppppppp.', 'pppppppppppppppp'], { p: 'pink' }),
  quilt: item('quilt', 'rug', ['tptyptyptyptyptp', 'ptyptyptyptyptyt'], { t: 'teal', p: 'pink', y: 'yellow' }),
  sakura: item('sakura', 'rug', ['.pppppppppppppp.', 'pprppprppprppprp'], { p: 'pink', r: 'rosewater' }),
  rainbow: item('rainbow', 'rug', ['.rpygtbmrpygtbm.', 'rpygtbmrpygtbmrp'], { r: 'red', p: 'pink', y: 'yellow', g: 'green', t: 'teal', b: 'blue', m: 'mauve' }),
  cactus: item('cactus', 'plant', ['..g..', '.ggg.', '..g..', '..g..', '.ppp.'], { g: 'green', p: 'maroon' }),
  catnip: item('catnip', 'plant', ['.tgt.', 'ggggg', '.ggg.', '..g..', '.ppp.'], { t: 'teal', g: 'green', p: 'maroon' }),
  jackolantern: item('jackolantern', 'plant', ['..g..', '.ppp.', 'py.yp', 'ppppp'], { g: 'green', p: 'peach', y: 'yellow' }),
  birds: item('birds', 'hanging', ['..s..', '..s..', '.ppp.', 'bb.bb'], { s: 'overlay1', p: 'maroon', b: 'blue' }),
  lantern: item('lantern', 'hanging', ['..s..', '.rrr.', 'ryyyr', '.rrr.'], { s: 'overlay1', r: 'red', y: 'yellow' }),
  chime: item('chime', 'hanging', ['sssss', '.s.s.', '.s.s.', 's.s.s'], { s: 'sky' }),
  snowglobe: item('snowglobe', 'hanging', ['..s..', '.www.', 'w.w.w', '.www.', '..p..'], { s: 'overlay1', w: 'rosewater', p: 'peach' }),
  moonlamp: item('moonlamp', 'hanging', ['..s..', '.yyy.', 'y...y', '.yyy.', '..y..'], { s: 'overlay1', y: 'yellow' }),
}
