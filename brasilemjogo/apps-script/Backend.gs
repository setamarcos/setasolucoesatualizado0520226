/*******************************************************
 * BRASIL EM JOGO — BACKEND v2.2.3 (Google Apps Script)
 * - A planilha é o banco de dados. Nada é apagado.
 * - Só acrescenta colunas/abas operacionais ausentes.
 * - Uma única entrada para o HTML: bjApi(acao, dados).
 * - Mesma API por HTTP (doGet ?action=painel / doPost JSON)
 *   para a versão GitHub Pages (docs/index.html).
 *
 * IMPORTANTE: este deve ser o ÚNICO doGet/doPost do projeto.
 * Apague qualquer outro doGet/doPost (ex.: em Código.gs ou
 * Estrutura.gs). Funções duplicadas = o Apps Script executa
 * a última carregada e o erro aparece "em outra linha".
 *
 * ATENÇÃO: SALVAR NÃO ATUALIZA O LINK /exec.
 * Depois de colar/salvar: Implantar > Gerenciar implantações >
 * lápis (editar) > Versão: Nova versão > Implantar.
 *******************************************************/

const BJ = {
  SPREADSHEET_ID: '1aGKeJdHJbDfcMjwD3iqWj_-7XV_CGf0Xp61j0BhtlRA',
  HTML_FILE: 'Index',
  VERSAO: '2.2.3',
  CACHE_KEY: 'bj_painel_v4',
  CACHE_SEG: 4,
  SHEETS: {
    CONFIG: 'CONFIG',
    PARTICIPANTES: 'PARTICIPANTES',
    CARTAS: 'CARTAS',
    FONTES: 'FONTES',
    DINAMICAS: 'DINAMICAS',
    PARTIDAS: 'PARTIDAS',
    RODADAS: 'RODADAS',
    PONTUACAO: 'PONTUACAO',
    HISTORICO: 'HISTORICO'
  },
  // Colunas exigidas. Só as ausentes são acrescentadas no fim da linha 1.
  HEADERS: {
    PARTICIPANTES: ['participante_id', 'apelido', 'nome', 'telefone', 'criado_em', 'ativo', 'status_presenca', 'ultima_atividade', 'partida_id'],
    PARTIDAS: ['partida_id', 'nome_partida', 'status', 'administrador', 'admin_nome', 'admin_contato', 'criada_em', 'iniciada_em', 'pausada_em', 'encerrada_em', 'rodada_atual', 'tempo_restante_segundos', 'observacoes'],
    RODADAS: ['rodada_id', 'partida_id', 'numero_rodada', 'carta_id', 'participante_respondeu_id', 'status', 'resposta_dada', 'julgamento_aberto_em', 'revelada_em', 'dinamica_id', 'iniciada_em', 'concluida_em', 'tempo_segundos'],
    PONTUACAO: ['pontuacao_id', 'partida_id', 'rodada_id', 'participante_id', 'pontos', 'criterio', 'registrado_em'],
    HISTORICO: ['evento_id', 'partida_id', 'rodada_id', 'tipo_evento', 'descricao', 'autor', 'data_hora', 'dados_json'],
    CARTAS: ['imagem_drive_id', 'imagem_url', 'imagem_descricao', 'imagem_credito', 'ordem_prioridade', 'data_validade']
  },
  // Abas que podem ser criadas automaticamente se faltarem (nunca CARTAS/FONTES).
  OPERACIONAIS: ['PARTICIPANTES', 'PARTIDAS', 'RODADAS', 'PONTUACAO', 'HISTORICO'],
  ATIVAS: ['ABERTA', 'EM_ANDAMENTO', 'PAUSADA']
};

/* ===================== ENTRADAS WEB ===================== */

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action) {
    // Por GET só leitura (painel/ping). Escritas vão por POST.
    const action = String(p.action);
    if (action !== 'painel' && action !== 'ping') return bjJson_({ ok: false, error: 'Use POST para esta ação.' });
    return bjJson_(bjDispatch_(action, p));
  }
  try {
    return HtmlService.createHtmlOutputFromFile(BJ.HTML_FILE)
      .setTitle('Brasil em Jogo')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    return HtmlService.createHtmlOutput(
      '<div style="font-family:sans-serif;padding:24px;max-width:640px">' +
      '<h2>Brasil em Jogo — não foi possível abrir a tela</h2>' +
      '<p><b>Erro:</b> ' + bjEsc_(err && err.message ? err.message : String(err)) + '</p>' +
      '<p>Confira no editor do Apps Script se existe um arquivo HTML chamado exatamente <b>' + BJ.HTML_FILE + '</b> (sem ".html", com I maiúsculo) e se não há outro <code>doGet</code> no projeto.</p>' +
      '</div>'
    ).setTitle('Brasil em Jogo — erro');
  }
}

function doPost(e) {
  let body = {};
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    body = (e && e.parameter) || {};
  }
  return bjJson_(bjDispatch_(String(body.action || ''), body));
}

/** Única função chamada pelo HTML via google.script.run. Retorna STRING JSON (evita erro de Date). */
function bjApi(action, payload) {
  return JSON.stringify(bjDispatch_(String(action || ''), payload || {}));
}

const BJ_PUBLICO = {
  ping: function () { return { versao: BJ.VERSAO, agora: Date.now() }; },
  painel: function (p) { return bjPainel_(p); },
  registrar: function (p) { return bjComLock_(function () { return bjRegistrar_(p.nome, p.telefone, p.partidaId); }); },
  listarPartidas: function () { bjGarantirEstrutura_(); return bjListarPartidas_(); },
  criarMesa: function (p) { bjGarantirEstrutura_(); return bjComLock_(function () { return bjCriarPartida_(p.nome); }); },
  sair: function (p) { return bjComLock_(function () { return bjSair_(p.participanteId); }); },
  voltar: function (p) { return bjComLock_(function () { return bjVoltar_(p.participanteId); }); }
};

