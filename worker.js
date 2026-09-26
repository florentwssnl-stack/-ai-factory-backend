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

    // =========================
    // HOME
    // =========================

    if (url.pathname === "/") {
      return json({
        service: "AI FACTORY",
        status: "online",
        version: "7.0"
      });
    }

    // =========================
    // HEALTH
    // =========================

    if (url.pathname === "/health") {

      try {

        const response = await fetch(
          `${HF_BASE}/info`,
          {
            headers: {
              Authorization:
                `Bearer ${env.HF_TOKEN}`
            }
          }
        );

        return json({
          cloudflare: true,
          huggingface_status:
            response.status,
          huggingface_ok:
            response.ok
        });

      } catch (error) {

        return json({
          cloudflare: true,
          huggingface_ok: false,
          error: error.message
        }, 500);

      }
    }

    // =========================
    // GENERATE
    // =========================

    if (
      url.pathname === "/generate" &&
      request.method === "POST"
    ) {

      try {

        const body =
          await request.json();

        if (!body.image_url) {

          return json({
            error:
              "image_url is required"
          }, 400);

        }

        /*
          IMPORTANT

          Gradio 6 API:
          POST /call/generate_video

          Body:
          {
            data: [...]
          }

          The order MUST match
          the Space's API schema.
        */

        const data = [

          // 1 - input_image
          {
            path:
              body.image_url,
            url:
              body.image_url,
            size:
              null,
            orig_name:
              "input.jpg",
            mime_type:
              "image/jpeg",
            is_stream:
              false,
            meta: {
              _type:
                "gradio.FileData"
            }
          },

          // 2 - last_image
          null,

          // 3 - prompt
          body.prompt ||
            "cinematic realistic motion, subtle mysterious movement, photorealistic",

          // 4 - steps
          body.steps ?? 6,

          // 5 - negative_prompt
          body.negative_prompt ?? "",

          // 6 - duration
          body.duration_seconds ?? 3.5,

          // 7 - guidance_scale
          body.guidance_scale ?? 1,

          // 8 - guidance_scale_2
          body.guidance_scale_2 ?? 1,

          // 9 - seed
          body.seed ?? 42,

          // 10 - randomize_seed
          body.randomize_seed ?? true,

          // 11 - quality
          body.quality ?? 6,

          // 12 - scheduler
          body.scheduler ??
            "UniPCMultistep",

          // 13 - flow_shift
          body.flow_shift ?? 3,

          // 14 - frame_multiplier
          body.frame_multiplier ?? 16,

          // 15 - safe_mode
          body.safe_mode ?? true,

          // 16 - lora_groups
          body.lora_groups ?? [],

          // 17 - auto_lora_enabled
          body.auto_lora_enabled ?? true,

          // 18 - display_result
          body.display_result ?? true
        ];

        const response =
          await fetch(
            `${HF_BASE}/call/generate_video`,
            {
              method:
                "POST",

              headers: {
                Authorization:
                  `Bearer ${env.HF_TOKEN}`,
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify({
                  data
                })
            }
          );

        const text =
          await response.text();

        let result;

        try {
          result =
            JSON.parse(text);
        } catch {
          result = {
            raw: text
          };
        }

        if (!response.ok) {

          return json({
            submitted:
              false,
            huggingface_status:
              response.status,
            result
          }, 502);

        }

        if (!result.event_id) {

          return json({
            submitted:
              false,
            error:
              "Hugging Face did not return an event_id",
            result
          }, 502);

        }

        return json({
          submitted:
            true,

          event_id:
            result.event_id,

          poll_url:
            `/result?event_id=${encodeURIComponent(
              result.event_id
            )}`
        });

      } catch (error) {

        return json({
          submitted:
            false,
          error:
            error.message
        }, 500);

      }
    }

    // =========================
    // RESULT
    // =========================

    if (
      url.pathname === "/result" &&
      request.method === "GET"
    ) {

      const eventId =
        url.searchParams.get(
          "event_id"
        );

      if (!eventId) {

        return json({
          error:
            "event_id is required"
        }, 400);

      }

      try {

        const response =
          await fetch(
            `${HF_BASE}/call/generate_video/${encodeURIComponent(eventId)}`,
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
            error:
              errorText,
            huggingface_status:
              response.status
          }, response.status);

        }

        return new Response(
          response.body,
          {
            status:
              200,

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

    // =========================
    // TEST
    // =========================

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

#log {
  margin-top:20px;
  color:#aaa;
  font-size:12px;
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

  document.getElementById(
    "log"
  ).textContent +=
    "\\n" + text;

}

async function generate() {

  if (running)
    return;

  running = true;

  const button =
    document.getElementById(
      "button"
    );

  button.disabled =
    true;

  button.textContent =
    "GÉNÉRATION EN COURS...";

  status(
    "⏳ Envoi vers Wan 2.2..."
  );

  try {

    // =====================
    // START JOB
    // =====================

    const start =
      await fetch(
        "/generate",
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({

              image_url:
                "https://raw.githubusercontent.com/gradio-app/gradio/main/test/test_files/bus.png",

              prompt:
                "cinematic realistic motion, the scene comes alive, subtle camera movement, natural movement, photorealistic",

              duration_seconds:
                3.5,

              steps:
                6

            })
        }
      );

    const job =
      await start.json();

    log(
      "START: " +
      JSON.stringify(job)
    );

    if (!job.event_id) {

      throw new Error(
        JSON.stringify(job)
      );

    }

    const eventId =
      job.event_id;

    status(
      "🎬 Génération lancée.\\n\\n" +
      "Event ID : " +
      eventId +
      "\\n\\n" +
      "⏳ Wan 2.2 travaille..."
    );

    // =====================
    // STREAM RESULT
    // =====================

    const result =
      await fetch(
        "/result?event_id=" +
        encodeURIComponent(
          eventId
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
          "Flux terminé."
        );

        break;
      }

      buffer +=
        decoder.decode(
          value,
          {
            stream:
              true
          }
        );

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

        let type =
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

            type =
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
          type
        );

        // =================
        // HEARTBEAT
        // =================

        if (
          type ===
          "heartbeat"
        ) {

          status(
            "💓 Wan 2.2 est toujours actif..."
          );

        }

        // =================
        // START
        // =================

        if (
          type ===
          "generating"
          ||
          type ===
          "process_starts"
        ) {

          status(
            "⚙️ Wan 2.2 génère la vidéo..."
          );

        }

        // =================
        // COMPLETE
        // =================

        if (
          type ===
          "complete"
          ||
          type ===
          "process_completed"
        ) {

          status(
            "🎉 VIDÉO TERMINÉE !"
          );

          try {

            const parsed =
              JSON.parse(
                data
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

              document
                .getElementById(
                  "videoContainer"
                )
                .innerHTML =
                '<video controls autoplay playsinline src="' +
                videoUrl +
                '"></video>';

            } else {

              log(
                "RESULTAT: " +
                JSON.stringify(
                  parsed
                )
              );

            }

          } catch {

            log(
              "DATA: " +
              data
            );

          }

          await reader.cancel();

          return;

        }

        // =================
        // ERROR
        // =================

        if (
          type ===
          "error"
        ) {

          status(
            "❌ ERREUR WAN 2.2\\n\\n" +
            data
          );

          await reader.cancel();

          return;

        }

      }

    }

  } catch (error) {

    status(
      "❌ " +
      error.message
    );

  } finally {

    running =
      false;

    button.disabled =
      false;

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
      error:
        "Route not found"
    }, 404);

  }
};
