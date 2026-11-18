/* Social Vortex — work page: hero paragraph reveal, sticky project stack, cursor-follow project info */
(function () {
  "use strict";
  if (typeof gsap === "undefined") return;
  gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, SplitText);

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const items = gsap.utils.toArray(".work-item");

  /* ---------- hero paragraph: lines rise in once the loader is done ---------- */
  const para = document.querySelector(".work-hero-para");
  if (para && !reduceMotion) {
    const ready = document.fonts ? document.fonts.ready : Promise.resolve();
    ready.then(() => {
      const split = SplitText.create(para, { type: "lines", mask: "lines", linesClass: "work-para-line" });
      gsap.set(split.lines, { yPercent: 110, opacity: 0 });
      const play = () =>
        gsap.to(split.lines, { yPercent: 0, opacity: 1, duration: 0.8, stagger: 0.08, ease: "power3.out", delay: 0.6 });
      if (document.body.classList.contains("is-loading")) document.addEventListener("sv:loaded", play, { once: true });
      else play();
    });
  }

  if (!items.length) return;
  items.forEach((it, i) => (it.style.zIndex = String(i + 1)));

  /* ---------- stack: as the next project slides over, the previous one shrinks, tilts and gets painted over ---------- */
  if (!reduceMotion) {
    items.forEach((it) => {
      const p = it.querySelector(".work-cover path");
      if (p) gsap.set(p, { drawSVG: "0%", strokeWidth: 0 });
    });
    for (let i = 0; i < items.length - 1; i++) {
      const card = items[i].querySelector(".work-card");
      const stroke = items[i].querySelector(".work-cover path");
      const tilt = (i % 2 === 0 ? -1 : 1) * gsap.utils.random(2.5, 4.5);
      const tl = gsap.timeline({
        scrollTrigger: { trigger: items[i + 1], start: "top bottom", end: "top top", scrub: 0.6, invalidateOnRefresh: true },
      });
      tl.to(card, { scale: 0.75, rotation: tilt, transformOrigin: "50% 50%", ease: "power1.inOut" }, 0);
      if (stroke) {
        tl.to(stroke, { drawSVG: "100%", ease: "none" }, 0)
          .to(stroke, { strokeWidth: 1000, ease: "power2.inOut" }, 0);
      }
    }
  }

  /* ---------- cursor-follow info (desktop with a fine pointer only) ---------- */
  const desktop = window.innerWidth >= 992 && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (!desktop || reduceMotion) return;

  let mx = window.innerWidth / 2, my = window.innerHeight / 2;
  let inside = false, active = -1;
  const list = document.querySelector(".work-list");

  // Cards get transformed while stacking, which would trap position:fixed children.
  // So the info pills live in one body-level layer instead.
  const layer = document.createElement("div");
  layer.className = "work-cursor";
  document.body.appendChild(layer);

  const data = items.map((it) => {
    const info = it.querySelector(".work-info");
    layer.appendChild(info);
    const pills = Array.from(info.children); // small pill, name+year wrap, small pill
    gsap.set(info, { scale: 1, x: 0, y: 0 });
    gsap.set(pills, { scale: 0, transformOrigin: "50% 50%" });
    // each pill trails the cursor at its own lag, so the stack stretches as you move
    const trails = pills.map(() => ({ x: mx, y: my }));
    return { info, pills, trails };
  });

  function show(i) {
    data.forEach((d, k) => {
      if (k === i && inside) {
        d.trails.forEach((t) => { t.x = mx; t.y = my; });
        gsap.to(d.pills, { scale: 1, duration: 0.45, stagger: 0.05, ease: "back.out(2)", overwrite: "auto" });
      } else {
        gsap.to(d.pills, { scale: 0, duration: 0.25, stagger: 0.03, ease: "back.in(1.7)", overwrite: "auto" });
      }
    });
  }
  function pickActive() {
    const mid = window.innerHeight * 0.5;
    let found = -1;
    items.forEach((it, i) => {
      const r = it.getBoundingClientRect();
      if (r.top <= mid && r.bottom >= mid) found = i;
    });
    if (found !== active) { active = found; show(active); }
  }

  window.addEventListener("mousemove", (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
  list.addEventListener("mouseenter", () => { inside = true; active = -1; pickActive(); });
  list.addEventListener("mouseleave", () => { inside = false; show(-1); });
  window.addEventListener("scroll", () => inside && pickActive(), { passive: true });

  const LAG = [0.22, 0.16, 0.11];
  const OFFSET_Y = [-46, 0, 46];
  gsap.ticker.add(() => {
    if (active < 0) return;
    const d = data[active];
    d.pills.forEach((p, k) => {
      const t = d.trails[k];
      t.x += (mx - t.x) * LAG[k];
      t.y += (my - t.y) * LAG[k];
      gsap.set(p, { x: t.x - p.offsetWidth / 2 - p.offsetLeft, y: t.y + OFFSET_Y[k] - p.offsetTop - p.offsetHeight / 2 });
    });
  });
})();
