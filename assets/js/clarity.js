/* =====================================================================
   FULCRUM — Clarity check (lead generator)
   Reads a visitor's site and scores go-to-market clarity, then gates the
   full breakdown behind an email.

   DEMO_MODE = true  -> built-in sample result, works anywhere (no backend).
   DEMO_MODE = false -> calls the deployed serverless functions:
       POST /api/analyze  { url, offer }            -> the scorecard
       POST /api/lead     { email, url, consent }   -> stores/sends the lead
   On Netlify, netlify.toml redirects /api/* to /.netlify/functions/*.
   Flip to false once the functions are deployed and ANTHROPIC_API_KEY is set.
   ===================================================================== */
(function () {
  "use strict";

  const DEMO_MODE = true;

  const DIM_LABELS = {
    what_you_do: "What you do",
    who_for: "Who it is for",
    why_you: "Why you, not them",
    path_to_buy: "Path to buy",
    proof: "Proof",
  };

  const SAMPLE = {
    overall: { score: 61, verdict: "Clear enough to browse, not clear enough to buy." },
    dimensions: [
      { key: "what_you_do", score: 7, finding: "A visitor gets the gist, but it takes two scrolls to be sure.", fix: "Lead with the outcome you create, not the category you are in." },
      { key: "who_for", score: 5, finding: "The copy speaks to everyone, so it lands with no one in particular.", fix: "Name the buyer in the first line. Specific beats broad." },
      { key: "why_you", score: 4, finding: "Claims are generic. Fast, powerful, smart. A competitor could say all of it.", fix: "Replace one adjective with a number or a named outcome." },
      { key: "path_to_buy", score: 6, finding: "There is a contact form, but no obvious next step for someone ready now.", fix: "Add one primary action above the fold and repeat it once." },
      { key: "proof", score: 5, finding: "Assertions without evidence. No metrics, no named results.", fix: "Put one concrete result where the eye lands first." },
    ],
    topFixes: [
      "Lead with the outcome, not the category.",
      "Name the buyer in the first sentence.",
      "Swap a generic claim for one real number.",
    ],
  };

  const $ = (s) => document.querySelector(s);
  const formEl = $("#cc-form");
  const loadEl = $("#cc-loading");
  const resEl = $("#cc-result");
  const runBtn = $("#cc-run");

  if (!formEl || !runBtn) return; // tool not on page

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

  function countTo(el, target, dur) {
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / dur, 1);
      el.textContent = Math.round(target * p);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  runBtn.addEventListener("click", run);
  $("#cc-url").addEventListener("keydown", (e) => { if (e.key === "Enter") run(); });

  async function run() {
    const url = $("#cc-url").value.trim();
    if (!url) { $("#cc-url").focus(); return; }
    const offer = $("#cc-offer").value.trim();

    formEl.style.display = "none";
    loadEl.classList.add("on");

    const steps = [...document.querySelectorAll("#cc-loading .lstep")];
    const animate = async () => {
      for (let i = 0; i < steps.length; i++) {
        steps[i].classList.add("active");
        await wait(650);
        steps[i].classList.remove("active");
        steps[i].classList.add("done");
      }
    };

    try {
      const [data] = await Promise.all([getResult(url, offer), animate()]);
      loadEl.classList.remove("on");
      render(data);
    } catch (err) {
      loadEl.classList.remove("on");
      formEl.style.display = "block";
      steps.forEach((s) => s.classList.remove("active", "done"));
      alert("Could not read that site. Check the URL and try again.");
      console.error(err);
    }
  }

  async function getResult(url, offer) {
    if (DEMO_MODE) { await wait(2600); return SAMPLE; }
    const r = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, offer }),
    });
    if (!r.ok) throw new Error("analyze failed");
    return r.json();
  }

  function render(data) {
    resEl.classList.add("on");
    const score = data.overall.score;
    $("#cc-verdict").textContent = data.overall.verdict;

    const ring = $("#cc-ring"), C = 264;
    setTimeout(() => {
      ring.style.transition = "stroke-dashoffset 1s ease";
      ring.style.strokeDashoffset = C - (C * score) / 100;
    }, 100);
    countTo($("#cc-scoreNum"), score, 900);

    const wrap = $("#cc-dims");
    wrap.innerHTML = "";
    data.dimensions.forEach((d, i) => {
      const el = document.createElement("div");
      el.className = "dim";
      el.innerHTML = `
        <div class="dim-h">
          <span class="nm">${DIM_LABELS[d.key] || esc(d.key)}</span>
          <span class="bar"><i></i></span>
          <span class="sc">${d.score}/10</span>
        </div>
        <p class="finding">${esc(d.finding)}</p>
        <p class="fix"><b>fix</b>${esc(d.fix)}</p>`;
      wrap.appendChild(el);
      setTimeout(() => { el.querySelector(".bar i").style.width = d.score * 10 + "%"; }, 200 + i * 120);
    });
  }

  $("#cc-unlock").addEventListener("click", async () => {
    const email = $("#cc-email").value.trim();
    const consent = $("#cc-consent").checked;
    if (!email || !email.includes("@")) { $("#cc-email").focus(); return; }
    if (!consent) { alert("Please tick the consent box so we can send the report."); return; }

    if (!DEMO_MODE) {
      try {
        await fetch("/api/lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, url: $("#cc-url").value.trim(), consent: true }),
        });
      } catch (e) { console.error(e); }
    }
    $("#cc-dims").classList.remove("locked");
    $("#cc-gate").style.display = "none";
    $("#cc-unlockedNote").classList.add("on");
  });
})();