const BJ_ADMIN = {
  verificarPin: function () { return { ok: true }; },
  criarPartida: function (p) { return bjCriarPartida_(p.nome); },
  statusPartida: function (p) { return bjStatusPartida_(String(p.status || '')); },
  sortearCarta: function () { return bjSortearCarta_(); },
  definirRespondente: function (p) { return bjDefinirRespondente_(p.participanteId, !!p.aleatorio); },
  sortearDinamica: function () { return bjSortearDinamica_(); },
  reiniciarTempo: function () { return bjReiniciarTempo_(); },
  revelar: function () { return bjRevelar_(); },
  pontuar: function (p) { return bjPontuar_(p.participanteId, p.pontos, p.criterio); },
  concluirRodada: function () { return bjConcluirRodada_(); },
  marcarSaida: function (p) { return bjTirar_(p.participanteId); },
  // v2.1 — novo jogo e gestão da mesa
  novoJogo: function (p) { return bjNovoJogo_(p.nome, p.manterJogadores !== false && p.manterJogadores !== 'false'); },
  limparMesa: function () { return bjLimparMesa_(); },
  adicionarParticipante: function (p) { return bjRegistrar_(p.nome, p.telefone, p.partidaId); },
  registrarAdmin: function (p) {
    const partida = bjPartidaPorId_(BJ_CONTEXT_PARTIDA_ID_) || bjPartidaAtiva_(true);
    if (!partida) throw new Error('Mesa não encontrada.');
    const nome = String(p.nome || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    const contato = bjPhone_(p.telefone);
    if (nome.length < 2) throw new Error('Informe o nome do administrador.');
    if (contato.length < 10 || contato.length > 11) throw new Error('Informe um contato válido com DDD.');
    bjUpdate_('PARTIDAS', partida._row, { admin_nome: nome, admin_contato: contato });
    bjEvento_(String(partida.partida_id), '', 'ADMIN_IDENTIFICADO', nome, 'SISTEMA', {});
    return { nome: nome, contato: contato };
  },
  readmitir: function (p) { return bjVoltar_(p.participanteId); }
};

var BJ_CONTEXT_PARTIDA_ID_ = '';
function bjDispatch_(action, p) {
  try {
    p = p || {};
    BJ_CONTEXT_PARTIDA_ID_ = String(p.partidaId || '');
    if (Object.prototype.hasOwnProperty.call(BJ_PUBLICO, action)) {
      if (action !== 'ping' && action !== 'painel') bjGarantirEstrutura_();
      return { ok: true, data: BJ_PUBLICO[action](p) };
    }
    if (Object.prototype.hasOwnProperty.call(BJ_ADMIN, action)) {
      bjGarantirEstrutura_();
      if (!bjAdminTokenValido_(BJ_CONTEXT_PARTIDA_ID_, p.adminToken)) throw new Error('Somente o criador desta mesa pode administrar a partida.');
      return { ok: true, data: bjComLock_(function () { return BJ_ADMIN[action](p); }) };
    }
    return { ok: false, error: 'Ação não reconhecida: ' + action };
  } catch (err) {
    return { ok: false, error: err && err.message ? err.message : String(err) };
  }
}

function bjHashAdminToken_(token) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(token || ''), Utilities.Charset.UTF_8);
  return bytes.map(function (b) { const v = (b + 256) % 256; return ('0' + v.toString(16)).slice(-2); }).join('');
}
function bjAdminTokenValido_(partidaId, token) {
  if (!partidaId || !token) return false;
  const partida = bjPartidaPorId_(String(partidaId));
  if (!partida) return false;
  const salvo = String(partida.administrador || '');
  return !!salvo && salvo === bjHashAdminToken_(token);
}

/* ===================== PARTICIPANTES ===================== */

function bjRegistrar_(nome, telefone, partidaId) {
  nome = String(nome || '').replace(/\s+/g, ' ').trim();
  const phone = bjPhone_(telefone);
  if (nome.length < 2) throw new Error('Informe um nome com pelo menos 2 letras.');
  if (nome.length > 60) nome = nome.slice(0, 60);
  if (phone.length < 10 || phone.length > 11) throw new Error('Informe o telefone com DDD (10 ou 11 números).');
  const pid = String(partidaId || BJ_CONTEXT_PARTIDA_ID_ || '');
  if (!pid || !bjPartidaPorId_(pid)) throw new Error('Escolha uma mesa antes de entrar.');
  const cfg = bjConfig_();
  const rows = bjTable_('PARTICIPANTES').rows.filter(function (r) { return String(r.partida_id || '') === pid; });
  const jogando = rows.filter(function (r) { return bjUp_(r.status_presenca) === 'JOGANDO'; }).length;
  const existente = bjTable_('PARTICIPANTES').rows.filter(function (r) { return bjPhone_(r.telefone) === phone && String(r.partida_id || '') === pid; }).pop();

  if (existente) {
    const id = String(existente.participante_id);
    if (bjUp_(existente.status_presenca) !== 'JOGANDO' && jogando >= cfg.max) throw new Error('Limite de ' + cfg.max + ' jogadores atingido.');
    bjUpdate_('PARTICIPANTES', existente._row, { nome: nome, status_presenca: 'JOGANDO', ativo: 'SIM', ultima_atividade: new Date(), partida_id: pid });
    bjEvento_(pid, '', 'REENTRADA_JOGADOR', nome + ' voltou ao jogo.', 'SISTEMA', { participante_id: id });
    return { participante_id: id, nome: nome, status_presenca: 'JOGANDO', reentrada: true };
  }

  if (jogando >= cfg.max) throw new Error('Limite de ' + cfg.max + ' jogadores atingido.');
  const id = bjId_('P');
  bjAppend_('PARTICIPANTES', {
    participante_id: id,
    apelido: nome,
    nome: nome,
    telefone: "'" + phone, // texto: preserva o número
    criado_em: new Date(),
    ativo: 'SIM',
    status_presenca: 'JOGANDO',
    ultima_atividade: new Date(),
    partida_id: pid
  });
  bjEvento_(pid, '', 'ENTRADA_JOGADOR', nome + ' entrou no jogo.', 'SISTEMA', { participante_id: id });
  return { participante_id: id, nome: nome, status_presenca: 'JOGANDO', reentrada: false };
}

function bjSair_(participanteId) {
  const p = bjParticipante_(participanteId);
  bjUpdate_('PARTICIPANTES', p._row, { status_presenca: 'SAIU', ultima_atividade: new Date() });
  bjEvento_(String(p.partida_id || ''), '', 'SAIDA_JOGADOR', bjNome_(p) + ' saiu.', 'SISTEMA', { participante_id: String(p.participante_id) });
  return { ok: true };
}

function bjVoltar_(participanteId) {
  const p = bjParticipante_(participanteId);
  if (bjUp_(p.status_presenca) === 'JOGANDO') return { ok: true, nome: bjNome_(p) };
  const pid = String(p.partida_id || BJ_CONTEXT_PARTIDA_ID_ || '');
  const cfg = bjConfig_();
  const jogando = bjTable_('PARTICIPANTES').rows.filter(function (r) { return String(r.partida_id || '') === pid && bjUp_(r.status_presenca) === 'JOGANDO'; }).length;
  if (jogando >= cfg.max) throw new Error('Limite de ' + cfg.max + ' jogadores atingido.');
  bjUpdate_('PARTICIPANTES', p._row, { status_presenca: 'JOGANDO', ultima_atividade: new Date() });
  bjEvento_(pid, '', 'REENTRADA_JOGADOR', bjNome_(p) + ' voltou.', 'SISTEMA', { participante_id: String(p.participante_id) });
  return { ok: true, nome: bjNome_(p) };
}

