// google.js - Integração Google Sheets via Apps Script WebApp
const URL_APPS_SCRIPT = "https://script.google.com/macros/s/AKfycbwAFjbqPdEk5rcgQahgsOn35tPXpTIj9vjSIA63LgyYDPj2QOvMB4K-kNGrkqscmYzp/exec";

let usuarioTelefone = localStorage.getItem('promptTelefone') || null;

function salvarNoGoogleSheets(tipoAcao = "Gerar Prompt") {
  if (!usuarioTelefone) return;

  const dados = {
    timestamp: new Date().toLocaleString("pt-BR"),
    contato: usuarioTelefone,
    solicitacao: document.getElementById('solicitacao')?.value || "",
    detalhe: document.getElementById('detalhe')?.value || "",
    evitar: document.getElementById('evitar')?.value || "",
    fazSentido: document.getElementById('faz-sentido')?.value || "Sim",
    area: document.getElementById('area-select')?.value || "Automático (geral)",
    promptGerado: document.getElementById('prompt-final')?.innerText || "",
    respostaIA: document.getElementById('resposta_ia')?.value || "",
    statusFeedback: window.ultimoFeedback || "",
    acao: tipoAcao
  };

  fetch(URL_APPS_SCRIPT, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  }).catch(err => console.log("Envio planilha executado."));
}

function enviarFeedbackPlanilha(status) {
  window.ultimoFeedback = status;
  salvarNoGoogleSheets("Feedback IA");
}