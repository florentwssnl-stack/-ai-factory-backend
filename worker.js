const ETERNAL_BASE = "https://open.eternalai.org";
const ETERNAL_MODEL = "wan-ai/wan2.2-i2v-a14b-lightning";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json; charset=utf-8"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: cors
  });
}

async function eternalFetch(env, path, options = {}) {
  if (!env.ETERNAL_AI_API_KEY) {
    throw new Error("ETERNAL_AI_API_KEY manquante");
  }

  const response = await fetch(`${ETERNAL_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${env.ETERNAL_AI_API_KEY}`,
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
      `Eternal AI HTTP ${response.status}: ${
        data?.error || data?.detail || text
      }`
    );
  }

  return data;
}


// ─────────────────────────────────────
// TEST DIRECT WAN 2.2
// GET /test-eternal
// ─────────────────────────────────────

async function testEternal(env) {

  // Image publique de démonstration
  const imageUrl =
    "https://cdn.eternalai.org/feed/2025/12/12/11752376-938c-46c5-8799-ab6d32c8599d.jpg";

  const payload = {
    prompt:
      "A person slowly turns their head toward the camera. Natural realistic movement. Cinematic lighting. Static camera.",

    image_url: imageUrl,

    model_id: ETERNAL_MODEL,

    duration: "5",

    aspect_ratio: "9:16",

    resolution: "480p",

    negative_prompt:
      "blur, distort, low quality, watermark, text, subtitles",

    cfg_scale: 0.5
  };

  const result = await eternalFetch(
    env,
    "/api/image-to-video",
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  );

  return result;
}


// ─────────────────────────────────────
// ROUTER
// ─────────────────────────────────────

export default {

  async fetch(request, env) {

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: cors
      });
    }

    const url = new URL(request.url);

    try {

      // HOME
      if (
        request.method === "GET" &&
        url.pathname === "/"
      ) {
        return json({
          service: "AI FACTORY",
          status: "online",
          engine: ETERNAL_MODEL,
          version: "3.0"
        });
      }


      // HEALTH
      if (
        request.method === "GET" &&
        url.pathname === "/health"
      ) {
        return json({
          service: "AI FACTORY",
          status: "online",
          eternal_key_configured:
            !!env.ETERNAL_AI_API_KEY,
          engine: ETERNAL_MODEL
        });
      }


      // TEST RÉEL WAN 2.2
      if (
        request.method === "GET" &&
        url.pathname === "/test-eternal"
      ) {

        const result = await testEternal(env);

        return json({
          success: true,
          engine: "Eternal AI",
          model: ETERNAL_MODEL,
          response: result
        }, 202);
      }


      // GÉNÉRATION AVEC NOTRE IMAGE
      //
      // POST /generate
      //
      // {
      //   "image_url": "...",
      //   "prompt": "..."
      // }

      if (
        request.method === "POST" &&
        url.pathname === "/generate"
      ) {

        const body = await request.json();

        if (!body.image_url) {
          return json({
            success: false,
            error: "image_url obligatoire"
          }, 400);
        }

        const result = await eternalFetch(
          env,
          "/api/image-to-video",
          {
            method: "POST",
            body: JSON.stringify({

              prompt:
                body.prompt ||
                "A person slowly moves their hand toward a mirror. The reflection reacts slightly late and slowly smiles while the real person remains expressionless. Realistic subtle horror.",

              image_url: body.image_url,

              model_id: ETERNAL_MODEL,

              duration: "5",

              aspect_ratio: "9:16",

              resolution: "480p",

              negative_prompt:
                "blur, distort, low quality, watermark, text, subtitles, camera shake",

              cfg_scale: 0.5
            })
          }
        );

        return json({
          success: true,
          engine: "Eternal AI",
          model: ETERNAL_MODEL,
          request: result
        }, 202);
      }


      // RÉCUPÉRER LE RÉSULTAT
      //
      // GET /result?request_id=XXXXX

      if (
        request.method === "GET" &&
        url.pathname === "/result"
      ) {

        const requestId =
          url.searchParams.get("request_id");

        if (!requestId) {
          return json({
            success: false,
            error: "request_id obligatoire"
          }, 400);
        }

        const result = await eternalFetch(
          env,
          `/api/image-to-video/${encodeURIComponent(requestId)}/status`,
          {
            method: "GET",
            headers: {
              Authorization:
                `Bearer ${env.ETERNAL_AI_API_KEY}`
            }
          }
        );

        return json({
          success: true,
          request_id: requestId,
          result
        });
      }


      return json({
        success: false,
        error: "Route inconnue",
        path: url.pathname
      }, 404);


    } catch (error) {

      return json({
        success: false,
        error: error?.message || String(error)
      }, 500);
    }
  }
};