function bjParticipante_(participanteId) {
  const id = String(participanteId || '').trim();
  if (!id) throw new Error('Participante não informado.');
  const p = bjTable_('PARTICIPANTES').rows.filter(function (r) { return String(r.participante_id) === id; }).pop();
  if (!p) throw new Error('Participante não encontrado. Faça o cadastro novamente.');
  if (BJ_CONTEXT_PARTIDA_ID_ && String(p.partida_id || '') !== BJ_CONTEXT_PARTIDA_ID_) throw new Error('Este participante não pertence à mesa selecionada.');
  return p;
}

/* ===================== MESA: NOVO JOGO / LIMPAR / TIRAR ===================== */

/** Encerra a partida ativa (se houver) e cria outra. manter=false tira todos da mesa. */
function bjNovoJogo_(nome, manter) {
  const ativa = bjPartidaAtiva_(false);
  const anteriorId = ativa ? String(ativa.partida_id) : '';
  const presentesAntes = anteriorId ? bjTable_('PARTICIPANTES').rows.filter(function(p){return String(p.partida_id||'')===anteriorId && bjUp_(p.status_presenca)==='JOGANDO';}) : [];
  if (ativa && BJ.ATIVAS.indexOf(bjUp_(ativa.status)) >= 0) bjStatusPartida_('ENCERRADA');
  if (!manter) bjLimparMesa_();
  const r = bjCriarPartida_(nome);
  const jogadoresMigrados = [];
  if (manter && anteriorId) {
    presentesAntes.forEach(function(p){
      const novoId=bjId_('P');
      bjAppend_('PARTICIPANTES',{participante_id:novoId,apelido:p.apelido||bjNome_(p),nome:p.nome||bjNome_(p),telefone:"'"+bjPhone_(p.telefone),criado_em:new Date(),ativo:'SIM',status_presenca:'JOGANDO',ultima_atividade:new Date(),partida_id:r.partida_id});
      jogadoresMigrados.push({anterior:String(p.participante_id),novo:novoId,nome:bjNome_(p)});
    });
  }
  bjEvento_(r.partida_id, '', 'NOVO_JOGO', manter ? 'Mesmos jogadores' : 'Mesa limpa', 'MESA', { anterior: anteriorId });
  r.jogadoresMigrados = jogadoresMigrados;
  return r;
}

/** Marca todos os presentes como SAIU. Não apaga ninguém da planilha. */
function bjLimparMesa_() {
  const agora = new Date();
  const pidAtual = String(BJ_CONTEXT_PARTIDA_ID_ || (bjPartidaAtiva_(false) || {}).partida_id || '');
  const presentes = bjTable_('PARTICIPANTES').rows.filter(function (r) { return String(r.partida_id || '') === pidAtual && bjUp_(r.status_presenca) === 'JOGANDO'; });
  presentes.forEach(function (r) { bjUpdate_('PARTICIPANTES', r._row, { status_presenca: 'SAIU', ultima_atividade: agora }); });
  const partida = bjPartidaAtiva_(false);
  if (partida) {
    const rodada = bjRodadaAberta_(String(partida.partida_id));
    if (rodada && rodada.participante_respondeu_id) bjUpdate_('RODADAS', rodada._row, { participante_respondeu_id: '' });
  }
  bjEvento_(partida ? String(partida.partida_id) : '', '', 'MESA_LIMPA', presentes.length + ' jogador(es) retirados.', 'MESA', {});
  return { retirados: presentes.length };
}

/** Mesa tira um jogador. Se ele era quem respondia, passa a vez para outro. */
function bjTirar_(participanteId) {
  const r = bjSair_(participanteId);
  const partida = bjPartidaAtiva_(false);
  if (partida) {
    const pid = String(partida.partida_id);
    const rodada = bjRodadaAberta_(pid);
    if (rodada && String(rodada.participante_respondeu_id) === String(participanteId)) {
      const novo = bjEscolherRespondente_(pid, participanteId);
      bjUpdate_('RODADAS', rodada._row, { participante_respondeu_id: novo ? novo.id : '' });
    }
  }
  return r;
}

/* ===================== PARTIDA ===================== */


function bjListarPartidas_() {
  const parts = bjTable_('PARTICIPANTES').rows;
  return bjTable_('PARTIDAS').rows.filter(function(r){return !!r.partida_id;}).map(function(r,i){
    const pid=String(r.partida_id), grupo=parts.filter(function(p){return String(p.partida_id||'')===pid;});
    return {id:pid,nome:String(r.nome_partida||'Brasil em Jogo'),status:bjUp_(r.status),numero:i+1,adminNome:String(r.admin_nome||''),adminContato:String(r.admin_contato||''),criadaMs:bjMs_(r.criada_em),iniciadaMs:bjMs_(r.iniciada_em),presentes:grupo.filter(function(p){return bjUp_(p.status_presenca)==='JOGANDO';}).length,max:bjConfig_().max,min:bjConfig_().min};
  }).sort(function(a,b){return b.criadaMs-a.criadaMs;});
}
function bjMigrarParticipantesSemMesa_(){
  const parts=bjTable_('PARTICIPANTES').rows;
  const sem=parts.filter(function(r){return !String(r.partida_id||'');});
  if(!sem.length) return;
  const partidas=bjTable_('PARTIDAS').rows.filter(function(r){return !!r.partida_id;});
  if(!partidas.length) return;
  const ativa=partidas.filter(function(r){return BJ.ATIVAS.indexOf(bjUp_(r.status))>=0;});
  const destino=ativa.length?ativa[ativa.length-1]:partidas[partidas.length-1];
  sem.forEach(function(r){bjUpdate_('PARTICIPANTES',r._row,{partida_id:String(destino.partida_id)});});
}

function bjPartidaPorId_(id) {
  if (!id) return null;
  return bjTable_('PARTIDAS').rows.filter(function (r) { return String(r.partida_id) === String(id); }).pop() || null;
}
function bjPartidaAtiva_(obrigatoria) {
  const rows = bjTable_('PARTIDAS').rows.filter(function (r) { return r.partida_id !== '' && r.partida_id !== null; });
  if (BJ_CONTEXT_PARTIDA_ID_) {
    const selected = bjPartidaPorId_(BJ_CONTEXT_PARTIDA_ID_);
    if (selected && BJ.ATIVAS.indexOf(bjUp_(selected.status)) >= 0) return selected;
    if (selected && !obrigatoria) return selected;
    if (obrigatoria) throw new Error('A mesa selecionada não está aberta. Escolha outra mesa.');
    return selected;
  }
  for (let i = rows.length - 1; i >= 0; i--) if (BJ.ATIVAS.indexOf(bjUp_(rows[i].status)) >= 0) return rows[i];
  if (obrigatoria) throw new Error('Nenhuma partida selecionada. Escolha ou crie uma mesa.');
  return rows.length ? rows[rows.length - 1] : null;
}
function bjCriarPartida_(nome) {
  const cfg = bjConfig_();
  const id = bjId_('J');
  const adminToken = Utilities.getUuid() + Utilities.getUuid();
  nome = String(nome || '').trim() || 'Brasil em Jogo';
  bjAppend_('PARTIDAS', {
    partida_id: id, nome_partida: nome, status: 'ABERTA', administrador: bjHashAdminToken_(adminToken),
    criada_em: new Date(), iniciada_em: '', pausada_em: '', encerrada_em: '',
    rodada_atual: 0, tempo_restante_segundos: cfg.tempo, observacoes: ''
  });
  bjEvento_(id, '', 'PARTIDA_CRIADA', nome, 'MESA', {});
  bjTable_('PARTICIPANTES').rows.filter(function(r){return !String(r.partida_id||'');}).forEach(function(r){bjUpdate_('PARTICIPANTES',r._row,{partida_id:id});});
  return { partida_id: id, nome_partida: nome, status: 'ABERTA', admin_token: adminToken };
}

