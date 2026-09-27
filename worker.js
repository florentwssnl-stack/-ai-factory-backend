const ETERNAL_BASE = "https://open.eternalai.org";
const ETERNAL_MODEL = "wan-ai/wan2.2-i2v-a14b-lightning";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json; charset=utf-8"
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: corsHeaders()
  });
}

async function eternalRequest(env, path, options = {}) {
  if (!env.ETERNAL_AI_API_KEY) {
    throw new Error("ETERNAL_AI_API_KEY is missing");
  }

  const response = await fetch(`${ETERNAL_BASE}${path}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${env.ETERNAL_AI_API_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const text = await response.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    throw new Error(
      data?.error ||
      data?.detail ||
      `Eternal AI HTTP ${response.status}`
    );
  }

  return data;
}


// ─────────────────────────────────────────────
// WAN 2.2 — LANCER UNE GÉNÉRATION
// ─────────────────────────────────────────────

async function generateVideo(env, body) {
  if (!body.image_url) {
    throw new Error("image_url is required");
  }

  const prompt =
    body.prompt ||
    "A person slowly moves their hand toward a mirror. The reflection reacts slightly late, then slowly smiles while the real person remains expressionless. Subtle realistic horror.";

  const payload = {
    prompt,
    image_url: body.image_url,
    model_id: ETERNAL_MODEL,

    // Notre premier test
    duration: "5",
    aspect_ratio: "9:16",
    resolution: "480p",

    negative_prompt:
      "blur, distorted face, deformed hands, extra fingers, low quality, watermark, text, subtitles, camera shake",

    cfg_scale: 0.5
  };

  const result = await eternalRequest(
    env,
    "/api/image-to-video",
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  );

  return {
    success: true,
    engine: "eternal-ai",
    model: ETERNAL_MODEL,
    request_id: result?.result?.request_id,
    status: "submitted",
    settings: {
      duration: "5",
      aspect_ratio: "9:16",
      resolution: "480p"
    }
  };
}


// ─────────────────────────────────────────────
// WAN 2.2 — VÉRIFIER UNE GÉNÉRATION
// ─────────────────────────────────────────────

async function getVideoStatus(env, requestId) {
  if (!requestId) {
    throw new Error("request_id is required");
  }

  const result = await eternalRequest(
    env,
    `/api/image-to-video/${encodeURIComponent(requestId)}/status`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    }
  );

  return {
    success: true,
    engine: "eternal-ai",
    request_id: requestId,
    result: result.result || result
  };
}


// ─────────────────────────────────────────────
// VÉRIFIER LE COMPTE / CRÉDITS
// ─────────────────────────────────────────────

async function getBalance(env) {
  const result = await eternalRequest(
    env,
    "/v1/balance",
    {
      method: "GET"
    }
  );

  return {
    success: true,
    balance: result
  };
}


// ─────────────────────────────────────────────
// ROUTER
// ─────────────────────────────────────────────

export default {
  async fetch(request, env) {

    // CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {

      // ───────────────────────────────────────
      // HOME
      // ───────────────────────────────────────

      if (request.method === "GET" && path === "/") {
        return json({
          service: "AI FACTORY",
          status: "online",
          version: "2.0",
          engine: "Eternal AI / Wan 2.2 I2V A14B Lightning"
        });
      }


      // ───────────────────────────────────────
      // HEALTH
      // ───────────────────────────────────────

      if (request.method === "GET" && path === "/health") {
        return json({
          service: "AI FACTORY",
          status: "online",
          eternal_ai: !!env.ETERNAL_AI_API_KEY,
          engine: ETERNAL_MODEL
        });
      }


      // ───────────────────────────────────────
      // BALANCE
      // ───────────────────────────────────────

      if (request.method === "GET" && path === "/balance") {
        return json(await getBalance(env));
      }


      // ───────────────────────────────────────
      // LANCER UNE VIDÉO
      // POST /generate
      //
      // {
      //   "image_url": "...",
      //   "prompt": "..."
      // }
      // ───────────────────────────────────────

      if (request.method === "POST" && path === "/generate") {
        const body = await request.json();

        const result = await generateVideo(env, body);

        return json(result, 202);
      }


      // Alias explicite
      // POST /eternal/generate

      if (
        request.method === "POST" &&
        path === "/eternal/generate"
      ) {
        const body = await request.json();

        const result = await generateVideo(env, body);

        return json(result, 202);
      }


      // ───────────────────────────────────────
      // STATUT D'UNE VIDÉO
      //
      // GET /result?request_id=XXXXX
      // ───────────────────────────────────────

      if (request.method === "GET" && path === "/result") {

        const requestId = url.searchParams.get("request_id");

        const result = await getVideoStatus(
          env,
          requestId
        );

        return json(result);
      }


      // Alias explicite
      // GET /eternal/status?request_id=XXXXX

      if (
        request.method === "GET" &&
        path === "/eternal/status"
      ) {

        const requestId =
          url.searchParams.get("request_id");

        const result = await getVideoStatus(
          env,
          requestId
        );

        return json(result);
      }


      // ───────────────────────────────────────
      // 404
      // ───────────────────────────────────────

      return json({
        error: "Route not found",
        path
      }, 404);

    } catch (error) {

      return json({
        success: false,
        error: error?.message || String(error)
      }, 500);
    }
  }
};
