import type { ClientModule } from 'claude-code'

const ExpeditionKeys: ClientModule<{ names: string[]; trail: string }> = (props, surface) => {
  const { Text } = surface.elements
  surface.onKey(e => { if (props.names.length && ['left', 'right', 'return'].includes(e.key)) surface.post({ key: e.key }) })
  return <Text>{props.names.join(', ') || 'No cats at home'} · ← → choose · Enter sends to {props.trail}</Text>
}
export default ExpeditionKeys