function bjStatusPartida_(novo) {
  const partida = bjPartidaAtiva_(true);
  const atual = bjUp_(partida.status);
  const pid = String(partida.partida_id);
  const rodada = bjRodadaAberta_(pid);
  const agora = new Date();

  if (novo === 'EM_ANDAMENTO') {
    if (atual === 'EM_ANDAMENTO') throw new Error('A partida já está em andamento.');
    if (atual === 'ABERTA') {
      const cfg = bjConfig_();
      const jogando = bjTable_('PARTICIPANTES').rows.filter(function (r) { return String(r.partida_id || '') === pid && bjUp_(r.status_presenca) === 'JOGANDO'; }).length;
      if (jogando < cfg.min) throw new Error('São necessários pelo menos ' + cfg.min + ' jogadores presentes (agora: ' + jogando + ').');
      bjUpdate_('PARTIDAS', partida._row, { status: 'EM_ANDAMENTO', iniciada_em: agora });
    } else { // PAUSADA -> retoma o cronômetro de onde parou
      if (rodada && bjUp_(rodada.status) === 'ABERTA') {
        const tempo = bjNum_(rodada.tempo_segundos, bjConfig_().tempo);
        const restante = Math.max(0, bjNum_(partida.tempo_restante_segundos, tempo));
        bjUpdate_('RODADAS', rodada._row, { iniciada_em: new Date(agora.getTime() - (tempo - restante) * 1000) });
      }
      bjUpdate_('PARTIDAS', partida._row, { status: 'EM_ANDAMENTO' });
    }
  } else if (novo === 'PAUSADA') {
    if (atual !== 'EM_ANDAMENTO') throw new Error('Só é possível pausar uma partida em andamento.');
    const restante = rodada ? bjRestante_(rodada, agora.getTime()) : bjConfig_().tempo;
    bjUpdate_('PARTIDAS', partida._row, { status: 'PAUSADA', pausada_em: agora, tempo_restante_segundos: restante });
  } else if (novo === 'ENCERRADA') {
    if (rodada) bjUpdate_('RODADAS', rodada._row, { status: 'CONCLUIDA', concluida_em: agora });
    bjUpdate_('PARTIDAS', partida._row, { status: 'ENCERRADA', encerrada_em: agora });
  } else {
    throw new Error('Status inválido.');
  }
  bjEvento_(pid, '', 'STATUS_PARTIDA', novo, 'MESA', {});
  return { ok: true, status: novo };
}

/* ===================== RODADAS ===================== */

function bjRodadasDa_(pid) {
  return bjTable_('RODADAS').rows.filter(function (r) { return String(r.partida_id) === pid; });
}

function bjRodadaAberta_(pid) {
  const rs = bjRodadasDa_(pid).filter(function (r) { return bjUp_(r.status) !== 'CONCLUIDA'; });
  return rs.length ? rs[rs.length - 1] : null;
}

function bjRodadaAtualObrigatoria_() {
  const partida = bjPartidaAtiva_(true);
  const r = bjRodadaAberta_(String(partida.partida_id));
  if (!r) throw new Error('Nenhuma rodada aberta. Sorteie uma carta.');
  return { partida: partida, rodada: r };
}

function bjSortearCarta_() {
  const partida = bjPartidaAtiva_(true);
  if (bjUp_(partida.status) !== 'EM_ANDAMENTO') throw new Error('Inicie (ou retome) a partida antes de sortear.');
  const pid = String(partida.partida_id);
  const agora = new Date();
  const rodadas = bjRodadasDa_(pid);
  rodadas.filter(function (r) { return bjUp_(r.status) !== 'CONCLUIDA'; }).forEach(function (r) {
    bjUpdate_('RODADAS', r._row, { status: 'CONCLUIDA', concluida_em: agora });
  });
  const usadas = {};
  rodadas.forEach(function (r) { usadas[String(r.carta_id)] = true; });
  const disponiveis = bjCartasAtivas_().filter(function (c) { return !usadas[c.carta_id]; });
  if (!disponiveis.length) throw new Error('Todas as cartas ativas já saíram nesta partida. Encerre a partida.');
  const carta = disponiveis[Math.floor(Math.random() * disponiveis.length)];
  const resp = bjEscolherRespondente_(pid, '');
  const cfg = bjConfig_();
  const numero = rodadas.length + 1;
  const id = bjId_('R');
  bjAppend_('RODADAS', {
    rodada_id: id, partida_id: pid, numero_rodada: numero, carta_id: carta.carta_id,
    participante_respondeu_id: resp ? resp.id : '', status: 'ABERTA', resposta_dada: '',
    julgamento_aberto_em: '', revelada_em: '', dinamica_id: '',
    iniciada_em: agora, concluida_em: '', tempo_segundos: cfg.tempo
  });
  bjUpdate_('PARTIDAS', partida._row, { rodada_atual: numero, tempo_restante_segundos: cfg.tempo });
  bjEvento_(pid, id, 'CARTA_SORTEADA', carta.titulo, 'MESA', { carta_id: carta.carta_id, respondente: resp ? resp.id : '' });
  return { rodada_id: id, numero_rodada: numero, titulo: carta.titulo, respondente: resp ? resp.nome : '' };
}

/** Escolhe quem respondeu menos vezes na partida (empate = sorteio). */
function bjEscolherRespondente_(pid, excluirId) {
  const ativos = bjTable_('PARTICIPANTES').rows.filter(function (r) { return String(r.partida_id || '') === String(pid) && bjUp_(r.status_presenca) === 'JOGANDO'; });
  if (!ativos.length) return null;
  const contagem = {};
  bjRodadasDa_(pid).forEach(function (r) {
    const k = String(r.participante_respondeu_id || '');
    if (k) contagem[k] = (contagem[k] || 0) + 1;
  });
  let pool = ativos.filter(function (r) { return String(r.participante_id) !== String(excluirId || ''); });
  if (!pool.length) pool = ativos;
  const min = Math.min.apply(null, pool.map(function (r) { return contagem[String(r.participante_id)] || 0; }));
  pool = pool.filter(function (r) { return (contagem[String(r.participante_id)] || 0) === min; });
  const p = pool[Math.floor(Math.random() * pool.length)];
  return { id: String(p.participante_id), nome: bjNome_(p) };
}

