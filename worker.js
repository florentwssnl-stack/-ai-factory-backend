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
      "https://observantdistressed-wan2-2-i2v-v3.hf.space/gradio_api";

    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: {
          "Content-Type": "application/json",
          ...cors
        }
      });

    const url = new URL(request.url);

    // HOME
    if (url.pathname === "/") {
      return json({
        service: "AI FACTORY",
        status: "online",
        version: "6.0"
      });
    }

    // HEALTH
    if (url.pathname === "/health") {
      try {
        const response = await fetch(
          `${HF_BASE}/info`,
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
        });

      } catch (error) {
        return json({
          cloudflare: true,
          huggingface_ok: false,
          error: error.message
        }, 500);
      }
    }

    // GENERATE
    if (
      url.pathname === "/generate" &&
      request.method === "POST"
    ) {
      try {

        const body = await request.json();

        if (!body.image_url) {
          return json({
            error: "image_url is required"
          }, 400);
        }

        const sessionHash = crypto.randomUUID();

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

          null,

          body.prompt ||
            "cinematic realistic motion, the scene comes alive, subtle camera movement, natural movement, photorealistic",

          body.steps ?? 6,

          body.negative_prompt ?? "",

          body.duration_seconds ?? 3.5,

          body.guidance_scale ?? 1,

          body.guidance_scale_2 ?? 1,

          body.seed ?? 42,

          body.randomize_seed ?? true,

          body.quality ?? 6,

          body.scheduler ?? "UniPCMultistep",

          body.flow_shift ?? 3,

          body.frame_multiplier ?? 16,

          body.safe_mode ?? true,

          body.lora_groups ?? [],

          body.auto_lora_enabled ?? true,

          body.display_result ?? true
        ];

        const response = await fetch(
          `${HF_BASE}/queue/join`,
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${env.HF_TOKEN}`,
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify({
              data,
              fn_index: 0,
              session_hash: sessionHash
            })
          }
        );

        const result = await response.text();

        let parsed;

        try {
          parsed = JSON.parse(result);
        } catch {
          parsed = {
            raw: result
          };
        }

        if (!response.ok) {
          return json({
            submitted: false,
            huggingface_status: response.status,
            result: parsed
          }, 502);
        }

        return json({
          submitted: true,
          session_hash: sessionHash,
          event_id: parsed.event_id || null
        });

      } catch (error) {

        return json({
          submitted: false,
          error: error.message
        }, 500);

      }
    }

    // SSE RESULT
    if (
      url.pathname === "/result" &&
      request.method === "GET"
    ) {

      const sessionHash =
        url.searchParams.get("session_hash");

      if (!sessionHash) {
        return json({
          error: "session_hash is required"
        }, 400);
      }

      try {

        const response = await fetch(
          `${HF_BASE}/queue/data?session_hash=${encodeURIComponent(sessionHash)}`,
          {
            headers: {
              Authorization:
                `Bearer ${env.HF_TOKEN}`,
              Accept:
                "text/event-stream"
            }
          }
        );

        if (!response.ok) {

          const errorText =
            await response.text();

          return json({
            error: errorText,
            huggingface_status: response.status
          }, response.status);
        }

        return new Response(
          response.body,
          {
            status: 200,
            headers: {
              "Content-Type":
                "text/event-stream; charset=utf-8",
              "Cache-Control":
                "no-cache, no-transform",
              "Connection":
                "keep-alive",
              ...cors
            }
          }
        );

      } catch (error) {

        return json({
          error: error.message
        }, 500);

      }
    }

    // TEST PAGE
    if (url.pathname === "/test") {

      return new Response(`

<!DOCTYPE html>

<html>

<head>

<meta
  name="viewport"
  content="width=device-width,initial-scale=1"
/>

<title>AI FACTORY</title>

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

button:disabled {
  opacity:.5;
}

#status {
  margin-top:20px;
  line-height:1.5;
  white-space:pre-wrap;
}

#events {
  margin-top:20px;
  font-size:12px;
  color:#aaa;
  white-space:pre-wrap;
  word-break:break-word;
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

<button
  id="button"
  onclick="generate()"
>
GENERATE TEST VIDEO
</button>

<div id="status">
Prêt.
</div>

<div id="events"></div>

<div id="videoContainer"></div>

<script>

let running = false;

function setStatus(text) {

  document.getElementById(
    "status"
  ).textContent = text;

}

function addEvent(text) {

  const box =
    document.getElementById(
      "events"
    );

  box.textContent +=
    "\\n" + text;

}

async function generate() {

  if (running) return;

  running = true;

  const button =
    document.getElementById(
      "button"
    );

  const container =
    document.getElementById(
      "videoContainer"
    );

  button.disabled = true;

  button.textContent =
    "GÉNÉRATION EN COURS...";

  setStatus(
    "⏳ Envoi vers Wan 2.2..."
  );

  try {

    const response =
      await fetch(
        "/generate",
        {
          method:"POST",

          headers:{
            "Content-Type":
              "application/json"
          },

          body:JSON.stringify({

            image_url:
              "https://raw.githubusercontent.com/gradio-app/gradio/main/test/test_files/bus.png",

            prompt:
              "cinematic realistic motion, the scene comes alive, subtle camera movement, natural movement, photorealistic",

            duration_seconds:
              3.5,

            steps:6

          })
        }
      );

    const job =
      await response.json();

    if (!job.session_hash) {

      throw new Error(
        JSON.stringify(job)
      );

    }

    const session =
      job.session_hash;

    setStatus(
      "🎬 Génération lancée.\\n\\n" +
      "Session : " +
      session +
      "\\n\\n" +
      "Connexion à Wan 2.2..."
    );

    addEvent(
      "SESSION : " + session
    );

    const resultResponse =
      await fetch(
        "/result?session_hash=" +
        encodeURIComponent(session)
      );

    if (!resultResponse.ok) {

      throw new Error(
        await resultResponse.text()
      );

    }

    const reader =
      resultResponse.body
        .getReader();

    const decoder =
      new TextDecoder();

    let buffer = "";

    while (true) {

      const {
        value,
        done
      } =
        await reader.read();

      if (done) {

        addEvent(
          "Flux fermé."
        );

        break;
      }

      const chunk =
        decoder.decode(
          value,
          {
            stream:true
          }
        );

      addEvent(
        "📡 " +
        chunk.substring(0,300)
      );

      buffer += chunk;

      // Accepte LF ou CRLF
      const events =
        buffer.split(
          /\\r?\\n\\r?\\n/
        );

      buffer =
        events.pop();

      for (
        const event
        of events
      ) {

        const lines =
          event.split(
            /\\r?\\n/
          );

        let eventType = "";
        let data = "";

        for (
          const line
          of lines
        ) {

          if (
            line.startsWith(
              "event:"
            )
          ) {

            eventType =
              line
                .substring(6)
                .trim();

          }

          if (
            line.startsWith(
              "data:"
            )
          ) {

            data +=
              line
                .substring(5)
                .trim();

          }

        }

        if (
          eventType ===
          "heartbeat"
        ) {

          setStatus(
            "💓 Wan 2.2 est toujours actif..."
          );

        }

        if (
          eventType ===
          "process_starts"
        ) {

          setStatus(
            "⚙️ Wan 2.2 démarre la génération..."
          );

        }

        if (
          eventType ===
          "progress"
        ) {

          setStatus(
            "🎬 Wan 2.2 génère la vidéo..."
          );

        }

        if (
          eventType ===
          "data"
        ) {

          try {

            const result =
              JSON.parse(data);

            const video =
              result?.[0];

            const videoUrl =
              video?.url ||
              video?.path;

            if (videoUrl) {

              setStatus(
                "🎬 Vidéo reçue !"
              );

              container.innerHTML =
                '<video controls autoplay playsinline src="' +
                videoUrl +
                '"></video>';

            }

          } catch {

            addEvent(
              "DATA : " + data
            );

          }

        }

        if (
          eventType ===
          "process_completed"
        ) {

          setStatus(
            "✅ VIDÉO TERMINÉE !"
          );

          try {

            const result =
              JSON.parse(data);

            const output =
              result.output ||
              result;

            const video =
              Array.isArray(output)
                ? output[0]
                : output;

            const videoUrl =
              video?.url ||
              video?.path;

            if (videoUrl) {

              container.innerHTML =
                '<video controls autoplay playsinline src="' +
                videoUrl +
                '"></video>';

            }

          } catch {

            addEvent(
              "RESULTAT : " +
              data
            );

          }

          await reader.cancel();

          return;

        }

        if (
          eventType ===
          "error"
        ) {

          setStatus(
            "❌ ERREUR WAN 2.2\\n\\n" +
            data
          );

          await reader.cancel();

          return;

        }

        if (
          eventType ===
          "close_stream"
        ) {

          setStatus(
            "🔌 Flux terminé."
          );

          await reader.cancel();

          return;

        }

      }

    }

  } catch (error) {

    setStatus(
      "❌ " +
      error.message
    );

  } finally {

    running = false;

    button.disabled = false;

    button.textContent =
      "GENERATE TEST VIDEO";

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
      error: "Route not found"
    }, 404);

  }
};
