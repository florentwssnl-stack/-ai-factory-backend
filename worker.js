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

    // ==========================================================
    // SPACES
    // ==========================================================

    const WAN_BASE =
      "https://observantdistressed-wan2-2-i2v-v3.hf.space/gradio_api";

    const LTX_BASE =
      "https://lightricks-ltx-2-3.hf.space/gradio_api";

    const hfHeaders = {
      Authorization:
        `Bearer ${env.HF_TOKEN}`,
      "x-gradio-user":
        "api"
    };

    const json = (data, status = 200) =>
      new Response(
        JSON.stringify(data),
        {
          status,
          headers: {
            "Content-Type":
              "application/json; charset=utf-8",
            ...cors
          }
        }
      );

    const url =
      new URL(request.url);

    // ==========================================================
    // HOME
    // ==========================================================

    if (url.pathname === "/") {

      return json({
        service:
          "AI FACTORY",

        status:
          "online",

        version:
          "11.0",

        engines: [
          "wan",
          "ltx"
        ]
      });

    }

    // ==========================================================
    // ENGINES
    // ==========================================================

    if (url.pathname === "/engines") {

      return json({

        engines: [

          {
            id:
              "ltx",

            name:
              "LTX 2.3",

            type:
              "image-to-video",

            status:
              "online"
          },

          {
            id:
              "wan",

            name:
              "Wan 2.2",

            type:
              "image-to-video",

            status:
              "quota-limited"
          }

        ]

      });

    }

    // ==========================================================
    // HEALTH
    // ==========================================================

    if (url.pathname === "/health") {

      const result = {
        cloudflare:
          true
      };

      // WAN
      try {

        const wan =
          await fetch(
            `${WAN_BASE}/info`,
            {
              headers:
                hfHeaders
            }
          );

        result.wan = {
          status:
            wan.status,

          ok:
            wan.ok
        };

      } catch (error) {

        result.wan = {
          ok:
            false,

          error:
            error.message
        };

      }

      // LTX
      try {

        const ltx =
          await fetch(
            `${LTX_BASE}/info`,
            {
              headers:
                hfHeaders
            }
          );

        result.ltx = {
          status:
            ltx.status,

          ok:
            ltx.ok
        };

      } catch (error) {

        result.ltx = {
          ok:
            false,

          error:
            error.message
        };

      }

      return json(result);
    }

    // ==========================================================
    // GENERATE
    // ==========================================================

    if (
      url.pathname === "/generate" &&
      request.method === "POST"
    ) {

      try {

        const body =
          await request.json();

        const engine =
          body.engine ||
          "ltx";

        if (!body.image_url) {

          return json({
            submitted:
              false,

            error:
              "image_url is required"
          }, 400);

        }

        // ======================================================
        // WAN 2.2
        // ======================================================

        if (
          engine === "wan"
        ) {

          const data = [

            // input image
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

            // last image
            null,

            // prompt
            body.prompt ||
              "cinematic realistic motion, subtle mysterious movement, photorealistic",

            // steps
            body.steps ??
              6,

            // negative prompt
            body.negative_prompt ??
              "",

            // duration
            body.duration_seconds ??
              3.5,

            // guidance
            body.guidance_scale ??
              1,

            // guidance 2
            body.guidance_scale_2 ??
              1,

            // seed
            body.seed ??
              42,

            // randomize seed
            body.randomize_seed ??
              true,

            // quality
            body.quality ??
              6,

            // scheduler
            body.scheduler ??
              "UniPCMultistep",

            // flow shift
            body.flow_shift ??
              3,

            // frame multiplier
            body.frame_multiplier ??
              16,

            // safe mode
            body.safe_mode ??
              true,

            // LoRA groups
            body.lora_groups ??
              [],

            // auto LoRA
            body.auto_lora_enabled ??
              true,

            // display result
            body.display_result ??
              true
          ];

          const sessionHash =
            crypto.randomUUID();

          const response =
            await fetch(
              `${WAN_BASE}/queue/join`,
              {
                method:
                  "POST",

                headers: {
                  ...hfHeaders,

                  "Content-Type":
                    "application/json"
                },

                body:
                  JSON.stringify({

                    data:
                      data,

                    fn_index:
                      0,

                    session_hash:
                      sessionHash

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
              raw:
                text
            };
          }

          return json({
            submitted:
              response.ok,

            engine:
              "wan",

            session_hash:
              sessionHash,

            event_id:
              result.event_id ||
              null,

            huggingface_status:
              response.status,

            result:
              result

          }, response.ok ? 200 : 502);
        }

        // ======================================================
        // LTX 2.3
        // ======================================================

        if (
          engine === "ltx"
        ) {

          /*
           * LTX-2.3 CURRENT SPACE
           *
           * generate_video:
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

            // 1. image
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

            // 2. prompt
            body.prompt ||
              "Make this image come alive with cinematic motion, smooth realistic animation, subtle camera movement",

            // 3. duration
            body.duration_seconds ??
              3,

            // 4. enhance prompt
            body.enhance_prompt ??
              false,

            // 5. seed
            body.seed ??
              42,

            // 6. randomize seed
            body.randomize_seed ??
              true,

            // 7. height
            body.height ??
              768,

            // 8. width
            body.width ??
              432
          ];

          const sessionHash =
            crypto.randomUUID();

          const response =
            await fetch(
              `${LTX_BASE}/queue/join`,
              {
                method:
                  "POST",

                headers: {
                  ...hfHeaders,

                  "Content-Type":
                    "application/json"
                },

                body:
                  JSON.stringify({

                    data:
                      data,

                    fn_index:
                      0,

                    session_hash:
                      sessionHash

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
              raw:
                text
            };
          }

          if (!response.ok) {

            return json({
              submitted:
                false,

              engine:
                "ltx",

              huggingface_status:
                response.status,

              result:
                result

            }, 502);

          }

          return json({

            submitted:
              true,

            engine:
              "ltx",

            session_hash:
              sessionHash,

            event_id:
              result.event_id ||
              null

          });

        }

        return json({

          submitted:
            false,

          error:
            "Unknown engine: " +
            engine

        }, 400);

      } catch (error) {

        return json({

          submitted:
            false,

          error:
            error.message

        }, 500);

      }
    }

    // ==========================================================
    // RESULT
    // ==========================================================

    if (
      url.pathname === "/result" &&
      request.method === "GET"
    ) {

      const engine =
        url.searchParams.get(
          "engine"
        ) ||
        "ltx";

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

      let base;

      if (
        engine === "wan"
      ) {

        base =
          WAN_BASE;

      } else if (
        engine === "ltx"
      ) {

        base =
          LTX_BASE;

      } else {

        return json({
          error:
            "Unknown engine"
        }, 400);

      }

      try {

        const response =
          await fetch(
            `${base}/queue/data?session_hash=${encodeURIComponent(sessionHash)}`,
            {
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

            engine:
              engine,

            huggingface_status:
              response.status,

            error:
              errorText

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

    // ==========================================================
    // TEST PAGE
    // ==========================================================

    if (
      url.pathname === "/test"
    ) {

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
  color:#fff;
  font-family:Arial,sans-serif;
  padding:20px;
  margin:0;
}

h1 {
  margin-top:5px;
}

select,
button {
  width:100%;
  box-sizing:border-box;
  padding:16px;
  margin-top:12px;
  border:0;
  border-radius:12px;
  font-size:17px;
}

select {
  background:#222;
  color:white;
}

button {
  background:#ff4d00;
  color:white;
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

<p>Multi-engine video test</p>

<select id="engine">

<option value="ltx">
LTX 2.3
</option>

<option value="wan">
Wan 2.2
</option>

</select>

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
  ).textContent =
    text;

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

  if (running)
    return;

  running =
    true;

  const button =
    document.getElementById(
      "button"
    );

  const engine =
    document.getElementById(
      "engine"
    ).value;

  button.disabled =
    true;

  button.textContent =
    "GÉNÉRATION EN COURS...";

  status(
    "⏳ Moteur : " +
    engine +
    "\\n\\nEnvoi vers Hugging Face..."
  );

  try {

    // ========================================================
    // START
    // ========================================================

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

              engine:
                engine,

              image_url:
                "https://raw.githubusercontent.com/gradio-app/gradio/main/test/test_files/bus.png",

              prompt:
                "Make this image come alive with cinematic motion, subtle realistic movement, smooth camera movement, natural motion",

              duration_seconds:
                engine === "ltx"
                  ? 3
                  : 3.5,

              enhance_prompt:
                false,

              randomize_seed:
                true,

              safe_mode:
                true,

              display_result:
                true,

              /*
               * LTX vertical 9:16
               *
               * Low resolution to keep
               * the first test as light
               * as possible.
               */

              width:
                engine === "ltx"
                  ? 432
                  : undefined,

              height:
                engine === "ltx"
                  ? 768
                  : undefined

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
      !job.session_hash
    ) {

      throw new Error(
        JSON.stringify(
          job
        )
      );

    }

    const session =
      job.session_hash;

    status(
      "🎬 Génération lancée.\\n\\n" +
      "Moteur : " +
      engine +
      "\\n\\n" +
      "Session : " +
      session +
      "\\n\\n" +
      "⏳ En attente..."
    );

    // ========================================================
    // RESULT STREAM
    // ========================================================

    const result =
      await fetch(
        "/result?engine=" +
        encodeURIComponent(
          engine
        ) +
        "&session_hash=" +
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

    let buffer =
      "";

    while (true) {

      const {
        value,
        done
      } =
        await reader.read();

      if (done) {

        log(
          "FLUX FERMÉ"
        );

        break;

      }

      const chunk =
        decoder.decode(
          value,
          {
            stream:
              true
          }
        );

      log(
        "RAW:\\n" +
        chunk.substring(
          0,
          1500
        )
      );

      buffer +=
        chunk;

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

        /*
         * Gradio SSE can expose
         * the message through
         * "data:" without an
         * explicit event name.
         */

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

        let parsed =
          null;

        try {

          parsed =
            JSON.parse(
              data
            );

        } catch {}

        const msg =
          parsed?.msg ||
          parsed?.type ||
          "";

        log(
          "EVENT: " +
          eventType +
          " / " +
          msg
        );

        // ====================================================
        // ESTIMATION
        // ====================================================

        if (
          msg ===
          "estimation"
        ) {

          const eta =
            parsed?.rank_eta;

          status(
            "⏳ " +
            engine.toUpperCase() +
            " en file..." +
            (
              eta
                ? "\\n\\nTemps estimé : " +
                  Math.round(eta) +
                  " s"
                : ""
            )
          );

        }

        // ====================================================
        // START
        // ====================================================

        if (
          msg ===
          "process_starts"
        ) {

          status(
            "⚙️ " +
            engine.toUpperCase() +
            " commence la génération..."
          );

        }

        // ====================================================
        // PROGRESS
        // ====================================================

        if (
          msg ===
          "progress"
        ) {

          status(
            "🎬 " +
            engine.toUpperCase() +
            " génère la vidéo..."
          );

        }

        // ====================================================
        // COMPLETED
        // ====================================================

        if (
          msg ===
          "process_completed"
        ) {

          log(
            "COMPLETED:\\n" +
            JSON.stringify(
              parsed,
              null,
              2
            )
          );

          if (
            parsed?.success ===
            false
          ) {

            const output =
              parsed.output;

            const error =
              output?.error ||
              output ||
              "Erreur inconnue";

            status(
              "❌ ERREUR " +
              engine.toUpperCase() +
              "\\n\\n" +
              error
            );

            await reader.cancel();

            return;

          }

          const output =
            parsed?.output;

          /*
           * LTX output:
           *
           * [video, seed]
           *
           * Wan output:
           *
           * [video, file, seed]
           */

          let video =
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

            status(
              "🎉 VIDÉO TERMINÉE !"
            );

            document
              .getElementById(
                "videoContainer"
              )
              .innerHTML =
              '<video controls autoplay playsinline src="' +
              videoUrl +
              '"></video>';

          } else {

            status(
              "⚠️ Génération terminée, mais URL vidéo introuvable."
            );

          }

          await reader.cancel();

          return;

        }

        // ====================================================
        // ERROR
        // ====================================================

        if (
          msg ===
          "error" ||
          eventType ===
          "error"
        ) {

          status(
            "❌ ERREUR " +
            engine.toUpperCase() +
            "\\n\\n" +
            (
              parsed?.message ||
              data ||
              "Erreur inconnue"
            )
          );

          await reader.cancel();

          return;

        }

        // ====================================================
        // QUEUE FULL
        // ====================================================

        if (
          msg ===
          "queue_full"
        ) {

          status(
            "⏳ " +
            engine.toUpperCase() +
            " est actuellement occupé.\\n\\n" +
            "La génération attend dans la file..."
          );

        }

        // ====================================================
        // CLOSE
        // ====================================================

        if (
          msg ===
          "close_stream"
        ) {

          status(
            "🔌 Flux terminé."
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

    log(
      "EXCEPTION:\\n" +
      error.stack
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

    // ==========================================================
    // 404
    // ==========================================================

    return json({
      error:
        "Route not found"
    }, 404);
  }
};
