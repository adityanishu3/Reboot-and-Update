/**
 * evaluate-review — Supabase Edge Function
 *
 * Acts as a server-side proxy for the Anthropic API so the API key never
 * touches the browser.
 *
 * Deploy:
 *   supabase functions deploy evaluate-review
 *
 * Set the secret (one-time):
 *   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
 *
 * Expected request body (POST, JSON):
 *   { systemPrompt: string, userInput: string }
 *
 * Returns: the raw JSON evaluation object from Claude.
 */

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL         = "claude-sonnet-4-20250514";
const MAX_TOKENS    = 1000;

// ── CORS helpers ──────────────────────────────────────────────────────────────
const CORS_HEADERS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function corsOk() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // Browser preflight
  if (req.method === "OPTIONS") return corsOk();
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Parse body
  let systemPrompt: string;
  let userInput: string;
  try {
    const body = await req.json();
    systemPrompt = body.systemPrompt;
    userInput    = body.userInput;
    if (!systemPrompt || !userInput) throw new Error("Missing fields");
  } catch {
    return json({ error: "Invalid request body. Expected { systemPrompt, userInput }." }, 400);
  }

  // Retrieve secret (set via: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...)
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY secret not set");
    return json({ error: "Server configuration error — API key not set." }, 500);
  }

  // Call Anthropic server-side
  let anthropicRes: Response;
  try {
    anthropicRes = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: MAX_TOKENS,
        system:     systemPrompt,
        messages:   [{ role: "user", content: userInput }],
      }),
    });
  } catch (err) {
    console.error("Anthropic fetch failed:", err);
    return json({ error: "Failed to reach Anthropic API." }, 502);
  }

  if (!anthropicRes.ok) {
    const errText = await anthropicRes.text();
    console.error("Anthropic error response:", errText);
    return json({ error: "Anthropic API error.", detail: errText }, anthropicRes.status);
  }

  // Extract Claude's text block and parse the JSON evaluation
  const data = await anthropicRes.json();
  const rawText: string = (data.content ?? [])
    .map((b: { type: string; text?: string }) => b.text ?? "")
    .join("");

  const clean = rawText.replace(/```json|```/g, "").trim();

  let evaluation: unknown;
  try {
    evaluation = JSON.parse(clean);
  } catch {
    console.error("Claude returned non-JSON text:", rawText);
    return json({ error: "Claude returned an unparseable response.", raw: rawText }, 502);
  }

  return json(evaluation);
});
