// DR1PD glass surface — ported from GlassSurface (ReactBits): SVG displacement-map refraction with
// RGB channel split, applied as a backdrop-filter on every [data-glass] element. Chromium renders the
// SVG filter; Safari/Firefox fall back to plain blur + saturate (set via html[data-glass-fx]).
(function () {
  var ua = navigator.userAgent;
  var isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  var isFirefox = /firefox/i.test(ua);
  var svgOK = !isSafari && !isFirefox && typeof CSS !== 'undefined' && CSS.supports && CSS.supports('backdrop-filter', 'url(#x)');
  document.documentElement.setAttribute('data-glass-fx', svgOK ? 'svg' : 'plain');
  if (!svgOK) return;

  // Displacement map: red ramps left→right, blue ramps top→bottom, a soft neutral plate in the middle,
  // so refraction only happens along the rim of the pane (the Apple "lens edge").
  var W = 400, H = 300, R = 40, EDGE = 18, BRIGHT = 50, OPACITY = 0.93, BLUR = 11;
  var map =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '">' +
    '<defs>' +
    '<linearGradient id="r" x1="100%" y1="0%" x2="0%" y2="0%"><stop offset="0%" stop-color="#0000"/><stop offset="100%" stop-color="red"/></linearGradient>' +
    '<linearGradient id="b" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#0000"/><stop offset="100%" stop-color="blue"/></linearGradient>' +
    '</defs>' +
    '<rect width="' + W + '" height="' + H + '" fill="black"/>' +
    '<rect width="' + W + '" height="' + H + '" rx="' + R + '" fill="url(#r)"/>' +
    '<rect width="' + W + '" height="' + H + '" rx="' + R + '" fill="url(#b)" style="mix-blend-mode:difference"/>' +
    '<rect x="' + EDGE + '" y="' + EDGE + '" width="' + (W - 2 * EDGE) + '" height="' + (H - 2 * EDGE) + '" rx="' + (R - EDGE) + '" fill="hsl(0 0% ' + BRIGHT + '% / ' + OPACITY + ')" style="filter:blur(' + BLUR + 'px)"/>' +
    '</svg>';
  var href = 'data:image/svg+xml,' + encodeURIComponent(map);

  var SCALE = -70, DISPLACE = 0.6, RO = 0, GO = 6, BO = 12;
  var ns = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
  svg.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML =
    '<defs><filter id="dr1pd-glass" color-interpolation-filters="sRGB" x="0" y="0" width="100%" height="100%">' +
    '<feImage x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map" href="' + href + '"/>' +
    '<feDisplacementMap in="SourceGraphic" in2="map" xChannelSelector="R" yChannelSelector="B" scale="' + (SCALE + RO) + '" result="dR"/>' +
    '<feColorMatrix in="dR" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="red"/>' +
    '<feDisplacementMap in="SourceGraphic" in2="map" xChannelSelector="R" yChannelSelector="B" scale="' + (SCALE + GO) + '" result="dG"/>' +
    '<feColorMatrix in="dG" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="green"/>' +
    '<feDisplacementMap in="SourceGraphic" in2="map" xChannelSelector="R" yChannelSelector="B" scale="' + (SCALE + BO) + '" result="dB"/>' +
    '<feColorMatrix in="dB" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="blue"/>' +
    '<feBlend in="red" in2="green" mode="screen" result="rg"/>' +
    '<feBlend in="rg" in2="blue" mode="screen" result="rgb"/>' +
    '<feGaussianBlur in="rgb" stdDeviation="' + DISPLACE + '"/>' +
    '</filter></defs>';
  var mount = function () { if (!document.getElementById('dr1pd-glass')) document.body.insertBefore(svg, document.body.firstChild); };
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
