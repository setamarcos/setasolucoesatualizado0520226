const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbyWTN1XC2JWhqWFPiVvxKSM8EUGUW8BvxSw59j5kQx8BD580ctuiqjiFW2uPPwjF3a9/exec";

var momentosDoAno = [
  { frase: "Recria tua vida, sempre.", autor: "Cora Coralina" },
  { frase: "Delicadeza das pequenas coisas.", autor: "Cecília Meireles" },
  { frase: "Renda-se ao que não conhece.", autor: "Clarice Lispector" },
  { frase: "O que a memória ama, fica eterno.", autor: "Adélia Prado" },
  { frase: "Tempo pra si é acalmar a alma.", autor: "Lya Luft" }
];

function obterDiaDoAno(data) {
  var inicio = new Date(data.getFullYear(), 0, 0);
  var diff = (data - inicio) + ((inicio.getTimezoneOffset() - data.getTimezoneOffset()) * 60 * 1000);
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function preencherDiasUteis() {
  var selectDia = document.getElementById('select-dia');
  selectDia.innerHTML = "";
  var hoje = new Date();
  var contador = 0;
  var d = new Date(hoje);
  while (contador < 10) {
    d.setDate(d.getDate() + 1);
    var diaSemana = d.getDay();
    if (diaSemana !== 0 && diaSemana !== 6) { 
      var iso = d.toISOString().split('T')[0];
      var textoFormatado = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
      var opt = document.createElement('option');
      opt.value = iso;
      opt.text = textoFormatado.charAt(0).toUpperCase() + textoFormatado.slice(1);
      selectDia.appendChild(opt);
      contador++;
    }
  }
}

// FIX DE CORS (text/plain) E MENSAGEM DO WHATSAPP
function enviarAgendamentoSite() {
  var nomeCliente = document.getElementById('input-nome-cliente').value.trim();
  var telCliente = document.getElementById('input-tel-cliente').value.trim();
  var diaSelecionado = document.getElementById('select-dia').value;
  var horarioSelecionado = document.getElementById('select-horario').value;

  if (!nomeCliente || !telCliente) {
    alert("Por favor, preencha seu nome e telefone para agendar.");
    return;
  }

  const btnAgendar = document.querySelector('.btn-agendar-site');
  if (btnAgendar) {
    btnAgendar.disabled = true;
    btnAgendar.innerText = 'Agendando...';
    btnAgendar.style.opacity = '0.6';
  }

  const payload = {
    tipo: 'agendamento',
    dataRegistro: new Date().toLocaleString('pt-BR'),
    nome: nomeCliente,
    telefone: telCliente,
    dia: diaSelecionado,
    horario: horarioSelecionado,
    status: 'Pendente'
  };

  let listaAgendamentos = JSON.parse(localStorage.getItem('veronica_agendamentos') || '[]');
  listaAgendamentos.unshift(payload);
  localStorage.setItem('veronica_agendamentos', JSON.stringify(listaAgendamentos));
  carregarAgenda();

  fetch(URL_SCRIPT, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  })
  .then(() => {
    console.log('Agendamento salvo na planilha!');
  })
  .catch(err => console.error(err))
  .finally(() => {
    if (btnAgendar) {
      btnAgendar.disabled = false;
      btnAgendar.innerText = 'Agendar Horário';
      btnAgendar.style.opacity = '1';
    }
  });

  // Trata e formata a data BR (ex: 26/08/2026)
  var dataFormatadaBr = diaSelecionado.split('-').reverse().join('/');
  
  // Limpa o telefone para manter apenas dígitos no link do WhatsApp
  var telApenasNumeros = telCliente.replace(/\D/g, '');

  // Montagem da mensagem estruturada com quebras de linha limpas
  var textoZap = "Olá Verônica! Gostaria de agendar Manicure Pé e Mão.\n\n" +
                 "👤 Nome: " + nomeCliente + "\n" +
                 "📞 Telefone: " + telCliente + "\n" +
                 "📅 Data: " + dataFormatadaBr + "\n" +
                 "⏰ Horário: " + horarioSelecionado;

  // encodeURIComponent garante a conversão correta dos emojis e caracteres especiais para a URL
  var urlZap = "https://wa.me/5531991946163?text=" + encodeURIComponent(textoZap);

  // Limpa os inputs
  document.getElementById('input-nome-cliente').value = '';
  document.getElementById('input-tel-cliente').value = '';

  // Abre a janela do WhatsApp
  window.open(urlZap, '_blank');
}

