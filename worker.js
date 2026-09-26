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

    const hfHeaders = {
      Authorization: `Bearer ${env.HF_TOKEN}`,
      "x-gradio-user": "api"
    };

    const json = (data, status = 200) => {
      return new Response(JSON.stringify(data), {
        status,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          ...cors
        }
      });
    };

    const url = new URL(request.url);

    // ============================================================
    // HOME
    // ============================================================

    if (url.pathname === "/") {
      return json({
        service: "AI FACTORY",
        status: "online",
        version: "8.0"
      });
    }

    // ============================================================
    // HEALTH
    // ============================================================

    if (url.pathname === "/health") {

      try {

        const response = await fetch(
          `${HF_BASE}/info`,
          {
            method: "GET",
            headers: hfHeaders
          }
        );

        const text = await response.text();

        return json({
          cloudflare: true,
          huggingface_status: response.status,
          huggingface_ok: response.ok,
          response_preview: text.substring(0, 500)
        });

      } catch (error) {

        return json({
          cloudflare: true,
          huggingface_ok: false,
          error: error.message
        }, 500);

      }
    }

    // ============================================================
    // GENERATE
    // ============================================================

    if (
      url.pathname === "/generate" &&
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
         * IMPORTANT
         *
         * Exact input order from the Space config:
         *
         * 9  = input_image
         * 18 = last_image
         * 6  = prompt
         * 26 = steps
         * 19 = negative_prompt
         * 14 = duration
         * 29 = guidance_scale
         * 30 = guidance_scale_2
         * 22 = seed
         * 24 = randomize_seed
         * 21 = quality
         * 31 = scheduler
         * 27 = flow_shift
         * 15 = frame_multiplier
         * 12 = safe_mode
         * 32 = lora_groups
         * 11 = auto_lora_enabled
         * 33 = display_result
         */

        const data = [

          // 1. input_image
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

          // 2. last_image
          null,

          // 3. prompt
          body.prompt ||
            "cinematic realistic motion, subtle mysterious movement, photorealistic",

          // 4. steps
          body.steps ?? 6,

          // 5. negative_prompt
          body.negative_prompt ?? "",

          // 6. duration
          body.duration_seconds ?? 3.5,

          // 7. guidance_scale
          body.guidance_scale ?? 1,

          // 8. guidance_scale_2
          body.guidance_scale_2 ?? 1,

          // 9. seed
          body.seed ?? 42,

          // 10. randomize_seed
          body.randomize_seed ?? true,

          // 11. quality
          body.quality ?? 6,

          // 12. scheduler
          body.scheduler ?? "UniPCMultistep",

          // 13. flow_shift
          body.flow_shift ?? 3,

          // 14. frame_multiplier
          body.frame_multiplier ?? 16,

          // 15. safe_mode
          body.safe_mode ?? true,

          // 16. lora_groups
          body.lora_groups ?? [],

          // 17. auto_lora_enabled
          body.auto_lora_enabled ?? true,

          // 18. display_result
          body.display_result ?? true
        ];

        const sessionHash =
          crypto.randomUUID();

        // --------------------------------------------------------
        // JOIN GRADIO QUEUE
        // --------------------------------------------------------

        const response = await fetch(
          `${HF_BASE}/queue/join`,
          {
            method: "POST",

            headers: {
              ...hfHeaders,
              "Content-Type": "application/json"
            },

            body: JSON.stringify({
              data: data,
              fn_index: 0,
              session_hash: sessionHash
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

        if (!response.ok) {

          return json({
            submitted: false,
            huggingface_status:
              response.status,
            result: result
          }, 502);

        }

        return json({
          submitted: true,
          session_hash: sessionHash,
          event_id:
            result.event_id || null
        });

      } catch (error) {

        return json({
          submitted: false,
          error: error.message
        }, 500);

      }
    }

    // ============================================================
    // RESULT SSE
    // ============================================================

    if (
      url.pathname === "/result" &&
      request.method === "GET"
    ) {

      const sessionHash =
        url.searchParams.get(
          "session_hash"
        );

      if (!sessionHash) {

        return json({
          error:
            "session_hash is required"
        }, 400);

      }

      try {

        const response =
          await fetch(
            `${HF_BASE}/queue/data?session_hash=${encodeURIComponent(sessionHash)}`,
            {
              method: "GET",

              headers: {
                ...hfHeaders,
                Accept:
                  "text/event-stream"
              }
            }
          );

        if (!response.ok) {

          const errorText =
            await response.text();

          return json({
            huggingface_status:
              response.status,
            error:
              errorText
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
          error:
            error.message
        }, 500);

      }
    }

    // ============================================================
    // TEST PAGE
    // ============================================================

    if (url.pathname === "/test") {

      return new Response(`

<!DOCTYPE html>

<html>

<head>

<meta
  name="viewport"
  content="width=device-width,initial-scale=1"
/>

<title>AI FACTORY TEST</title>

<style>

body {
  background:#111;
  color:#fff;
  font-family:Arial,sans-serif;
  padding:20px;
  margin:0;
}

h1 {
  margin-top:10px;
}

button {
  width:100%;
  padding:18px;
  border:0;
  border-radius:12px;
  background:#ff4d00;
  color:#fff;
  font-size:18px;
  font-weight:bold;
}

button:disabled {
  opacity:.5;
}

#status {
  margin-top:20px;
  padding:15px;
  background:#1b1b1b;
  border-radius:12px;
  white-space:pre-wrap;
  line-height:1.5;
}

#log {
  margin-top:15px;
  padding:15px;
  background:#080808;
  border-radius:12px;
  color:#aaa;
  font-size:12px;
  white-space:pre-wrap;
  word-break:break-word;
  max-height:400px;
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

<p>Wan 2.2 — diagnostic</p>

<button
  id="button"
  onclick="generate()"
>
GENERATE TEST VIDEO
</button>

<div id="status">
Prêt.
</div>

<div id="log"></div>

<div id="videoContainer"></div>

<script>

let running = false;

function setStatus(text) {

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

  const videoContainer =
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

    // ==========================================================
    // START
    // ==========================================================

    const start =
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

            steps:
              6,

            randomize_seed:
              true,

            safe_mode:
              true,

            display_result:
              true

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

    if (!job.session_hash) {

      throw new Error(
        JSON.stringify(
          job
        )
      );

    }

    const session =
      job.session_hash;

    setStatus(
      "🎬 Génération lancée.\\n\\n" +
      "Session : " +
      session +
      "\\n\\n" +
      "⏳ Connexion au flux Wan 2.2..."
    );

    // ==========================================================
    // RESULT STREAM
    // ==========================================================

    const result =
      await fetch(
        "/result?session_hash=" +
        encodeURIComponent(
          session
        )
      );

    if (!result.ok) {

      throw new Error(
        await result.text()
      );

    }

    const reader =
      result.body
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

        log(
          "STREAM CLOSED"
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

      log(
        "RAW:\\n" +
        chunk.substring(
          0,
          1000
        )
      );

      buffer += chunk;

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

        let eventType =
          "";

        let data =
          "";

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

        log(
          "EVENT: " +
          eventType
        );

        // ------------------------------------------------------
        // QUEUE FULL
        // ------------------------------------------------------

        if (
          eventType ===
          "queue_full"
        ) {

          setStatus(
            "⏳ Wan 2.2 est occupé.\\n\\n" +
            "Le job attend dans la file..."
          );

        }

        // ------------------------------------------------------
        // ESTIMATION
        // ------------------------------------------------------

        if (
          eventType ===
          "estimation"
        ) {

          setStatus(
            "⏳ En attente de Wan 2.2..."
          );

        }

        // ------------------------------------------------------
        // START
        // ------------------------------------------------------

        if (
          eventType ===
          "process_starts"
        ) {

          setStatus(
            "⚙️ Wan 2.2 commence la génération..."
          );

        }

        // ------------------------------------------------------
        // PROGRESS
        // ------------------------------------------------------

        if (
          eventType ===
          "progress"
        ) {

          setStatus(
            "🎬 Wan 2.2 génère la vidéo..."
          );

        }

        // ------------------------------------------------------
        // DATA
        // ------------------------------------------------------

        if (
          eventType ===
          "data"
        ) {

          try {

            const parsed =
              JSON.parse(
                data
              );

            log(
              "DATA:\\n" +
              JSON.stringify(
                parsed,
                null,
                2
              )
            );

            const video =
              parsed?.[0];

            const videoUrl =
              video?.url ||
              video?.path;

            if (
              videoUrl
            ) {

              setStatus(
                "🎬 VIDÉO REÇUE !"
              );

              videoContainer.innerHTML =
                '<video controls autoplay playsinline src="' +
                videoUrl +
                '"></video>';

            }

          } catch (error) {

            log(
              "DATA PARSE ERROR: " +
              error.message
            );

          }

        }

        // ------------------------------------------------------
        // COMPLETE
        // ------------------------------------------------------

        if (
          eventType ===
          "process_completed"
        ) {

          setStatus(
            "✅ VIDÉO TERMINÉE !"
          );

          try {

            const parsed =
              JSON.parse(
                data
              );

            log(
              "COMPLETED:\\n" +
              JSON.stringify(
                parsed,
                null,
                2
              )
            );

            const output =
              parsed.output ||
              parsed;

            const video =
              Array.isArray(
                output
              )
                ? output[0]
                : output;

            const videoUrl =
              video?.url ||
              video?.path;

            if (
              videoUrl
            ) {

              videoContainer.innerHTML =
                '<video controls autoplay playsinline src="' +
                videoUrl +
                '"></video>';

            }

          } catch (error) {

            log(
              "COMPLETE PARSE ERROR: " +
              error.message
            );

          }

          await reader.cancel();

          return;
        }

        // ------------------------------------------------------
        // ERROR
        // ------------------------------------------------------

        if (
          eventType ===
          "error"
        ) {

          setStatus(
            "❌ ERREUR WAN 2.2\\n\\n" +
            data
          );

          log(
            "ERROR DATA: " +
            data
          );

          await reader.cancel();

          return;
        }

        // ------------------------------------------------------
        // CLOSE
        // ------------------------------------------------------

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

    log(
      "EXCEPTION:\\n" +
      error.stack
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

    // ============================================================
    // 404
    // ============================================================

    return json({
      error:
        "Route not found"
    }, 404);
  }
};
