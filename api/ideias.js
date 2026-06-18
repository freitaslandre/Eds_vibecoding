const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: `Metodo ${req.method} nao permitido. Usa POST.` });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY nao esta configurada no servidor." });
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const tema = String(body.tema || "").trim();

  if (!tema) {
    return res.status(400).json({ error: "Envia um tema para gerar ideias." });
  }

  try {
    const payload = body.ideia
      ? buildDetailPayload(tema, body.ideia)
      : buildIdeasPayload(tema);

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message = data?.error?.message || `Erro da OpenAI API: ${response.status}`;
      return res.status(response.status).json({ error: message });
    }

    const text = extractOpenAIText(data);

    if (!text) {
      return res.status(502).json({ error: "A OpenAI API nao devolveu conteudo utilizavel." });
    }

    return res.status(200).json(JSON.parse(text));
  } catch (error) {
    return res.status(500).json({ error: error.message || "Nao foi possivel gerar a resposta." });
  }
};

function buildIdeasPayload(tema) {
  return {
    model: OPENAI_MODEL,
    input: [
      {
        role: "system",
        content: "Responde sempre em portugues europeu e gera ideias criativas, praticas e especificas."
      },
      {
        role: "user",
        content: `Gera exatamente 5 ideias criativas relacionadas com este tema: ${tema}`
      }
    ],
    max_output_tokens: 900,
    text: {
      format: {
        type: "json_schema",
        name: "ideas_response",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            ideas: {
              type: "array",
              minItems: 5,
              maxItems: 5,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  title: {
                    type: "string",
                    description: "Titulo curto da ideia."
                  },
                  description: {
                    type: "string",
                    description: "Descricao com uma frase pratica e especifica."
                  }
                },
                required: ["title", "description"]
              }
            }
          },
          required: ["ideas"]
        }
      }
    }
  };
}

function buildDetailPayload(tema, ideia) {
  return {
    model: OPENAI_MODEL,
    input: [
      {
        role: "system",
        content: "Responde sempre em portugues europeu. Aprofunda ideias de forma concreta, util e acionavel."
      },
      {
        role: "user",
        content: [
          `Tema original: ${tema}`,
          `Ideia escolhida: ${String(ideia.title || "")}`,
          `Descricao da ideia: ${String(ideia.description || "")}`,
          "Aprofunda esta ideia com uma visao geral curta, passos praticos, recursos necessarios e beneficios."
        ].join("\n")
      }
    ],
    max_output_tokens: 1200,
    text: {
      format: {
        type: "json_schema",
        name: "idea_detail_response",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: {
              type: "string"
            },
            overview: {
              type: "string"
            },
            steps: {
              type: "array",
              minItems: 3,
              maxItems: 5,
              items: {
                type: "string"
              }
            },
            resources: {
              type: "array",
              minItems: 3,
              maxItems: 5,
              items: {
                type: "string"
              }
            },
            benefits: {
              type: "array",
              minItems: 3,
              maxItems: 5,
              items: {
                type: "string"
              }
            }
          },
          required: ["title", "overview", "steps", "resources", "benefits"]
        }
      }
    }
  };
}

function extractOpenAIText(data) {
  if (typeof data?.output_text === "string") {
    return data.output_text;
  }

  return data?.output
    ?.flatMap((item) => item.content || [])
    ?.find((content) => content.type === "output_text")
    ?.text;
}