function bjDefinirRespondente_(participanteId, aleatorio) {
  const ctx = bjRodadaAtualObrigatoria_();
  let alvo;
  if (aleatorio) {
    alvo = bjEscolherRespondente_(String(ctx.partida.partida_id), ctx.rodada.participante_respondeu_id);
    if (!alvo) throw new Error('Não há jogadores presentes.');
  } else {
    const p = bjParticipante_(participanteId);
    alvo = { id: String(p.participante_id), nome: bjNome_(p) };
  }
  bjUpdate_('RODADAS', ctx.rodada._row, { participante_respondeu_id: alvo.id });
  bjEvento_(String(ctx.partida.partida_id), String(ctx.rodada.rodada_id), 'RESPONDENTE', alvo.nome, 'MESA', { participante_id: alvo.id });
  return alvo;
}

function bjSortearDinamica_() {
  const ctx = bjRodadaAtualObrigatoria_();
  const atual = String(ctx.rodada.dinamica_id || '');
  let lista = bjDinamicas_().filter(function (d) { return d.ativa; });
  if (!lista.length) throw new Error('Nenhuma dinâmica ativa na aba DINAMICAS.');
  if (lista.length > 1) lista = lista.filter(function (d) { return d.id !== atual; });
  const d = lista[Math.floor(Math.random() * lista.length)];
  const tempo = d.tempo || bjConfig_().tempo;
  bjUpdate_('RODADAS', ctx.rodada._row, { dinamica_id: d.id, tempo_segundos: tempo, iniciada_em: new Date() });
  bjUpdate_('PARTIDAS', ctx.partida._row, { tempo_restante_segundos: tempo });
  bjEvento_(String(ctx.partida.partida_id), String(ctx.rodada.rodada_id), 'DINAMICA', d.nome, 'MESA', { dinamica_id: d.id });
  return d;
}

function bjReiniciarTempo_() {
  const ctx = bjRodadaAtualObrigatoria_();
  const tempo = bjNum_(ctx.rodada.tempo_segundos, bjConfig_().tempo);
  bjUpdate_('RODADAS', ctx.rodada._row, { iniciada_em: new Date() });
  bjUpdate_('PARTIDAS', ctx.partida._row, { tempo_restante_segundos: tempo });
  return { ok: true, tempo: tempo };
}

function bjRevelar_() {
  const ctx = bjRodadaAtualObrigatoria_();
  const agora = new Date();
  bjUpdate_('RODADAS', ctx.rodada._row, { status: 'REVELADA', revelada_em: agora, julgamento_aberto_em: agora });
  bjEvento_(String(ctx.partida.partida_id), String(ctx.rodada.rodada_id), 'RESPOSTA_REVELADA', '', 'MESA', {});
  return { ok: true };
}

function bjConcluirRodada_() {
  const ctx = bjRodadaAtualObrigatoria_();
  bjUpdate_('RODADAS', ctx.rodada._row, { status: 'CONCLUIDA', concluida_em: new Date() });
  return { ok: true };
}

/** Pontos 0–3 por jogador na rodada atual. Repetir sobrescreve (não soma em dobro). */
function bjPontuar_(participanteId, pontos, criterio) {
  const n = Number(pontos);
  if (!(n >= 0 && n <= 3 && Math.floor(n) === n)) throw new Error('Pontuação deve ser 0, 1, 2 ou 3.');
  const partida = bjPartidaAtiva_(true);
  const pid = String(partida.partida_id);
  const rodadas = bjRodadasDa_(pid);
  const rodada = bjRodadaAberta_(pid) || rodadas[rodadas.length - 1];
  if (!rodada) throw new Error('Sorteie uma carta antes de pontuar.');
  const p = bjParticipante_(participanteId);
  const jid = String(p.participante_id);
  const rid = String(rodada.rodada_id);
  const existente = bjTable_('PONTUACAO').rows.filter(function (r) {
    return String(r.rodada_id) === rid && String(r.participante_id) === jid;
  }).pop();
  const crit = String(criterio || '').slice(0, 120);
  if (existente) {
    bjUpdate_('PONTUACAO', existente._row, { pontos: n, criterio: crit, registrado_em: new Date() });
  } else {
    bjAppend_('PONTUACAO', { pontuacao_id: bjId_('S'), partida_id: pid, rodada_id: rid, participante_id: jid, pontos: n, criterio: crit, registrado_em: new Date() });
  }
  bjEvento_(pid, rid, 'PONTUACAO', bjNome_(p) + ': ' + n, 'MESA', { participante_id: jid, pontos: n });
  return { participante_id: jid, nome: bjNome_(p), pontos: n };
}

/* ===================== PAINEL ===================== */

function bjPainel_(p) {
  const full = JSON.parse(JSON.stringify(bjMontarPainel_()));
  const pin = full._pin;
  delete full._pin;
  const admin = !!(p && bjAdminTokenValido_(full.partida && full.partida.id, p.adminToken));
  full.admin = admin;
  if (!admin) delete full.fora;
  full.serverNow = Date.now();
  if (full.rodada && full.rodada.status === 'ABERTA' && full.rodada.carta) {
    delete full.rodada.carta.resposta_correta;
    delete full.rodada.carta.explicacao;
    full.rodada.carta.fontes = [];
  }
  return full;
}

