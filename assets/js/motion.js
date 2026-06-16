/* =====================================================================
   FULCRUM — motion choreography
   GSAP ScrollTrigger drives the signature beam, the pinned orders,
   count-ups, reveals, magnetic buttons and the pivot cursor.

   Every animation maps to one of: leverage, weight, balance, sequence.
   prefers-reduced-motion is honoured throughout — motion is an
   enhancement, never a dependency for understanding the content.
   ===================================================================== */
(function () {
  "use strict";

  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const COARSE = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  const hasGSAP = typeof window.gsap !== "undefined";

  /* ─── Nav: solidify on scroll ──────────────────────────────────── */
  const nav = document.querySelector("[data-nav]");
  const onScrollNav = () => {
    if (nav) nav.classList.toggle("is-stuck", window.scrollY > 24);
  };
  onScrollNav();
  window.addEventListener("scroll", onScrollNav, { passive: true });

  /* ─── Scroll reveals (works with or without GSAP) ──────────────── */
  const reveals = document.querySelectorAll("[data-reveal]");
  if (REDUCED || !("IntersectionObserver" in window)) {
    reveals.forEach((el) => el.classList.add("is-in"));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 }
    );
    reveals.forEach((el) => io.observe(el));
  }

  /* ─── Count-up numbers (stats), respecting reduced motion ──────── */
  const counters = document.querySelectorAll("[data-count]");
  const runCount = (el) => {
    const target = parseFloat(el.getAttribute("data-count"));
    if (REDUCED) { el.textContent = target; return; }
    const dur = 1100;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      el.textContent = Math.round(target * eased);
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = target;
    };
    requestAnimationFrame(tick);
  };
  if ("IntersectionObserver" in window) {
    const co = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { runCount(e.target); co.unobserve(e.target); }
        });
      },
      { threshold: 0.6 }
    );
    counters.forEach((el) => co.observe(el));
  } else {
    counters.forEach(runCount);
  }

  /* ─── Magnetic buttons + pivot cursor ──────────────────────────── */
  if (!REDUCED && !COARSE) {
    // pivot-dot cursor
    const cursor = document.querySelector("[data-cursor]");
    if (cursor) {
      let cx = -100, cy = -100, tx = -100, ty = -100, raf;
      const loop = () => {
        cx += (tx - cx) * 0.22; cy += (ty - cy) * 0.22;
        cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
        raf = requestAnimationFrame(loop);
      };
      window.addEventListener("mousemove", (e) => {
        tx = e.clientX; ty = e.clientY;
        cursor.classList.add("is-active");
        if (!raf) raf = requestAnimationFrame(loop);
      });
      window.addEventListener("mouseleave", () => cursor.classList.remove("is-active"));
      document.querySelectorAll("a, button, input, [data-magnetic]").forEach((el) => {
        el.addEventListener("mouseenter", () => cursor.classList.add("is-hover"));
        el.addEventListener("mouseleave", () => cursor.classList.remove("is-hover"));
      });
    }

    // weighted magnetic pull on key buttons
    document.querySelectorAll("[data-magnetic]").forEach((btn) => {
      const strength = 0.32;
      btn.addEventListener("mousemove", (e) => {
        const r = btn.getBoundingClientRect();
        const mx = e.clientX - (r.left + r.width / 2);
        const my = e.clientY - (r.top + r.height / 2);
        btn.style.transform = `translate(${mx * strength}px, ${my * strength}px)`;
      });
      btn.addEventListener("mouseleave", () => { btn.style.transform = ""; });
    });
  }

  /* ─── GSAP-driven scrollytelling ───────────────────────────────── */
  if (hasGSAP && window.ScrollTrigger && !REDUCED) {
    gsap.registerPlugin(ScrollTrigger);

    /* THE SIGNATURE MECHANISM — the tipping balance beam.
       At the top the beam is tipped toward SPEND (heavy, left side down).
       As the hero scrolls, the fulcrum does its work and the beam tips
       toward REVENUE. Counterweights stay plumb (honest physics).
       Easing is weighted (scrub), with mass, never bouncy. */
    const beam = document.querySelector("[data-beam]");
    const hangL = document.querySelector("[data-hang-l]");
    const hangR = document.querySelector("[data-hang-r]");
    const cap = document.querySelector("[data-lever-cap]");
    const labelL = document.querySelector("[data-label-l]");
    const labelR = document.querySelector("[data-label-r]");

    if (beam) {
      const START = 11;   // degrees, spend side down
      const END = -11;    // degrees, revenue side down
      gsap.set(beam, { rotation: START, transformOrigin: "280px 250px" });
      gsap.set([hangL, hangR], { transformOrigin: "center top" });
      gsap.set(hangL, { rotation: -START });
      gsap.set(hangR, { rotation: -START });

      ScrollTrigger.create({
        trigger: ".hero",
        start: "top top",
        end: "bottom bottom",
        scrub: 0.6,
        onUpdate: (self) => {
          const p = self.progress;
          const r = START + (END - START) * p;
          gsap.set(beam, { rotation: r });
          gsap.set(hangL, { rotation: -r }); // stay plumb
          gsap.set(hangR, { rotation: -r });
          // shift label emphasis as balance crosses over
          if (labelL) labelL.style.fill = p < 0.5 ? "var(--ink)" : "var(--ink-faint)";
          if (labelR) labelR.style.fill = p >= 0.5 ? "var(--clay)" : "var(--ink-faint)";
          if (cap) {
            cap.textContent =
              p < 0.35 ? "Tipped toward spend."
              : p < 0.7 ? "The foundation does its work."
              : "Tipped toward revenue.";
          }
        },
      });
    }

    /* PINNED ORDERS — the wrong order vs. the order that compounds.
       Steps reveal one at a time; on the wrong path the cost line rises,
       on the right path proof arrives first. */
    const ordersEl = document.querySelector("[data-orders]");
    if (ordersEl && window.innerWidth > 780) {
      const wrongSteps = document.querySelectorAll('[data-order="wrong"] [data-step]');
      const rightSteps = document.querySelectorAll('[data-order="right"] [data-step]');
      const cost = document.querySelector("[data-cost]");
      const proof = document.querySelector("[data-proof]");

      // give the pinned section scroll room: one viewport per "beat"
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: ordersEl,
          start: "top top",
          end: "+=180%",
          pin: ".orders__sticky",
          scrub: 0.5,
        },
      });

      // proof rises early on the right path
      tl.set(proof, { clearProps: "all" });
      for (let i = 0; i < 4; i++) {
        tl.call(() => { rightSteps[i] && rightSteps[i].classList.add("is-in"); }, null, i * 0.25);
        // cost climbs late on the wrong path
        tl.call(() => { wrongSteps[i] && wrongSteps[i].classList.add("is-in"); }, null, 0.08 + i * 0.25);
      }
      // meter fills tied to progress
      tl.fromTo(proof, { right: "100%" }, { right: "18%", ease: "none" }, 0.05)
        .fromTo(cost, { right: "100%" }, { right: "6%", ease: "none" }, 0.45);
    }

    // keep things correct on resize
    ScrollTrigger.addEventListener("refreshInit", () => {});
    window.addEventListener("load", () => ScrollTrigger.refresh());
  } else {
    /* No GSAP or reduced motion: ensure the beam reads as balanced/settled
       and all order steps are visible (the static, calm experience). */
    const beam = document.querySelector("[data-beam]");
    if (beam) beam.setAttribute("style", "transform-origin:280px 250px; transform:rotate(-4deg)");
    document.querySelectorAll("[data-step]").forEach((s) => s.classList.add("is-in"));
    // settle the meters to a representative state so they aren't empty
    const cost = document.querySelector("[data-cost]");
    const proof = document.querySelector("[data-proof]");
    if (cost) cost.style.inset = "0 6% 0 0";
    if (proof) proof.style.inset = "0 18% 0 0";
  }
})();
