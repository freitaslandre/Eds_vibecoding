const OPENAI_API_KEY = "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";
const OPENAI_MODEL = "gpt-4.1-mini";

const form = document.querySelector("#ideaForm");
const topicInput = document.querySelector("#topic");
const results = document.querySelector("#results");
const ideaDetail = document.querySelector("#ideaDetail");
const button = document.querySelector("#generateButton");
const buttonText = document.querySelector("#buttonText");
const buttonSpinner = document.querySelector("#buttonSpinner");

let currentTopic = "";
let selectedIdeaButton = null;
let activeDetailRequest = 0;

form.noValidate = true;
showEmptyMessage();

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const topic = topicInput.value.trim();
  currentTopic = topic;

  if (!topic) {
    showError("Escreve um tema antes de carregar em Gerar Ideias.");
    topicInput.focus();
    return;
  }

  if (!OPENAI_API_KEY || OPENAI_API_KEY === "COLOCA_AQUI_A_TUA_OPENAI_API_KEY") {
    showError("Insere a tua OpenAI API key na variável OPENAI_API_KEY, no início do script.js.");
    return;
  }

  setLoading(true);
  showLoading();
  clearIdeaDetail();

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

  return ideas.slice(0, 5).map((idea, index) => ({
    title: String(idea.title || `Ideia ${index + 1}`).trim(),
    description: String(idea.description || "").trim()
  }));
}

async function expandIdea(idea) {
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
          content: "Responde sempre em portugues europeu. Aprofunda ideias de forma concreta, util e acionavel."
        },
        {
          role: "user",
          content: [
            `Tema original: ${currentTopic}`,
            `Ideia escolhida: ${idea.title}`,
            `Descricao da ideia: ${idea.description}`,
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
    throw new Error("A OpenAI API não devolveu detalhe utilizável.");
  }

  return JSON.parse(text);
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

  if (ideas.length === 0) {
    showEmptyMessage();
    return;
  }

  ideas.forEach((idea, index) => {
    const ideaButton = document.createElement("button");
    ideaButton.className = "idea idea-button";
    ideaButton.type = "button";
    ideaButton.style.animationDelay = `${index * 45}ms`;
    ideaButton.setAttribute("aria-label", `Aprofundar ideia ${index + 1}: ${idea.title}`);

    const number = document.createElement("div");
    number.className = "idea-number";
    number.textContent = String(index + 1);

    const content = document.createElement("div");
    const title = document.createElement("h2");
    const description = document.createElement("p");

    title.textContent = idea.title;
    description.textContent = idea.description || "Explora esta direção e adapta-a ao teu contexto.";

    content.append(title, description);
    ideaButton.append(number, content);
    ideaButton.addEventListener("click", () => handleIdeaClick(idea, ideaButton));
    results.appendChild(ideaButton);
  });
}

async function handleIdeaClick(idea, ideaButton) {
  if (!OPENAI_API_KEY || OPENAI_API_KEY === "COLOCA_AQUI_A_TUA_OPENAI_API_KEY") {
    showDetailError("Insere a tua OpenAI API key antes de aprofundar uma ideia.");
    return;
  }

  if (selectedIdeaButton) {
    selectedIdeaButton.classList.remove("selected");
  }

  selectedIdeaButton = ideaButton;
  selectedIdeaButton.classList.add("selected");
  setIdeaButtonsDisabled(true);
  showDetailLoading(idea);

  const requestId = ++activeDetailRequest;

  try {
    const detail = await expandIdea(idea);
    if (requestId !== activeDetailRequest) {
      return;
    }
    renderIdeaDetail(detail);
  } catch (error) {
    if (requestId !== activeDetailRequest) {
      return;
    }
    showDetailError(error.message || "Não foi possível aprofundar esta ideia agora.");
  } finally {
    if (requestId === activeDetailRequest) {
      setIdeaButtonsDisabled(false);
    }
  }
}

function showEmptyMessage() {
  results.innerHTML = "";
  const empty = document.createElement("div");
  empty.className = "empty";
  empty.textContent = "Escreve um tema para começar";
  results.appendChild(empty);
}

function showLoading() {
  results.innerHTML = "";

  const loading = document.createElement("div");
  loading.className = "empty loading-card";
  loading.setAttribute("role", "status");

  const spinner = document.createElement("span");
  spinner.className = "result-spinner";
  spinner.setAttribute("aria-hidden", "true");

  const text = document.createElement("span");
  text.textContent = "A gerar ideias com a OpenAI API...";

  loading.append(spinner, text);
  results.appendChild(loading);
}

function showError(message) {
  results.innerHTML = "";
  clearIdeaDetail();
  const error = document.createElement("div");
  error.className = "error";
  error.textContent = message;
  results.appendChild(error);
}

function showDetailLoading(idea) {
  ideaDetail.classList.remove("hidden");
  ideaDetail.innerHTML = "";

  const loading = document.createElement("div");
  loading.className = "detail-panel loading-card";
  loading.setAttribute("role", "status");

  const spinner = document.createElement("span");
  spinner.className = "result-spinner";
  spinner.setAttribute("aria-hidden", "true");

  const text = document.createElement("span");
  text.textContent = `A aprofundar "${idea.title}"...`;

  loading.append(spinner, text);
  ideaDetail.appendChild(loading);
  ideaDetail.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function renderIdeaDetail(detail) {
  ideaDetail.classList.remove("hidden");
  ideaDetail.innerHTML = "";

  const panel = document.createElement("article");
  panel.className = "detail-panel";

  const eyebrow = document.createElement("span");
  eyebrow.className = "detail-eyebrow";
  eyebrow.textContent = "Ideia aprofundada";

  const title = document.createElement("h2");
  title.textContent = detail.title || "Detalhe da ideia";

  const overview = document.createElement("p");
  overview.className = "detail-overview";
  overview.textContent = detail.overview || "Explora esta ideia com os passos, recursos e benefícios abaixo.";

  panel.append(eyebrow, title, overview);
  panel.append(
    createDetailSection("Passos práticos", detail.steps),
    createDetailSection("Recursos necessários", detail.resources),
    createDetailSection("Benefícios", detail.benefits)
  );

  ideaDetail.appendChild(panel);
}

function createDetailSection(titleText, items = []) {
  const section = document.createElement("section");
  section.className = "detail-section";

  const title = document.createElement("h3");
  title.textContent = titleText;

  const list = document.createElement("ul");

  items.forEach((item) => {
    const listItem = document.createElement("li");
    listItem.textContent = item;
    list.appendChild(listItem);
  });

  section.append(title, list);
  return section;
}

function showDetailError(message) {
  ideaDetail.classList.remove("hidden");
  ideaDetail.innerHTML = "";

  const error = document.createElement("div");
  error.className = "error";
  error.textContent = message;
  ideaDetail.appendChild(error);
}

function clearIdeaDetail() {
  activeDetailRequest += 1;
  ideaDetail.innerHTML = "";
  ideaDetail.classList.add("hidden");

  if (selectedIdeaButton) {
    selectedIdeaButton.classList.remove("selected");
    selectedIdeaButton = null;
  }
}

function setIdeaButtonsDisabled(isDisabled) {
  results.querySelectorAll(".idea-button").forEach((ideaButton) => {
    ideaButton.disabled = isDisabled;
  });
}

function setLoading(isLoading) {
  button.disabled = isLoading;
  buttonText.textContent = isLoading ? "A gerar..." : "Gerar Ideias";
  buttonSpinner.classList.toggle("hidden", !isLoading);
}