function bjMontarPainel_() {
  const cfg = bjConfig_();
  const parts = bjTable_('PARTICIPANTES').rows;
  const partidas = bjTable_('PARTIDAS').rows.filter(function (r) { return r.partida_id !== '' && r.partida_id !== null; });
  const partida = (BJ_CONTEXT_PARTIDA_ID_ ? bjPartidaPorId_(BJ_CONTEXT_PARTIDA_ID_) : bjPartidaAtiva_(false)) || (partidas.length ? partidas[partidas.length - 1] : null);
  const pidSelecionado = partida ? String(partida.partida_id) : '';
  const mesaParts = parts.filter(function(r){ return String(r.partida_id || '') === pidSelecionado; });
  const pontos = {};
  let rodada = null, cartasRestantes = null;
  const cartas = bjCartasAtivas_();

  if (partida) {
    const pid = String(partida.partida_id);
    bjTable_('PONTUACAO').rows.forEach(function (r) {
      if (String(r.partida_id) !== pid) return;
      const k = String(r.participante_id);
      pontos[k] = (pontos[k] || 0) + bjNum_(r.pontos, 0);
    });
    const rodadas = bjRodadasDa_(pid);
    const usadas = {};
    rodadas.forEach(function (r) { usadas[String(r.carta_id)] = true; });
    cartasRestantes = cartas.filter(function (c) { return !usadas[c.carta_id]; }).length;
    const ult = rodadas[rodadas.length - 1];
    if (ult) rodada = bjRodadaView_(ult, partida, cfg, parts, cartas);
  }

  const jogadores = mesaParts
    .filter(function (r) { return r.participante_id !== '' && (bjUp_(r.status_presenca) === 'JOGANDO' || pontos[String(r.participante_id)] !== undefined); })
    .map(function (r) {
      const id = String(r.participante_id);
      return { id: id, nome: bjNome_(r), status: bjUp_(r.status_presenca) || 'SAIU', pontos: pontos[id] || 0 };
    })
    .sort(function (a, b) { return b.pontos - a.pontos || a.nome.localeCompare(b.nome, 'pt-BR'); });

  return {
    versao: BJ.VERSAO,
    _pin: '',
    config: { tempo: cfg.tempo, min: cfg.min, max: cfg.max, pinRequired: false },
    mesas: bjListarPartidas_(),
    partida: partida ? {
      id: String(partida.partida_id),
      nome: String(partida.nome_partida || 'Partida'),
      adminNome: String(partida.admin_nome || ''),
      adminContato: String(partida.admin_contato || ''),
      numero: partidas.findIndex(function (r) { return String(r.partida_id) === String(partida.partida_id); }) + 1,
      status: bjUp_(partida.status),
      criadaMs: bjMs_(partida.criada_em),
      iniciadaMs: bjMs_(partida.iniciada_em),
      rodadaAtual: bjNum_(partida.rodada_atual, 0),
      tempoRestante: bjNum_(partida.tempo_restante_segundos, cfg.tempo)
    } : null,
    jogadores: jogadores,
    // v2.1 — quem saiu nas últimas 12 h (só a Mesa recebe), para o botão "Voltar"
    fora: mesaParts
      .filter(function (r) { return r.participante_id !== '' && bjUp_(r.status_presenca) !== 'JOGANDO' && (Date.now() - bjMs_(r.ultima_atividade)) < 12 * 3600 * 1000; })
      .map(function (r) { const id = String(r.participante_id); return { id: id, nome: bjNome_(r), pontos: pontos[id] || 0 }; })
      .slice(-30),
    totalJogando: jogadores.filter(function (j) { return j.status === 'JOGANDO'; }).length,
    rodada: rodada,
    cartasRestantes: cartasRestantes,
    totalCartas: cartas.length
  };
}

function bjRodadaView_(r, partida, cfg, parts, cartas) {
  const carta = cartas.filter(function (c) { return c.carta_id === String(r.carta_id); })[0] || null;
  const rid = String(r.rodada_id);
  const respId = String(r.participante_respondeu_id || '');
  const resp = respId ? parts.filter(function (p) { return String(p.participante_id) === respId; })[0] : null;
  const din = r.dinamica_id ? bjDinamicas_().filter(function (d) { return d.id === String(r.dinamica_id); })[0] : null;
  const pontosRodada = {};
  bjTable_('PONTUACAO').rows.forEach(function (s) {
    if (String(s.rodada_id) === rid) pontosRodada[String(s.participante_id)] = bjNum_(s.pontos, 0);
  });
  let fontes = [];
  if (carta) {
    const ids = [carta.fonte_principal_id, carta.fonte_complementar_id].filter(Boolean);
    fontes = bjFontes_().filter(function (f) { return ids.indexOf(f.id) >= 0; });
  }
  return {
    id: rid,
    numero: bjNum_(r.numero_rodada, 0),
    status: bjUp_(r.status) || 'ABERTA',
    tempo: bjNum_(r.tempo_segundos, cfg.tempo),
    iniciadaMs: bjMs_(r.iniciada_em),
    carta: carta ? {
      id: carta.carta_id, categoria: carta.categoria, titulo: carta.titulo, pergunta: carta.pergunta,
      tipo: carta.tipo_afirmacao, dificuldade: carta.dificuldade,
      resposta_correta: carta.resposta_correta, explicacao: carta.explicacao,
      imagem: carta.imagem, imagem_descricao: carta.imagem_descricao, fontes: fontes
    } : null,
    respondente: resp ? { id: respId, nome: bjNome_(resp) } : null,
    dinamica: din || null,
    pontos: pontosRodada
  };
}

/* ===================== LEITURAS DE CONTEÚDO ===================== */

function bjCartasAtivas_() {
  return bjTable_('CARTAS').rows
    .filter(function (c) { return c.carta_id !== '' && bjUp_(c.ativa) === 'SIM'; })
    .map(function (c) {
      const driveId = String(c.imagem_drive_id || '').trim();
      return {
        carta_id: String(c.carta_id).trim(),
        categoria: String(c.categoria || ''),
        titulo: String(c.titulo || ''),
        pergunta: String(c.pergunta || ''),
        resposta_correta: String(c.resposta_correta || ''),
        explicacao: String(c.explicacao || ''),
        tipo_afirmacao: String(c.tipo_afirmacao || ''),
        dificuldade: String(c.dificuldade || ''),
        fonte_principal_id: String(c.fonte_principal_id || '').trim(),
        fonte_complementar_id: String(c.fonte_complementar_id || '').trim(),
        imagem: String(c.imagem_url || '').trim() || (driveId ? 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(driveId) + '&sz=w480' : ''),
        imagem_descricao: String(c.imagem_descricao || '')
      };
    });
}

/** FONTES por posição: A=id, B=instituição, C=título, D=URL. */
function bjFontes_() {
  return bjTable_('FONTES').rows.map(function (r) {
    return { id: String(r._v[0] || '').trim(), instituicao: String(r._v[1] || ''), titulo: String(r._v[2] || ''), url: String(r._v[3] || '') };
  }).filter(function (f) { return f.id; });
}

/** DINAMICAS por posição: A=id, B=nome, C=descrição, D=nível, E=tempo(s), F=ativa. */
function bjDinamicas_() {
  return bjTable_('DINAMICAS').rows.map(function (r) {
    return {
      id: String(r._v[0] || '').trim(), nome: String(r._v[1] || ''), descricao: String(r._v[2] || ''),
      nivel: String(r._v[3] || ''), tempo: bjNum_(r._v[4], 0), ativa: bjUp_(r._v[5]) !== 'NAO' && bjUp_(r._v[5]) !== 'NÃO'
    };
  }).filter(function (d) { return d.id; });
}

/** CONFIG: coluna A = chave, coluna B = valor. */
function bjConfig_() {
  if (BJ_MEMO_.__cfg) return BJ_MEMO_.__cfg;
  const sh = bjSS_().getSheetByName(BJ.SHEETS.CONFIG);
  const map = {};
  if (sh && sh.getLastRow() > 0) {
    sh.getRange(1, 1, sh.getLastRow(), 2).getDisplayValues().forEach(function (r) {
      const k = String(r[0] || '').replace(/^\uFEFF/, '').trim().toUpperCase();
      if (k) map[k] = String(r[1] || '').trim();
    });
  }
  return BJ_MEMO_.__cfg = {
    max: bjNum_(map.MAX_JOGADORES, 12),
    min: 2,
    tempo: bjNum_(map.TEMPO_PADRAO_RODADA, 180),
    pin: map.ADMIN_PIN || ''
  };
}

