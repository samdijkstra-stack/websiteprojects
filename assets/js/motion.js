/* =====================================================================
   FULCRUM — motion
   Deliberately restrained. No GSAP, no custom cursor, no magnetic pull.
   A gentle scroll-tip on the hero beam, calm in-view reveals, count-ups,
   and a non-pinned reveal for the two order paths.

   Every animation maps to leverage, weight, balance or sequence.
   prefers-reduced-motion is fully honoured — the static state is complete.
   ===================================================================== */
(function () {
  "use strict";

  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasIO = "IntersectionObserver" in window;

  /* ─── Logos: hide gracefully if the icon CDN can't be reached ──── */
  document.querySelectorAll(".intg-logo, .intg-cell img").forEach((img) => {
    const hide = () => { img.style.display = "none"; };
    img.addEventListener("error", hide);
    // catch any that already failed before this script attached
    if (img.tagName === "IMG" && img.complete && img.naturalWidth === 0) hide();
  });

  /* ─── Nav: solidify on scroll ──────────────────────────────────── */
  const nav = document.querySelector("[data-nav]");
  const onNav = () => { if (nav) nav.classList.toggle("is-stuck", window.scrollY > 24); };
  onNav();
  window.addEventListener("scroll", onNav, { passive: true });

  /* ─── Calm in-view reveals ─────────────────────────────────────── */
  const reveals = document.querySelectorAll("[data-reveal]");
  if (REDUCED || !hasIO) {
    reveals.forEach((el) => el.classList.add("is-in"));
  } else {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      }),
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 }
    );
    reveals.forEach((el) => io.observe(el));
  }

  /* ─── Count-up numbers ─────────────────────────────────────────── */
  const counters = document.querySelectorAll("[data-count]");
  const runCount = (el) => {
    const target = parseFloat(el.getAttribute("data-count"));
    if (REDUCED) { el.textContent = target; return; }
    const dur = 1000, start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / dur, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick); else el.textContent = target;
    };
    requestAnimationFrame(tick);
  };
  if (hasIO) {
    const co = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { runCount(e.target); co.unobserve(e.target); } }),
      { threshold: 0.6 }
    );
    counters.forEach((el) => co.observe(el));
  } else counters.forEach(runCount);

  /* ─── Order paths: reveal steps in sequence, fill the meters ───── */
  const fillMeter = (el, leave) => { if (el) el.style.inset = `0 ${leave} 0 0`; };
  const revealOrder = (order) => {
    const steps = order.querySelectorAll("[data-step]");
    steps.forEach((s, i) => setTimeout(() => s.classList.add("is-in"), REDUCED ? 0 : i * 160));
    const cost = order.querySelector("[data-cost]");
    const proof = order.querySelector("[data-proof]");
    setTimeout(() => { fillMeter(cost, "6%"); fillMeter(proof, "18%"); }, REDUCED ? 0 : 520);
  };
  const orders = document.querySelectorAll("[data-order]");
  if (REDUCED || !hasIO) {
    orders.forEach(revealOrder);
  } else if (orders.length) {
    const oo = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { revealOrder(e.target); oo.unobserve(e.target); } }),
      { threshold: 0.35 }
    );
    orders.forEach((o) => oo.observe(o));
  }

  /* ─── The beam: a gentle scroll-driven tip from SPEND to REVENUE ── */
  const beam = document.querySelector("[data-beam]");
  const hangL = document.querySelector("[data-hang-l]");
  const hangR = document.querySelector("[data-hang-r]");
  const cap = document.querySelector("[data-lever-cap]");
  const labelL = document.querySelector("[data-label-l]");
  const labelR = document.querySelector("[data-label-r]");
  const hero = document.querySelector(".hero");

  const setBeam = (deg) => {
    if (!beam) return;
    beam.style.transformOrigin = "280px 250px";
    beam.style.transform = `rotate(${deg}deg)`;
    if (hangL) { hangL.style.transformOrigin = "96px 250px"; hangL.style.transform = `rotate(${-deg}deg)`; }
    if (hangR) { hangR.style.transformOrigin = "464px 250px"; hangR.style.transform = `rotate(${-deg}deg)`; }
  };

  if (REDUCED || !hero || !beam) {
    // settled, balanced state — no scroll dependency
    setBeam(-3);
  } else {
    const START = 8, END = -8; // softened tilt, weighted not bouncy
    let ticking = false;
    const update = () => {
      ticking = false;
      const r = hero.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      const p = span > 0 ? Math.min(Math.max(-r.top / span, 0), 1) : 0;
      const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; // ease-in-out
      setBeam(START + (END - START) * eased);
      if (labelL) labelL.style.fill = p < 0.5 ? "var(--ink)" : "var(--ink-faint)";
      if (labelR) labelR.style.fill = p >= 0.5 ? "var(--clay)" : "var(--ink-faint)";
      if (cap) cap.textContent = p < 0.35 ? "Tipped toward spend."
        : p < 0.7 ? "The foundation does its work." : "Tipped toward revenue.";
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    update();
  }
})();
