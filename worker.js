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

    if (url.pathname === "/") {

      return new Response(

        JSON.stringify({

          service: "AI FACTORY",

          status: "online",

          version: "1.1"

        }),

        {

          headers: {

            "Content-Type": "application/json",

            ...cors

          }

        }

      );

    }

    if (url.pathname === "/health") {

      try {

        const response = await fetch(

          "https://observantdistressed-wan2-2-i2v-v3.hf.space/gradio_api/info",

          {

            headers: {

              "Authorization": `Bearer ${env.HF_TOKEN}`

            }

          }

        );

        const data = await response.text();

        return new Response(

          JSON.stringify({

            cloudflare: true,

            huggingface_status: response.status,

            huggingface_ok: response.ok,

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

            cloudflare: true,

            huggingface_ok: false,

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

};
