const token = new URLSearchParams(location.search).get('t') ?? ''
const canvas = document.getElementById('yard')
const status = document.getElementById('status')
const ctx = canvas.getContext('2d')
let scale = 1

const fit = (width, height) => {
  const next = Math.max(1, Math.floor(Math.min((innerWidth - 16) / width, (innerHeight - 36) / height)))
  scale = next
  canvas.style.width = `${width * scale}px`
  canvas.style.height = `${height * scale}px`
}

const draw = frame => {
  if (!frame || !frame.width || !frame.height || !frame.rgba) return
  const bytes = Uint8Array.from(atob(frame.rgba), ch => ch.charCodeAt(0))
  if (bytes.length !== frame.width * frame.height * 4) return
  if (canvas.width !== frame.width || canvas.height !== frame.height) {
    canvas.width = frame.width
    canvas.height = frame.height
  }
  fit(frame.width, frame.height)
  ctx.putImageData(new ImageData(new Uint8ClampedArray(bytes), frame.width, frame.height), 0, 0)
  status.textContent = ''
}

addEventListener('resize', () => { if (canvas.width) fit(canvas.width, canvas.height) })
const events = new EventSource(`/pane/events?t=${encodeURIComponent(token)}`)
events.addEventListener('frame', event => {
  try { draw(JSON.parse(event.data)) } catch { status.textContent = 'The picture could not be read.' }
})
events.onerror = () => { status.textContent = 'Reopen this page from the cat pane while Claude Code is running.' }
