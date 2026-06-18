# Eds_vibecoding

## Correr localmente

O botao "Go Live" do VS Code so serve ficheiros estaticos e nao executa `api/ideias.js`.
Para a API funcionar localmente, usa o servidor Node deste projeto.

No PowerShell:

```powershell
$env:OPENAI_API_KEY="a_tua_chave"
npm run dev
```

Depois abre:

```text
http://localhost:3000
```
