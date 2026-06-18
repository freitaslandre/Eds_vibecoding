const OPENAI_API_KEY = "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";
const OPENAI_MODEL = "gpt-4.1-mini";

const form = document.querySelector("#ideaForm");
const topicInput = document.querySelector("#topic");
const results = document.querySelector("#results");
const button = document.querySelector("#generateButton");
const buttonText = document.querySelector("#buttonText");
const buttonSpinner = document.querySelector("#buttonSpinner");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const topic = topicInput.value.trim();

  if (!OPENAI_API_KEY || OPENAI_API_KEY === "COLOCA_AQUI_A_TUA_OPENAI_API_KEY") {
    showError("Insere a tua OpenAI API key na variável OPENAI_API_KEY, no início do script.js.");
    return;
  }

  if (!topic) {
    showError("Preenche o tema antes de gerar ideias.");
    return;
  }

  setLoading(true);
  results.innerHTML = '<div class="empty">A gerar ideias com a OpenAI API...</div>';

  try {
    const ideas = await generateIdeas(topic);
    renderIdeas(ideas);
  } catch (error) {
    showError(error.message || "Não foi possível gerar ideias agora.");
  } finally {
    setLoading(false);
  }
});

async function generateIdeas(topic) {
  const endpoint = "https://api.openai.com/v1/responses";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: [
        {
          role: "system",
          content: "Responde sempre em portugues europeu e gera ideias criativas, praticas e especificas."
        },
        {
          role: "user",
          content: `Gera exatamente 5 ideias criativas relacionadas com este tema: ${topic}`
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
    })
  });

  if (!response.ok) {
    const details = await response.json().catch(() => null);
    const message = details?.error?.message || `Erro da API: ${response.status}`;
    throw new Error(message);
  }

  const data = await response.json();
  const text = extractOpenAIText(data);

  if (!text) {
    throw new Error("A OpenAI API não devolveu conteúdo utilizável.");
  }

  const parsed = JSON.parse(text);
  const ideas = Array.isArray(parsed.ideas) ? parsed.ideas : [];

  if (ideas.length === 0) {
    throw new Error("A resposta não trouxe ideias no formato esperado.");
  }

  return ideas.slice(0, 5).map((idea, index) => ({
    title: String(idea.title || `Ideia ${index + 1}`).trim(),
    description: String(idea.description || "").trim()
  }));
}

function extractOpenAIText(data) {
  if (typeof data.output_text === "string") {
    return data.output_text;
  }

  return data.output
    ?.flatMap((item) => item.content || [])
    ?.find((content) => content.type === "output_text")
    ?.text;
}

function renderIdeas(ideas) {
  results.innerHTML = "";

  ideas.forEach((idea, index) => {
    const article = document.createElement("article");
    article.className = "idea";
    article.style.animationDelay = `${index * 45}ms`;

    const number = document.createElement("div");
    number.className = "idea-number";
    number.textContent = String(index + 1);

    const content = document.createElement("div");
    const title = document.createElement("h2");
    const description = document.createElement("p");

    title.textContent = idea.title;
    description.textContent = idea.description || "Explora esta direção e adapta-a ao teu contexto.";

    content.append(title, description);
    article.append(number, content);
    results.appendChild(article);
  });
}

function showError(message) {
  results.innerHTML = "";
  const error = document.createElement("div");
  error.className = "error";
  error.textContent = message;
  results.appendChild(error);
}

function setLoading(isLoading) {
  button.disabled = isLoading;
  buttonText.textContent = isLoading ? "A gerar..." : "Gerar Ideias";
  buttonSpinner.classList.toggle("hidden", !isLoading);
}
