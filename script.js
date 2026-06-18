const GEMINI_API_KEY = "AQ.Ab8RN6LWK6yE409sos_MyD8vKria4aZgStRLZ9irh7gOvDX_rg";

const form = document.querySelector("#ideaForm");
const topicInput = document.querySelector("#topic");
const results = document.querySelector("#results");
const button = document.querySelector("#generateButton");
const buttonText = document.querySelector("#buttonText");
const buttonSpinner = document.querySelector("#buttonSpinner");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const topic = topicInput.value.trim();

  if (!GEMINI_API_KEY || GEMINI_API_KEY === "COLOCA_AQUI_A_TUA_API_KEY") {
    showError("Insere a tua Gemini API key na variável GEMINI_API_KEY, no início do script.js.");
    return;
  }

  if (!topic) {
    showError("Preenche o tema antes de gerar ideias.");
    return;
  }

  setLoading(true);
  results.innerHTML = '<div class="empty">A gerar ideias com a Gemini API...</div>';

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
  const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
  const prompt = [
    "Gera exatamente 5 ideias criativas relacionadas com o tema indicado.",
    "Responde apenas em JSON válido, sem markdown, no formato:",
    '{"ideas":[{"title":"Título curto","description":"Descrição com uma frase prática e específica"}]}',
    `Tema: ${topic}`
  ].join("\n");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": GEMINI_API_KEY
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.85,
        maxOutputTokens: 900,
        responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) {
    const details = await response.json().catch(() => null);
    const message = details?.error?.message || `Erro da API: ${response.status}`;
    throw new Error(message);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("A Gemini API não devolveu conteúdo utilizável.");
  }

  const parsed = parseGeminiJson(text);
  const ideas = Array.isArray(parsed.ideas) ? parsed.ideas : [];

  if (ideas.length === 0) {
    throw new Error("A resposta não trouxe ideias no formato esperado.");
  }

  return ideas.slice(0, 5).map((idea, index) => ({
    title: String(idea.title || `Ideia ${index + 1}`).trim(),
    description: String(idea.description || "").trim()
  }));
}

function parseGeminiJson(text) {
  const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  return JSON.parse(cleaned);
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
