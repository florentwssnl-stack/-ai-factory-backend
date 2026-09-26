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

    if (url.pathname === "/") {
      return new Response(
        JSON.stringify({
          service: "AI FACTORY",
          status: "online",
          version: "3.0"
        }),
        {
          headers: {
            "Content-Type": "application/json",
            ...cors
          }
        }
      );
    }

    if (url.pathname === "/health") {
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
    }

    // Lance une génération Wan 2.2
    if (url.pathname === "/generate" && request.method === "POST") {
      try {
        const body = await request.json();

        if (!body.image_url) {
          return new Response(
            JSON.stringify({ error: "image_url is required" }),
            {
              status: 400,
              headers: {
                "Content-Type": "application/json",
                ...cors
              }
            }
          );
        }

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
            body.prompt || "cinematic realistic motion, subtle mysterious movement",
            6,
            "",
            3.5,
            1,
            1,
            42,
            true,
            6,
            "UniPCMultistep",
            3,
            16,
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

        return new Response(result, {
          status: response.status,
          headers: {
            "Content-Type": "application/json",
            ...cors
          }
        });
      } catch (error) {
        return new Response(
          JSON.stringify({
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

    // Page de test
    if (url.pathname === "/test") {
      return new Response(
        `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>AI FACTORY TEST</title>
<style>
body {
  background:#111;
  color:white;
  font-family:Arial;
  padding:25px;
}
button {
  background:#ff4d00;
  color:white;
  border:0;
  padding:18px;
  border-radius:12px;
  font-size:18px;
  font-weight:bold;
}
#status {
  margin-top:20px;
  white-space:pre-wrap;
}
</style>
</head>
<body>

<h1>AI FACTORY</h1>
<p>Wan 2.2 — Test vidéo</p>

<button onclick="generate()">GENERATE TEST VIDEO</button>

<div id="status">Prêt.</div>

<script>
async function generate() {
  const status = document.getElementById("status");

  status.textContent = "⏳ Envoi vers Wan 2.2...";

  try {
    const response = await fetch("/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        image_url: "https://raw.githubusercontent.com/gradio-app/gradio/main/test/test_files/bus.png",
        prompt: "cinematic realistic motion, the scene comes alive, subtle camera movement, natural movement, photorealistic"
      })
    });

    const text = await response.text();

    status.textContent =
      "Réponse Wan 2.2 :\\n\\n" + text;

  } catch (error) {
    status.textContent = "❌ Erreur : " + error.message;
  }
}
</script>

</body>
</html>`,
        {
          headers: {
            "Content-Type": "text/html",
            ...cors
          }
        }
      );
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
