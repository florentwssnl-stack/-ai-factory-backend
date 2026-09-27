const ETERNAL_BASE = "https://open.eternalai.org";
const ETERNAL_MODEL = "wan-ai/wan2.2-i2v-a14b-lightning";

const DEFAULT_PROMPT =
  "Static camera. The man slowly raises his hand and touches the mirror. His reflection follows the movement with a subtle delay. After a brief pause, the reflection slowly turns its head and smiles while the real man remains completely expressionless. The real person stays still while only the reflection behaves unnaturally. Photorealistic movement, realistic mirror physics, subtle horror, cinematic lighting, no cuts, no camera shake.";

const NEGATIVE_PROMPT =
  "blur, distorted face, deformed hands, extra fingers, low quality, watermark, text, subtitles, camera shake";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: JSON_HEADERS
  });
}

function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8"
    }
  });
}

async function eternalFetch(env, path, options = {}) {
  if (!env.ETERNAL_AI_API_KEY) {
    throw new Error("ETERNAL_AI_API_KEY manquante");
  }

  const response = await fetch(`${ETERNAL_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${env.ETERNAL_AI_API_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    data = {
      raw: text
    };
  }

  if (!response.ok) {
    throw new Error(
      `Eternal AI HTTP ${response.status}: ${
        data?.error ||
        data?.detail ||
        text
      }`
    );
  }

  return data;
}


// Convertit l'image reçue depuis l'iPhone en Base64
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(
      i,
      Math.min(i + chunkSize, bytes.length)
    );

    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}


// ─────────────────────────────────────────────
// PAGE AI FACTORY
// ─────────────────────────────────────────────

function appPage() {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport"
      content="width=device-width, initial-scale=1.0">

<title>AI FACTORY</title>

<style>

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background:
    radial-gradient(
      circle at top,
      #202020,
      #080808 65%
    );

  color: white;
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;

  min-height: 100vh;
}

.container {
  width: 100%;
  max-width: 600px;
  margin: auto;
  padding: 24px 18px 50px;
}

.logo {
  text-align: center;
  margin-bottom: 30px;
}

.logo h1 {
  margin: 0;
  font-size: 32px;
  letter-spacing: 5px;
  font-weight: 800;
}

.logo p {
  margin-top: 8px;
  color: #999;
  font-size: 13px;
}

.card {
  background: #151515;
  border: 1px solid #292929;
  border-radius: 18px;
  padding: 18px;
  margin-bottom: 18px;
}

label {
  display: block;
  margin-bottom: 8px;
  color: #aaa;
  font-size: 13px;
}

input[type="file"] {
  width: 100%;
  padding: 14px;
  border-radius: 12px;
  border: 1px dashed #555;
  background: #0e0e0e;
  color: white;
}

textarea {
  width: 100%;
  min-height: 190px;
  resize: vertical;

  background: #0c0c0c;
  color: white;

  border: 1px solid #333;
  border-radius: 12px;

  padding: 14px;

  font-size: 14px;
  line-height: 1.5;
}

button {
  width: 100%;
  border: 0;
  border-radius: 14px;

  padding: 17px;

  margin-top: 15px;

  font-size: 16px;
  font-weight: 700;

  color: white;

  background:
    linear-gradient(
      135deg,
      #ff5a1f,
      #e91e63
    );

  cursor: pointer;
}

button:disabled {
  opacity: 0.45;
}

.status {
  margin-top: 16px;
  padding: 13px;

  background: #0b0b0b;
  border-radius: 12px;

  color: #aaa;
  font-size: 13px;

  white-space: pre-wrap;
}

.preview {
  width: 100%;
  max-height: 500px;
  object-fit: contain;

  border-radius: 12px;

  margin-top: 15px;

  display: none;
}

.video {
  width: 100%;
  border-radius: 14px;
  margin-top: 15px;
  display: none;
}

.download {
  display: none;

  text-align: center;

  margin-top: 12px;

  padding: 13px;

  border-radius: 12px;

  background: #222;

  color: white;

  text-decoration: none;
}

.small {
  color: #666;
  font-size: 11px;
  margin-top: 12px;
  text-align: center;
}

</style>
</head>

<body>

<div class="container">

  <div class="logo">
    <h1>AI FACTORY</h1>
    <p>VISUAL ANOMALY VIDEO FACTORY</p>
  </div>

  <div class="card">

    <label>IMAGE DE DÉPART</label>

    <input
      id="image"
      type="file"
      accept="image/png,image/jpeg,image/webp"
    >

    <img
      id="preview"
      class="preview"
    >

  </div>


  <div class="card">

    <label>PROMPT VIDÉO</label>

    <textarea id="prompt">${DEFAULT_PROMPT}</textarea>

    <button id="generate">
      🎬 GÉNÉRER LA VIDÉO
    </button>

    <div id="status" class="status">
      En attente d'une image.
    </div>

  </div>


  <div class="card">

    <label>RÉSULTAT</label>

    <video
      id="video"
      class="video"
      controls
      playsinline
    ></video>

    <a
      id="download"
      class="download"
      target="_blank"
    >
      ⬇️ OUVRIR / TÉLÉCHARGER LA VIDÉO
    </a>

  </div>

  <div class="small">
    Wan 2.2 I2V A14B Lightning · 5s · 9:16 · 480p
  </div>

</div>


<script>

const imageInput =
  document.getElementById("image");

const preview =
  document.getElementById("preview");

const promptInput =
  document.getElementById("prompt");

const generateButton =
  document.getElementById("generate");

const statusBox =
  document.getElementById("status");

const video =
  document.getElementById("video");

const download =
  document.getElementById("download");


imageInput.addEventListener(
  "change",
  () => {

    const file =
      imageInput.files[0];

    if (!file) {
      preview.style.display = "none";
      return;
    }

    preview.src =
      URL.createObjectURL(file);

    preview.style.display = "block";

    statusBox.textContent =
      "Image prête. Tu peux lancer la génération.";
  }
);


generateButton.addEventListener(
  "click",
  async () => {

    const file =
      imageInput.files[0];

    if (!file) {
      alert("Choisis d'abord une image.");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      alert(
        "Image trop lourde. Maximum 15 Mo."
      );
      return;
    }

    generateButton.disabled = true;

    video.style.display = "none";
    download.style.display = "none";

    statusBox.textContent =
      "⏳ Envoi de l'image à Wan 2.2...";

    try {

      const form =
        new FormData();

      form.append(
        "image",
        file
      );

      form.append(
        "prompt",
        promptInput.value
      );


      const response =
        await fetch(
          "/generate",
          {
            method: "POST",
            body: form
          }
        );


      const data =
        await response.json();


      if (!response.ok ||
          !data.success) {

        throw new Error(
          data.error ||
          "Erreur de génération"
        );
      }


      const requestId =
        data.request_id;


      statusBox.textContent =
        "🎬 Génération lancée.\\n\\n" +
        "Request ID : " +
        requestId;


      // POLLING

      for (
        let attempt = 0;
        attempt < 100;
        attempt++
      ) {

        await new Promise(
          resolve =>
            setTimeout(resolve, 3000)
        );


        const resultResponse =
          await fetch(
            "/result?request_id=" +
            encodeURIComponent(
              requestId
            )
          );


        const result =
          await resultResponse.json();


        if (!result.success) {
          throw new Error(
            result.error ||
            "Erreur pendant le rendu"
          );
        }


        const job =
          result.result;


        if (
          job.status ===
          "completed"
        ) {

          const videoUrl =
            job.video_url;


          if (!videoUrl) {
            throw new Error(
              "Vidéo terminée mais URL absente."
            );
          }


          video.src =
            videoUrl;

          video.style.display =
            "block";


          download.href =
            videoUrl;

          download.style.display =
            "block";


          statusBox.textContent =
            "✅ VIDÉO TERMINÉE !\\n\\n" +
            "Wan 2.2 A14B Lightning\\n" +
            "5 secondes · 9:16 · 480p";


          break;
        }


        if (
          job.status ===
          "failed"
        ) {

          throw new Error(
            job.error ||
            "La génération a échoué."
          );
        }


        statusBox.textContent =
          "⏳ Wan 2.2 travaille...\\n\\n" +
          "Statut : " +
          job.status +
          "\\nProgression : " +
          (job.progress ?? "?") +
          "%";
      }

    } catch (error) {

      statusBox.textContent =
        "❌ ERREUR\\n\\n" +
        error.message;

    } finally {

      generateButton.disabled =
        false;
    }

  }
);

</script>

</body>
</html>`;
}


// ─────────────────────────────────────────────
// WORKER
// ─────────────────────────────────────────────

export default {

  async fetch(request, env) {

    if (
      request.method === "OPTIONS"
    ) {
      return new Response(null, {
        status: 204,
        headers: JSON_HEADERS
      });
    }


    const url =
      new URL(request.url);


    try {


      // ─────────────────────────────────────
      // APP
      // ─────────────────────────────────────

      if (
        request.method === "GET" &&
        (
          url.pathname === "/" ||
          url.pathname === "/app"
        )
      ) {

        return html(
          appPage()
        );
      }


      // ─────────────────────────────────────
      // HEALTH
      // ─────────────────────────────────────

      if (
        request.method === "GET" &&
        url.pathname === "/health"
      ) {

        return json({
          service: "AI FACTORY",
          status: "online",
          eternal_ai:
            !!env.ETERNAL_AI_API_KEY,
          model:
            ETERNAL_MODEL
        });
      }


      // ─────────────────────────────────────
      // GÉNÉRATION
      // POST /generate
      // ─────────────────────────────────────

      if (
        request.method === "POST" &&
        url.pathname === "/generate"
      ) {

        const contentType =
          request.headers.get(
            "content-type"
          ) || "";


        let imageData;
        let prompt =
          DEFAULT_PROMPT;


        // FormData depuis l'iPhone
        if (
          contentType.includes(
            "multipart/form-data"
          )
        ) {

          const form =
            await request.formData();


          const image =
            form.get("image");


          if (
            !image ||
            typeof image === "string"
          ) {

            return json({
              success: false,
              error:
                "Image manquante."
            }, 400);
          }


          if (
            image.size >
            15 * 1024 * 1024
          ) {

            return json({
              success: false,
              error:
                "Image trop lourde. Maximum 15 Mo."
            }, 400);
          }


          const type =
            image.type ||
            "image/jpeg";


          const base64 =
            arrayBufferToBase64(
              await image.arrayBuffer()
            );


          imageData =
            `data:${type};base64,${base64}`;


          const submittedPrompt =
            form.get("prompt");


          if (
            submittedPrompt &&
            typeof submittedPrompt ===
              "string"
          ) {

            prompt =
              submittedPrompt.trim() ||
              DEFAULT_PROMPT;
          }

        }

        // JSON : permet aussi à AI FACTORY
        // d'appeler l'API plus tard
        else {

          const body =
            await request.json();


          imageData =
            body.image_url;


          prompt =
            body.prompt ||
            DEFAULT_PROMPT;


          if (!imageData) {

            return json({
              success: false,
              error:
                "image_url manquante."
            }, 400);
          }
        }


        // ───────────────────────────────
        // ETERNAL AI
        // ───────────────────────────────

        const payload = {

          prompt,

          image_url:
            imageData,

          model_id:
            ETERNAL_MODEL,

          duration:
            "5",

          aspect_ratio:
            "9:16",

          resolution:
            "480p",

          negative_prompt:
            NEGATIVE_PROMPT,

          cfg_scale:
            0.5
        };


        const result =
          await eternalFetch(
            env,
            "/api/image-to-video",
            {
              method: "POST",
              body:
                JSON.stringify(
                  payload
                )
            }
          );


        const requestId =
          result?.result?.request_id;


        if (!requestId) {

          throw new Error(
            "Eternal AI n'a pas retourné de request_id."
          );
        }


        return json({

          success: true,

          engine:
            "Eternal AI",

          model:
            ETERNAL_MODEL,

          request_id:
            requestId,

          status:
            "pending",

          settings: {
            duration: "5",
            aspect_ratio: "9:16",
            resolution: "480p"
          }

        }, 202);
      }


      // ─────────────────────────────────────
      // RÉSULTAT
      // GET /result?request_id=...
      // ─────────────────────────────────────

      if (
        request.method === "GET" &&
        url.pathname === "/result"
      ) {

        const requestId =
          url.searchParams.get(
            "request_id"
          );


        if (!requestId) {

          return json({
            success: false,
            error:
              "request_id manquant."
          }, 400);
        }


        const result =
          await eternalFetch(
            env,
            `/api/image-to-video/${encodeURIComponent(requestId)}/status`,
            {
              method: "GET"
            }
          );


        return json({
          success: true,
          request_id:
            requestId,
          result:
            result.result ||
            result
        });
      }


      // ─────────────────────────────────────
      // 404
      // ─────────────────────────────────────

      return json({
        success: false,
        error:
          "Route inconnue",
        path:
          url.pathname
      }, 404);


    } catch (error) {

      return json({

        success: false,

        error:
          error?.message ||
          String(error)

      }, 500);
    }
  }
};
