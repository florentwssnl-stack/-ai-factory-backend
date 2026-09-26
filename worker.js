const WAN_BASE =
  "https://observantdistressed-wan2-2-i2v-v3.hf.space/gradio_api";

const LTX_BASE =
  "https://lightricks-ltx-2-3.hf.space/gradio_api";

const hfHeaders = (env) => ({
  Authorization: `Bearer ${env.HF_TOKEN}`,
  "Content-Type": "application/json",
  "x-gradio-user": "api"
});

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "*"
    }
  });
}

function corsResponse(response) {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Headers", "*");
  headers.set("Access-Control-Allow-Methods", "*");

  return new Response(response.body, {
    status: response.status,
    headers
  });
}

function fileDataFromUrl(url, name = "input.png") {
  return {
    path: url,
    url: url,
    orig_name: name,
    mime_type: "image/png",
    is_stream: false,
    meta: {
      _type: "gradio.FileData"
    }
  };
}

async function queueJoin(base, data, fnIndex, env) {
  const sessionHash = crypto.randomUUID();

  const response = await fetch(`${base}/queue/join`, {
    method: "POST",
    headers: hfHeaders(env),
    body: JSON.stringify({
      data,
      fn_index: fnIndex,
      session_hash: sessionHash
    })
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Queue join HTTP ${response.status}: ${text}`);
  }

  let result;

  try {
    result = JSON.parse(text);
  } catch {
    throw new Error(`Réponse queue invalide: ${text}`);
  }

  return {
    ...result,
    session_hash: result.session_hash || sessionHash
  };
}

async function streamQueue(base, sessionHash, env) {
  const response = await fetch(
    `${base}/queue/data?session_hash=${encodeURIComponent(sessionHash)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${env.HF_TOKEN}`,
        "x-gradio-user": "api",
        Accept: "text/event-stream"
      }
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Queue stream HTTP ${response.status}: ${text}`);
  }

  return response;
}

async function getInfo(base, env) {
  const response = await fetch(`${base}/info`, {
    headers: {
      Authorization: `Bearer ${env.HF_TOKEN}`
    }
  });

  const text = await response.text();

  return {
    status: response.status,
    ok: response.ok,
    info: text
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Allow-Methods": "*"
        }
      });
    }

    try {
      // --------------------------------------------------
      // HOME
      // --------------------------------------------------

      if (url.pathname === "/") {
        return json({
          service: "AI FACTORY",
          status: "online",
          version: "12.0",
          engines: ["wan", "ltx"]
        });
      }

      // --------------------------------------------------
      // ENGINES
      // --------------------------------------------------

      if (url.pathname === "/engines") {
        return json({
          engines: {
            ltx: {
              name: "LTX 2.3",
              status: "online",
              space: "Lightricks/LTX-2-3"
            },
            wan: {
              name: "Wan 2.2",
              status: "online / quota limited",
              space: "observantdistressed/wan2-2-i2v-v3"
            }
          }
        });
      }

      // --------------------------------------------------
      // HEALTH
      // --------------------------------------------------

      if (url.pathname === "/health") {
        const [ltx, wan] = await Promise.all([
          getInfo(LTX_BASE, env),
          getInfo(WAN_BASE, env)
        ]);

        return json({
          status: "ok",
          cloudflare: true,
          huggingface: {
            ltx,
            wan
          }
        });
      }

      // --------------------------------------------------
      // GENERATE
      // --------------------------------------------------

      if (url.pathname === "/generate" && request.method === "POST") {
        const body = await request.json();

        const engine = body.engine || "ltx";

        const imageUrl =
          body.image_url ||
          "https://raw.githubusercontent.com/gradio-app/gradio/main/test/test_files/bus.png";

        const prompt =
          body.prompt ||
          "Make this image come alive with cinematic motion, smooth animation";

        const duration = Number(body.duration || 3);

        // ------------------------------------------------
        // LTX 2.3
        // ------------------------------------------------

        if (engine === "ltx") {
          /*
            LTX CONFIG EXACT :

            id 5  = image
            id 6  = prompt
            id 8  = duration
            id 10 = enhance prompt
            id 16 = seed
            id 17 = randomize seed
            id 20 = height
            id 19 = width

            IMPORTANT :
            generate_video = fn_index 2
          */

          const data = [
            fileDataFromUrl(imageUrl),
            prompt,
            duration,
            false,
            42,
            true,
            768,
            432
          ];

          const result = await queueJoin(
            LTX_BASE,
            data,
            2,
            env
          );

          return json({
            submitted: true,
            engine: "ltx",
            session_hash: result.session_hash,
            event_id: result.event_id || null
          });
        }

        // ------------------------------------------------
        // WAN 2.2
        // ------------------------------------------------

        if (engine === "wan") {
          /*
            WAN generate_video = fn_index 0

            ordre exact du Space Wan :
            1  image
            2  last_image
            3  prompt
            4  steps
            5  negative_prompt
            6  duration
            7  guidance
            8  guidance_2
            9  seed
            10 randomize_seed
            11 quality
            12 scheduler
            13 flow_shift
            14 frame_multiplier
            15 safe_mode
            16 lora_groups
            17 auto_lora
            18 video_component
          */

          const data = [
            fileDataFromUrl(imageUrl),
            null,
            prompt,
            6,
            "低质量，模糊，失真，静态画面",
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
          ];

          const result = await queueJoin(
            WAN_BASE,
            data,
            0,
            env
          );

          return json({
            submitted: true,
            engine: "wan",
            session_hash: result.session_hash,
            event_id: result.event_id || null
          });
        }

        return json(
          {
            error: `Moteur inconnu : ${engine}`
          },
          400
        );
      }

      // --------------------------------------------------
      // RESULT / SSE
      // --------------------------------------------------

      if (url.pathname === "/result") {
        const engine = url.searchParams.get("engine") || "ltx";
        const sessionHash = url.searchParams.get("session_hash");

        if (!sessionHash) {
          return json(
            {
              error: "session_hash manquant"
            },
            400
          );
        }

        const base =
          engine === "wan"
            ? WAN_BASE
            : LTX_BASE;

        const response = await streamQueue(
          base,
          sessionHash,
          env
        );

        return corsResponse(response);
      }

      // --------------------------------------------------
      // TEST PAGE
      // --------------------------------------------------

      if (url.pathname === "/test") {
        const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>AI FACTORY TEST</title>

<style>
body {
  font-family: Arial, sans-serif;
  background: #0b0b0b;
  color: white;
  padding: 20px;
}

button, select {
  font-size: 18px;
  padding: 12px;
  margin: 5px 0;
  width: 100%;
}

button {
  background: #ff5a1f;
  color: white;
  border: 0;
  border-radius: 8px;
}

pre {
  white-space: pre-wrap;
  word-break: break-word;
  background: #151515;
  padding: 15px;
  border-radius: 8px;
}
</style>
</head>

<body>

<h1>AI FACTORY</h1>

<select id="engine">
  <option value="ltx">LTX 2.3</option>
  <option value="wan">Wan 2.2</option>
</select>

<button onclick="generate()">GENERATE VIDEO</button>

<pre id="output">Prêt.</pre>

<script>

const output = document.getElementById("output");

async function generate() {

  output.textContent = "Lancement...";

  const engine =
    document.getElementById("engine").value;

  const response = await fetch("/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      engine: engine,
      image_url:
        "https://raw.githubusercontent.com/gradio-app/gradio/main/test/test_files/bus.png",
      prompt:
        "Make this image come alive with cinematic motion, smooth animation, subtle camera movement",
      duration: engine === "ltx" ? 3 : 3.5
    })
  });

  const start = await response.json();

  output.textContent =
    "START:\\n" +
    JSON.stringify(start, null, 2);

  if (!start.session_hash) {
    return;
  }

  const resultResponse = await fetch(
    "/result?engine=" +
    encodeURIComponent(engine) +
    "&session_hash=" +
    encodeURIComponent(start.session_hash)
  );

  if (!resultResponse.body) {
    output.textContent +=
      "\\n\\nERREUR : flux SSE absent";
    return;
  }

  const reader =
    resultResponse.body.getReader();

  const decoder =
    new TextDecoder();

  let buffer = "";

  while (true) {

    const { value, done } =
      await reader.read();

    if (done) {
      output.textContent +=
        "\\n\\nFLUX FERMÉ";
      break;
    }

    buffer += decoder.decode(
      value,
      { stream: true }
    );

    const messages =
      buffer.split("\\n\\n");

    buffer =
      messages.pop() || "";

    for (const message of messages) {

      const lines =
        message.split("\\n");

      for (const line of lines) {

        if (!line.startsWith("data:")) {
          continue;
        }

        const raw =
          line.substring(5).trim();

        if (!raw) {
          continue;
        }

        let parsed;

        try {
          parsed = JSON.parse(raw);
        } catch {
          continue;
        }

        output.textContent +=
          "\\n\\nEVENT: " +
          (parsed.msg || "");

        if (parsed.msg === "process_completed") {

          output.textContent +=
            "\\n\\nCOMPLETED:\\n" +
            JSON.stringify(
              parsed,
              null,
              2
            );

          // Cherche automatiquement une vidéo
          const data =
            parsed.output &&
            parsed.output.data;

          if (Array.isArray(data)) {

            for (const item of data) {

              if (
                item &&
                typeof item === "object" &&
                (
                  item.url ||
                  item.path ||
                  item.video
                )
              ) {

                output.textContent +=
                  "\\n\\nVIDEO TROUVÉE :\\n" +
                  JSON.stringify(
                    item,
                    null,
                    2
                  );

                if (item.url) {

                  output.innerHTML +=
                    "<br><br>" +
                    '<a href="' +
                    item.url +
                    '" target="_blank" style="color:#ff7b39;font-size:20px">' +
                    "🎬 OUVRIR LA VIDÉO" +
                    "</a>";
                }
              }
            }
          }
        }

        if (
          parsed.msg === "error" ||
          parsed.msg === "queue_full"
        ) {

          output.textContent +=
            "\\n\\nERREUR:\\n" +
            JSON.stringify(
              parsed,
              null,
              2
            );
        }

        if (parsed.msg === "close_stream") {
          output.textContent +=
            "\\n\\nFLUX FERMÉ";
        }
      }
    }
  }
}

</script>

</body>
</html>
`;

        return new Response(html, {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Access-Control-Allow-Origin": "*"
          }
        });
      }

      return json(
        {
          error: "Route inconnue"
        },
        404
      );

    } catch (error) {

      return json(
        {
          error: error.message || String(error)
        },
        500
      );
    }
  }
};
