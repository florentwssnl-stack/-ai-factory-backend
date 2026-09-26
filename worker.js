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

    // Accueil

    if (url.pathname === "/") {

      return new Response(

        JSON.stringify({

          service: "AI FACTORY",

          status: "online",

          version: "1.0"

        }),

        {

          headers: {

            "Content-Type": "application/json",

            ...cors

          }

        }

      );

    }

    // Vérification Hugging Face

    if (url.pathname === "/health") {

      try {

        const response = await fetch(

          "https://observantdistressed-wan2-2-i2v-v3.hf.space/gradio_api/info",

          {

            method: "GET",

            headers: {

              "Authorization": `Bearer ${env.HF_TOKEN}`

            }

          }

        );

        const data = await response.text();

        return new Response(

          JSON.stringify({

            ok: response.ok,

            huggingface_status: response.status,

            huggingface_connected: response.ok,

            response: data

          }),

          {

            status: response.ok ? 200 : 502,

            headers: {

              "Content-Type": "application/json",

              ...cors

            }

          }

        );

      } catch (error) {

        return new Response(

          JSON.stringify({

            ok: false,

            huggingface_connected: false,

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

    // Route inconnue

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

}
