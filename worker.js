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
      "https://lightricks-ltx-2-3.hf.space/gradio_api";

    const headers = {
      Authorization: `Bearer ${env.HF_TOKEN}`,
      "x-gradio-user": "api"
    };

    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          ...cors
        }
      });

    const url = new URL(request.url);

    // ==========================================================
    // HOME
    // ==========================================================

    if (url.pathname === "/") {
      return json({
        service: "AI FACTORY",
        status: "online",
        version: "10.0",
        engine: "LTX-2.3"
      });
    }

    // ==========================================================
    // GENERATE LTX
    // ==========================================================

    if (
      url.pathname === "/generate-ltx" &&
      request.method === "POST"
    ) {

      try {

        const body = await request.json();

        if (!body.image_url) {
          return json({
            submitted: false,
            error: "image_url is required"
          }, 400);
        }

        /*
         * EXACT ORDER FROM LTX SPACE:
         *
         * 1 input_image
         * 2 prompt
         * 3 duration
         * 4 enhance_prompt
         * 5 seed
         * 6 randomize_seed
         * 7 height
         * 8 width
         */

        const data = [

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

          body.prompt ||
            "Make this image come alive with cinematic motion, smooth realistic animation",

          // 3 seconds = minimum-ish practical test
          3,

          // enhance prompt
          false,

          // seed
          42,

          // randomize seed
          true,

          /*
           * LOW RESOLUTION
           *
           * Vertical 9:16
           * 512 x 768
           *
           * The Space explicitly supports
           * this low-resolution preset.
           */

          768,

          512
        ];

        const response = await fetch(
          `${HF_BASE}/queue/join`,
          {
            method: "POST",

            headers: {
              ...headers,
              "Content-Type": "application/json"
            },

            body: JSON.stringify({
              data,
              fn_index: 0,
              session_hash:
                crypto.randomUUID()
            })
          }
        );

        const text =
          await response.text();

        let result;

        try {
          result = JSON.parse(text);
        } catch {
          result = {
            raw: text
          };
        }

        return json({
          submitted: response.ok,
          huggingface_status:
            response.status,
          result
        }, response.ok ? 200 : 502);

      } catch (error) {

        return json({
          submitted: false,
          error: error.message
        }, 500);

      }
    }

    // ==========================================================
    // TEST PAGE
    // ==========================================================

    if (url.pathname === "/test-ltx") {

      return new Response(`

<!DOCTYPE html>

<html>

<head>

<meta
  name="viewport"
  content="width=device-width,initial-scale=1"
/>

<title>AI FACTORY — LTX TEST</title>

<style>

body {
  background:#111;
  color:white;
  font-family:Arial,sans-serif;
  padding:20px;
}

button {
  width:100%;
  padding:18px;
  margin-top:15px;
  border:0;
  border-radius:12px;
  background:#ff4d00;
  color:white;
  font-size:18px;
  font-weight:bold;
}

button:disabled {
  opacity:.5;
}

#status {
  margin-top:20px;
  padding:15px;
  background:#1c1c1c;
  border-radius:12px;
  white-space:pre-wrap;
  line-height:1.5;
}

#log {
  margin-top:15px;
  padding:15px;
  background:#050505;
  border-radius:12px;
  color:#aaa;
  font-size:12px;
  white-space:pre-wrap;
  word-break:break-word;
  max-height:500px;
  overflow:auto;
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

<p>LTX-2.3 — diagnostic test</p>

<button
  id="button"
  onclick="generate()"
>
GENERATE LTX VIDEO
</button>

<div id="status">
Prêt.
</div>

<div id="log"></div>

<div id="videoContainer"></div>

<script>

let running = false;

function status(text) {

  document.getElementById(
    "status"
  ).textContent = text;

}

function log(text) {

  const box =
    document.getElementById(
      "log"
    );

  box.textContent +=
    text + "\\n";

  box.scrollTop =
    box.scrollHeight;

}

async function generate() {

  if (running) return;

  running = true;

  const button =
    document.getElementById(
      "button"
    );

  button.disabled = true;

  button.textContent =
    "LTX EN COURS...";

  status(
    "⏳ Envoi vers LTX-2.3..."
  );

  try {

    // ========================================================
    // START
    // ========================================================

    const start =
      await fetch(
        "/generate-ltx",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({

            image_url:
              "https://raw.githubusercontent.com/gradio-app/gradio/main/test/test_files/bus.png",

            prompt:
              "Make this image come alive with subtle cinematic realistic movement, smooth camera motion, natural movement",

          })
        }
      );

    const job =
      await start.json();

    log(
      "START:\\n" +
      JSON.stringify(
        job,
        null,
        2
      )
    );

    if (
      !job.result
    ) {

      throw new Error(
        JSON.stringify(job)
      );

    }

    // The Space may return an event_id
    // and/or session hash.

    const eventId =
      job.result.event_id;

    const sessionHash =
      job.result.session_hash;

    if (
      !eventId &&
      !sessionHash
    ) {

      throw new Error(
        "Aucun event_id/session_hash reçu."
      );

    }

    status(
      "🎬 LTX-2.3 accepté.\\n\\n" +
      "⏳ Génération en cours..."
    );

    // ========================================================
    // RESULT
    // ========================================================

    let resultUrl;

    if (eventId) {

      resultUrl =
        HF_BASE_PLACEHOLDER;

    } else {

      resultUrl =
        HF_BASE_PLACEHOLDER;

    }

  } catch (error) {

    status(
      "❌ " +
      error.message
    );

    log(
      "EXCEPTION:\\n" +
      error.stack
    );

  } finally {

    running = false;

    button.disabled = false;

    button.textContent =
      "GENERATE LTX VIDEO";

  }

}

</script>

</body>

</html>

      `, {
        headers: {
          "Content-Type":
            "text/html; charset=utf-8",
          ...cors
        }
      });

    }

    return json({
      error:
        "Route not found"
    }, 404);
  }
};
