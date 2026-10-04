// <ascii-text> — port of React Bits ASCIIText (from https://codepen.io/JuanFuentes/pen/eYEeoyE) to a plain web
// component. three.js (global THREE, UMD build) must be loaded before this file. Waves, mouse-tilt, RGB shift and
// ASCII rasterisation are verbatim; only the glyph colours are retinted to the DR1PD palette.
(function () {
  var vertexShader = [
    'varying vec2 vUv; uniform float uTime; uniform float mouse; uniform float uEnableWaves;',
    'void main(){ vUv = uv; float time = uTime * 5.; float waveFactor = uEnableWaves; vec3 transformed = position;',
    ' transformed.x += sin(time + position.y) * 0.5 * waveFactor; transformed.y += cos(time + position.z) * 0.15 * waveFactor;',
    ' transformed.z += sin(time + position.x) * waveFactor; gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0); }'
  ].join('\n');
  var fragmentShader = [
    'varying vec2 vUv; uniform float mouse; uniform float uTime; uniform sampler2D uTexture;',
    'void main(){ float time = uTime; vec2 pos = vUv;',
    ' float r = texture2D(uTexture, pos + cos(time * 2. - time + pos.x) * .01).r;',
    ' float g = texture2D(uTexture, pos + tan(time * .5 + pos.x - time) * .01).g;',
    ' float b = texture2D(uTexture, pos - cos(time * 2. + time + pos.y) * .01).b;',
    ' float a = texture2D(uTexture, pos).a; gl_FragColor = vec4(r, g, b, a); }'
  ].join('\n');
  var map = function (n, a, b, c, d) { return ((n - a) / (b - a)) * (d - c) + c; };
  var PX_RATIO = window.devicePixelRatio || 1;
  var CHARSET = ' .\'`^",:;Il!i~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$';

  function AsciiFilter(renderer, o) {
    this.renderer = renderer;
    this.domElement = document.createElement('div');
    this.domElement.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';
    this.pre = document.createElement('pre');
    this.domElement.appendChild(this.pre);
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;image-rendering:pixelated;opacity:0;';
    this.context = this.canvas.getContext('2d', { willReadFrequently: true });
    this.domElement.appendChild(this.canvas);
    this.deg = 0; this.invert = o.invert !== false; this.fontSize = o.fontSize || 12;
    this.fontFamily = o.fontFamily || "'Courier New', monospace"; this.charset = CHARSET;
    this.context.imageSmoothingEnabled = false;
    this.hueRange = o.hueRange == null ? 1 : o.hueRange;
    this.onMouseMove = this.onMouseMove.bind(this);
    document.addEventListener('mousemove', this.onMouseMove, { passive: true });
  }
  AsciiFilter.prototype.setSize = function (w, h) {
    this.width = w; this.height = h; this.renderer.setSize(w, h); this.reset();
    this.center = { x: w / 2, y: h / 2 }; this.mouse = { x: this.center.x, y: this.center.y };
  };
  AsciiFilter.prototype.reset = function () {
    this.context.font = this.fontSize + 'px ' + this.fontFamily;
    var charWidth = this.context.measureText('A').width;
    this.cols = Math.floor(this.width / (this.fontSize * (charWidth / this.fontSize)));
    this.rows = Math.floor(this.height / this.fontSize);
    this.canvas.width = this.cols; this.canvas.height = this.rows;
    var p = this.pre.style;
    p.fontFamily = this.fontFamily; p.fontSize = this.fontSize + 'px'; p.margin = '0'; p.padding = '0'; p.lineHeight = '1em';
    p.position = 'absolute'; p.left = '0'; p.top = '0'; p.zIndex = '9'; p.backgroundAttachment = 'fixed'; p.mixBlendMode = 'difference';
    p.userSelect = 'none'; p.textAlign = 'left'; p.pointerEvents = 'none';
    p.backgroundImage = 'radial-gradient(circle, #e9edf7 0%, #8fb0ff 50%, #c9d6ff 100%)';
    p.webkitTextFillColor = 'transparent'; p.webkitBackgroundClip = 'text'; p.backgroundClip = 'text';
  };
  AsciiFilter.prototype.render = function (scene, camera) {
    this.renderer.render(scene, camera);
    var w = this.canvas.width, h = this.canvas.height;
    this.context.clearRect(0, 0, w, h);
    if (w && h) this.context.drawImage(this.renderer.domElement, 0, 0, w, h);
    this.asciify(this.context, w, h); this.hue();
  };
  AsciiFilter.prototype.onMouseMove = function (e) { this.mouse = { x: e.clientX * PX_RATIO, y: e.clientY * PX_RATIO }; };
  AsciiFilter.prototype.hue = function () {
    if (!this.mouse || !this.center) return;
    var deg = (Math.atan2(this.mouse.y - this.center.y, this.mouse.x - this.center.x) * 180) / Math.PI;
    this.deg += (deg - this.deg) * 0.075;
    this.domElement.style.filter = 'hue-rotate(' + (this.deg * this.hueRange).toFixed(1) + 'deg)';
  };
  AsciiFilter.prototype.asciify = function (ctx, w, h) {
    if (!(w && h)) return;
    var d = ctx.getImageData(0, 0, w, h).data, str = '', L = this.charset.length;
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var i = x * 4 + y * 4 * w, a = d[i + 3];
        if (a === 0) { str += ' '; continue; }
        var gray = (0.3 * d[i] + 0.6 * d[i + 1] + 0.1 * d[i + 2]) / 255;
        var idx = Math.floor((1 - gray) * (L - 1));
        if (this.invert) idx = L - idx - 1;
        str += this.charset[idx];
      }
      str += '\n';
    }
    this.pre.textContent = str;
  };
  AsciiFilter.prototype.dispose = function () { document.removeEventListener('mousemove', this.onMouseMove); };

  function CanvasTxt(txt, o) {
    this.canvas = document.createElement('canvas'); this.context = this.canvas.getContext('2d');
    this.txt = txt; this.fontSize = o.fontSize || 200; this.fontFamily = o.fontFamily || 'Arial'; this.color = o.color || '#fdf9f3';
    this.font = '600 ' + this.fontSize + 'px ' + this.fontFamily;
  }
  CanvasTxt.prototype.resize = function () {
    this.context.font = this.font; var m = this.context.measureText(this.txt);
    // generous padding: the wave shader displaces UVs and the glyphs overshoot measureText, so give the texture real breathing room
    this.padX = Math.ceil(this.fontSize * 0.6); this.padY = Math.ceil(this.fontSize * 0.25);
    this.canvas.width = Math.ceil(m.width) + this.padX * 2;
    this.canvas.height = Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) + this.padY * 2;
  };
  CanvasTxt.prototype.render = function () {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.fillStyle = this.color; this.context.font = this.font;
    var m = this.context.measureText(this.txt);
    this.context.fillText(this.txt, this.padX, this.padY + m.actualBoundingBoxAscent);
  };

  function CanvAscii(o, container, w, h) {
    this.o = o; this.container = container; this.width = w; this.height = h;
    this.camera = new THREE.PerspectiveCamera(45, w / h, 1, 1000); this.camera.position.z = 30;
    this.scene = new THREE.Scene(); this.mouse = { x: w / 2, y: h / 2 };
    this.onMouseMove = this.onMouseMove.bind(this);
  }
  CanvAscii.prototype.init = function () {
    var self = this, o = this.o;
    var ready = document.fonts ? Promise.all([
      document.fonts.load('600 200px "' + o.fontFamily + '"').catch(function () {}),
      document.fonts.load('500 12px "' + o.fontFamily + '"').catch(function () {})
    ]).then(function () { return document.fonts.ready; }) : Promise.resolve();
    return ready.then(function () { self.setMesh(); self.setRenderer(); });
  };
  CanvAscii.prototype.setMesh = function () {
    var o = this.o;
    this.textCanvas = new CanvasTxt(o.text, { fontSize: o.textFontSize, fontFamily: o.fontFamily, color: o.textColor });
    this.textCanvas.resize(); this.textCanvas.render();
    this.texture = new THREE.CanvasTexture(this.textCanvas.canvas); this.texture.minFilter = THREE.NearestFilter;
    var aspect = this.textCanvas.canvas.width / this.textCanvas.canvas.height;
    this.geometry = new THREE.PlaneGeometry(o.planeBaseHeight * aspect, o.planeBaseHeight, 36, 36);
    this.material = new THREE.ShaderMaterial({
      vertexShader: vertexShader, fragmentShader: fragmentShader, transparent: true,
      uniforms: { uTime: { value: 0 }, mouse: { value: 1.0 }, uTexture: { value: this.texture }, uEnableWaves: { value: o.enableWaves ? 1.0 : 0.0 } }
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material); this.scene.add(this.mesh);
  };
  CanvAscii.prototype.setRenderer = function () {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    this.renderer.setPixelRatio(1); this.renderer.setClearColor(0x000000, 0);
    this.filter = new AsciiFilter(this.renderer, { fontFamily: this.o.fontFamily, fontSize: this.o.asciiFontSize, invert: true, hueRange: this.o.hueRange });
    this.container.appendChild(this.filter.domElement);
    this.setSize(this.width, this.height);
    this.container.addEventListener('mousemove', this.onMouseMove, { passive: true });
    this.container.addEventListener('touchmove', this.onMouseMove, { passive: true });
  };
  CanvAscii.prototype.setSize = function (w, h) {
    this.width = w; this.height = h; this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.filter.setSize(w, h); this.fit();
  };
  // scale the text plane so it never exceeds ~86% of the visible frustum (leaves room for the wave + mouse tilt)
  CanvAscii.prototype.fit = function () {
    if (!this.mesh) return;
    var visH = 2 * this.camera.position.z * Math.tan(this.camera.fov * Math.PI / 360), visW = visH * this.camera.aspect;
    var p = this.geometry.parameters, s = Math.min(1, (visW * 0.98) / p.width, (visH * 0.98) / p.height);
    this.mesh.scale.set(s, s, s);
  };
  CanvAscii.prototype.onMouseMove = function (evt) {
    var e = evt.touches ? evt.touches[0] : evt, b = this.container.getBoundingClientRect();
    this.mouse = { x: e.clientX - b.left, y: e.clientY - b.top };
  };
  CanvAscii.prototype.animate = function () {
    var self = this;
    var frame = function () { self.raf = requestAnimationFrame(frame); if (!document.hidden) self.render(); };
    frame();
  };
  CanvAscii.prototype.render = function () {
    var time = Date.now() * 0.001;
    this.textCanvas.render(); this.texture.needsUpdate = true;
    this.mesh.material.uniforms.uTime.value = Math.sin(time);
    var x = map(this.mouse.y, 0, this.height, 0.5, -0.5), y = map(this.mouse.x, 0, this.width, -0.5, 0.5);
    this.mesh.rotation.x += (x - this.mesh.rotation.x) * 0.05; this.mesh.rotation.y += (y - this.mesh.rotation.y) * 0.05;
    this.filter.render(this.scene, this.camera);
  };
  CanvAscii.prototype.dispose = function () {
    cancelAnimationFrame(this.raf);
    if (this.filter) { this.filter.dispose(); if (this.filter.domElement.parentNode) this.container.removeChild(this.filter.domElement); }
    this.container.removeEventListener('mousemove', this.onMouseMove); this.container.removeEventListener('touchmove', this.onMouseMove);
    if (this.material) this.material.dispose(); if (this.geometry) this.geometry.dispose(); if (this.texture) this.texture.dispose();
    if (this.renderer) { this.renderer.dispose(); this.renderer.forceContextLoss(); }
  };

  class AsciiText extends HTMLElement {
    connectedCallback() {
      this.style.position = this.style.position || 'absolute'; this.style.inset = '0'; this.style.display = 'block';
      var self = this;
      // text fallback only when WebGL itself is unavailable (ASCII effect renders on phones too)
      var lite = (function () { try { var c = document.createElement('canvas'); return !(c.getContext('webgl') || c.getContext('experimental-webgl')); } catch (e) { return true; } })();
      if (lite) { self.setAttribute('data-ascii-fallback', ''); self.textContent = ''; var f = document.createElement('span'); f.textContent = self.getAttribute('text') || ''; f.style.cssText = "position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-family:'Cormorant Garamond',serif; font-size:clamp(2.4rem,9vw,4.2rem); letter-spacing:0.08em; color:#e9edf7; text-shadow:0 0 22px rgba(143,176,255,0.5), 0 0 60px rgba(95,125,255,0.25);"; self.appendChild(f); return; }
      var start = function () {
        if (!window.THREE) { setTimeout(start, 60); return; }
        var r = self.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) { self._io = new IntersectionObserver(function (es) { if (es[0].boundingClientRect.width > 0) { self._io.disconnect(); start(); } }); self._io.observe(self); return; }
        var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
        var opts = {
          text: self.getAttribute('text') || 'David!',
          asciiFontSize: (parseFloat(self.getAttribute('ascii-font-size')) || 8) * (r.width < 600 ? 0.6 : 1),
          textFontSize: parseFloat(self.getAttribute('text-font-size')) || 200,
          textColor: self.getAttribute('text-color') || '#fdf9f3',
          planeBaseHeight: parseFloat(self.getAttribute('plane-base-height')) || 8,
          enableWaves: reduced ? false : self.getAttribute('enable-waves') !== 'false',
          fontFamily: self.getAttribute('font-family') || 'IBM Plex Mono',
          hueRange: self.hasAttribute('hue-range') ? parseFloat(self.getAttribute('hue-range')) : 1
        };
        self._inst = new CanvAscii(opts, self, r.width, r.height);
        self._inst.init().then(function () {
          if (!self.isConnected) { self._inst.dispose(); return; }
          self._inst.animate();
          self._ro = new ResizeObserver(function (es) { var c = es[0].contentRect; if (c.width > 0 && c.height > 0 && self._inst) self._inst.setSize(c.width, c.height); });
          self._ro.observe(self);
        });
      };
      start();
    }
    disconnectedCallback() {
      if (this._io) this._io.disconnect(); if (this._ro) this._ro.disconnect();
      if (this._inst) { this._inst.dispose(); this._inst = null; }
    }
  }
  if (!customElements.get('ascii-text')) customElements.define('ascii-text', AsciiText);
})();
