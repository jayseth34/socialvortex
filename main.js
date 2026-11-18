/* Social Vortex — load + scroll animations (GSAP 3.13 + SplitText + DrawSVG + ScrollTrigger + Lenis) */
(function () {
  // Wait for webfonts so SplitText measures real line breaks (cap the wait so the loader never stalls)
  const ready = document.fonts
    ? Promise.all(["400 1em Anton", "500 1em 'Bricolage Grotesque'", "400 1em 'Bricolage Grotesque'", "500 1em 'Inter Tight'"].map((f) => document.fonts.load(f)))
    : Promise.resolve();
  const allFonts = ready.then(() => (document.fonts ? document.fonts.ready : null));
  Promise.race([allFonts, new Promise((r) => setTimeout(r, 3000))]).then(init, init);
})();

function init() {
  "use strict";

  gsap.registerPlugin(SplitText, ScrollTrigger, DrawSVGPlugin);

  const ORANGE = "#FF5400";
  const SVGNS = "http://www.w3.org/2000/svg";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- helpers ---------- */
  // Archimedean spiral, drawn from the outside edge inward (reads as a vortex).
  function spiralD(cx, cy, R, turns, startDeg, innerRatio) {
    const steps = Math.round(turns * 64);
    const inner = R * (innerRatio == null ? 0.12 : innerRatio);
    const a0 = (startDeg * Math.PI) / 180;
    let d = "";
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const r = R - (R - inner) * t;
      const a = a0 + t * turns * Math.PI * 2;
      const x = cx + r * Math.cos(a);
      const y = cy + r * Math.sin(a);
      d += (i ? "L" : "M") + x.toFixed(2) + " " + y.toFixed(2);
    }
    return d;
  }

  function el(tag, attrs, parent) {
    const n = document.createElementNS(SVGNS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  /* ---------- static spirals (nav logo + hero vortex) ---------- */
  document.querySelector(".nav-logo-spiral path").setAttribute("d", spiralD(0, 0, 44, 2.1, -90, 0.12));

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (!reduceMotion && typeof Lenis !== "undefined") {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
    document.querySelectorAll('a[href^="#"]').forEach((a) =>
      a.addEventListener("click", (e) => {
        const target = document.querySelector(a.getAttribute("href"));
        if (target) { e.preventDefault(); lenis.scrollTo(target, { duration: 1.4 }); }
      })
    );
  }

  /* ================================================================
     HERO TIMELINE (built paused, played when the loader finishes)
     ================================================================ */
  const heading = document.querySelector(".hero-heading");
  const pills = gsap.utils.toArray(".hero-pill");
  const swirlPaths = gsap.utils.toArray(".hero-swirl path");
  const walkers = gsap.utils.toArray(".walker, .cat");

  const heroSplit = SplitText.create(heading, { type: "lines", linesClass: "hero-line", mask: "lines" });
  gsap.set(heading, { opacity: 1 });
  gsap.set(heroSplit.lines, { yPercent: 115, opacity: 0 });

  gsap.set(pills, { opacity: 0, scale: 0.4, y: 20, transformOrigin: "50% 50%" });
  pills.forEach((pill) => {
    const txt = pill.querySelector(".hero-pill-text");
    const mask = document.createElement("span");
    mask.className = "hero-pill-text-mask";
    pill.insertBefore(mask, txt);
    mask.appendChild(txt);
    gsap.set(txt, { yPercent: 105, opacity: 0 });
  });

  const swirlData = swirlPaths.map((p) => ({ p, w: parseFloat(p.getAttribute("stroke-width")) || 24 }));
  gsap.set(swirlPaths, { drawSVG: "0%", strokeWidth: 0 });
  gsap.set(walkers, { yPercent: 60, opacity: 0 });

  const heroTl = gsap.timeline({ paused: true, defaults: { ease: "power2.out" } }).timeScale(0.75);

  heroTl.to(heroSplit.lines, { yPercent: 0, opacity: 1, duration: 0.85, stagger: 0.12, ease: "back.out(1.4)" }, 0);
  const linesTime = heroSplit.lines.length * 0.12 + 0.5;

  pills.forEach((pill, i) => {
    const at = 0.2 + (i / Math.max(1, pills.length)) * linesTime * 0.7;
    heroTl.to(pill, { opacity: 1, scale: 1, y: 0, duration: 0.55, ease: "back.out(2.5)" }, at);
    heroTl.to(pill.querySelector(".hero-pill-text"), { yPercent: 0, opacity: 1, duration: 0.5, ease: "back.out(1.6)" }, at + 0.15);
  });

  swirlData.forEach((s, i) => {
    const at = linesTime * 0.4 + i * 0.15;
    heroTl.to(s.p, { drawSVG: "100%", duration: 0.9 }, at).to(s.p, { strokeWidth: s.w, duration: 0.9 }, at);
  });

  // Walking characters rise in and start their walk cycle
  heroTl.add(() => window.Walkers && window.Walkers.start(), 0);
  heroTl.to(walkers, { yPercent: 0, opacity: 1, duration: 1.1, stagger: 0.15, ease: "power3.out" }, 0.1);

  /* ================================================================
     LOADER
     ================================================================ */
  const loader = document.querySelector(".loader");
  const logoSvg = document.querySelector(".loader-logo");
  const bgOrange = document.querySelector(".loader-bg-orange");
  const bgPink = document.querySelector(".loader-bg-pink");

  let loaderDone = false;
  function finishLoader() {
    if (loaderDone) return;
    loaderDone = true;
    loader.style.display = "none";
    document.body.classList.remove("is-loading");
    if (lenis) lenis.start();
    ScrollTrigger.refresh();
    heroTl.play();
    document.dispatchEvent(new CustomEvent("sv:loaded"));
  }

  if (reduceMotion) {
    heroTl.progress(1);
    finishLoader();
  } else {
    gsap.set([bgOrange, bgPink], { drawSVG: "0% 100%", strokeWidth: 3000, x: 0, y: 0 });
    buildLoader();
    setTimeout(() => { if (!loaderDone) finishLoader(); }, 9000); // safety net
  }

  function buildLoader() {
    const group = el("g", { class: "logo-group" }, logoSvg);

    const TOP = { word: "SOCIAL", size: 150, track: -4 };
    const BOT = { word: "VORTEX", size: 236, track: -6, spiralIndex: 1 };
    const capTop = TOP.size * 0.72;
    const capBot = BOT.size * 0.72;
    const gap = 22;
    const baseTop = 500 - (capTop + gap + capBot) / 2 + capTop;
    const baseBot = baseTop + gap + capBot;

    const letters = [];
    let spiral = null;

    function layoutWord(cfg, baseline) {
      const items = [];
      [...cfg.word].forEach((ch, i) => {
        if (cfg.spiralIndex === i) {
          const w = capBot * 0.98;
          items.push({ spiral: true, w });
        } else {
          const t = el("text", { "font-size": cfg.size, y: baseline, "stroke-width": 0 }, group);
          t.textContent = ch;
          items.push({ t, w: t.getComputedTextLength() });
        }
      });
      const total = items.reduce((s, it) => s + it.w, 0) + cfg.track * (items.length - 1);
      let x = 500 - total / 2;
      items.forEach((it) => {
        if (it.spiral) {
          const cx = x + it.w / 2;
          const cy = baseline - capBot / 2;
          const R = capBot / 2 - 8;
          spiral = { cx, cy, R };
        } else {
          it.t.setAttribute("x", x.toFixed(2));
          letters.push(it.t);
        }
        x += it.w + cfg.track;
      });
    }
    layoutWord(TOP, baseTop);
    layoutWord(BOT, baseBot);

    // The hand-drawn vortex "O"
    const spiralPath = el("path", {
      d: spiralD(spiral.cx, spiral.cy, spiral.R, 2.35, -90, 0.1),
      fill: "none", stroke: ORANGE, "stroke-width": 19, "stroke-linecap": "round", "stroke-linejoin": "round",
    }, group);
    // Ribbon tracer: swoops in from off-screen, hands off at the spiral's outer edge, then leaves
    const sx = spiral.cx, sy = spiral.cy - spiral.R;
    const ribbon = el("path", {
      d: `M-650 1250C-150 1150 ${sx - 420} ${sy + 380} ${sx} ${sy}C${sx + 420} ${sy - 380} 1150 -150 1650 -250`,
      fill: "none", stroke: ORANGE, "stroke-width": 0, "stroke-linecap": "round", "stroke-linejoin": "round",
    }, group);
    group.insertBefore(ribbon, group.firstChild);

    // Start with the spiral centred on screen, then glide to the centred logo
    const startX = 500 - spiral.cx, startY = 500 - spiral.cy;
    gsap.set(group, { x: startX, y: startY });

    letters.forEach((t) => {
      gsap.set(t, { scale: 0, rotation: gsap.utils.random(-25, 25), strokeWidth: 6, transformOrigin: "50% 50%" });
    });
    gsap.set(ribbon, { drawSVG: "0% 0%", strokeWidth: 0 });
    gsap.set(spiralPath, { drawSVG: "0%" });
    logoSvg.style.visibility = "visible";

    const tl = gsap.timeline({ delay: 0.25, onComplete: () => { logoDone = true; tryExit(); } }).timeScale(1.25);

    // A. ribbon grows and travels toward the spiral
    tl.to(ribbon, { strokeWidth: 19, duration: 1, ease: "power2.in" }, 0)
      .to(ribbon, { drawSVG: "0% 7%", duration: 0.7, ease: "power2.in" }, 0)
      .to(ribbon, { drawSVG: "43% 50%", duration: 1.2, ease: "none" }, 0.7);
    // B. the vortex O draws itself
    tl.to(spiralPath, { drawSVG: "100%", duration: 1.1, ease: "power2.out" }, "-=0.4");
    // C. ribbon departs and thins out
    tl.to(ribbon, { drawSVG: "100% 100%", duration: 1.1, ease: "power2.inOut" }, "-=0.5")
      .to(ribbon, { strokeWidth: 0, duration: 0.5, ease: "power2.in" }, "-=0.55");
    // D. whole logo glides to centre
    tl.to(group, { x: 0, y: 0, duration: 0.8, ease: "power2.inOut" }, "+=0.1");
    // E. bouncy letter pops
    tl.to(letters, { scale: 1, rotation: 0, duration: 0.6, stagger: 0.06, ease: "back.out(3)" }, "-=0.2")
      .to(letters, { strokeWidth: 0, duration: 0.6, stagger: 0.06, ease: "power1.in" }, "<");
  }

  let logoDone = false;
  let pageLoaded = document.readyState === "complete";
  if (!pageLoaded) window.addEventListener("load", () => { pageLoaded = true; tryExit(); });
  let exiting = false;

  function tryExit() {
    if (!logoDone || !pageLoaded || exiting) return;
    exiting = true;
    const SWEEP = 0.65;
    const tl = gsap.timeline({ onComplete: finishLoader });
    tl.to({}, { duration: 0.2 });
    tl.addLabel("pink");
    // Pink layer slithers down-right, exposing orange
    tl.to(bgPink, { drawSVG: "50% 100%", strokeWidth: 1000, x: 900, y: 1800, duration: SWEEP, ease: "power2.inOut" }, "pink");
    tl.to(".loader-inner", { opacity: 0, duration: 0.15, ease: "power1.out" }, "pink+=" + SWEEP * 0.2);
    // Orange layer follows down-left, exposing the page
    tl.to(bgOrange, { drawSVG: "50% 100%", strokeWidth: 1000, x: -900, y: 1800, duration: SWEEP, ease: "power2.inOut" }, "pink+=" + SWEEP * 0.25);
    // Kick the hero off slightly before the sweep fully clears
    tl.add(() => { if (!heroTl.isActive() && heroTl.progress() === 0) heroTl.play(); }, "pink+=" + SWEEP * 0.75);
  }

  /* ================================================================
     NAV BUTTON SCRIBBLE HOVER
     ================================================================ */
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    const path = btn.querySelector(".nav-btn-fill path");
    gsap.set(path, { drawSVG: "0%", strokeWidth: 0 });
    btn.addEventListener("mouseenter", () => {
      gsap.killTweensOf(path);
      gsap.fromTo(path, { drawSVG: "0% 0%", strokeWidth: 24 }, { drawSVG: "0% 100%", duration: 0.55, ease: "power2.out" });
    });
    btn.addEventListener("mouseleave", () => {
      gsap.killTweensOf(path);
      gsap.to(path, { drawSVG: "100% 100%", duration: 0.45, ease: "power2.in" });
    });
  });

  /* ================================================================
     SCROLL ANIMATIONS
     ================================================================ */
  if (reduceMotion) return;

  // Header hides on scroll down, returns on scroll up
  const header = document.querySelector(".header");
  ScrollTrigger.create({
    start: 0, end: "max",
    onUpdate: (self) => header.classList.toggle("is-hidden", self.direction === 1 && self.scroll() > 200),
  });

  // Header gets a soft backdrop once you leave the very top, so content never collides with it
  ScrollTrigger.create({
    start: 40, end: "max",
    onToggle: (self) => header.classList.toggle("is-scrolled", self.isActive),
  });

  // Curved ribbon: draws on right-to-left when it enters, text loops along the curve forever
  const ribbonBg = document.querySelector(".ribbon-bg");
  const ribbonMask = document.querySelector(".ribbon-mask-path");
  const ribbonTp = document.querySelector(".ribbon-tp");
  const ribbonUnit = document.querySelector(".ribbon-unit");
  if (ribbonBg && ribbonTp) {
    gsap.set([ribbonBg, ribbonMask], { drawSVG: "100% 100%" });
    const unitLen = ribbonUnit ? ribbonUnit.getComputedTextLength() : 1600;
    gsap.to(ribbonTp, { attr: { startOffset: -unitLen }, duration: unitLen / 75, ease: "none", repeat: -1 });
    gsap.to([ribbonBg, ribbonMask], {
      drawSVG: "0% 100%", duration: 1.3, ease: "power2.out",
      scrollTrigger: { trigger: ".ribbon", start: "top 85%", once: true },
      onComplete: () => document.querySelector(".ribbon-text-group").removeAttribute("mask"),
    });
  }

  // About: section pins while every letter pops orange, tilts, then settles to black
  const aboutSection = document.querySelector(".about");
  if (aboutSection) {
  const aboutSplit = SplitText.create(".about-para", { type: "words,chars", charsClass: "about-char" });
  const chars = aboutSplit.chars;
  const aboutPills = gsap.utils.toArray(".about-pill");
  gsap.set(chars, { color: "rgba(255, 84, 0, 0.45)", transformOrigin: "50% 50%" });
  gsap.set(aboutPills, { opacity: 0, scale: 0.6, y: 24 });

  const aboutTl = gsap.timeline({
    scrollTrigger: {
      trigger: aboutSection,
      start: "top top",
      end: () => "+=" + Math.round(window.innerHeight * (window.innerWidth < 992 ? 1.6 : 2)),
      pin: true,
      scrub: window.innerWidth < 992 ? 0.6 : 0.8,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });
  const SPAN = 85;
  chars.forEach((c, i) => {
    const at = (i / chars.length) * SPAN;
    aboutTl
      .to(c, { color: "#FF5400", scale: 1.12, rotation: () => gsap.utils.random(-4, 4), duration: 3.5, ease: "power1.out" }, at)
      .to(c, { color: "#0A0A0A", scale: 1, rotation: 0, duration: 3.5, ease: "power1.inOut" }, at + 3.5);
  });
  if (aboutPills[0]) aboutTl.to(aboutPills[0], { opacity: 1, scale: 1, y: 0, duration: 6, ease: "back.out(2)" }, 35);
  if (aboutPills[1]) aboutTl.to(aboutPills[1], { opacity: 1, scale: 1, y: 0, duration: 6, ease: "back.out(2)" }, 72);
  aboutTl.to({}, { duration: 6 }); // short hold at the end before unpinning
  }

  // Work showcase: endless card marquee. Drifts right-to-left, follows scroll direction,
  // speeds up with scroll velocity, and cards dip slightly as they pass the centre.
  (function showcase() {
    const wrapper = document.querySelector(".showcase-wrapper");
    const track = wrapper && wrapper.querySelector(".showcase-track");
    if (!track) return;
    const originals = Array.from(track.children);
    const n = originals.length;
    const setsNeeded = Math.max(3, Math.ceil((window.innerWidth * 3.5) / ((originals[0].offsetWidth || 500) * n)));
    for (let s = 1; s < setsNeeded; s++) {
      originals.forEach((slide) => {
        const c = slide.cloneNode(true);
        c.setAttribute("aria-hidden", "true");
        const img = c.querySelector("img");
        if (img) { img.alt = ""; img.loading = "eager"; }
        track.appendChild(c);
      });
    }
    const slides = Array.from(track.children);
    let setWidth = 0;
    const measure = () => { setWidth = slides[n].offsetLeft - slides[0].offsetLeft; };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("load", measure);

    const BASE = 1.5; // px per frame
    let x = 0, dir = -1, targetDir = -1, boost = 0;
    ScrollTrigger.create({
      start: 0, end: "max",
      onUpdate: (self) => {
        const d = self.direction === 1 ? -1 : 1;
        targetDir = d;
        boost = Math.min(Math.abs(self.getVelocity()) / 220, 10) * d;
      },
    });

    let visible = false;
    ScrollTrigger.create({ trigger: ".showcase", start: "top bottom", end: "bottom top", onToggle: (s) => (visible = s.isActive) });

    gsap.ticker.add(() => {
      dir += (targetDir - dir) * 0.06;
      boost *= 0.92;
      x += BASE * dir + boost;
      if (setWidth > 0) {
        while (x <= -setWidth) x += setWidth;
        while (x > 0) x -= setWidth;
      }
      gsap.set(track, { x, force3D: true });
      if (!visible) return;
      const r = wrapper.getBoundingClientRect();
      const centre = r.left + r.width / 2, half = r.width * 0.45 || 400;
      slides.forEach((s) => {
        const b = s.getBoundingClientRect();
        const t = Math.min(1, Math.abs(b.left + b.width / 2 - centre) / half);
        gsap.set(s, { scale: 0.95 + 0.05 * t });
      });
    });
  })();

  // ================= SELECTED WORKS =================
  (function selectedWorks() {
    const section = document.querySelector(".projects");
    if (!section) return;

    // Heading: orange copy sits behind and drifts 1-4px away from the cursor
    const hWrap = section.querySelector(".projects-heading-wrap");
    const shadow = section.querySelector(".projects-heading-shadow");
    const qx = gsap.quickTo(shadow, "x", { duration: 0.4, ease: "power3.out" });
    const qy = gsap.quickTo(shadow, "y", { duration: 0.4, ease: "power3.out" });
    qx(3); qy(3);
    section.querySelector(".projects-header").addEventListener("pointermove", (e) => {
      const r = hWrap.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const k = Math.min(1, Math.max(0.25, Math.hypot(dx, dy) / (Math.max(r.width, r.height) / 2))) * 4;
      const a = Math.atan2(dy, dx);
      qx(Math.cos(a) * k); qy(Math.sin(a) * k);
    });

    // Cards: open out from a small tilted, zoomed window as they scroll in
    const FG_PATH = "M30 160C30 160 160 -20 250 50C365 140 -80 525 70 610C185 675 470 -65 655 50C895 200 -70 865 160 985C345 1085 535 455 675 560C810 655 420 935 510 990C595 1045 715 800 715 800";
    const MASK_PATH = "M30 735C30 735 140 1065 295 975C505 845 -165 180 90 45C315 -70 465 565 620 520C770 475 625 30 625 30";
    gsap.utils.toArray(".project-card", section).forEach((card, i) => {
      const clip = document.createElement("div");
      clip.className = "project-clip";
      card.parentNode.insertBefore(clip, card);
      clip.appendChild(card);

      gsap.set(clip, { clipPath: "inset(42.5% 42.5% 42.5% 42.5%)", borderRadius: 36 });
      gsap.set(card, {
        scale: 1.45, rotationX: 25, rotationY: i % 2 ? 16 : -16, rotation: i % 2 ? 4 : -4,
        transformPerspective: 800, transformOrigin: "50% 50%",
      });
      gsap.timeline({ scrollTrigger: { trigger: clip, start: "top 85%", toggleActions: "play none none reverse" } })
        .to(clip, { clipPath: "inset(0% 0% 0% 0%)", borderRadius: 0, duration: 1.25, ease: "power3.out" }, 0)
        .to(card, { scale: 1, rotationX: 0, rotationY: 0, rotation: 0, duration: 1.25, ease: "power3.out" }, 0);

      // Hover: a thick brand-coloured brush stroke sweeps in, then a second stroke paints in the hover image
      const media = card.querySelector(".project-media");
      const hoverSrc = media.dataset.hover;
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "project-overlay");
      svg.setAttribute("viewBox", "0 0 740 1000");
      svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
      svg.innerHTML =
        `<path class="fg" d="${FG_PATH}" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>` +
        `<defs><mask id="pmask-${i}" maskUnits="userSpaceOnUse" x="-300" y="-300" width="1340" height="1600">` +
        `<path class="mk" d="${MASK_PATH}" fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round"/></mask></defs>` +
        `<image href="${hoverSrc}" x="0" y="0" width="740" height="1000" preserveAspectRatio="xMidYMid slice" mask="url(#pmask-${i})"/>`;
      svg.style.color = getComputedStyle(card).getPropertyValue("--brand").trim() || "#FF5400";
      media.appendChild(svg);
      const fg = svg.querySelector(".fg"), mk = svg.querySelector(".mk");
      const arrow = card.querySelector(".project-arrow");
      gsap.set([fg, mk], { drawSVG: "100% 100%", strokeWidth: 0 });
      const htl = gsap.timeline({ paused: true, defaults: { ease: "power1.inOut" } })
        .to(fg, { drawSVG: "0% 100%", strokeWidth: 1200, duration: 0.95 }, 0)
        .to(mk, { drawSVG: "0% 100%", strokeWidth: 1200, duration: 1.05 }, 0.35)
        .to(arrow, { rotation: -45, duration: 0.28, ease: "power2.out" }, 0)
        .to(arrow, { rotation: 0, duration: 0.65, ease: "elastic.out(1.15, 0.35)" }, 0.28);
      card.addEventListener("mouseenter", () => htl.timeScale(1).play());
      card.addEventListener("mouseleave", () => htl.timeScale(1.3).reverse());
    });

    // Closing line: rises line by line, pills and button pop in
    const end = section.querySelector(".projects-end");
    const para = end.querySelector(".projects-end-para");
    const split = SplitText.create(para, { type: "lines", mask: "lines" });
    gsap.set(para, { opacity: 1 });
    gsap.set(split.lines, { yPercent: 115, opacity: 0 });
    const pills = gsap.utils.toArray(".projects-pill", end);
    gsap.set(pills, { opacity: 0, scale: 0.4, y: 20 });
    gsap.set(pills.map((p) => p.firstElementChild), { opacity: 0, y: 15 });
    const btn = end.querySelector(".project-btn");
    gsap.set(btn, { opacity: 0, scale: 0.4, y: 20 });
    const etl = gsap.timeline({ scrollTrigger: { trigger: end, start: "top 75%" } })
      .to(split.lines, { yPercent: 0, opacity: 1, duration: 0.85, stagger: 0.12, ease: "back.out(1.4)" }, 0);
    pills.forEach((p, k) => {
      etl.to(p, { opacity: 1, scale: 1, y: 0, duration: 0.55, ease: "back.out(2.5)" }, 0.35 + k * 0.18)
         .to(p.firstElementChild, { opacity: 1, y: 0, duration: 0.45, ease: "back.out(1.6)" }, 0.5 + k * 0.18);
    });
    etl.to(btn, { opacity: 1, scale: 1, y: 0, duration: 0.6, ease: "back.out(2.5)" }, 0.9);
  })();

  // ================= SERVICES: path fills orange on scroll, each service blooms as it is reached =================
  (function servicesPath() {
    const body = document.querySelector(".svc-body");
    if (!body) return;

    // Smooth curve through waypoints (Catmull-Rom converted to cubic Béziers)
    const smooth = (pts) => {
      let d = `M${pts[0][0]} ${pts[0][1]}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
        const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
        const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
        d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0]} ${p2[1]}`;
      }
      return d;
    };
    // Desktop route: swoops through each service (with a little loop after each one)
    const desktop = [[1590, 20], [1350, 120], [1150, 330], [1260, 470], [1180, 560], [1050, 470], [800, 560], [560, 620],
      [450, 700], [330, 820], [430, 900], [560, 860], [820, 930], [1100, 1080], [1220, 1200], [1120, 1290], [1010, 1220],
      [760, 1330], [480, 1450], [360, 1580], [470, 1650], [560, 1580], [840, 1680], [1120, 1820], [1260, 1950], [1150, 2040],
      [1040, 1960], [800, 2080], [520, 2200], [300, 2330], [-40, 2400]];
    const mobile = [[420, 10], [80, 180], [330, 440], [70, 700], [330, 960], [70, 1220], [330, 1480], [-20, 1600]];
    body.querySelectorAll(".svc-path-desktop path").forEach((p) => p.setAttribute("d", smooth(desktop)));
    body.querySelectorAll(".svc-path-mobile path").forEach((p) => p.setAttribute("d", smooth(mobile)));

    const fills = body.querySelectorAll(".svc-fill");
    gsap.set(fills, { drawSVG: "0%" });

    const blocks = gsap.utils.toArray(".svc-block", body);
    blocks.forEach((b) => {
      const icon = b.querySelector(".svc-icon");
      icon.dataset.w = icon.getBoundingClientRect().width;
      gsap.set(icon, { width: 0, scale: 0, opacity: 0 });
      gsap.set(b.querySelector(".svc-para"), { scale: 0, opacity: 0 });
    });

    const tl = gsap.timeline({
      scrollTrigger: { trigger: body, start: "top 70%", end: "bottom 70%", scrub: 1.2, invalidateOnRefresh: true },
    });
    tl.to(fills, { drawSVG: "100%", ease: "none", duration: 1 }, 0);
    const n = blocks.length;
    blocks.forEach((b, i) => {
      const at = Math.max(0, (n > 1 ? i / (n - 1) : 0) * 0.92 + 0.02 - 0.04);
      const icon = b.querySelector(".svc-icon");
      tl.to(icon, { width: () => parseFloat(icon.dataset.w) || 80, scale: 1, opacity: 1, duration: 0.14, ease: "back.out(3.5)" }, at)
        .to(b.querySelector(".svc-para"), { scale: 1, opacity: 1, duration: 0.14, ease: "back.out(3.5)" }, at + 0.02);
    });
  })();

  // Big headings: masked line reveal
  document.querySelectorAll("[data-lines]").forEach((h) => {
    const s = SplitText.create(h, { type: "lines", mask: "lines" });
    gsap.from(s.lines, {
      yPercent: 115, opacity: 0, duration: 0.85, stagger: 0.12, ease: "back.out(1.4)",
      scrollTrigger: { trigger: h, start: "top 82%" },
    });
  });

  // Eyebrows
  gsap.utils.toArray(".eyebrow").forEach((e) =>
    gsap.from(e, { y: 20, opacity: 0, duration: 0.6, scrollTrigger: { trigger: e, start: "top 88%" } })
  );

  // Services rows
  if (document.querySelector(".service")) gsap.from(".service", {
    y: 60, opacity: 0, duration: 0.8, stagger: 0.08, ease: "power3.out",
    scrollTrigger: { trigger: ".service-list", start: "top 80%" },
  });

  // FAQ accordion with smooth height
  document.querySelectorAll(".faq-item").forEach((item) => {
    const summary = item.querySelector("summary");
    const body = item.querySelector(".faq-body");
    summary.addEventListener("click", (e) => {
      e.preventDefault();
      if (item.open) {
        gsap.to(body, { height: 0, duration: 0.45, ease: "power2.inOut", onComplete: () => { item.open = false; gsap.set(body, { clearProps: "height" }); ScrollTrigger.refresh(); } });
        item.querySelector(".faq-plus").style.transform = "rotate(0deg)";
      } else {
        item.open = true;
        item.querySelector(".faq-plus").style.transform = "";
        gsap.fromTo(body, { height: 0 }, { height: "auto", duration: 0.5, ease: "power2.out", onComplete: () => ScrollTrigger.refresh() });
      }
    });
  });
  if (document.querySelector(".faq-item")) gsap.from(".faq-item", {
    y: 40, opacity: 0, duration: 0.7, stagger: 0.07, ease: "power3.out",
    scrollTrigger: { trigger: ".faq-list", start: "top 82%" },
  });

  // Footer CTA
  if (document.querySelector(".talk-btn-big")) gsap.from(".talk-btn-big", {
    scale: 0.4, opacity: 0, duration: 0.7, ease: "back.out(2.5)",
    scrollTrigger: { trigger: ".talk-btn-big", start: "top 90%" },
  });
}
