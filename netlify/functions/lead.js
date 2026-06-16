// netlify/functions/lead.js  —  Netlify Function (Node 18+)
//
// Captures the email lead after the clarity check. Right now it validates
// and logs. Wire the marked section to wherever you want leads to land:
// your CRM, a Google Sheet, or an email tool like Resend.

exports.handler = async (event) => {
  const json = (status, body) => ({
    statusCode: status,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (event.httpMethod !== "POST") return json(405, { error: "POST only" });

  try {
    const { email, url, consent } = JSON.parse(event.body || "{}");
    if (!email || !email.includes("@")) return json(400, { error: "valid email required" });
    if (!consent) return json(400, { error: "consent required" });

    // -------------------------------------------------------------
    // WIRE THIS UP. Pick one:
    //
    // a) Email yourself via Resend (https://resend.com):
    //    await fetch("https://api.resend.com/emails", {
    //      method:"POST",
    //      headers:{ Authorization:`Bearer ${process.env.RESEND_API_KEY}`, "Content-Type":"application/json" },
    //      body: JSON.stringify({
    //        from:"Fulcrum <hello@yourdomain.com>",
    //        to:"you@yourdomain.com",
    //        subject:`New clarity check lead: ${url}`,
    //        text:`Email: ${email}\nSite: ${url}`
    //      })
    //    });
    //
    // b) Push to your CRM via its API.
    // c) Append to a Google Sheet via a webhook.
    //
    // For GDPR: store only email + url + consent + timestamp, and keep a record
    // of the consent text shown. You are the data controller here.
    // -------------------------------------------------------------

    console.log("LEAD:", { email, url, consent, at: new Date().toISOString() });

    return json(200, { ok: true });
  } catch (err) {
    console.error(err);
    return json(500, { error: "server error" });
  }
};