function bjPinValido_(pin) {
  const cfg = bjConfig_();
  return !cfg.pin || String(pin || '').trim() === cfg.pin;
}

/* ===================== ACESSO À PLANILHA ===================== */

let BJ_SS_ = null;
let BJ_MEMO_ = {};

function bjSS_() {
  if (!BJ_SS_) BJ_SS_ = SpreadsheetApp.openById(BJ.SPREADSHEET_ID);
  return BJ_SS_;
}

function bjSheet_(key) {
  const sh = bjSS_().getSheetByName(BJ.SHEETS[key]);
  if (!sh) throw new Error('Aba ausente na planilha: ' + BJ.SHEETS[key]);
  return sh;
}

/** Lê a aba inteira uma vez por execução. Linhas vazias são ignoradas. */
function bjTable_(key) {
  if (BJ_MEMO_[key]) return BJ_MEMO_[key];
  const sh = bjSheet_(key);
  const lastCol = sh.getLastColumn();
  const lastRow = sh.getLastRow();
  const headers = lastCol ? sh.getRange(1, 1, 1, lastCol).getDisplayValues()[0].map(function (h) { return String(h).replace(/^\uFEFF/, '').trim(); }) : [];
  const values = (lastRow > 1 && lastCol) ? sh.getRange(2, 1, lastRow - 1, lastCol).getValues() : [];
  const rows = [];
  values.forEach(function (v, i) {
    if (v.every(function (c) { return c === '' || c === null; })) return;
    const o = { _row: i + 2, _v: v };
    headers.forEach(function (h, j) { if (h && !(h in o)) o[h] = v[j]; });
    rows.push(o);
  });
  BJ_MEMO_[key] = { sh: sh, headers: headers, rows: rows };
  return BJ_MEMO_[key];
}

function bjAppend_(key, obj) {
  const t = bjTable_(key);
  t.sh.appendRow(t.headers.map(function (h) { return obj[h] !== undefined ? obj[h] : ''; }));
  delete BJ_MEMO_[key];
}

function bjUpdate_(key, row, obj) {
  const t = bjTable_(key);
  Object.keys(obj).forEach(function (f) {
    const c = t.headers.indexOf(f);
    if (c < 0) throw new Error('Coluna "' + f + '" ausente na aba ' + BJ.SHEETS[key] + '. Execute inicializarSistemaBrasilEmJogo().');
    t.sh.getRange(row, c + 1).setValue(obj[f]);
  });
  delete BJ_MEMO_[key];
}

/** Garante colunas/abas operacionais (roda 1x por versão; depois é instantâneo). */
function bjGarantirEstrutura_(forcar) {
  const props = PropertiesService.getScriptProperties();
  if (!forcar && props.getProperty('BJ_SCHEMA') === BJ.VERSAO) return;
  const ss = bjSS_();
  Object.keys(BJ.HEADERS).forEach(function (key) {
    let sh = ss.getSheetByName(BJ.SHEETS[key]);
    if (!sh) {
      if (BJ.OPERACIONAIS.indexOf(key) < 0) throw new Error('Aba ausente: ' + BJ.SHEETS[key]);
      sh = ss.insertSheet(BJ.SHEETS[key]);
    }
    const lastCol = sh.getLastColumn();
    const atuais = lastCol ? sh.getRange(1, 1, 1, lastCol).getDisplayValues()[0].map(function (h) { return String(h).trim(); }) : [];
    let col = atuais.length;
    // ignora colunas vazias à direita
    while (col > 0 && !atuais[col - 1]) col--;
    BJ.HEADERS[key].forEach(function (h) {
      if (atuais.indexOf(h) === -1) {
        col++;
        sh.getRange(1, col).setValue(h);
        atuais[col - 1] = h;
      }
    });
    delete BJ_MEMO_[key];
  });
  // telefone sempre como texto
  const part = ss.getSheetByName(BJ.SHEETS.PARTICIPANTES);
  const ph = part.getRange(1, 1, 1, part.getLastColumn()).getDisplayValues()[0].indexOf('telefone');
  if (ph >= 0 && part.getMaxRows() > 1) part.getRange(2, ph + 1, part.getMaxRows() - 1, 1).setNumberFormat('@');
  props.setProperty('BJ_SCHEMA', BJ.VERSAO);
  bjMigrarParticipantesSemMesa_();
}

function bjComLock_(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new Error('Muitas ações ao mesmo tempo. Tente de novo.');
  try {
    BJ_MEMO_ = {}; // lê dados frescos dentro do lock
    const r = fn();
    SpreadsheetApp.flush();
    return r;
  } finally {
    try { CacheService.getScriptCache().remove(BJ.CACHE_KEY); } catch (e) { }
    lock.releaseLock();
  }
}

function bjEvento_(partidaId, rodadaId, tipo, descricao, autor, dados) {
  try {
    bjAppend_('HISTORICO', {
      evento_id: bjId_('E'), partida_id: partidaId, rodada_id: rodadaId,
      tipo_evento: tipo, descricao: descricao, autor: autor,
      data_hora: new Date(), dados_json: JSON.stringify(dados || {})
    });
  } catch (e) { /* histórico nunca bloqueia o jogo */ }
}

/* ===================== UTILITÁRIOS ===================== */

