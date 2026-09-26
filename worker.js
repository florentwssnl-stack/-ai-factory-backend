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

    const HF_BASE =
      "https://observantdistressed-wan2-2-i2v-v3.hf.space";

    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: {
          "Content-Type": "application/json",
          ...cors
        }
      });

    const url = new URL(request.url);

    // ACCUEIL
    if (url.pathname === "/") {
      return json({
        service: "AI FACTORY",
        status: "online",
        version: "4.0"
      });
    }

    // TEST HUGGING FACE
    if (url.pathname === "/health") {
      try {
        const response = await fetch(
          `${HF_BASE}/gradio_api/info`,
          {
            headers: {
              Authorization: `Bearer ${env.HF_TOKEN}`
            }
          }
        );

        return json({
          cloudflare: true,
          huggingface_status: response.status,
          huggingface_ok: response.ok
        }, response.ok ? 200 : 502);

      } catch (error) {
        return json({
          cloudflare: true,
          huggingface_ok: false,
          error: error.message
        }, 500);
      }
    }

    // LANCE UNE GENERATION
    if (url.pathname === "/generate" && request.method === "POST") {
      try {
        const body = await request.json();

        if (!body.image_url) {
          return json({
            error: "image_url is required"
          }, 400);
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
            body.prompt ||
              "cinematic realistic motion, subtle mysterious movement",
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
          `${HF_BASE}/gradio_api/call/generate_video`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${env.HF_TOKEN}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
          }
        );

        const result = await response.json();

        if (!response.ok) {
          return json({
            submitted: false,
            huggingface_status: response.status,
            result
          }, 502);
        }

        return json({
          submitted: true,
          event_id: result.event_id
        });

      } catch (error) {
        return json({
          submitted: false,
          error: error.message
        }, 500);
      }
    }

    // RECUPERE LE RESULTAT D'UNE GENERATION
    if (
      url.pathname === "/result" &&
      request.method === "GET"
    ) {
      const eventId = url.searchParams.get("event_id");

      if (!eventId) {
        return json({
          error: "event_id is required"
        }, 400);
      }

      try {
        const response = await fetch(
          `${HF_BASE}/gradio_api/call/generate_video/${encodeURIComponent(eventId)}`,
          {
            headers: {
              Authorization: `Bearer ${env.HF_TOKEN}`
            }
          }
        );

        const stream = await response.text();

        return new Response(stream, {
          status: response.status,
          headers: {
            "Content-Type":
              response.headers.get("content-type") ||
              "text/event-stream",
            "Cache-Control": "no-cache",
            ...cors
          }
        });

      } catch (error) {
        return json({
          error: error.message
        }, 500);
      }
    }

    // PAGE DE TEST
    if (url.pathname === "/test") {
      return new Response(`
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>AI FACTORY TEST</title>
<style>
body {
  background:#111;
  color:white;
  font-family:Arial,sans-serif;
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
  width:100%;
}
#status {
  margin-top:20px;
  white-space:pre-wrap;
}
video {
  width:100%;
  margin-top:20px;
  border-radius:12px;
}
</style>
</head>

<body>

<h1>AI FACTORY</h1>
<p>Wan 2.2 — Test vidéo</p>

<button id="button" onclick="generate()">
GENERATE TEST VIDEO
</button>

<div id="status">Prêt.</div>

<div id="videoContainer"></div>

<script>

let running = false;

async function generate() {

  if (running) return;

  running = true;

  const button = document.getElementById("button");
  const status = document.getElementById("status");
  const container = document.getElementById("videoContainer");

  button.disabled = true;
  button.textContent = "GENERATION EN COURS...";
  status.textContent = "⏳ Envoi vers Wan 2.2...";

  try {

    const response = await fetch("/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        image_url:
          "https://raw.githubusercontent.com/gradio-app/gradio/main/test/test_files/bus.png",

        prompt:
          "cinematic realistic motion, the scene comes alive, subtle camera movement, natural movement, photorealistic"
      })
    });

    const job = await response.json();

    if (!job.event_id) {
      throw new Error(JSON.stringify(job));
    }

    const eventId = job.event_id;

    status.textContent =
      "🎬 Génération lancée.\\n\\nEvent ID : " +
      eventId +
      "\\n\\n⏳ Wan 2.2 travaille...";

    const resultResponse = await fetch(
      "/result?event_id=" +
      encodeURIComponent(eventId)
    );

    const stream = resultResponse.body.getReader();
    const decoder = new TextDecoder();

    let buffer = "";
    let finished = false;

    while (!finished) {

      const { value, done } = await stream.read();

      if (done) break;

      buffer += decoder.decode(value, {
        stream: true
      });

      const events = buffer.split("\\n\\n");

      buffer = events.pop();

      for (const event of events) {

        const lines = event.split("\\n");

        let eventType = "";
        let data = "";

        for (const line of lines) {

          if (line.startsWith("event:")) {
            eventType =
              line.substring(6).trim();
          }

          if (line.startsWith("data:")) {
            data =
              line.substring(5).trim();
          }
        }

        if (eventType === "generating") {

          status.textContent =
            "🎬 Wan 2.2 génère la vidéo...\\n\\n" +
            data;

        }

        if (eventType === "complete") {

          status.textContent =
            "✅ VIDÉO TERMINÉE !";

          try {

            const result = JSON.parse(data);

            const video =
              result[0] || result;

            const videoUrl =
              video.url ||
              video.path;

            if (videoUrl) {

              container.innerHTML =
                '<video controls autoplay playsinline src="' +
                videoUrl +
                '"></video>';

            } else {

              status.textContent +=
                "\\n\\nRésultat :\\n" +
                data;
            }

          } catch (e) {

            status.textContent +=
              "\\n\\nRésultat :\\n" +
              data;
          }

          finished = true;
        }

        if (eventType === "error") {

          status.textContent =
            "❌ ERREUR WAN 2.2\\n\\n" +
            data;

          finished = true;
        }
      }
    }

  } catch (error) {

    status.textContent =
      "❌ Erreur : " +
      error.message;

  } finally {

    running = false;
    button.disabled = false;
    button.textContent = "GENERATE TEST VIDEO";
  }
}

</script>

</body>
</html>
      `, {
        headers: {
          "Content-Type": "text/html",
          ...cors
        }
      });
    }

    return json({
      error: "Route not found"
    }, 404);
  }
};
