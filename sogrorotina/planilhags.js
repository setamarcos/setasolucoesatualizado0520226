/**
 * SISTEMA: RONDA DE CUIDADO - CAMERA JOAQUIM
 * PROPRIETÁRIO: Marquinhos (Seta Soluções)
 * ARQUITETURA: Monolítica Híbrida (Apps Script + GitHub Pages Ready)
 */

const CONFIG_SISTEMA = {
  SPREADSHEET_ID: '1MLPgqy69SHIZVK5hj7493tGvuEqvkSIU2qAlBaE8xYM',
  WEBAPP_URL: 'https://script.google.com/macros/s/AKfycby--j5wSXhhoFjlybE7W4vZTH7e4HeNC0Pw6Zt5RLhxvq1LsGpDQNACC9GKKGo4Td6S/exec',
  EMAIL_ALERTA: 'setamarcos@gmail.com',
  TURNOS: ['09:00', '12:00', '18:00', '22:00'],
  TOLERANCIA_MIN: 15
};

function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'getEstado') {
    const estado = obterEstadoAtual();
    return ContentService.createTextOutput(JSON.stringify(estado))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Ronda de Cuidado | Seta Soluções')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
}

function doPost(e) {
  try {
    const dados = JSON.parse(e.postData.contents);
    const res = registrarPonto(dados);
    return ContentService.createTextOutput(JSON.stringify(res))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, erro: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 1. CRIAÇÃO AUTOMÁTICA DA PLANILHA (ZERO ERRO DE DIGITAÇÃO)
 */
function criarPlanilha() {
  const ss = SpreadsheetApp.openById(CONFIG_SISTEMA.SPREADSHEET_ID);
  
  // Cria ou limpa abas
  const abasNecessarias = ['1_Controle_Acesso', '2_Config', '3_Matriz_Mensal', '4_Dashboard'];
  abasNecessarias.forEach(nome => {
    let sheet = ss.getSheetByName(nome);
    if (!sheet) {
      sheet = ss.insertSheet(nome);
    } else {
      sheet.clear();
    }
  });

  // Remove aba padrão Página1 se existir
  const pag1 = ss.getSheetByName('Página1') || ss.getSheetByName('Sheet1');
  if (pag1 && ss.getSheets().length > 1) {
    ss.deleteSheet(pag1);
  }

  // --- ABA 1: CONTROLE DE ACESSO ---
  const abaControle = ss.getSheetByName('1_Controle_Acesso');
  const cabecalhoControle = [
    'ID_Registro', 'Data', 'Turno_Alvo', 'Hora_Registro_Sistema', 
    'Hora_Real_Visualizacao', 'Status_Acesso', 'Estado_Camera', 
    'Situacao', 'Obs_Motivo', 'Chave_Unica'
  ];
  abaControle.getRange(1, 1, 1, cabecalhoControle.length)
    .setValues([cabecalhoControle])
    .setBackground('#0f172a')
    .setFontColor('#ffffff')
    .setFontWeight('bold');
  abaControle.setFrozenRows(1);

  // --- ABA 2: CONFIGURAÇÕES ---
  const abaConfig = ss.getSheetByName('2_Config');
  const dadosConfig = [
    ['Parâmetro', 'Valor'],
    ['Responsável', 'Marquinhos'],
    ['Monitorado', 'Joaquim'],
    ['Turno 1', '09:00'],
    ['Turno 2', '12:00'],
    ['Turno 3', '18:00'],
    ['Turno 4', '22:00'],
    ['Tolerância (min)', 15],
    ['E-mail Lembrete', CONFIG_SISTEMA.EMAIL_ALERTA]
  ];
  abaConfig.getRange(1, 1, dadosConfig.length, 2).setValues(dadosConfig);
  abaConfig.getRange('A1:B1').setBackground('#1e3a8a').setFontColor('#ffffff').setFontWeight('bold');

  // --- ABA 3: MATRIZ MENSAL (DIA X MÊS) ---
  const abaMatriz = ss.getSheetByName('3_Matriz_Mensal');
  const meses = ['Dia', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez', 'Total_Dia'];
  abaMatriz.getRange(1, 1, 1, meses.length)
    .setValues([meses])
    .setBackground('#0f172a')
    .setFontColor('#ffffff')
    .setFontWeight('bold');

  const anoAtual = new Date().getFullYear();
  for (let dia = 1; dia <= 31; dia++) {
    const linha = dia + 1;
    abaMatriz.getRange(linha, 1).setValue(dia < 10 ? '0' + dia : '' + dia);
    for (let mes = 1; mes <= 12; mes++) {
      const dataStr = (dia < 10 ? '0' + dia : dia) + '/' + (mes < 10 ? '0' + mes : mes) + '/' + anoAtual;
      const formula = `=COUNTIFS('1_Controle_Acesso'!$B$2:$B;"${dataStr}";'1_Controle_Acesso'!$F$2:$F;"<>Não Acessado")`;
      abaMatriz.getRange(linha, mes + 1).setFormula(formula);
    }
    abaMatriz.getRange(linha, 14).setFormula(`=SUM(B${linha}:M${linha})`);
  }

  // --- ABA 4: DASHBOARD & GRÁFICO ---
  const abaDash = ss.getSheetByName('4_Dashboard');
  const cabDash = ['Mês', 'Acessos Realizados', 'Turnos Não Acessados'];
  abaDash.getRange(1, 1, 1, 3).setValues([cabDash]).setBackground('#0f172a').setFontColor('#ffffff').setFontWeight('bold');

  const nomesMeses = ['01 - Jan', '02 - Fev', '03 - Mar', '04 - Abr', '05 - Mai', '06 - Jun', '07 - Jul', '08 - Ago', '09 - Set', '10 - Out', '11 - Nov', '12 - Dez'];
  for (let m = 1; m <= 12; m++) {
    const row = m + 1;
    const mesPadrao = m < 10 ? '0' + m : '' + m;
    abaDash.getRange(row, 1).setValue(nomesMeses[m - 1]);
    abaDash.getRange(row, 2).setFormula(`=COUNTIFS('1_Controle_Acesso'!$B$2:$B;"*/${mesPadrao}/${anoAtual}";'1_Controle_Acesso'!$F$2:$F;"<>Não Acessado")`);
    abaDash.getRange(row, 3).setFormula(`=COUNTIFS('1_Controle_Acesso'!$B$2:$B;"*/${mesPadrao}/${anoAtual}";'1_Controle_Acesso'!$F$2:$F;"Não Acessado")`);
  }

  // Remove gráficos antigos e cria novo
  abaDash.getCharts().forEach(c => abaDash.removeChart(c));
  const chart = abaDash.newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(abaDash.getRange('A1:C13'))
    .setOption('isStacked', true)
    .setOption('title', 'Rondas Joaquim: Realizadas vs Não Acessadas (' + anoAtual + ')')
    .setOption('colors', ['#10b981', '#ef4444'])
    .setOption('width', 750)
    .setOption('height', 400)
    .setPosition(2, 5, 0, 0)
    .build();
  abaDash.insertChart(chart);

  Logger.log('Planilha Camera Joaquim estruturada com sucesso!');
  return { ok: true, msg: 'Planilha criada com sucesso!' };
}

/**
 * 2. INSERIR TESTES (100%, 75%, 50%, 25% + PENDÊNCIA DE ONTEM)
 */
function inserirTeste() {
  const ss = SpreadsheetApp.openById(CONFIG_SISTEMA.SPREADSHEET_ID);
  const aba = ss.getSheetByName('1_Controle_Acesso');
  if (!aba) throw new Error('Execute criarPlanilha() primeiro.');

  // Limpa dados anteriores mantendo cabeçalho
  if (aba.getLastRow() > 1) {
    aba.getRange(2, 1, aba.getLastRow() - 1, 10).clearContent();
  }

  const hoje = new Date();
  const formatarData = (d) => Utilities.formatDate(d, 'America/Sao_Paulo', 'dd/MM/yyyy');

  const d4 = new Date(hoje); d4.setDate(hoje.getDate() - 4); // 100% (4/4)
  const d3 = new Date(hoje); d3.setDate(hoje.getDate() - 3); // 75% (3/4)
  const d2 = new Date(hoje); d2.setDate(hoje.getDate() - 2); // 50% (2/4)
  const d1 = new Date(hoje); d1.setDate(hoje.getDate() - 1); // 25% (1/4) - Ontem (gera alerta amigo)

  const linhasTeste = [
    // Dia -4: 100% (4 de 4)
    ['TST-01', formatarData(d4), '09:00', '09:03', '09:03', 'No Prazo', 'ON', 'Tudo OK', '', formatarData(d4) + '_09:00'],
    ['TST-02', formatarData(d4), '12:00', '12:10', '12:10', 'No Prazo', 'ON', 'Tudo OK', '', formatarData(d4) + '_12:00'],
    ['TST-03', formatarData(d4), '18:00', '18:05', '18:05', 'No Prazo', 'ON', 'Tudo OK', '', formatarData(d4) + '_18:00'],
    ['TST-04', formatarData(d4), '22:00', '22:01', '22:01', 'No Prazo', 'ON', 'Tudo OK', '', formatarData(d4) + '_22:00'],

    // Dia -3: 75% (3 de 4)
    ['TST-05', formatarData(d3), '09:00', '09:05', '09:05', 'No Prazo', 'ON', 'Tudo OK', '', formatarData(d3) + '_09:00'],
    ['TST-06', formatarData(d3), '12:00', '15:30', '12:20', 'Retroativo', 'ON', 'Tudo OK', 'Estava em atendimento', formatarData(d3) + '_12:00'],
    ['TST-07', formatarData(d3), '18:00', '18:12', '18:12', 'No Prazo', 'ON', 'Tudo OK', '', formatarData(d3) + '_18:00'],
    ['TST-08', formatarData(d3), '22:00', '23:55', '-', 'Não Acessado', 'N/A', 'Pendente', 'Dormi cedo', formatarData(d3) + '_22:00'],

    // Dia -2: 50% (2 de 4 - com falha técnica de câmera OFF)
    ['TST-09', formatarData(d2), '09:00', '09:02', '09:02', 'No Prazo', 'ON', 'Tudo OK', '', formatarData(d2) + '_09:00'],
    ['TST-10', formatarData(d2), '12:00', '12:04', '12:04', 'No Prazo', 'OFF', 'Atenção', 'Sem internet no local', formatarData(d2) + '_12:00'],
    ['TST-11', formatarData(d2), '18:00', '23:55', '-', 'Não Acessado', 'N/A', 'Pendente', 'Trabalho na rua', formatarData(d2) + '_18:00'],
    ['TST-12', formatarData(d2), '22:00', '23:55', '-', 'Não Acessado', 'N/A', 'Pendente', 'Esquecimento', formatarData(d2) + '_22:00'],

    // Dia -1 (Ontem): 25% (1 de 4 + 1 sem justificativa para testar o banner amigo)
    ['TST-13', formatarData(d1), '09:00', '09:10', '09:10', 'No Prazo', 'ON', 'Tudo OK', '', formatarData(d1) + '_09:00'],
    ['TST-14', formatarData(d1), '12:00', '23:55', '-', 'Não Acessado', 'N/A', 'Pendente', 'Sem motivo informado', formatarData(d1) + '_12:00'],
    ['TST-15', formatarData(d1), '18:00', '23:55', '-', 'Não Acessado', 'N/A', 'Pendente', 'Trânsito', formatarData(d1) + '_18:00'],
    ['TST-16', formatarData(d1), '22:00', '23:55', '-', 'Não Acessado', 'N/A', 'Pendente', 'Cansaço', formatarData(d1) + '_22:00']
  ];

  aba.getRange(2, 1, linhasTeste.length, 10).setValues(linhasTeste);
  Logger.log('Dados de teste (100%, 75%, 50%, 25%) inseridos com sucesso!');
  return { ok: true, msg: 'Testes inseridos!' };
}

/**
 * 3. LÓGICA DE LEITURA E GRAVAÇÃO DO APP
 */
function obterEstadoAtual() {
  const ss = SpreadsheetApp.openById(CONFIG_SISTEMA.SPREADSHEET_ID);
  const aba = ss.getSheetByName('1_Controle_Acesso');
  const agora = new Date();
  const hojeStr = Utilities.formatDate(agora, 'America/Sao_Paulo', 'dd/MM/yyyy');
  
  const ontem = new Date(agora);
  ontem.setDate(agora.getDate() - 1);
  const ontemStr = Utilities.formatDate(ontem, 'America/Sao_Paulo', 'dd/MM/yyyy');

  const dados = aba.getLastRow() > 1 ? aba.getRange(2, 1, aba.getLastRow() - 1, 10).getValues() : [];
  
  const registrosHoje = {};
  const pendenciasRecentes = [];

  dados.forEach((linha, idx) => {
    const dataLinha = linha[1] instanceof Date 
      ? Utilities.formatDate(linha[1], 'America/Sao_Paulo', 'dd/MM/yyyy') 
      : String(linha[1]);
    const turno = String(linha[2]);

    if (dataLinha === hojeStr) {
      registrosHoje[turno] = {
        id: linha[0],
        horaReal: linha[4],
        statusAcesso: linha[5],
        camera: linha[6],
        situacao: linha[7],
        obs: linha[8]
      };
    }

    // Verifica pendências sem motivo de ontem ou anteriores
    if (linha[5] === 'Não Acessado' && (!linha[8] || linha[8] === 'Sem motivo informado' || linha[8] === 'Pendente')) {
      pendenciasRecentes.push({
        data: dataLinha,
        turno: turno
      });
    }
  });

  return {
    ok: true,
    hoje: hojeStr,
    turnos: CONFIG_SISTEMA.TURNOS,
    tolerancia: CONFIG_SISTEMA.TOLERANCIA_MIN,
    registrosHoje: registrosHoje,
    pendencias: pendenciasRecentes.slice(-3) // Mostra até 3 pendentes mais recentes
  };
}

function registrarPonto(payload) {
  const ss = SpreadsheetApp.openById(CONFIG_SISTEMA.SPREADSHEET_ID);
  const aba = ss.getSheetByName('1_Controle_Acesso');
  const agora = new Date();
  const dataAlvo = payload.data || Utilities.formatDate(agora, 'America/Sao_Paulo', 'dd/MM/yyyy');
  const horaSistema = Utilities.formatDate(agora, 'America/Sao_Paulo', 'HH:mm');
  const turno = payload.turno;
  const chaveUnica = dataAlvo + '_' + turno;

  // Verifica se já existe registro para este dia + turno (permite atualizar sem duplicar)
  const ultimaLinha = aba.getLastRow();
  let linhaExistente = -1;

  if (ultimaLinha > 1) {
    const chaves = aba.getRange(2, 10, ultimaLinha - 1, 1).getValues();
    for (let i = 0; i < chaves.length; i++) {
      if (String(chaves[i][0]) === chaveUnica) {
        linhaExistente = i + 2;
        break;
      }
    }
  }

  const novaLinha = [
    'REG-' + Utilities.formatDate(agora, 'America/Sao_Paulo', 'yyyyMMddHHmmss'),
    dataAlvo,
    turno,
    horaSistema,
    payload.horaReal || horaSistema,
    payload.statusAcesso, // 'No Prazo', 'Retroativo', 'Não Acessado'
    payload.camera,       // 'ON', 'OFF', 'N/A'
    payload.situacao,     // 'Tudo OK', 'Atenção', 'Pendente'
    payload.obs || '',
    chaveUnica
  ];

  if (linhaExistente > 0) {
    aba.getRange(linhaExistente, 1, 1, 10).setValues([novaLinha]);
  } else {
    aba.appendRow(novaLinha);
  }

  return obterEstadoAtual();
}

/**
 * 4. AUDITORIA NOTURNA (CONFIGURAR TRIGGER ÀS 23:55)
 */
function auditarPendencias() {
  const ss = SpreadsheetApp.openById(CONFIG_SISTEMA.SPREADSHEET_ID);
  const aba = ss.getSheetByName('1_Controle_Acesso');
  const agora = new Date();
  const hojeStr = Utilities.formatDate(agora, 'America/Sao_Paulo', 'dd/MM/yyyy');

  const ultimaLinha = aba.getLastRow();
  const chavesExistentes = new Set();

  if (ultimaLinha > 1) {
    const dados = aba.getRange(2, 10, ultimaLinha - 1, 1).getValues();
    dados.forEach(r => chavesExistentes.add(String(r[0])));
  }

  CONFIG_SISTEMA.TURNOS.forEach(turno => {
    const chave = hojeStr + '_' + turno;
    if (!chavesExistentes.has(chave)) {
      aba.appendRow([
        'AUD-' + Utilities.formatDate(agora, 'America/Sao_Paulo', 'yyyyMMddHHmmss'),
        hojeStr,
        turno,
        '23:55',
        '-',
        'Não Acessado',
        'N/A',
        'Pendente',
        'Sem motivo informado',
        chave
      ]);
    }
  });
}

/**
 * 5. CRIAR LEMBRETES NATIVOS NA GOOGLE AGENDA (RODAR UMA ÚNICA VEZ)
 */
function criarLembretesAgenda() {
  const cal = CalendarApp.getDefaultCalendar();
  const hoje = new Date();
  
  CONFIG_SISTEMA.TURNOS.forEach((turno, index) => {
    const [h, m] = turno.split(':').map(Number);
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), h, m, 0);
    const fim = new Date(inicio.getTime() + 10 * 60000); // 10 min de duração

    const serie = CalendarApp.newRecurrence().addDailyRule();
    const evento = cal.createEventSeries(
      `Ronda ${index + 1} - Câmera Joaquim (${turno})`,
      inicio,
      fim,
      serie,
      {
        description: `Abra a câmera e registre seu ponto rápido:\n${CONFIG_SISTEMA.WEBAPP_URL}`
      }
    );
    evento.addPopupReminder(0); // Avisa exatamente na hora
  });
  Logger.log('4 lembretes diários criados na sua Google Agenda!');
}