function carregarAgenda() {
  let listaAgendamentos = JSON.parse(localStorage.getItem('veronica_agendamentos') || '[]');
  var tbody = document.getElementById('tabela-agenda-corpo');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (listaAgendamentos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">Nenhum agendamento registrado.</td></tr>`;
    return;
  }
  listaAgendamentos.forEach((item, index) => {
    var dataFormatada = item.dia ? item.dia.split('-').reverse().join('/') : '';
    var tr = document.createElement('tr');
    tr.innerHTML = `<td>${index + 1}</td><td style="text-align:left">${item.nome || ''}</td><td>${item.telefone || ''}</td><td>${dataFormatada}</td><td>${item.horario || ''}</td><td><button class="btn-acao btn-excluir" onclick="excluirAgenda(${index})">Excluir</button></td>`;
    tbody.appendChild(tr);
  });
}

// FIX DE CORS (text/plain) E MENSAGEM DO WHATSAPP + TRAVAMENTO DE BOTÃO
function enviarAgendamentoSite() {
  var nomeCliente = document.getElementById('input-nome-cliente').value.trim();
  var telCliente = document.getElementById('input-tel-cliente').value.trim();
  var diaSelecionado = document.getElementById('select-dia').value;
  var horarioSelecionado = document.getElementById('select-horario').value;

  if (!nomeCliente || !telCliente) return;

  const btnAgendar = document.querySelector('.btn-agendar-site');
  if (btnAgendar) {
    btnAgendar.disabled = true;
    btnAgendar.innerText = 'Agendando...';
    btnAgendar.style.opacity = '0.6';
  }

  const payload = {
    tipo: 'agendamento',
    dataRegistro: new Date().toLocaleString('pt-BR'),
    nome: nomeCliente,
    telefone: telCliente,
    dia: diaSelecionado,
    horario: horarioSelecionado,
    status: 'Pendente'
  };

  let listaAgendamentos = JSON.parse(localStorage.getItem('veronica_agendamentos') || '[]');
  listaAgendamentos.unshift(payload);
  localStorage.setItem('veronica_agendamentos', JSON.stringify(listaAgendamentos));
  carregarAgenda();

  fetch(URL_SCRIPT, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  })
  .then(() => {
    console.log('Agendamento salvo na planilha!');
  })
  .catch(err => console.error(err))
  .finally(() => {
    if (btnAgendar) {
      btnAgendar.disabled = false;
      btnAgendar.innerText = 'Agendar Horário';
      btnAgendar.style.opacity = '1';
    }
  });

  var dataFormatadaBr = diaSelecionado.split('-').reverse().join('/');
  var textoZap = `Olá Verônica! Gostaria de agendar Manicure Pé e Mão.\n\n👤 Nome: ${nomeCliente}\n📞 Telefone: ${telCliente}\n📅 Data: ${dataFormatadaBr}\n⏰ Horário: ${horarioSelecionado}`;
  var urlZap = `https://wa.me/5531991946163?text=` + encodeURIComponent(textoZap);
  
  document.getElementById('input-nome-cliente').value = '';
  document.getElementById('input-tel-cliente').value = '';
  window.open(urlZap, '_blank');
}

