// script.js - Lógica da Interface e Áudio
let reconhecimentoAudio;
let campoGravandoId = null;

// Relógio dinâmico no topo
function atualizarRelogioTopo() {
  const agora = new Date();
  const formatado = agora.toLocaleDateString('pt-BR') + ' ' + agora.toLocaleTimeString('pt-BR');
  const el = document.getElementById('relogio-dinamico');
  if(el) el.innerText = formatado;
}
setInterval(atualizarRelogioTopo, 1000);

// Validação e Máscara de Telefone
function mascaraTelefone(input) {
  let v = input.value.replace(/\D/g, "");
  if (v.length > 11) v = v.slice(0, 11);
  if (v.length > 6) {
    v = v.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
  } else if (v.length > 2) {
    v = v.replace(/^(\d{2})(\d+)/, "($1) $2");
  } else if (v.length > 0) {
    v = v.replace(/^(\d*)/, "($1");
  }
  input.value = v;
}

function fazerLogin() {
  const inputEl = document.getElementById('input-telefone');
  const telefone = inputEl ? inputEl.value.trim() : "";
  const apenasNumeros = telefone.replace(/\D/g, "");
  
  // Valida número com DDD (10 ou 11 dígitos)
  if (apenasNumeros.length >= 10 && apenasNumeros.length <= 11) {
    usuarioTelefone = telefone;
    localStorage.setItem('promptTelefone', telefone);
    renderizarEstadoLogin();
  } else {
    alert("Digite um número de telefone válido com DDD. Exemplo: (31) 98482-1902");
  }
}

function fazerLogoutPrompt() {
  usuarioTelefone = null;
  localStorage.removeItem('promptTelefone');
  renderizarEstadoLogin();
}

function renderizarEstadoLogin() {
  const loginDiv = document.getElementById('login');
  if (!loginDiv) return;

  if (usuarioTelefone) {
    loginDiv.innerHTML = `
      <p style="color:#16a34a; font-weight:bold; margin:0; flex:1;">✅ ${usuarioTelefone}</p>
      <button type="button" onclick="fazerLogoutPrompt()" style="background:#dc2626;">Sair</button>
    `;
  } else {
    loginDiv.innerHTML = `
      <input type="text" id="input-telefone" placeholder="(xx) xxxxx-xxxx" maxlength="15" oninput="mascaraTelefone(this)">
      <button type="button" onclick="fazerLogin()">Entrar</button>
    `;
  }
}

// Gravação de Áudio para Campos 1 e 2
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechGen = window.SpeechRecognition || window.webkitSpeechRecognition;
  reconhecimentoAudio = new SpeechGen();
  reconhecimentoAudio.continuous = false;
  reconhecimentoAudio.lang = 'pt-BR';

  reconhecimentoAudio.onresult = function(event) {
    if (campoGravandoId) {
      const resultadoTexto = event.results[0][0].transcript;
      const campoTarget = document.getElementById(campoGravandoId);
      if(campoTarget) {
        campoTarget.value += (campoTarget.value ? " " : "") + resultadoTexto;
      }
    }
  };
  reconhecimentoAudio.onend = pararGravacaoUI;
  reconhecimentoAudio.onerror = pararGravacaoUI;
}

function gerenciarAudio(idCampo, botao) {
  if (!reconhecimentoAudio) {
    alert("Gravação de áudio não suportada neste navegador.");
    return;
  }
  if (campoGravandoId === idCampo) {
    try { reconhecimentoAudio.stop(); } catch(e) {}
    pararGravacaoUI();
  } else {
    pararGravacaoUI();
    campoGravandoId = idCampo;
    botao.classList.add('gravando');
    botao.innerText = "🛑 Gravando...";
    try { reconhecimentoAudio.start(); } catch(e) {}
  }
}

function pararGravacaoUI() {
  document.querySelectorAll('.btn-audio-inline').forEach(btn => {
    btn.classList.remove('gravando');
    btn.innerText = "🎤 Gravar Áudio";
  });
  campoGravandoId = null;
}

// Filtros "Evitar"
function toggleFiltro(elemento, texto) {
  elemento.classList.toggle('active');
  const campoEvitar = document.getElementById('evitar');
  if (elemento.classList.contains('active')) {
    campoEvitar.value += (campoEvitar.value ? " " : "") + texto;
    elemento.innerText = elemento.innerText.replace('⬜', '✅');
  } else {
    campoEvitar.value = campoEvitar.value.replace(texto, "").trim();
    elemento.innerText = elemento.innerText.replace('✅', '⬜');
  }
}

// Gerar Prompt e Salvar
function gerarPromptEstruturado() {
  if (!usuarioTelefone) {
    alert("Faça o login com seu telefone antes de gerar o prompt.");
    return;
  }

  const solicitacao = document.getElementById('solicitacao').value.trim();
  if (!solicitacao) {
    alert("Preencha a solicitação (Ideia principal).");
    return;
  }

  let painel = document.getElementById('prompt-final');
  let area = document.getElementById('area-select').value;
  let fazSentido = document.getElementById('faz-sentido').value;
  let detalhe = document.getElementById('detalhe').value;
  let evitar = document.getElementById('evitar').value;

  let prompt = `### TAREFA (${area}) ###\n${solicitacao}\n\n`;
  if (detalhe) prompt += `### DETALHES ###\n${detalhe}\n\n`;
  if (evitar) prompt += `### RESTRIÇÕES ###\n${evitar}\n\n`;
  prompt += `### FAZ SENTIDO ###\n${fazSentido}\n\n`;
  prompt += `Atue como um especialista pragmático. Vá direto à solução, sem enrolação.`;

  painel.innerText = prompt;
  painel.style.display = 'block';

  // Salva automaticamente na planilha
  if(window.salvarNoGoogleSheets) {
    window.salvarNoGoogleSheets("Gerar Prompt");
  }
}

function copiarPromptGerado() {
  let texto = document.getElementById('prompt-final').innerText;
  if(!texto) { alert('Clique em "Gerar prompt" primeiro!'); return; }
  navigator.clipboard.writeText(texto);
  alert('Prompt copiado!');
}

function executarFeedback(status) {
  if(window.enviarFeedbackPlanilha) {
    window.enviarFeedbackPlanilha(status);
  }
  alert("Feedback registrado: " + status);
}

function reiniciarNovaInteracao() {
  document.getElementById('solicitacao').value = "";
  document.getElementById('detalhe').value = "";
  document.getElementById('evitar').value = "";
  document.getElementById('resposta_ia').value = "";
  document.getElementById('prompt-final').innerText = "";
  document.getElementById('prompt-final').style.display = "none";
  document.querySelectorAll('.checkbox-btn').forEach(btn => {
    btn.classList.remove('active');
    btn.innerText = btn.innerText.replace('✅', '⬜');
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.addEventListener('DOMContentLoaded', renderizarEstadoLogin);