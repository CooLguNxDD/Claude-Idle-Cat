// Draws a game Frame: a WebGL2 texture scaled with crisp pixels, glow on bright pixels and an optional CRT pass.
import type { Frame } from '../hooks/arcade/engine'

export type Effect = 'glow' | 'crt'
export type Renderer = {
  kind: 'webgl' | 'canvas'
  draw: (f: Frame) => void
  resize: (width: number, height: number) => void
  set: (effect: Effect, isOn: boolean) => void
  isOn: (effect: Effect) => boolean
}

const VERTEX = `#version 300 es
in vec2 corner;
out vec2 uv;
void main() {
  uv = vec2(corner.x * 0.5 + 0.5, 0.5 - corner.y * 0.5);
  gl_Position = vec4(corner, 0.0, 1.0);
}`

// Glow adds a blur of the bright pixels; CRT bends the screen, darkens between pixel rows and the corners.
const FRAGMENT = `#version 300 es
precision mediump float;
uniform sampler2D frame;
uniform vec2 size;
uniform float glow;
uniform float crt;
in vec2 uv;
out vec4 color;
void main() {
  vec2 p = uv;
  if (crt > 0.5) {
    vec2 c = p * 2.0 - 1.0;
    c *= 1.0 + 0.045 * dot(c, c);
    p = c * 0.5 + 0.5;
    if (p.x < 0.0 || p.y < 0.0 || p.x > 1.0 || p.y > 1.0) { color = vec4(0.0, 0.0, 0.0, 1.0); return; }
  }
  vec3 base = texture(frame, p).rgb;
  if (glow > 0.5) {
    vec3 sum = vec3(0.0);
    for (int x = -2; x <= 2; x++) {
      for (int y = -2; y <= 2; y++) {
        vec3 s = texture(frame, p + vec2(float(x), float(y)) / size).rgb;
        float light = max(s.r, max(s.g, s.b)) - min(s.r, min(s.g, s.b)) * 0.5;
        sum += s * smoothstep(0.55, 0.95, light);
      }
    }
    base += sum / 25.0 * 0.9;
  }
  if (crt > 0.5) {
    float row = fract(p.y * size.y);
    base *= 0.78 + 0.22 * smoothstep(0.0, 0.35, row) * smoothstep(1.0, 0.65, row);
    vec2 v = p * (1.0 - p);
    base *= clamp(pow(v.x * v.y * 18.0, 0.18), 0.0, 1.0);
  }
  color = vec4(base, 1.0);
}`

const toRgba = (f: Frame, out: Uint8ClampedArray) => {
  for (let i = 0; i < f.px.length; i++) {
    const c = f.px[i] ?? 0
    out[i * 4] = (c >> 16) & 255
    out[i * 4 + 1] = (c >> 8) & 255
    out[i * 4 + 2] = c & 255
    out[i * 4 + 3] = 255
  }
}

const compile = (gl: WebGL2RenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('shader')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'shader')
  return shader
}

const webgl = (canvas: HTMLCanvasElement, w: number, h: number): Renderer | null => {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false })
  if (!gl) return null
  try {
    const program = gl.createProgram()
    if (!program) return null
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX))
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null
    gl.useProgram(program)
    const quad = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, quad)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const corner = gl.getAttribLocation(program, 'corner')
    gl.enableVertexAttribArray(corner)
    gl.vertexAttribPointer(corner, 2, gl.FLOAT, false, 0, 0)
    const texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST],
      [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]] as const) gl.texParameteri(gl.TEXTURE_2D, k, v)
    gl.uniform2f(gl.getUniformLocation(program, 'size'), w, h)
    const glowAt = gl.getUniformLocation(program, 'glow')
    const crtAt = gl.getUniformLocation(program, 'crt')
    const effects = { glow: true, crt: false }
    const rgba = new Uint8ClampedArray(w * h * 4)
    return {
      kind: 'webgl',
      draw: f => {
        toRgba(f, rgba)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, rgba)
        gl.uniform1f(glowAt, effects.glow ? 1 : 0)
        gl.uniform1f(crtAt, effects.crt ? 1 : 0)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      },
      resize: (width, height) => {
        canvas.width = Math.round(width)
        canvas.height = Math.round(height)
        gl.viewport(0, 0, canvas.width, canvas.height)
      },
      set: (effect, isOn) => { effects[effect] = isOn },
      isOn: effect => effects[effect],
    }
  } catch {
    return null
  }
}

// Without WebGL: the same pixels on a 2D canvas, scaled with smoothing off.
const plain = (canvas: HTMLCanvasElement, w: number, h: number): Renderer => {
  const ctx = canvas.getContext('2d')
  const small = document.createElement('canvas')
  small.width = w
  small.height = h
  const sctx = small.getContext('2d')
  const image = sctx?.createImageData(w, h)
  return {
    kind: 'canvas',
    draw: f => {
      if (!ctx || !sctx || !image) return
      toRgba(f, image.data)
      sctx.putImageData(image, 0, 0)
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(small, 0, 0, canvas.width, canvas.height)
    },
    resize: (width, height) => {
      canvas.width = Math.round(width)
      canvas.height = Math.round(height)
    },
    set: () => undefined,
    isOn: () => false,
  }
}

// A canvas that took a WebGL context cannot give a 2D one, so the fallback gets a fresh canvas in its place.
export const createRenderer = (canvas: HTMLCanvasElement, w: number, h: number): Renderer => {
  const gl = webgl(canvas, w, h)
  if (gl) return gl
  const fresh = canvas.cloneNode() as HTMLCanvasElement
  canvas.replaceWith(fresh)
  return plain(fresh, w, h)
}
