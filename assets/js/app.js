/* Devamm Patel · portfolio
   Plain JavaScript, no dependencies. Five small parts:
   1. page chrome (theme, scroll spy, reveal)   4. "Ask this page" BM25 retriever
   2. role lens                                 5. live stream + anomaly detector
   3. hero pipeline animation                                                   */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cssVar = (name) => getComputedStyle(root).getPropertyValue(name).trim();

  /* ───────────── 1. Page chrome ───────────── */
  function initChrome() {
    $('#year').textContent = new Date().getFullYear();

    // Theme toggle: follows the system until the visitor chooses.
    $('#theme-toggle').addEventListener('click', () => {
      const current = root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      const next = current === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch (e) { /* private mode */ }
      window.dispatchEvent(new Event('themechange'));
    });
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => window.dispatchEvent(new Event('themechange')));

    // Reveal on scroll.
    const targets = $$('.sec-head, .job, .project, .paper, .creds article, .skill-row, .lead, .edu-grid article, .lab, .about-grid, .contact-links li, .also');
    if ('IntersectionObserver' in window && !reduceMotion) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
      }, { threshold: 0.06, rootMargin: '0px 0px -6% 0px' });
      targets.forEach((t) => { t.classList.add('reveal'); io.observe(t); });
    }

    // Scroll spy: light up the current pipeline stage.
    const stages = $$('[data-stage]');
    const links = $$('.top-nav a, .rail a');
    const setActive = (id) => {
      const idx = stages.findIndex((s) => s.id === id);
      links.forEach((a) => {
        const i = stages.findIndex((s) => '#' + s.id === a.getAttribute('href'));
        a.classList.toggle('on', i === idx);
        a.classList.toggle('done', i > -1 && i < idx);
      });
    };
    if ('IntersectionObserver' in window) {
      const spy = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); });
      }, { rootMargin: '-40% 0px -55% 0px' });
      stages.forEach((s) => spy.observe(s));
      window.addEventListener('scroll', () => { if (window.scrollY < 200) setActive(''); }, { passive: true });
    }
  }

  /* ───────────── 2. Role lens ─────────────
     One page, read five ways. A lens never hides anything: it reorders the
     projects, dims what is less relevant, and has its own shareable URL.   */
  function initLens() {
    const names = { all: 'Everything', de: 'Data Engineering', ds: 'Data Science', da: 'Analytics', ai: 'AI & Agents' };
    const buttons = $$('[data-lens-btn]');
    const tagged = $$('[data-lens]');
    const projects = $$('.project');
    const note = $('#lens-note');

    function apply(lens, { push = true } = {}) {
      if (!names[lens]) lens = 'all';
      document.body.dataset.lens = lens;
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lensBtn === lens)));

      tagged.forEach((el) => {
        const match = lens === 'all' || el.dataset.lens.split(' ').includes(lens);
        if (el.closest('.skill-row')) el.classList.toggle('lens-on', lens !== 'all' && match);
        else el.classList.toggle('lens-off', !match);
      });

      let lead = 0;
      projects.forEach((p, i) => {
        const match = lens === 'all' || p.dataset.lens.split(' ').includes(lens);
        if (match) lead++;
        p.style.order = match ? i : 100 + i;
      });

      if (lens === 'all') {
        note.textContent = '';
      } else {
        note.innerHTML = `Reading as <b>${names[lens]}</b>: ${lead} of ${projects.length} projects lead and the rest are dimmed, not hidden. ` +
          `<a href="?lens=${lens}" id="lens-copy">Copy a link to this view</a>`;
        $('#lens-copy').addEventListener('click', (e) => {
          e.preventDefault();
          const url = location.origin + location.pathname + '?lens=' + lens;
          (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject())
            .then(() => { e.target.textContent = 'Link copied'; })
            .catch(() => { e.target.textContent = url; });
        });
      }

      if (push) {
        const url = new URL(location.href);
        if (lens === 'all') url.searchParams.delete('lens'); else url.searchParams.set('lens', lens);
        history.replaceState(null, '', url);
      }
    }

    buttons.forEach((b) => b.addEventListener('click', () => apply(b.dataset.lensBtn)));
    apply(new URLSearchParams(location.search).get('lens') || 'all', { push: false });
  }

  /* ───────────── 3. Hero pipeline animation ─────────────
     Particles are events. Left of the bronze gate they are raw and noisy;
     bad records are dropped after landing; survivors are conformed into
     lanes (silver), then modelled into a single signal (gold).           */
  function initHeroFlow() {
    const cv = $('#hero-flow');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const G = [0.26, 0.5, 0.74];
    const LANES = 6;
    let W = 0, H = 0, parts = [], col = {}, running = false, raf = 0, last = 0, time = 0;
    const mouse = { x: -9999, y: -9999 };

    const ease = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
    const signal = (x) => 0.64 - 0.38 * ease((x - G[2]) / (1 - G[2])) + 0.03 * Math.sin(x * 26);
    const make = (fresh) => ({
      t: fresh ? Math.random() : -Math.random() * 0.06,
      y0: 0.17 + Math.random() * 0.72,
      lane: (Math.random() * LANES) | 0,
      bad: Math.random() < 0.24,
      v: 0.045 + Math.random() * 0.035,
      ph: Math.random() * 6.283,
      r: 1.1 + Math.random() * 1.4,
      off: 0,
    });

    function readColors() {
      col = { muted: cssVar('--muted'), line: cssVar('--line-strong'), bronze: cssVar('--bronze'), silver: cssVar('--silver'), gold: cssVar('--gold'), signal: cssVar('--signal') };
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(300, Math.max(90, W / 3.4)));
      parts = Array.from({ length: n }, () => make(true)).filter((p) => !(p.bad && p.t > G[0] + 0.07));
      while (parts.length < n) parts.push(make(false));
      readColors();
      if (!running) frame(0, true);
    }

    function yOf(p) {
      const raw = p.y0 + 0.035 * Math.sin(time * 1.4 + p.ph);
      const lane = 0.24 + ((p.lane + 0.5) / LANES) * 0.6;
      if (p.t < G[0]) return raw;
      if (p.t < G[1]) return raw + (lane - raw) * ease(((p.t - G[0]) / (G[1] - G[0])) * 1.5);
      if (p.t < G[2]) { const s = signal(p.t); return lane + (s - lane) * ease(((p.t - G[1]) / (G[2] - G[1])) * 1.2); }
      return signal(p.t);
    }

    function frame(now, still) {
      const dt = still ? 0 : Math.min(0.05, (now - last) / 1000 || 0);
      last = now; time += dt;
      ctx.clearRect(0, 0, W, H);

      // Gates.
      ctx.setLineDash([3, 5]); ctx.lineWidth = 1; ctx.strokeStyle = col.line;
      G.forEach((g) => { ctx.beginPath(); ctx.moveTo(g * W + 0.5, 34); ctx.lineTo(g * W + 0.5, H - 12); ctx.stroke(); });
      ctx.setLineDash([]);

      // The modelled signal, right of the gold gate.
      ctx.beginPath();
      for (let x = G[2]; x <= 1.001; x += 0.004) { const px = x * W, py = signal(x) * H; x === G[2] ? ctx.moveTo(px, py) : ctx.lineTo(px, py); }
      ctx.strokeStyle = col.gold; ctx.lineWidth = 1.6; ctx.globalAlpha = 0.9; ctx.stroke();
      ctx.lineTo(W, H); ctx.lineTo(G[2] * W, H); ctx.closePath();
      ctx.globalAlpha = 0.07; ctx.fillStyle = col.gold; ctx.fill();
      ctx.globalAlpha = 1;

      for (let i = 0; i < parts.length; i++) {
        let p = parts[i];
        p.t += p.v * dt;
        if (p.t > 1 || (p.bad && p.t > G[0] + 0.075)) { p = parts[i] = make(false); }
        if (p.t < 0) continue;
        const x = p.t * W;
        let y = yOf(p) * H;

        // Pointer disturbance: push events off course, then let them recover.
        const dx = x - mouse.x, dy = y - mouse.y, d = Math.hypot(dx, dy);
        if (d < 80) p.off += (dy >= 0 ? 1 : -1) * (1 - d / 80) * 2.2;
        p.off *= 0.92; y += p.off;

        let c = col.muted, a = 0.55, r = p.r;
        if (p.t >= G[2]) { c = col.gold; a = 0.95; r = 1.5; }
        else if (p.t >= G[1]) { c = col.silver; a = 0.9; }
        else if (p.t >= G[0]) { c = col.bronze; a = 0.9; }
        if (p.bad) { c = col.signal; a = p.t < G[0] ? 0.8 : 0.8 * (1 - (p.t - G[0]) / 0.075); }

        ctx.globalAlpha = Math.max(0, a);
        if (p.bad) { // malformed records are drawn as hollow rings
          ctx.beginPath(); ctx.arc(x, y, r + 0.8, 0, 6.283); ctx.strokeStyle = c; ctx.lineWidth = 1; ctx.stroke();
        } else {
          ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fillStyle = c; ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      if (running) raf = requestAnimationFrame(frame);
    }

    const start = () => { if (running || reduceMotion) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); };
    const stop = () => { running = false; cancelAnimationFrame(raf); };

    cv.addEventListener('pointermove', (e) => { const b = cv.getBoundingClientRect(); mouse.x = e.clientX - b.left; mouse.y = e.clientY - b.top; });
    cv.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
    window.addEventListener('resize', resize);
    window.addEventListener('themechange', () => { readColors(); if (!running) frame(0, true); });
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop())).observe(cv);
    resize();
  }

  /* ───────────── 4. Ask this page ─────────────
     A BM25 retriever over every [data-p] element on the page. It returns
     the exact passages with a link back to where they sit, and refuses
     when nothing scores above the relevance gate.                        */
  function initAsk() {
    const dlg = $('#ask'), input = $('#ask-q'), out = $('#ask-results'), meta = $('#ask-meta');
    const K1 = 1.4, B = 0.75, GATE = 1.6;
    const STOP = new Set(('a an the and or of to in on for with at by from is are was were be been it its this that these those as ' +
      'i you he she his her him my me we our your what which who whom how why when do does did has have had can could would should ' +
      'about into over than then so not no any some most more much many very just tell show give know want there their they them good best').split(' '));
    // Query expansion: the words visitors use → the words the page uses.
    const SYN = {
      ml: ['machine', 'learning', 'model'], ai: ['agent', 'rag', 'retrieval'], llm: ['rag', 'agent', 'retrieval'],
      paper: ['publication', 'ieee'], publish: ['publication', 'ieee', 'paper'], research: ['publication', 'ieee'],
      degree: ['education', 'msc'], study: ['education', 'university'], school: ['education', 'university'], university: ['education'],
      job: ['intern', 'experience'], work: ['intern'], internship: ['intern'], role: ['intern'],
      led: ['leadership', 'team'], lead: ['leadership', 'team'], manage: ['leadership', 'budget'], biggest: ['largest'],
      contact: ['email'], hire: ['contact', 'open', 'role'], reach: ['contact', 'email'], available: ['availability', 'open'],
      where: ['location', 'based'], live: ['location', 'based'], location: ['based', 'leeds'],
      stream: ['kafka', 'spark'], pipeline: ['etl', 'kafka'], cert: ['certification', 'certified'], certification: ['certified'],
      award: ['hackathon', 'winner'], win: ['award', 'winner', 'hackathon'], won: ['award', 'winner', 'hackathon'], prize: ['award', 'winner'],
      database: ['postgresql', 'mysql', 'sql'], cloud: ['aws', 'azure', 'fabric'], dashboard: ['power', 'grafana'],
      accuracy: ['precision', 'hit'], evaluation: ['hit', 'golden'], metric: ['hit', 'precision'],
      security: ['privacy', 'ddos'], skill: ['stack'], tool: ['stack', 'skill'], language: ['python', 'sql'],
    };
    const stem = (w) => {
      if (w.length > 5 && w.endsWith('ing')) return w.slice(0, -3);
      if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
      if (w.length > 4 && w.endsWith('ed')) return w.slice(0, -2);
      if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
      return w;
    };
    const words = (t) => t.toLowerCase().replace(/[’']/g, '').split(/[^a-z0-9]+/).filter(Boolean);
    const tokens = (t) => words(t).filter((w) => !STOP.has(w)).map(stem);

    // Build the index from the page itself.
    const docs = $$('[data-p]').map((el) => {
      const text = (el.innerText || el.textContent).trim().replace(/\s*\n+\s*/g, ' · ').replace(/\s+/g, ' ');
      const tf = new Map();
      const toks = tokens(text + ' ' + (el.dataset.k || ''));
      toks.forEach((t) => tf.set(t, (tf.get(t) || 0) + 1));
      const art = el.closest('article[data-title]'), sec = el.closest('section[data-title]');
      const source = [sec && sec.dataset.title, art && art.dataset.title].filter(Boolean).join(' · ');
      return { el, text, tf, len: toks.length, source };
    });
    const N = docs.length;
    const avgdl = docs.reduce((s, d) => s + d.len, 0) / N;
    const df = new Map();
    docs.forEach((d) => d.tf.forEach((_, t) => df.set(t, (df.get(t) || 0) + 1)));
    const idf = (t) => Math.log(1 + (N - (df.get(t) || 0) + 0.5) / ((df.get(t) || 0) + 0.5));
    $('#ask-n').textContent = N;

    function search(q) {
      const base = words(q);
      const terms = new Map(); // term → weight
      const groups = [];       // one group per word the visitor typed: the word plus its expansions
      base.forEach((w) => {
        const s = stem(w);
        const group = [];
        if (!STOP.has(w)) { terms.set(s, 1); group.push(s); }
        (SYN[w] || SYN[s] || []).forEach((x) => { const sx = stem(x); if (!terms.has(sx)) terms.set(sx, 0.45); group.push(sx); });
        if (group.length) groups.push(group);
      });
      const scored = docs.map((d) => {
        let score = 0;
        terms.forEach((wgt, t) => {
          const f = d.tf.get(t);
          if (f) score += wgt * idf(t) * (f * (K1 + 1)) / (f + K1 * (1 - B + B * d.len / avgdl));
        });
        return { d, score };
      }).filter((r) => r.score > 0).sort((a, b) => b.score - a.score);
      // Coverage: how much of the question the best passage actually speaks to.
      // "salary expectations" must not pass just because a tool is called Great Expectations.
      const best = scored[0];
      const coverage = best && groups.length ? groups.filter((g) => g.some((t) => best.d.tf.has(t))).length / groups.length : 0;
      return { scored, terms, coverage };
    }

    const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    function highlight(text, terms) {
      let t = text;
      if (t.length > 330) { // window around the first matching word
        const m = [...t.matchAll(/[A-Za-z0-9]+/g)].find((x) => terms.has(stem(x[0].toLowerCase())));
        const at = m ? m.index : 0, from = Math.max(0, at - 110);
        const more = from + 320 < text.length;
        let cut = t.slice(from, from + 320);
        if (from) cut = cut.replace(/^\S*\s/, '');
        if (more) cut = cut.replace(/\s\S*$/, '');
        t = (from ? '… ' : '') + cut.trim() + (more ? ' …' : '');
      }
      return t.split(/([A-Za-z0-9]+)/).map((part, i) =>
        (i % 2 && terms.has(stem(part.toLowerCase()))) ? `<mark>${esc(part)}</mark>` : esc(part)).join('');
    }

    function run() {
      const q = input.value.trim();
      out.innerHTML = '';
      meta.className = 'ask-meta';
      if (!q) { meta.textContent = ''; return; }
      const t0 = performance.now();
      const { scored, terms, coverage } = search(q);
      const ms = (performance.now() - t0).toFixed(1);
      const top = scored[0] ? scored[0].score : 0;

      let hits;
      if (top < GATE || coverage <= 0.5) {
        meta.classList.add('refused');
        meta.textContent = scored.length
          ? `Refused · nothing here clearly answers that, so I won't guess. Closest passages (score ${top.toFixed(2)}, ${Math.round(coverage * 100)}% of the question covered):`
          : `Refused · nothing on this page matches that. Try one of the suggestions above.`;
        hits = scored.slice(0, 2);
      } else {
        hits = scored.filter((r) => r.score >= top * 0.45).slice(0, 4);
        meta.textContent = `${hits.length} passage${hits.length > 1 ? 's' : ''} cited · BM25 over ${N} passages · ${ms} ms`;
      }

      hits.forEach(({ d, score }, i) => {
        const li = document.createElement('li');
        li.style.animationDelay = i * 40 + 'ms';
        li.innerHTML = `<div class="src"><span>[${i + 1}] ${esc(d.source)}</span><span>score ${score.toFixed(2)}</span></div>` +
          `<p>${highlight(d.text, terms)}</p><button type="button">Jump to this passage on the page →</button>`;
        $('button', li).addEventListener('click', () => {
          dlg.close();
          d.el.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
          d.el.classList.remove('cited'); void d.el.offsetWidth; d.el.classList.add('cited');
          setTimeout(() => d.el.classList.remove('cited'), 2600);
        });
        out.appendChild(li);
      });
    }

    const open = () => { if (!dlg.open) dlg.showModal(); input.focus(); input.select(); };
    $$('[data-open-ask]').forEach((b) => b.addEventListener('click', open));
    $$('[data-close-ask]').forEach((a) => a.addEventListener('click', () => dlg.close()));
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    document.addEventListener('keydown', (e) => {
      const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) { e.preventDefault(); open(); }
    });
    let deb = 0;
    input.addEventListener('input', () => { clearTimeout(deb); deb = setTimeout(run, 70); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); run(); } });
    $$('#ask-chips button').forEach((b) => b.addEventListener('click', () => { input.value = b.textContent; run(); input.focus(); }));
    if (!/Mac|iPhone|iPad/.test(navigator.platform)) $$('.ask-btn kbd').forEach((k) => { k.textContent = 'Ctrl K'; });
  }

  /* ───────────── 5. Live stream + anomaly detector ─────────────
     Real trades from Binance's public market-data socket when reachable,
     otherwise a clearly labelled simulated feed. Each new log-return is
     z-scored against a sliding window of clean returns.                  */
  function initLab() {
    const cv = $('#lab-chart');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const feed = $('#lab-feed'), log = $('#lab-log');
    const WIN = 60, MAXP = 200, ZT = 4, SAMPLE_MS = 500, BAND = 20, SD_FLOOR = 4e-5;
    const URL_WS = 'wss://data-stream.binance.vision/ws/btcusdt@aggTrade';

    let pts = [], mode = 'idle', ws = null, latest = null, events = 0, perSec = 0, anomalies = 0;
    let paused = false, spike = 0, sim = 100, sampler = 0, ticker = 0, fallback = 0, active = false;

    const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283 * v); };
    const fmt = (p) => (mode === 'live' ? '$' : '') + p.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const setFeed = (cls, text) => { feed.className = 'feed ' + cls; $('span', feed).textContent = text; };

    function toSim() {
      if (mode === 'sim') return;
      closeSocket();
      mode = 'sim'; pts = []; latest = null;
      setFeed('sim', 'Simulated feed · the live exchange socket is not reachable from this network');
    }
    function closeSocket() {
      clearTimeout(fallback);
      if (ws) { ws.onmessage = ws.onerror = ws.onclose = null; try { ws.close(); } catch (e) { /* already closed */ } ws = null; }
    }
    function connect() {
      mode = 'connecting';
      setFeed('', 'Connecting to live BTC/USDT trades…');
      try {
        ws = new WebSocket(URL_WS);
        ws.onmessage = (e) => {
          const p = +JSON.parse(e.data).p;
          if (!(p > 0)) return;
          latest = p; events++; perSec++;
          if (mode !== 'live') { mode = 'live'; clearTimeout(fallback); setFeed('live', 'Live · BTC/USDT trades, Binance public market data'); }
        };
        ws.onerror = ws.onclose = () => { if (active) toSim(); };
      } catch (e) { toSim(); }
      fallback = setTimeout(() => { if (mode !== 'live') toSim(); }, 5000);
    }

    function sample() {
      if (paused) return;
      let p, synth = false;
      if (mode === 'live') { if (latest == null) return; p = latest; }
      else if (mode === 'sim') {
        for (let i = 0; i < 12; i++) sim *= 1 + gauss() * 0.00002;
        if (Math.random() < 0.006) sim *= 1 + (Math.random() < 0.5 ? -1 : 1) * (0.0005 + Math.random() * 0.0005); // an organic shock
        events += 12; perSec += 12; p = sim;
      } else return;

      if (spike) { p *= 1 + spike; synth = true; if (mode === 'sim') sim = p; spike = 0; }

      const prev = pts[pts.length - 1];
      const ret = prev ? Math.log(p / prev.p) : 0;
      // Baseline excludes injected spikes; real moves stay in, so the window adapts to volatility.
      const clean = pts.filter((q) => !q.synth && !q.rebound).slice(-WIN).map((q) => q.ret);
      let z = null, anom = false;
      const rebound = !!(prev && prev.synth && mode === 'live'); // the real price snapping back after an injected spike
      if (clean.length >= 20) {
        const m = clean.reduce((a, b) => a + b, 0) / clean.length;
        // The floor stops a quiet, flat market from turning every one-tick move into an "anomaly".
        const sd = Math.max(Math.sqrt(clean.reduce((a, b) => a + (b - m) ** 2, 0) / clean.length), SD_FLOOR);
        z = (ret - m) / sd;
        anom = Math.abs(z) > ZT && !rebound;
      }
      const recent = pts.slice(-BAND + 1).map((q) => q.p).concat(p);
      const mu = recent.reduce((a, b) => a + b, 0) / recent.length;
      const sdp = Math.sqrt(recent.reduce((a, b) => a + (b - mu) ** 2, 0) / recent.length);
      pts.push({ p, ret, z, anom, synth, rebound, mu, sdp });
      if (pts.length > MAXP) pts.shift();

      if (anom) {
        anomalies++;
        $('.empty', log)?.remove();
        const li = document.createElement('li');
        const zt = (z > 0 ? '+' : '') + (Math.abs(z) > 999 ? z.toExponential(1) : z.toFixed(1));
        li.innerHTML = `${new Date().toLocaleTimeString('en-GB')} &nbsp; <b>z = ${zt}</b> &nbsp; price ${fmt(p)} &nbsp; ${synth ? 'injected spike, caught' : mode === 'live' ? 'live market move' : 'simulated shock'}`;
        log.prepend(li);
        while (log.children.length > 4) log.lastChild.remove();
      }
      $('#s-price').textContent = fmt(p);
      $('#s-events').textContent = events.toLocaleString('en-GB');
      $('#s-z').textContent = z == null ? 'warming up' : (z > 0 ? '+' : '') + (Math.abs(z) > 999 ? z.toExponential(1) : z.toFixed(2));
      $('#s-anom').textContent = anomalies;
      draw();
    }

    function draw() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = cv.clientWidth, H = cv.clientHeight;
      if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const ink = cssVar('--ink'), muted = cssVar('--muted'), silver = cssVar('--silver'), sig = cssVar('--signal'), gold = cssVar('--gold');
      ctx.font = '11px "Geist Mono", ui-monospace, monospace';

      if (pts.length < 2) {
        ctx.fillStyle = muted; ctx.textAlign = 'center';
        ctx.fillText(mode === 'idle' ? 'Starts when this section is on screen' : 'Waiting for the first events…', W / 2, H / 2);
        return;
      }
      const padL = 10, padR = 74, padT = 16, padB = 16;
      let lo = Infinity, hi = -Infinity;
      pts.forEach((q) => { lo = Math.min(lo, q.p, q.mu - 2 * q.sdp); hi = Math.max(hi, q.p, q.mu + 2 * q.sdp); });
      const span = (hi - lo) || 1; lo -= span * 0.08; hi += span * 0.08;
      const step = (W - padL - padR) / (MAXP - 1);
      const X = (i) => W - padR - (pts.length - 1 - i) * step;
      const Y = (v) => padT + (1 - (v - lo) / (hi - lo)) * (H - padT - padB);

      // Rolling band: mean ± 2σ of the last 20 samples.
      ctx.beginPath();
      pts.forEach((q, i) => (i ? ctx.lineTo(X(i), Y(q.mu + 2 * q.sdp)) : ctx.moveTo(X(i), Y(q.mu + 2 * q.sdp))));
      for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(X(i), Y(pts[i].mu - 2 * pts[i].sdp));
      ctx.closePath(); ctx.globalAlpha = 0.16; ctx.fillStyle = silver; ctx.fill(); ctx.globalAlpha = 1;

      ctx.beginPath(); ctx.setLineDash([3, 4]);
      pts.forEach((q, i) => (i ? ctx.lineTo(X(i), Y(q.mu)) : ctx.moveTo(X(i), Y(q.mu))));
      ctx.strokeStyle = silver; ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);

      ctx.beginPath();
      pts.forEach((q, i) => (i ? ctx.lineTo(X(i), Y(q.p)) : ctx.moveTo(X(i), Y(q.p))));
      ctx.strokeStyle = ink; ctx.lineWidth = 1.6; ctx.lineJoin = 'round'; ctx.stroke();

      pts.forEach((q, i) => {
        if (!q.anom) return;
        const c = q.synth ? gold : sig;
        ctx.beginPath(); ctx.arc(X(i), Y(q.p), 4, 0, 6.283); ctx.fillStyle = c; ctx.fill();
        ctx.beginPath(); ctx.arc(X(i), Y(q.p), 9, 0, 6.283); ctx.strokeStyle = c; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.2; ctx.stroke(); ctx.globalAlpha = 1;
      });

      const lastP = pts[pts.length - 1];
      ctx.beginPath(); ctx.arc(X(pts.length - 1), Y(lastP.p), 3, 0, 6.283); ctx.fillStyle = ink; ctx.fill();
      ctx.fillStyle = ink; ctx.textAlign = 'left';
      ctx.fillText(lastP.p.toFixed(2), W - padR + 8, Math.min(H - 6, Math.max(12, Y(lastP.p) + 4)));
      ctx.fillStyle = muted;
      ctx.fillText('price', padL, padT - 3);
      ctx.fillText('mean ± 2σ band', padL + 48, padT - 3);
    }

    function start() {
      if (active) return;
      active = true;
      if (mode === 'idle' || mode === 'connecting') connect();
      else if (mode === 'live') { pts = []; connect(); } // reconnect after leaving the section
      sampler = setInterval(sample, SAMPLE_MS);
      ticker = setInterval(() => { $('#s-eps').textContent = paused ? 0 : perSec; perSec = 0; }, 1000);
    }
    function stop() {
      if (!active) return;
      active = false;
      clearInterval(sampler); clearInterval(ticker);
      closeSocket();
    }

    $('#lab-spike').addEventListener('click', () => { spike = (Math.random() < 0.5 ? -1 : 1) * (0.0009 + Math.random() * 0.0006); });
    $('#lab-pause').addEventListener('click', (e) => {
      paused = !paused;
      e.currentTarget.textContent = paused ? 'Resume' : 'Pause';
      e.currentTarget.setAttribute('aria-pressed', String(paused));
    });
    window.addEventListener('resize', draw);
    window.addEventListener('themechange', draw);
    let onScreen = false;
    new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; (onScreen && !document.hidden) ? start() : stop(); }, { threshold: 0.15 }).observe($('.lab'));
    document.addEventListener('visibilitychange', () => ((onScreen && !document.hidden) ? start() : stop()));
    draw();
  }

  initChrome();
  initLens();
  initHeroFlow();
  initAsk();
  initLab();
})();