function bjRestante_(rodada, agoraMs) {
  const tempo = bjNum_(rodada.tempo_segundos, bjConfig_().tempo);
  const ini = bjMs_(rodada.iniciada_em);
  if (!ini) return tempo;
  return Math.max(0, Math.round(tempo - (agoraMs - ini) / 1000));
}
function bjMs_(v) {
  if (v instanceof Date) return v.getTime();
  if (!v) return 0;
  const t = Date.parse(v);
  return isNaN(t) ? 0 : t;
}
function bjNum_(v, d) { const n = Number(String(v === null || v === undefined ? '' : v).replace(',', '.')); return (v === '' || v === null || v === undefined || isNaN(n)) ? d : n; }
function bjUp_(v) { return String(v === null || v === undefined ? '' : v).trim().toUpperCase(); }
function bjNome_(r) { return String(r.nome || r.apelido || 'Jogador').trim(); }
function bjPhone_(v) { return String(v === null || v === undefined ? '' : v).replace(/\D/g, ''); }
function bjId_(prefix) { return prefix + '-' + Utilities.getUuid().slice(0, 8).toUpperCase(); }
function bjEsc_(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function bjJson_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ===================== EXECUTAR MANUALMENTE ===================== */

/** Rode 1x após colar este arquivo. Não apaga nada. */
function inicializarSistemaBrasilEmJogo() {
  bjGarantirEstrutura_(true);
  const cfg = bjSS_().getSheetByName(BJ.SHEETS.CONFIG);
  if (!cfg) throw new Error('Aba CONFIG ausente.');
  const chaves = {};
  cfg.getDataRange().getDisplayValues().forEach(function (r) { chaves[String(r[0]).trim().toUpperCase()] = true; });
  [
    ['MAX_JOGADORES', '12', 'Máximo de jogadores presentes'],
    ['MIN_JOGADORES', '2', 'Mínimo para iniciar a partida'],
    ['TEMPO_PADRAO_RODADA', '180', 'Tempo padrão da rodada (segundos)'],
    ['ADMIN_PIN', '', 'PIN da Mesa (vazio = sem PIN)']
  ].forEach(function (r) { if (!chaves[r[0]]) cfg.appendRow(r); });
  const minRow = cfg.getDataRange().getDisplayValues().findIndex(function(r){return String(r[0]).trim().toUpperCase()==='MIN_JOGADORES';});
  if (minRow >= 0 && Number(cfg.getRange(minRow+1,2).getValue()) === 4) cfg.getRange(minRow+1,2).setValue(2);
  bjMigrarParticipantesSemMesa_();
  CacheService.getScriptCache().remove(BJ.CACHE_KEY);
  const rel = diagnosticarBrasilEmJogo();
  return rel;
}

/** Remove somente registros identificados como teste por esta rotina. Dados reais são preservados. */
function zerarDadosTesteBrasilEmJogo() {
  bjGarantirEstrutura_(true);
  const tP = bjTable_('PARTIDAS');
  const ids = {};
  tP.rows.forEach(function(r) {
    if (String(r.observacoes || '').indexOf('BJ_TESTE=SIM') >= 0) ids[String(r.partida_id)] = true;
  });
  if (!Object.keys(ids).length) return { ok: true, removidas: 0, mensagem: 'Nenhuma mesa de teste encontrada. Dados reais preservados.' };
  ['PARTICIPANTES','RODADAS','PONTUACAO','HISTORICO','PARTIDAS'].forEach(function(key) {
    const t = bjTable_(key), col = t.headers.indexOf('partida_id');
    if (col < 0) return;
    const linhas = t.rows.filter(function(r){ return !!ids[String(r.partida_id || '')]; }).map(function(r){return r._row;}).sort(function(a,b){return b-a;});
    linhas.forEach(function(n){t.sh.deleteRow(n);});
    delete BJ_MEMO_[key];
  });
  CacheService.getScriptCache().remove(BJ.CACHE_KEY);
  return { ok: true, removidas: Object.keys(ids).length, mensagem: 'Mesas e registros de teste removidos. Mesas reais preservadas.' };
}

/** Cria uma partida demonstrativa completa com seis jogadores e TESTE 03 vencedor. */
function criarTesteRealBrasilEmJogo() {
  bjGarantirEstrutura_(true);
  zerarDadosTesteBrasilEmJogo();
  const nomeMesa = 'JOGO 01 — TESTE';
  const criada = bjCriarPartida_(nomeMesa);
  const pid = String(criada.partida_id);
  const partida = bjPartidaPorId_(pid);
  bjUpdate_('PARTIDAS', partida._row, { observacoes: 'BJ_TESTE=SIM', status: 'ENCERRADA', iniciada_em: new Date(), encerrada_em: new Date() });
  const jogadores = [];
  for (let i = 1; i <= 6; i++) {
    const nome = 'TESTE ' + String(i).padStart(2, '0');
    const id = bjId_('P');
    bjAppend_('PARTICIPANTES', { participante_id:id, apelido:nome, nome:nome, telefone:'1199000000'+i, criado_em:new Date(), ativo:'SIM', status_presenca:'JOGANDO', ultima_atividade:new Date(), partida_id:pid });
    jogadores.push({id:id,nome:nome});
  }
  const rodadaId = bjId_('R');
  bjAppend_('RODADAS', { rodada_id:rodadaId, partida_id:pid, numero_rodada:1, carta_id:'', participante_respondeu_id:jogadores[2].id, status:'CONCLUIDA', resposta_dada:'Resposta demonstrativa de teste', julgamento_aberto_em:new Date(), revelada_em:new Date(), dinamica_id:'', iniciada_em:new Date(), concluida_em:new Date(), tempo_segundos:180 });
  jogadores.forEach(function(j, i) {
    bjAppend_('PONTUACAO', { pontuacao_id:bjId_('S'), partida_id:pid, rodada_id:rodadaId, participante_id:j.id, pontos:i===2?3:(i===0?2:1), criterio:i===2?'Vencedor demonstrativo':'Pontuação demonstrativa', registrado_em:new Date() });
  });
  bjEvento_(pid, rodadaId, 'TESTE_CRIADO', 'JOGO 01 — vencedor TESTE 03', 'SISTEMA', { teste:true, participantes:6, vencedor:'TESTE 03' });
  CacheService.getScriptCache().remove(BJ.CACHE_KEY);
  return { ok:true, partida_id:pid, mesa:nomeMesa, participantes:jogadores.map(function(j){return j.nome;}), vencedor:'TESTE 03', mensagem:'Teste criado. Abra o jogo e selecione JOGO 01 — TESTE.' };
}

/** Diagnóstico: abas, colunas, cartas ativas, HTML e PIN. Veja em "Registro de execução". */
function diagnosticarBrasilEmJogo() {
  const ss = bjSS_();
  const rel = { versao: BJ.VERSAO, planilha: ss.getName(), abas: {}, avisos: [] };
  Object.keys(BJ.SHEETS).forEach(function (key) {
    const sh = ss.getSheetByName(BJ.SHEETS[key]);
    if (!sh) { rel.abas[BJ.SHEETS[key]] = 'AUSENTE'; rel.avisos.push('Falta a aba ' + BJ.SHEETS[key]); return; }
    const hs = sh.getLastColumn() ? sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0] : [];
    const faltando = (BJ.HEADERS[key] || []).filter(function (h) { return hs.indexOf(h) < 0; });
    rel.abas[BJ.SHEETS[key]] = { linhas: Math.max(sh.getLastRow() - 1, 0), faltando: faltando };
    if (faltando.length) rel.avisos.push(BJ.SHEETS[key] + ' sem colunas: ' + faltando.join(', '));
  });
  try { rel.cartasAtivas = bjCartasAtivas_().length; } catch (e) { rel.avisos.push('CARTAS: ' + e.message); }
  try { HtmlService.createHtmlOutputFromFile(BJ.HTML_FILE); rel.html = 'OK'; } catch (e) { rel.html = 'ERRO'; rel.avisos.push('Arquivo HTML "' + BJ.HTML_FILE + '" não encontrado.'); }
  rel.pinConfigurado = !!bjConfig_().pin;
  if (!rel.pinConfigurado) rel.avisos.push('ADMIN_PIN vazio: qualquer pessoa com o link controla a Mesa.');
  Logger.log(JSON.stringify(rel, null, 2));
  return rel;
}
