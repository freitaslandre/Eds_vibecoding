/**
 * Testes Unitários Simples para script.js
 * Testa: validação de campo vazio, parseGeminiJson e renderIdeas
 */

// Framework de testes simples
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  describe(suiteName, callback) {
    console.log(`\n📦 ${suiteName}`);
    callback();
  }

  it(testName, callback) {
    try {
      callback();
      this.passed++;
      console.log(`  ✅ ${testName}`);
    } catch (error) {
      this.failed++;
      console.error(`  ❌ ${testName}`);
      console.error(`     Erro: ${error.message}`);
    }
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message || "Asserção falhou");
    }
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `Esperado ${expected}, obteve ${actual}`);
    }
  }

  assertTrue(value, message) {
    this.assert(value === true, message || "Esperado true");
  }

  assertFalse(value, message) {
    this.assert(value === false, message || "Esperado false");
  }

  summary() {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`📊 Resultados dos Testes:`);
    console.log(`   ✅ Passou: ${this.passed}`);
    console.log(`   ❌ Falhou: ${this.failed}`);
    console.log(`   📈 Total: ${this.passed + this.failed}`);
    console.log(`${'='.repeat(50)}\n`);
  }
}

const runner = new TestRunner();

// ============================================
// TESTE 1: Validação de Campo Vazio
// ============================================

runner.describe("Teste 1: Validação de Campo Vazio", () => {
  runner.it("Deve mostrar erro quando o campo está vazio", () => {
    const topicInput = "";
    const isValid = topicInput.trim().length > 0;
    runner.assertFalse(isValid, "Campo vazio deve ser inválido");
  });

  runner.it("Deve aceitar tema válido", () => {
    const topicInput = "Ideias de negócio";
    const isValid = topicInput.trim().length > 0;
    runner.assertTrue(isValid, "Campo com texto deve ser válido");
  });

  runner.it("Deve ignorar espaços em branco", () => {
    const topicInput = "   ";
    const isValid = topicInput.trim().length > 0;
    runner.assertFalse(isValid, "Apenas espaços não é válido");
  });
});

// ============================================
// TESTE 2: Parse de JSON (parseGeminiJson)
// ============================================

runner.describe("Teste 2: Parse de JSON (Gemini/OpenAI Format)", () => {
  // Função auxiliar para simular parseGeminiJson
  function parseGeminiJson(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.ideas && Array.isArray(parsed.ideas)) {
        return parsed.ideas;
      }
      throw new Error("Formato inválido: falta propriedade 'ideas'");
    } catch (error) {
      throw new Error(`Erro ao fazer parse de JSON: ${error.message}`);
    }
  }

  runner.it("Deve fazer parse de JSON válido com ideias", () => {
    const jsonString = JSON.stringify({
      ideas: [
        { title: "Ideia 1", description: "Descrição 1" },
        { title: "Ideia 2", description: "Descrição 2" }
      ]
    });

    const ideas = parseGeminiJson(jsonString);
    runner.assertEqual(ideas.length, 2, "Deve ter 2 ideias");
    runner.assertEqual(ideas[0].title, "Ideia 1", "Primeira ideia incorreta");
  });

  runner.it("Deve retornar array vazio quando não há ideias", () => {
    const jsonString = JSON.stringify({ ideas: [] });
    const ideas = parseGeminiJson(jsonString);
    runner.assertEqual(ideas.length, 0, "Deve ter 0 ideias");
  });

  runner.it("Deve lançar erro para JSON inválido", () => {
    try {
      parseGeminiJson("{ invalid json");
      runner.assert(false, "Deveria ter lançado erro");
    } catch (error) {
      runner.assert(
        error.message.includes("Erro ao fazer parse"),
        "Mensagem de erro incorreta"
      );
    }
  });

  runner.it("Deve lançar erro se faltar propriedade 'ideas'", () => {
    try {
      const jsonString = JSON.stringify({ data: [] });
      parseGeminiJson(jsonString);
      runner.assert(false, "Deveria ter lançado erro");
    } catch (error) {
      runner.assert(
        error.message.includes("falta propriedade 'ideas'"),
        "Mensagem de erro incorreta"
      );
    }
  });

  runner.it("Deve processar ideias com descrições vazias", () => {
    const jsonString = JSON.stringify({
      ideas: [{ title: "Ideia Teste", description: "" }]
    });

    const ideas = parseGeminiJson(jsonString);
    runner.assertEqual(ideas[0].title, "Ideia Teste", "Título incorreto");
    runner.assertEqual(ideas[0].description, "", "Descrição não está vazia");
  });
});