// FIX DE SALVAMENTO COM TRAVAMENTO DE BOTÃO E MENSAGEM
function salvarAtendimento() {
  const editIndex = parseInt(document.getElementById('edit-index').value);
  const btnSalvar = document.getElementById('btn-salvar');

  const dados = {
    tipo: 'atendimento',
    dataRegistro: new Date().toLocaleString('pt-BR'),
    nome: document.getElementById('input-cliente').value.trim(), 
    data: document.getElementById('input-data').value, 
    retorno: document.getElementById('input-retorno').value,
    valor: document.getElementById('input-valor').value, 
    tempo: document.getElementById('input-tempo').value, 
    niver: document.getElementById('input-niver').value,
    endereco: document.getElementById('input-endereco').value, 
    obs: document.getElementById('input-obs').value,
    pgto: Array.from(document.querySelectorAll('.pgto:checked')).map(cb=>cb.value).join(', ')
  };

  if (!dados.nome || !dados.valor || !dados.data) {
    alert("Por favor, preencha pelo menos o Nome do Cliente, a Data e o Valor.");
    return; 
  }

  // Trava o botão para evitar múltiplos disparos no Google Sheets
  if (btnSalvar) {
    btnSalvar.disabled = true;
    btnSalvar.innerText = 'Salvando na Nuvem, aguarde...';
    btnSalvar.style.opacity = '0.6';
  }
  
  let listaAtendimentos = JSON.parse(localStorage.getItem('veronica_atendimentos') || '[]');
  if (editIndex >= 0) { 
    listaAtendimentos[editIndex] = dados; 
  } else { 
    listaAtendimentos.unshift(dados); 
  }
  localStorage.setItem('veronica_atendimentos', JSON.stringify(listaAtendimentos));
  carregarPlanilha();

  fetch(URL_SCRIPT, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(dados)
  })
  .then(() => { 
    limparForm(); 
  })
  .catch(err => console.error('Erro ao integrar com Google Sheets:', err))
  .finally(() => {
    // Reativa o botão
    if (btnSalvar) {
      btnSalvar.disabled = false;
      btnSalvar.innerText = 'Salvar Cliente / Atendimento';
      btnSalvar.style.opacity = '1';
    }
  });
}

function excluirAgenda(index) {
  let listaAgendamentos = JSON.parse(localStorage.getItem('veronica_agendamentos') || '[]');
  let itemRemovido = listaAgendamentos.splice(index, 1)[0];
  localStorage.setItem('veronica_agendamentos', JSON.stringify(listaAgendamentos));
  
  fetch(URL_SCRIPT, { 
    method: 'POST', 
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
    body: JSON.stringify({ tipo: 'excluir_agendamento', dados: itemRemovido }) 
  });
  
  carregarAgenda();
}

function excluir(index){ 
  let listaAtendimentos = JSON.parse(localStorage.getItem('veronica_atendimentos') || '[]');
  let itemRemovido = listaAtendimentos.splice(index, 1)[0];
  localStorage.setItem('veronica_atendimentos', JSON.stringify(listaAtendimentos));
  
  fetch(URL_SCRIPT, { 
    method: 'POST', 
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
    body: JSON.stringify({ tipo: 'excluir_atendimento', dados: itemRemovido }) 
  });
  
  carregarPlanilha();
}

function definirMomentoDoDia() {
  var hoje = new Date();
  document.getElementById('txt-data').innerText = hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  var sel = momentosDoAno[obterDiaDoAno(hoje) % momentosDoAno.length];
  document.getElementById('txt-momento').innerText = '"' + sel.frase + '"';
  document.getElementById('autor-momento').innerText = '— ' + sel.autor;
  var inputDataEl = document.getElementById('input-data');
  if(inputDataEl && !inputDataEl.value) { inputDataEl.value = hoje.toISOString().split('T')[0]; atualizarRetornoAutomatico(); }
}

function atualizarRetornoAutomatico() {
  var dataVal = document.getElementById('input-data').value;
  if (!dataVal) return;
  var d = new Date(dataVal + 'T00:00:00');
  d.setDate(d.getDate() + 14);
  document.getElementById('input-retorno').value = d.toISOString().split('T')[0];
}

function solicitarSenha() { document.getElementById('modal-senha').style.display = 'flex'; document.getElementById('input-senha-veronica').focus(); }
function fecharModal(e) { if(e) e.preventDefault(); document.getElementById('modal-senha').style.display = 'none'; document.getElementById('input-senha-veronica').value = ""; }

function validarSenha() {
  if (document.getElementById('input-senha-veronica').value === "1401") {
    fecharModal();
    document.getElementById('conteudo-principal').style.display = 'none';
    document.getElementById('painel-privado').style.display = 'flex';
    setarCabecalhoEspaco(); carregarAgenda(); carregarPlanilha();
  } else { alert("Senha incorreta."); document.getElementById('input-senha-veronica').value = ""; }
}

function sairPainel() { document.getElementById('painel-privado').style.display = 'none'; document.getElementById('conteudo-principal').style.display = 'flex'; }

function setarCabecalhoEspaco(){
  const hoje = new Date();
  document.getElementById('espaco-data').innerText = hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const comem = ["Dia da renovação","Dia do autocuidado","Dia da beleza","Dia da gratidão","Dia da leveza"];
  document.getElementById('espaco-comemora').innerText = "Hoje comemoramos: " + comem[obterDiaDoAno(hoje) % comem.length];
}

