// Lightweight in-game performance panel (no external dependencies)
// Shows FPS (instant & moving average) and key three.js renderer.info metrics.
export class PerformancePanel {
  constructor(renderer) {
    this.renderer = renderer;
    this.lastTime = performance.now();
    this.fps = 0;
    this.avgFps = 0;
    this._fpsSamples = [];
    this._maxSamples = 120; // ~2 seconds at 60fps
    this._sinceLastDom = 0;
    this._updateEveryMs = 250; // Update panel 4x per second
    this.element = this._createElement();
  }

  _createElement() {
    let el = document.getElementById('perf-panel');
    if (!el) {
      el = document.createElement('div');
      el.id = 'perf-panel';
      el.style.cssText = [
        'position:fixed',
        'left:8px',
        'top:8px',
        'padding:6px 8px',
        'background:rgba(0,0,0,0.55)',
        'font:12px/1.2 "Courier New",monospace',
        'color:#0ff',
        'z-index:3000',
        'border:1px solid #044',
        'border-radius:4px',
        'pointer-events:none',
        'user-select:none',
        'white-space:pre',
        'min-width:130px'
      ].join(';');
      el.textContent = 'FPS --\nAVG --\nDC 0 TRI 0\nGEO 0 TEX 0';
      document.body.appendChild(el);
    }
    return el;
  }

  update() {
    const now = performance.now();
    const dt = now - this.lastTime;
    this.lastTime = now;
    if (dt > 0) {
      const instFps = 1000 / dt;
      this.fps = instFps;
      this._fpsSamples.push(instFps);
      if (this._fpsSamples.length > this._maxSamples) this._fpsSamples.shift();
    }
    this._sinceLastDom += dt;
    if (this._sinceLastDom >= this._updateEveryMs) {
      this._sinceLastDom = 0;
      // Moving average
      let sum = 0; for (let v of this._fpsSamples) sum += v; this.avgFps = sum / (this._fpsSamples.length || 1);
      const info = this.renderer.info;
      const calls = info.render.calls;
      const triangles = info.render.triangles;
      const geos = info.memory.geometries;
      const tex = info.memory.textures;
      const fpsStr = this.fps.toFixed(0).padStart(2, ' ');
      const avgStr = this.avgFps.toFixed(0).padStart(2, ' ');
      this.element.textContent = `FPS ${fpsStr}\nAVG ${avgStr}\nDC ${calls} TRI ${triangles}\nGEO ${geos} TEX ${tex}`;
    }
  }
}
