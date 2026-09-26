export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    const url = new URL(request.url);

    // Accueil
    if (url.pathname === "/") {
      return new Response(
        JSON.stringify({
          service: "AI FACTORY",
          status: "online",
          version: "2.0"
        }),
        {
          headers: {
            "Content-Type": "application/json",
            ...cors
          }
        }
      );
    }

    // Test Hugging Face
    if (url.pathname === "/health") {
      try {
        const response = await fetch(
          "https://observantdistressed-wan2-2-i2v-v3.hf.space/gradio_api/info",
          {
            headers: {
              "Authorization": `Bearer ${env.HF_TOKEN}`
            }
          }
        );

        return new Response(
          JSON.stringify({
            cloudflare: true,
            huggingface_status: response.status,
            huggingface_ok: response.ok
          }),
          {
            status: response.ok ? 200 : 502,
            headers: {
              "Content-Type": "application/json",
              ...cors
            }
          }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({
            cloudflare: true,
            huggingface_ok: false,
            error: error.message
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              ...cors
            }
          }
        );
      }
    }

    // Génération vidéo
    if (url.pathname === "/generate" && request.method === "POST") {
      try {
        const body = await request.json();

        if (!body.image_url) {
          return new Response(
            JSON.stringify({
              error: "image_url is required"
            }),
            {
              status: 400,
              headers: {
                "Content-Type": "application/json",
                ...cors
              }
            }
          );
        }

        const prompt =
          body.prompt ||
          "cinematic realistic motion, subtle mysterious movement";

        const payload = {
          data: [
            {
              path: body.image_url,
              url: body.image_url,
              size: null,
              orig_name: "input.jpg",
              mime_type: "image/jpeg",
              is_stream: false,
              meta: {
                _type: "gradio.FileData"
              }
            },
            null,
            prompt,
            body.steps ?? 6,
            body.negative_prompt ?? "",
            body.duration_seconds ?? 3.5,
            body.guidance_scale ?? 1,
            body.guidance_scale_2 ?? 1,
            body.seed ?? 42,
            true,
            body.quality ?? 6,
            body.scheduler ?? "UniPCMultistep",
            body.flow_shift ?? 3,
            body.frame_multiplier ?? 16,
            true,
            [],
            true,
            true
          ]
        };

        const response = await fetch(
          "https://observantdistressed-wan2-2-i2v-v3.hf.space/gradio_api/call/generate_video",
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${env.HF_TOKEN}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
          }
        );

        const result = await response.text();

        return new Response(
          JSON.stringify({
            huggingface_status: response.status,
            submitted: response.ok,
            result: result
          }),
          {
            status: response.ok ? 200 : 502,
            headers: {
              "Content-Type": "application/json",
              ...cors
            }
          }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({
            submitted: false,
            error: error.message
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              ...cors
            }
          }
        );
      }
    }

    return new Response(
      JSON.stringify({
        error: "Route not found"
      }),
      {
        status: 404,
        headers: {
          "Content-Type": "application/json",
          ...cors
        }
      }
    );
  }
};
