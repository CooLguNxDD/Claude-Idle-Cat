import { defineTrailEvent } from '../types'

export default defineTrailEvent({
  id: 'patch-ghost', label: 'Patch ghost', kind: 'boss', moves: ['hiss', 'chase-tail', 'celebrate'], prop: 'ghost',
  seconds: 14, weight: 1, trails: ['pumpkin-patch'], line: 'Boo! A ghost! {cat} pounces',
})
