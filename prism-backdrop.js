/* <prism-backdrop> — verbatim port of the Prism gradient shader (WebGL2). Only the palette is changed:
   dark = the site's navy, bright streaks = the site's glow periwinkle / text white. Layer is blended with
   `screen` at low opacity by the page, so the dark parts add nothing and only the streaks read as glow. */
(() => {
  const PRISM = { colors: ["#05070d", "#6e8cff", "#e9edf7"], rotation: -50, proportion: 1, scale: 0.01, speed: 30, distortion: 0, swirl: 50, swirlIterations: 16, softness: 47, offset: -299, shapeSize: 45 };
  const VS = `#version 300 es
in vec4 a_position;
void main() {
  gl_Position = a_position;
}`;
  const FS = `#version 300 es
precision highp float;

uniform float u_time;
uniform float u_pixelRatio;
uniform vec2 u_resolution;
uniform float u_scale;
uniform float u_rotation;
uniform vec4 u_color1;
uniform vec4 u_color2;
uniform vec4 u_color3;
uniform float u_proportion;
uniform float u_softness;
uniform float u_shapeScale;
uniform float u_distortion;
uniform float u_swirl;
uniform float u_swirlIterations;

out vec4 fragColor;

#define TWO_PI 6.28318530718
#define PI 3.14159265358979323846

vec2 rotate(vec2 uv, float th) {
  return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
}

float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float noise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  float a = random(i);
  float b = random(i + vec2(1.0, 0.0));
  float c = random(i + vec2(0.0, 1.0));
  float d = random(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

vec4 blendColors(vec4 c1, vec4 c2, vec4 c3, float mixer, float edgesWidth, float edgeBlur) {
  vec3 color1 = c1.rgb * c1.a;
  vec3 color2 = c2.rgb * c2.a;
  vec3 color3 = c3.rgb * c3.a;
  float r1 = smoothstep(.0 + .35 * edgesWidth, .7 - .35 * edgesWidth + .5 * edgeBlur, mixer);
  float r2 = smoothstep(.3 + .35 * edgesWidth, 1. - .35 * edgesWidth + edgeBlur, mixer);
  vec3 blendedColor2 = mix(color1, color2, r1);
  float blendedOpacity2 = mix(c1.a, c2.a, r1);
  vec3 color = mix(blendedColor2, color3, r2);
  float opacity = mix(blendedOpacity2, c3.a, r2);
  return vec4(color, opacity);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float time = .5 * u_time;
  float noiseScale = .0005 + .006 * u_scale;

  uv -= .5;
  uv *= noiseScale * u_resolution;
  uv = rotate(uv, u_rotation * .5 * PI);
  uv /= u_pixelRatio;
  uv += .5;

  float n1 = noise(uv + time);
  float n2 = noise(uv * 2. - time);
  float angle = n1 * TWO_PI;
  uv.x += 4. * u_distortion * n2 * cos(angle);
  uv.y += 4. * u_distortion * n2 * sin(angle);

  float iterations = ceil(clamp(u_swirlIterations, 1., 30.));
  for (float i = 1.; i <= iterations; i++) {
    uv.x += clamp(u_swirl, 0., 2.) / i * cos(time + i * 1.5 * uv.y);
    uv.y += clamp(u_swirl, 0., 2.) / i * cos(time + i * uv.x);
  }

  float proportion = clamp(u_proportion, 0., 1.);
  vec2 checksUv = uv * (.5 + 3.5 * u_shapeScale);
  float shape = .5 + .5 * sin(checksUv.x) * cos(checksUv.y);
  float mixer = shape + .48 * sign(proportion - .5) * pow(abs(proportion - .5), .5);
  vec4 colorMix = blendColors(
    u_color1,
    u_color2,
    u_color3,
    mixer,
    1. - clamp(u_softness, 0., 1.),
    .01 + .01 * u_scale
  );
  // DR1PD: emit luminance as alpha (premultiplied) so dark regions are transparent and only the
  // bright streaks composite over the page — same result as CSS screen-blend, without a blend layer
  // (Safari drops hardware <video> decoding when a fixed mix-blend-mode layer shares the GPU).
  float lum = dot(colorMix.rgb, vec3(0.299, 0.587, 0.114));
  fragColor = vec4(colorMix.rgb * lum, lum);
}
`;
  const hexToRgba = (hex) => { const v = hex.replace("#", ""); const e = v.length === 3 ? v.split("").map(c => c + c).join("") : v; return [parseInt(e.slice(0, 2), 16) / 255, parseInt(e.slice(2, 4), 16) / 255, parseInt(e.slice(4, 6), 16) / 255, e.length === 8 ? parseInt(e.slice(6, 8), 16) / 255 : 1]; };
  class PrismBackdrop extends HTMLElement {
    connectedCallback() {
      this.style.cssText = "position:absolute; inset:0; display:block; pointer-events:none; overflow:hidden;";
      const canvas = document.createElement("canvas"); canvas.style.cssText = "display:block; width:100%; height:100%; opacity:0; transition:opacity .45s ease;"; this.appendChild(canvas);
      const gl = canvas.getContext("webgl2", { premultipliedAlpha: true, alpha: true, antialias: true }); if (!gl) return;
      const compile = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { gl.deleteShader(s); return null; } return s; };
      const vs = compile(gl.VERTEX_SHADER, VS), fs = compile(gl.FRAGMENT_SHADER, FS); if (!vs || !fs) return;
      const program = gl.createProgram(); gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program); if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return; gl.useProgram(program);
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(program, "a_position"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      const u = (n) => gl.getUniformLocation(program, n);
      const U = { time: u("u_time"), resolution: u("u_resolution"), pixelRatio: u("u_pixelRatio"), scale: u("u_scale"), rotation: u("u_rotation"), color1: u("u_color1"), color2: u("u_color2"), color3: u("u_color3"), proportion: u("u_proportion"), softness: u("u_softness"), shapeScale: u("u_shapeScale"), distortion: u("u_distortion"), swirl: u("u_swirl"), swirlIterations: u("u_swirlIterations") };
      const speed = parseFloat(this.getAttribute("speed") || "1");
      const colors = PRISM.colors.map(hexToRgba);
      const resize = () => { const pr = window.devicePixelRatio || 1; canvas.width = Math.max(1, Math.round(this.clientWidth * pr)); canvas.height = Math.max(1, Math.round(this.clientHeight * pr)); gl.viewport(0, 0, canvas.width, canvas.height); };
      resize(); this._ro = new ResizeObserver(resize); this._ro.observe(this);
      const startedAt = performance.now();
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const draw = (time) => {
        const elapsed = (time - startedAt) / 1000;
        const prismSpeed = (PRISM.speed / 100) * 5 * Math.max(0, speed);
        gl.uniform1f(U.time, elapsed * prismSpeed + PRISM.offset * 0.01);
        gl.uniform2f(U.resolution, canvas.width, canvas.height);
        gl.uniform1f(U.pixelRatio, window.devicePixelRatio || 1);
        gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform1f(U.scale, PRISM.scale);
        gl.uniform1f(U.rotation, (PRISM.rotation * Math.PI) / 180);
        gl.uniform4fv(U.color1, colors[0]); gl.uniform4fv(U.color2, colors[1]); gl.uniform4fv(U.color3, colors[2]);
        gl.uniform1f(U.proportion, PRISM.proportion / 100);
        gl.uniform1f(U.softness, PRISM.softness / 100);
        gl.uniform1f(U.shapeScale, PRISM.shapeSize / 100);
        gl.uniform1f(U.distortion, PRISM.distortion / 50);
        gl.uniform1f(U.swirl, PRISM.swirl / 100);
        gl.uniform1f(U.swirlIterations, PRISM.swirlIterations);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        if (!this._shown) { this._shown = true; canvas.style.opacity = "1"; }
        if (!reduceMotion && speed > 0 && !document.hidden) this._raf = requestAnimationFrame(draw);
      };
      this._onVis = () => { if (!document.hidden) { cancelAnimationFrame(this._raf); this._raf = requestAnimationFrame(draw); } };
      document.addEventListener("visibilitychange", this._onVis);
      this._raf = requestAnimationFrame(draw);
    }
    disconnectedCallback() { cancelAnimationFrame(this._raf); if (this._ro) this._ro.disconnect(); document.removeEventListener("visibilitychange", this._onVis); }
  }
  if (!customElements.get("prism-backdrop")) customElements.define("prism-backdrop", PrismBackdrop);
})();