function editarAtendimento(index) {
  let item = JSON.parse(localStorage.getItem('veronica_atendimentos') || '[]')[index];
  if(!item) return;
  document.getElementById('edit-index').value = index;
  document.getElementById('input-cliente').value = item.nome || '';
  document.getElementById('input-data').value = item.data || '';
  document.getElementById('input-retorno').value = item.retorno || '';
  document.getElementById('input-valor').value = item.valor || '50,00';
  document.getElementById('input-tempo').value = item.tempo || '';
  document.getElementById('input-niver').value = item.niver || '';
  document.getElementById('input-endereco').value = item.endereco || '';
  document.getElementById('input-obs').value = item.obs || '';
  document.querySelectorAll('.pgto').forEach(cb => { cb.checked = item.pgto ? item.pgto.includes(cb.value) : false; });
  document.getElementById('form-titulo').innerText = "✏️ EDITAR ATENDIMENTO";
  document.getElementById('btn-salvar').innerText = "Atualizar Atendimento";
  document.getElementById('btn-cancelar').style.display = "block";
}

function limparForm() {
  document.getElementById('edit-index').value = "-1";
  document.getElementById('input-cliente').value = '';
  document.getElementById('input-retorno').value = '';
  document.getElementById('input-valor').value = '50,00';
  document.getElementById('input-tempo').value = '';
  document.getElementById('input-niver').value = '';
  document.getElementById('input-endereco').value = '';
  document.getElementById('input-obs').value = '';
  document.querySelectorAll('.pgto').forEach(cb => cb.checked = false);
  document.getElementById('input-data').value = new Date().toISOString().split('T')[0];
  atualizarRetornoAutomatico();
  document.getElementById('form-titulo').innerText = "📝 NOVO ATENDIMENTO";
  document.getElementById('btn-salvar').innerText = "Salvar Cliente / Atendimento";
  document.getElementById('btn-cancelar').style.display = "none";
}

function carregarPlanilha() {
  let listaAtendimentos = JSON.parse(localStorage.getItem('veronica_atendimentos') || '[]');
  var tbody = document.getElementById('tabela-corpo');
  tbody.innerHTML = '';
  
  if(listaAtendimentos.length === 0){ return; }
  
  var totalMesValorCalc = 0, totalAnoValorCalc = 0, qtdeMes = 0;
  var agora = new Date(), mesAtual = agora.getMonth(), anoAtual = agora.getFullYear();

  listaAtendimentos.forEach((r, i) => {
    var valNum = parseFloat(String(r.valor).replace(',', '.')) || 0;
    var dataParts = r.data ? r.data.split('-') : [];
    var anoAtend = dataParts.length === 3 ? parseInt(dataParts[0]) : anoAtual;
    var mesAtend = dataParts.length === 3 ? parseInt(dataParts[1]) - 1 : mesAtual;

    if (anoAtend === anoAtual) { totalAnoValorCalc += valNum; if (mesAtend === mesAtual) { qtdeMes++; totalMesValorCalc += valNum; } }

    var tr = document.createElement('tr');
    tr.innerHTML = `<td>${i+1}</td><td style="text-align:left">${r.nome || ''}</td><td>${r.data ? r.data.split('-').reverse().join('/') : ''}</td><td>${r.retorno ? r.retorno.split('-').reverse().join('/') : ''}</td><td>R$ ${valNum.toFixed(2).replace('.', ',')}</td><td>${r.tempo || ''}</td><td style="text-align:left">${r.obs || ''}</td><td><button class="btn-acao btn-editar" onclick="editarAtendimento(${i})">Editar</button> <button class="btn-acao btn-excluir" onclick="excluir(${i})">Excluir</button></td>`;
    tbody.appendChild(tr);
  });

  document.getElementById('tot-atend-mes').innerText = qtdeMes;
  document.getElementById('tot-valor-mes').innerText = 'R$ ' + totalMesValorCalc.toFixed(2).replace('.', ',');
  document.getElementById('tot-valor-ano').innerText = 'R$ ' + totalAnoValorCalc.toFixed(2).replace('.', ',');
}

window.onload = function() {
  definirMomentoDoDia(); setarCabecalhoEspaco(); preencherDiasUteis(); carregarAgenda(); carregarPlanilha();
};
