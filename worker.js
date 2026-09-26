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
    // ENGINES
    // ==========================================================

    const ENGINES = {

      wan: {
        name: "Wan 2.2",
        base:
          "https://observantdistressed-wan2-2-i2v-v3.hf.space/gradio_api",
        type: "queue"
      },

      ltx: {
        name: "LTX 2.3",
        base:
          "https://lightricks-ltx-2-3.hf.space/gradio_api",
        type: "call"
      }

    };

    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: {
          "Content-Type":
            "application/json; charset=utf-8",
          ...cors
        }
      });

    const url =
      new URL(request.url);

    const hfHeaders = {
      Authorization:
        `Bearer ${env.HF_TOKEN}`,
      "x-gradio-user":
        "api"
    };

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
          "9.0",

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
              "wan",

            name:
              "Wan 2.2",

            type:
              "image-to-video",

            status:
              "available"
          },

          {
            id:
              "ltx",

            name:
              "LTX 2.3",

            type:
              "image-to-video",

            status:
              "available"
          }

        ]

      });

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

        if (engine === "wan") {

          const data = [

            // input_image
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

            // last_image
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

            // randomize
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

            // loras
            body.lora_groups ??
              [],

            // auto lora
            body.auto_lora_enabled ??
              true,

            // display
            body.display_result ??
              true
          ];

          const sessionHash =
            crypto.randomUUID();

          const response =
            await fetch(
              `${ENGINES.wan.base}/queue/join`,
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
                "wan",

              huggingface_status:
                response.status,

              result
            }, 502);

          }

          return json({

            submitted:
              true,

            engine:
              "wan",

            session_hash:
              sessionHash,

            event_id:
              result.event_id ||
              null

          });

        }

        // ======================================================
        // LTX 2.3
        // ======================================================

        if (engine === "ltx") {

          /*
           * LTX-2.3 generate_video inputs:
           *
           * 1  input_image
           * 2  prompt
           * 3  duration
           * 4  enhance_prompt
           * 5  seed
           * 6  randomize_seed
           * 7  height
           * 8  width
           */

          const width =
            body.width ??
            512;

          const height =
            body.height ??
            768;

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

            // prompt
            body.prompt ||
              "Make this image come alive with cinematic motion, subtle realistic movement, smooth camera movement",

            // duration
            body.duration_seconds ??
              3,

            // enhance prompt
            body.enhance_prompt ??
              false,

            // seed
            body.seed ??
              42,

            // randomize seed
            body.randomize_seed ??
              true,

            // height
            height,

            // width
            width
          ];

          const response =
            await fetch(
              `${ENGINES.ltx.base}/call/generate_video`,
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

              result
            }, 502);

          }

          return json({

            submitted:
              true,

            engine:
              "ltx",

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
    // WAN RESULT
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

      const eventId =
        url.searchParams.get(
          "event_id"
        );

      try {

        // ------------------------------------------------------
        // WAN
        // ------------------------------------------------------

        if (engine === "wan") {

          if (!sessionHash) {

            return json({
              error:
                "session_hash is required"
            }, 400);

          }

          const response =
            await fetch(
              `${ENGINES.wan.base}/queue/data?session_hash=${encodeURIComponent(sessionHash)}`,
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

        }

        // ------------------------------------------------------
        // LTX
        // ------------------------------------------------------

        if (engine === "ltx") {

          if (!eventId) {

            return json({
              error:
                "event_id is required"
            }, 400);

          }

          const response =
            await fetch(
              `${ENGINES.ltx.base}/call/generate_video/${encodeURIComponent(eventId)}`,
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

        }

        return json({
          error:
            "Unknown engine"
        }, 400);

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
  padding:20px;
  margin:0;
}

h1 {
  margin-top:5px;
}

select,
button {
  width:100%;
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
  background:#1b1b1b;
  border-radius:12px;
  white-space:pre-wrap;
}

#log {
  margin-top:15px;
  padding:15px;
  background:#080808;
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

<p>Multi-engine video factory</p>

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

let running =
  false;

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
    "\\n\\nEnvoi..."
  );

  try {

    const response =
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
                "cinematic realistic motion, the scene comes alive, subtle camera movement, natural movement, photorealistic",

              duration_seconds:
                engine === "ltx"
                  ? 3
                  : 3.5,

              steps:
                6,

              enhance_prompt:
                false,

              randomize_seed:
                true,

              safe_mode:
                true,

              display_result:
                true,

              width:
                512,

              height:
                768

            })
        }
      );

    const job =
      await response.json();

    log(
      "START:\\n" +
      JSON.stringify(
        job,
        null,
        2
      )
    );

    if (!job.event_id) {

      if (
        !job.session_hash
      ) {

        throw new Error(
          JSON.stringify(
            job
          )
        );

      }

    }

    status(
      "🎬 Génération lancée.\\n\\n" +
      "Moteur : " +
      engine +
      "\\n\\n" +
      "⏳ Attente du résultat..."
    );

    let resultUrl;

    if (
      engine ===
      "wan"
    ) {

      resultUrl =
        "/result?engine=wan&session_hash=" +
        encodeURIComponent(
          job.session_hash
        );

    } else {

      resultUrl =
        "/result?engine=ltx&event_id=" +
        encodeURIComponent(
          job.event_id
        );

    }

    const result =
      await fetch(
        resultUrl
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
          "STREAM CLOSED"
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

        // ====================================================
        // LTX / GRADIO COMPLETE
        // ====================================================

        if (
          type ===
          "complete" ||
          type ===
          "process_completed"
        ) {

          try {

            const parsed =
              JSON.parse(
                data
              );

            log(
              "RESULT:\\n" +
              JSON.stringify(
                parsed,
                null,
                2
              )
            );

            let output =
              parsed.output ||
              parsed;

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
                "⚠️ Résultat reçu mais vidéo introuvable."
              );

            }

          } catch (error) {

            log(
              "PARSE ERROR: " +
              error.message
            );

          }

          await reader.cancel();

          return;

        }

        // ====================================================
        // ERROR
        // ====================================================

        if (
          type ===
          "error"
        ) {

          status(
            "❌ ERREUR " +
            engine.toUpperCase() +
            "\\n\\n" +
            data
          );

          log(
            "ERROR DATA:\\n" +
            data
          );

          await reader.cancel();

          return;

        }

        // ====================================================
        // PROGRESS
        // ====================================================

        if (
          type ===
          "progress" ||
          type ===
          "process_starts"
        ) {

          status(
            "🎬 " +
            engine.toUpperCase() +
            " génère la vidéo..."
          );

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

    return json({
      error:
        "Route not found"
    }, 404);

  }
};
