// netlify/functions/analyze.js  —  Netlify Function (Node 18+)
//
// Fetches the visitor's site, runs a go-to-market clarity audit through Claude,
// and returns a structured scorecard. The API key stays server-side.
//
// Setup:
//   1. This file lives at /netlify/functions/analyze.js (mapped to /api/analyze
//      by the redirect in netlify.toml).
//   2. In Netlify → Site settings → Environment variables, add ANTHROPIC_API_KEY.
//   3. In assets/js/clarity.js set DEMO_MODE = false.
//
// Model: swap MODEL for whichever current model you prefer. Haiku is cheaper
// and fine for this; Sonnet reads more sharply.

const MODEL = "claude-sonnet-4-6";
const MAX_SITE_CHARS = 12000;

exports.handler = async (event) => {
  const json = (status, body) => ({
    statusCode: status,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (event.httpMethod !== "POST") return json(405, { error: "POST only" });

  try {
    const { url, offer } = JSON.parse(event.body || "{}");
    if (!url) return json(400, { error: "url required" });
    if (!process.env.ANTHROPIC_API_KEY) return json(500, { error: "ANTHROPIC_API_KEY not set" });

    const target = normalizeUrl(url);
    const siteText = await readSite(target);
    if (!siteText) return json(422, { error: "could not read site" });

    const system = [
      "You are a sharp B2B go-to-market operator running a 5-second clarity audit on a company website.",
      "You judge it the way a first-time visitor and a ready buyer would, not the way the company sees itself.",
      "Be specific and opinionated. No fluff, no praise padding. Every finding names a real gap, every fix is one concrete action.",
      "Score each dimension 0 to 10 and the overall 0 to 100, where the overall reflects how easily a stranger understands the offer and can act on it.",
      "Write in sentence case. Do not use em dashes. Keep each finding and fix to one short sentence.",
      "Return JSON only, no markdown, no preamble, matching exactly this shape:",
      `{"overall":{"score":0,"verdict":""},"dimensions":[{"key":"what_you_do","score":0,"finding":"","fix":""},{"key":"who_for","score":0,"finding":"","fix":""},{"key":"why_you","score":0,"finding":"","fix":""},{"key":"path_to_buy","score":0,"finding":"","fix":""},{"key":"proof","score":0,"finding":"","fix":""}],"topFixes":["","",""]}`,
    ].join("\n");

    const userMsg =
      `Website: ${target}\n` +
      (offer ? `The company says it sells: ${offer}\n` : "") +
      `\nExtracted page content (truncated):\n"""\n${siteText}\n"""`;

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        system,
        messages: [{ role: "user", content: userMsg }],
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      return json(502, { error: "model call failed", detail });
    }

    const data = await r.json();
    const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());

    if (!parsed.overall || !Array.isArray(parsed.dimensions)) {
      return json(502, { error: "unexpected model output" });
    }

    return json(200, parsed);
  } catch (err) {
    console.error(err);
    return json(500, { error: "server error" });
  }
};

function normalizeUrl(u) {
  let s = String(u).trim();
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  return s;
}

async function readSite(target) {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(target, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (clarity-check bot)" },
    });
    clearTimeout(t);
    if (!resp.ok) return null;
    const html = await resp.text();

    // keep the signal a buyer reads: title, meta description, headings, button/link text
    const grab = (re) => [...html.matchAll(re)].map((m) => clean(m[1])).filter(Boolean);
    const title = grab(/<title[^>]*>([\s\S]*?)<\/title>/gi).join(" ");
    const desc = grab(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/gi).join(" ");
    const heads = grab(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi).slice(0, 30);
    const ctas = grab(/<(?:button|a)[^>]*>([\s\S]*?)<\/(?:button|a)>/gi).slice(0, 40);

    const body = clean(
      html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
    );

    const out = [
      title && `TITLE: ${title}`,
      desc && `META: ${desc}`,
      heads.length && `HEADINGS: ${heads.join(" | ")}`,
      ctas.length && `BUTTONS/LINKS: ${ctas.join(" | ")}`,
      `BODY: ${body}`,
    ].filter(Boolean).join("\n");

    return out.slice(0, MAX_SITE_CHARS);
  } catch {
    return null;
  }
}

function clean(s) {
  return String(s).replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();
}