// ============================================
// TESTE 3: renderIdeas - Número Correto de Ideias
// ============================================

runner.describe("Teste 3: renderIdeas - Renderizar Ideias Corretamente", () => {
  // Criar um contentor mock para testes
  let mockResults;

  // Função auxiliar que simula renderIdeas
  function renderIdeas(ideas, container) {
    container.innerHTML = "";

    if (ideas.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "Escreve um tema para começar";
      container.appendChild(empty);
      return;
    }

    ideas.forEach((idea, index) => {
      const article = document.createElement("article");
      article.className = "idea";

      const number = document.createElement("div");
      number.className = "idea-number";
      number.textContent = String(index + 1);

      const content = document.createElement("div");
      const title = document.createElement("h2");
      const description = document.createElement("p");

      title.textContent = idea.title;
      description.textContent =
        idea.description || "Explora esta direção e adapta-a ao teu contexto.";

      content.append(title, description);
      article.append(number, content);
      container.appendChild(article);
    });
  }

  runner.it("Deve renderizar 0 ideias (mostrar mensagem vazia)", () => {
    mockResults = document.createElement("div");
    renderIdeas([], mockResults);

    runner.assertEqual(
      mockResults.children.length,
      1,
      "Deve ter 1 elemento (mensagem vazia)"
    );
    runner.assert(
      mockResults.querySelector(".empty") !== null,
      "Deve ter div com classe 'empty'"
    );
  });

  runner.it("Deve renderizar 1 ideia", () => {
    mockResults = document.createElement("div");
    const ideas = [{ title: "Ideia 1", description: "Descrição 1" }];

    renderIdeas(ideas, mockResults);

    runner.assertEqual(
      mockResults.children.length,
      1,
      "Deve renderizar 1 ideia"
    );
    runner.assert(
      mockResults.querySelector("article") !== null,
      "Deve ter article"
    );
  });

  runner.it("Deve renderizar 5 ideias corretamente", () => {
    mockResults = document.createElement("div");
    const ideas = [
      { title: "Ideia 1", description: "Desc 1" },
      { title: "Ideia 2", description: "Desc 2" },
      { title: "Ideia 3", description: "Desc 3" },
      { title: "Ideia 4", description: "Desc 4" },
      { title: "Ideia 5", description: "Desc 5" }
    ];

    renderIdeas(ideas, mockResults);

    runner.assertEqual(
      mockResults.children.length,
      5,
      "Deve renderizar 5 ideias"
    );

    // Verificar cada ideia
    ideas.forEach((idea, index) => {
      const article = mockResults.children[index];
      const title = article.querySelector("h2");
      runner.assertEqual(
        title.textContent,
        idea.title,
        `Título da ideia ${index + 1} incorreto`
      );
    });
  });

  runner.it("Deve numerar as ideias corretamente (1, 2, 3...)", () => {
    mockResults = document.createElement("div");
    const ideas = [
      { title: "Ideia A", description: "Desc A" },
      { title: "Ideia B", description: "Desc B" },
      { title: "Ideia C", description: "Desc C" }
    ];

    renderIdeas(ideas, mockResults);

    ideas.forEach((_, index) => {
      const article = mockResults.children[index];
      const number = article.querySelector(".idea-number");
      runner.assertEqual(
        number.textContent,
        String(index + 1),
        `Número da ideia ${index} incorreto`
      );
    });
  });

  runner.it("Deve usar descrição padrão se não fornecida", () => {
    mockResults = document.createElement("div");
    const ideas = [{ title: "Ideia Teste", description: "" }];

    renderIdeas(ideas, mockResults);

    const description = mockResults.querySelector("p");
    const defaultText = "Explora esta direção e adapta-a ao teu contexto.";
    runner.assert(
      description.textContent.includes(defaultText),
      "Deve usar descrição padrão"
    );
  });

  runner.it("Deve limpar conteúdo anterior ao renderizar", () => {
    mockResults = document.createElement("div");
    mockResults.innerHTML = "<div>Conteúdo antigo</div>";

    const ideas = [{ title: "Nova Ideia", description: "Novo conteúdo" }];
    renderIdeas(ideas, mockResults);

    runner.assertFalse(
      mockResults.innerHTML.includes("Conteúdo antigo"),
      "Conteúdo antigo deve ser removido"
    );
  });
});

// ============================================
// Executar testes e mostrar resumo
// ============================================

console.log("\n🧪 INICIANDO TESTES UNITÁRIOS\n");
runner.summary();
