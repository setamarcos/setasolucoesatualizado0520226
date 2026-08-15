'use strict';

/* =========================================================
   CONFIGURAÇÃO
   ========================================================= */

const URL_SCRIPT =
  "https://script.google.com/macros/s/AKfycbyWTN1XC2JWhqWFPiVvxKSM8EUGUW8BvxSw59j5kQx8BD580ctuiqjiFW2uPPwjF3a9/exec";

const CHAVE_AGENDAMENTOS = 'veronica_agendamentos';
const CHAVE_ATENDIMENTOS = 'veronica_atendimentos';

const SENHA_PAINEL = '1401';

const NUMERO_WHATSAPP = '5531991946163';

let sincronizacaoEmAndamento = false;
let intervaloSincronizacao = null;


/* =========================================================
   MOMENTOS DO DIA
   ========================================================= */

var momentosDoAno = [
  {
    frase: "Recria tua vida, sempre.",
    autor: "Cora Coralina"
  },
  {
    frase: "Delicadeza das pequenas coisas.",
    autor: "Cecília Meireles"
  },
  {
    frase: "Renda-se ao que não conhece.",
    autor: "Clarice Lispector"
  },
  {
    frase: "O que a memória ama, fica eterno.",
    autor: "Adélia Prado"
  },
  {
    frase: "Tempo pra si é acalmar a alma.",
    autor: "Lya Luft"
  }
];


/* =========================================================
   UTILITÁRIOS
   ========================================================= */

function obterDiaDoAno(data) {
  var inicio = new Date(data.getFullYear(), 0, 0);

  var diff =
    (data - inicio) +
    ((inicio.getTimezoneOffset() - data.getTimezoneOffset()) * 60 * 1000);

  return Math.floor(diff / (1000 * 60 * 60 * 24));
}


function dataLocalISO(data) {
  data = data || new Date();

  var ano = data.getFullYear();
  var mes = String(data.getMonth() + 1).padStart(2, '0');
  var dia = String(data.getDate()).padStart(2, '0');

  return ano + '-' + mes + '-' + dia;
}


function formatarDataBR(data) {
  if (!data) return '';

  var texto = String(data);

  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    return texto.split('-').reverse().join('/');
  }

  var dataObj = new Date(texto);

  if (isNaN(dataObj.getTime())) {
    return '';
  }

  return dataObj.toLocaleDateString('pt-BR');
}


function formatarMoeda(valor) {
  var numero = converterValorParaNumero(valor);

  return 'R$ ' + numero
    .toFixed(2)
    .replace('.', ',');
}


function converterValorParaNumero(valor) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ''
  ) {
    return 0;
  }

  var texto = String(valor).trim();

  texto = texto
    .replace(/R\$/gi, '')
    .replace(/\s/g, '');

  /*
    Exemplos:
    50
    50,00
    R$ 50,00
    1.250,00
    1250.00
  */

  if (texto.includes(',') && texto.includes('.')) {
    texto = texto.replace(/\./g, '').replace(',', '.');
  } else if (texto.includes(',')) {
    texto = texto.replace(',', '.');
  }

  var numero = Number(texto);

  return Number.isFinite(numero)
    ? numero
    : 0;
}


function gerarId() {
  if (window.crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return 'web-' +
    Date.now() +
    '-' +
    Math.random().toString(36).substring(2, 12);
}


function escaparHTML(valor) {
  return String(valor || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


/* =========================================================
   LOCAL STORAGE
   ========================================================= */

function lerListaLocal(chave) {
  try {
    return JSON.parse(
      localStorage.getItem(chave) || '[]'
    );
  } catch (erro) {
    console.error('Erro ao ler localStorage:', erro);
    return [];
  }
}


function salvarListaLocal(chave, lista) {
  try {
    localStorage.setItem(
      chave,
      JSON.stringify(lista)
    );
  } catch (erro) {
    console.error('Erro ao salvar localStorage:', erro);
  }
}


/* =========================================================
   COMUNICAÇÃO COM GOOGLE APPS SCRIPT
   ========================================================= */

async function requisicaoGet() {
  const resposta = await fetch(
    URL_SCRIPT + '?acao=ping&_=' + Date.now(),
    {
      method: 'GET',
      cache: 'no-store'
    }
  );

  if (!resposta.ok) {
    throw new Error(
      'Erro HTTP ao consultar o Apps Script: ' +
      resposta.status
    );
  }

  return resposta.json();
}


async function buscarDadosDaNuvem() {
  const resposta = await fetch(
    URL_SCRIPT + '?_=' + Date.now(),
    {
      method: 'GET',
      cache: 'no-store'
    }
  );

  if (!resposta.ok) {
    throw new Error(
      'Erro HTTP ao buscar dados: ' +
      resposta.status
    );
  }

  const resultado = await resposta.json();

  if (!resultado || resultado.status !== 'sucesso') {
    throw new Error(
      resultado && resultado.mensagem
        ? resultado.mensagem
        : 'Resposta inválida do Apps Script.'
    );
  }

  return resultado.dados || {};
}


async function enviarParaNuvem(payload) {
  const resposta = await fetch(
    URL_SCRIPT,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    }
  );

  if (!resposta.ok) {
    throw new Error(
      'Erro HTTP ao enviar dados: ' +
      resposta.status
    );
  }

  const resultado = await resposta.json();

  if (!resultado || resultado.status !== 'sucesso') {
    throw new Error(
      resultado && resultado.mensagem
        ? resultado.mensagem
        : 'Erro retornado pelo Apps Script.'
    );
  }

  return resultado;
}


/* =========================================================
   SINCRONIZAÇÃO PRINCIPAL
   ========================================================= */

async function sincronizarComNuvem(silencioso) {

  if (sincronizacaoEmAndamento) {
    return false;
  }

  sincronizacaoEmAndamento = true;

  try {

    const dados = await buscarDadosDaNuvem();

    const atendimentos =
      Array.isArray(dados.atendimentos)
        ? dados.atendimentos
        : [];

    const agendamentos =
      Array.isArray(dados.agendamentos)
        ? dados.agendamentos
        : [];

    /*
      GOOGLE SHEETS É A FONTE PRINCIPAL.
      O localStorage passa a ser apenas um cache.
    */

    salvarListaLocal(
      CHAVE_ATENDIMENTOS,
      atendimentos
    );

    salvarListaLocal(
      CHAVE_AGENDAMENTOS,
      agendamentos
    );

    carregarAgenda();
    carregarPlanilha();

    console.log(
      'Sincronização concluída:',
      atendimentos.length,
      'atendimentos;',
      agendamentos.length,
      'agendamentos.'
    );

    return true;

  } catch (erro) {

    console.error(
      'Falha na sincronização:',
      erro
    );

    if (!silencioso) {
      alert(
        'Não foi possível atualizar os dados da nuvem.\n\n' +
        'Verifique sua conexão com a internet e tente novamente.'
      );
    }

    /*
      Se a internet falhar, o aparelho continua
      mostrando o último cache disponível.
    */

    carregarAgenda();
    carregarPlanilha();

    return false;

  } finally {

    sincronizacaoEmAndamento = false;
  }
}


/* =========================================================
   SINCRONIZAÇÃO AUTOMÁTICA
   ========================================================= */

function iniciarSincronizacaoAutomatica() {

  if (intervaloSincronizacao) {
    clearInterval(intervaloSincronizacao);
  }

  /*
    Atualiza a cada 15 segundos.
    Assim, se outro Android cadastrar algo,
    este aparelho busca a alteração.
  */

  intervaloSincronizacao = setInterval(
    function() {
      var painel = document.getElementById('painel-privado');

      if (
        painel &&
        painel.style.display !== 'none'
      ) {
        sincronizarComNuvem(true);
      }
    },
    15000
  );
}


/* =========================================================
   AGENDA DO SITE
   ========================================================= */

function preencherDiasUteis() {

  var selectDia =
    document.getElementById('select-dia');

  if (!selectDia) return;

  selectDia.innerHTML = '';

  var hoje = new Date();

  var contador = 0;

  var d = new Date(hoje);

  while (contador < 10) {

    d.setDate(d.getDate() + 1);

    var diaSemana = d.getDay();

    /*
      Domingo = 0
      Sábado = 6
    */

    if (
      diaSemana !== 0 &&
      diaSemana !== 6
    ) {

      var iso = dataLocalISO(d);

      var textoFormatado =
        d.toLocaleDateString(
          'pt-BR',
          {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
          }
        );

      var opt =
        document.createElement('option');

      opt.value = iso;

      opt.text =
        textoFormatado.charAt(0).toUpperCase() +
        textoFormatado.slice(1);

      selectDia.appendChild(opt);

      contador++;
    }
  }
}


/* =========================================================
   ENVIAR AGENDAMENTO DO SITE
   ========================================================= */

async function enviarAgendamentoSite() {

  var nomeCliente =
    document
      .getElementById('input-nome-cliente')
      .value
      .trim();

  var telCliente =
    document
      .getElementById('input-tel-cliente')
      .value
      .trim();

  var diaSelecionado =
    document
      .getElementById('select-dia')
      .value;

  var horarioSelecionado =
    document
      .getElementById('select-horario')
      .value;


  if (!nomeCliente || !telCliente) {

    alert(
      'Por favor, preencha seu nome e telefone para agendar.'
    );

    return;
  }


  var btnAgendar =
    document.querySelector(
      '.btn-agendar-site'
    );


  if (btnAgendar) {

    btnAgendar.disabled = true;

    btnAgendar.innerText =
      'Agendando...';

    btnAgendar.style.opacity =
      '0.6';
  }


  var payload = {

    tipo: 'agendamento',

    id: gerarId(),

    dataRegistro:
      new Date().toLocaleString('pt-BR'),

    nome: nomeCliente,

    telefone: telCliente,

    dia: diaSelecionado,

    horario: horarioSelecionado,

    status: 'Pendente'
  };


  try {

    /*
      PRIMEIRO envia para a nuvem.
      Só depois atualiza a tabela local.
    */

    var resultado =
      await enviarParaNuvem(payload);


    /*
      O Apps Script devolve todos os dados.
      Usamos a resposta oficial da nuvem.
    */

    if (
      resultado &&
      resultado.dados
    ) {

      salvarListaLocal(
        CHAVE_AGENDAMENTOS,
        resultado.dados.agendamentos || []
      );

      salvarListaLocal(
        CHAVE_ATENDIMENTOS,
        resultado.dados.atendimentos || []
      );

    } else {

      /*
        Fallback.
      */

      var lista =
        lerListaLocal(
          CHAVE_AGENDAMENTOS
        );

      lista.unshift(payload);

      salvarListaLocal(
        CHAVE_AGENDAMENTOS,
        lista
      );
    }


    carregarAgenda();


    /*
      WhatsApp
    */

    var dataFormatadaBr =
      diaSelecionado
        .split('-')
        .reverse()
        .join('/');


    var textoZap =
      "Olá Verônica! Gostaria de agendar Manicure Pé e Mão.\n\n" +
      "👤 Nome: " + nomeCliente + "\n" +
      "📞 Telefone: " + telCliente + "\n" +
      "📅 Data: " + dataFormatadaBr + "\n" +
      "⏰ Horário: " + horarioSelecionado;


    var urlZap =
      "https://wa.me/" +
      NUMERO_WHATSAPP +
      "?text=" +
      encodeURIComponent(textoZap);


    /*
      Limpa os campos.
    */

    document
      .getElementById('input-nome-cliente')
      .value = '';

    document
      .getElementById('input-tel-cliente')
      .value = '';


    /*
      Abre WhatsApp.
    */

    window.open(
      urlZap,
      '_blank'
    );


  } catch (erro) {

    console.error(
      'Erro ao salvar agendamento:',
      erro
    );

    alert(
      'Não foi possível salvar o agendamento na nuvem.\n\n' +
      'Tente novamente.'
    );

  } finally {

    if (btnAgendar) {

      btnAgendar.disabled = false;

      btnAgendar.innerText =
        'Agendar Horário';

      btnAgendar.style.opacity =
        '1';
    }
  }
}


/* =========================================================
   CARREGAR AGENDA
   ========================================================= */

function carregarAgenda() {

  var listaAgendamentos =
    lerListaLocal(
      CHAVE_AGENDAMENTOS
    );

  var tbody =
    document.getElementById(
      'tabela-agenda-corpo'
    );

  if (!tbody) return;

  tbody.innerHTML = '';


  if (
    listaAgendamentos.length === 0
  ) {

    tbody.innerHTML =
      '<tr>' +
      '<td colspan="6">' +
      'Nenhum agendamento registrado.' +
      '</td>' +
      '</tr>';

    return;
  }


  listaAgendamentos.forEach(
    function(item, index) {

      var dataFormatada =
        item.dia
          ? item.dia
              .split('-')
              .reverse()
              .join('/')
          : '';


      var tr =
        document.createElement('tr');


      tr.innerHTML =

        '<td>' +
        (index + 1) +
        '</td>' +

        '<td style="text-align:left">' +
        escaparHTML(item.nome) +
        '</td>' +

        '<td>' +
        escaparHTML(item.telefone) +
        '</td>' +

        '<td>' +
        escaparHTML(dataFormatada) +
        '</td>' +

        '<td>' +
        escaparHTML(item.horario) +
        '</td>' +

        '<td>' +

        '<button ' +
        'type="button" ' +
        'class="btn-acao btn-excluir" ' +
        'onclick="excluirAgenda(' +
        index +
        ')">' +

        'Excluir' +

        '</button>' +

        '</td>';


      tbody.appendChild(tr);
    }
  );
}


/* =========================================================
   EXCLUIR AGENDAMENTO
   ========================================================= */

async function excluirAgenda(index) {

  var listaAgendamentos =
    lerListaLocal(
      CHAVE_AGENDAMENTOS
    );

  var itemRemovido =
    listaAgendamentos[index];


  if (!itemRemovido) {
    return;
  }


  var confirmacao =
    confirm(
      'Excluir o agendamento de "' +
      (itemRemovido.nome || 'cliente') +
      '"?'
    );


  if (!confirmacao) {
    return;
  }


  try {

    await enviarParaNuvem({

      tipo: 'excluir_agendamento',

      dados: itemRemovido

    });


    /*
      Depois de excluir, busca novamente
      a versão oficial do Google Sheets.
    */

    await sincronizarComNuvem(true);


  } catch (erro) {

    console.error(
      'Erro ao excluir agendamento:',
      erro
    );

    alert(
      'Não foi possível excluir o agendamento da nuvem.'
    );

  }
}


/* =========================================================
   SALVAR ATENDIMENTO
   ========================================================= */

async function salvarAtendimento() {

  var editIndex =
    parseInt(
      document
        .getElementById('edit-index')
        .value,
      10
    );


  var btnSalvar =
    document.getElementById(
      'btn-salvar'
    );


  var listaAtendimentos =
    lerListaLocal(
      CHAVE_ATENDIMENTOS
    );


  /*
    IMPORTANTE:
    Se estiver editando, mantém o ID
    original do Google Sheets.
  */

  var registroExistente =
    editIndex >= 0 &&
    editIndex < listaAtendimentos.length
      ? listaAtendimentos[editIndex]
      : null;


  var id =
    registroExistente &&
    registroExistente.id
      ? registroExistente.id
      : gerarId();


  var dados = {

    tipo: 'atendimento',

    id: id,

    dataRegistro:
      new Date().toLocaleString('pt-BR'),

    nome:
      document
        .getElementById('input-cliente')
        .value
        .trim(),

    data:
      document
        .getElementById('input-data')
        .value,

    retorno:
      document
        .getElementById('input-retorno')
        .value,

    valor:
      document
        .getElementById('input-valor')
        .value
        .trim(),

    tempo:
      document
        .getElementById('input-tempo')
        .value
        .trim(),

    niver:
      document
        .getElementById('input-niver')
        .value,

    endereco:
      document
        .getElementById('input-endereco')
        .value
        .trim(),

    obs:
      document
        .getElementById('input-obs')
        .value
        .trim(),

    pgto:
      Array
        .from(
          document.querySelectorAll(
            '.pgto:checked'
          )
        )
        .map(
          function(cb) {
            return cb.value;
          }
        )
        .join(', ')
  };


  if (
    !dados.nome ||
    !dados.valor ||
    !dados.data
  ) {

    alert(
      'Por favor, preencha pelo menos o Nome do Cliente, a Data e o Valor.'
    );

    return;
  }


  if (btnSalvar) {

    btnSalvar.disabled = true;

    btnSalvar.innerText =
      'Salvando na Nuvem, aguarde...';

    btnSalvar.style.opacity =
      '0.6';
  }


  try {

    var resultado =
      await enviarParaNuvem(
        dados
      );


    /*
      Usa a resposta do Apps Script
      para atualizar o aparelho.
    */

    if (
      resultado &&
      resultado.dados
    ) {

      salvarListaLocal(
        CHAVE_ATENDIMENTOS,
        resultado.dados.atendimentos || []
      );

      salvarListaLocal(
        CHAVE_AGENDAMENTOS,
        resultado.dados.agendamentos || []
      );

    } else {

      /*
        Fallback local.
      */

      if (editIndex >= 0) {

        listaAtendimentos[
          editIndex
        ] = dados;

      } else {

        listaAtendimentos.unshift(
          dados
        );
      }

      salvarListaLocal(
        CHAVE_ATENDIMENTOS,
        listaAtendimentos
      );
    }


    carregarPlanilha();

    limparForm();


  } catch (erro) {

    console.error(
      'Erro ao salvar atendimento:',
      erro
    );

    alert(
      'Não foi possível salvar o atendimento na nuvem.\n\n' +
      'Nenhuma alteração foi confirmada no sistema.'
    );

  } finally {

    if (btnSalvar) {

      btnSalvar.disabled = false;

      btnSalvar.innerText =
        'Salvar Cliente / Atendimento';

      btnSalvar.style.opacity =
        '1';
    }
  }
}


/* =========================================================
   EXCLUIR ATENDIMENTO
   ========================================================= */

async function excluir(index) {

  var listaAtendimentos =
    lerListaLocal(
      CHAVE_ATENDIMENTOS
    );


  var itemRemovido =
    listaAtendimentos[index];


  if (!itemRemovido) {
    return;
  }


  var confirmacao =
    confirm(
      'Excluir o atendimento de "' +
      (itemRemovido.nome || 'cliente') +
      '"?'
    );


  if (!confirmacao) {
    return;
  }


  try {

    await enviarParaNuvem({

      tipo: 'excluir_atendimento',

      dados: itemRemovido

    });


    /*
      Recarrega a versão oficial.
    */

    await sincronizarComNuvem(true);


  } catch (erro) {

    console.error(
      'Erro ao excluir atendimento:',
      erro
    );

    alert(
      'Não foi possível excluir o atendimento da nuvem.'
    );
  }
}


/* =========================================================
   MOMENTO DO DIA
   ========================================================= */

function definirMomentoDoDia() {

  var hoje =
    new Date();


  var elementoData =
    document.getElementById(
      'txt-data'
    );


  var elementoMomento =
    document.getElementById(
      'txt-momento'
    );


  var elementoAutor =
    document.getElementById(
      'autor-momento'
    );


  if (elementoData) {

    elementoData.innerText =
      hoje.toLocaleDateString(
        'pt-BR',
        {
          weekday: 'long',
          day: 'numeric',
          month: 'long'
        }
      );
  }


  var selecionado =
    momentosDoAno[
      obterDiaDoAno(hoje) %
      momentosDoAno.length
    ];


  if (elementoMomento) {

    elementoMomento.innerText =
      '"' +
      selecionado.frase +
      '"';
  }


  if (elementoAutor) {

    elementoAutor.innerText =
      '— ' +
      selecionado.autor;
  }


  var inputData =
    document.getElementById(
      'input-data'
    );


  if (
    inputData &&
    !inputData.value
  ) {

    inputData.value =
      dataLocalISO(hoje);

    atualizarRetornoAutomatico();
  }
}


/* =========================================================
   RETORNO AUTOMÁTICO
   ========================================================= */

function atualizarRetornoAutomatico() {

  var inputData =
    document.getElementById(
      'input-data'
    );


  var inputRetorno =
    document.getElementById(
      'input-retorno'
    );


  if (
    !inputData ||
    !inputRetorno ||
    !inputData.value
  ) {
    return;
  }


  var data =
    new Date(
      inputData.value +
      'T00:00:00'
    );


  data.setDate(
    data.getDate() + 14
  );


  inputRetorno.value =
    dataLocalISO(data);
}


/* =========================================================
   SENHA
   ========================================================= */

function solicitarSenha() {

  var modal =
    document.getElementById(
      'modal-senha'
    );


  var input =
    document.getElementById(
      'input-senha-veronica'
    );


  if (!modal || !input) {
    return;
  }


  modal.style.display =
    'flex';

  input.value =
    '';

  input.focus();
}


function fecharModal(evento) {

  if (evento) {
    evento.preventDefault();
  }


  var modal =
    document.getElementById(
      'modal-senha'
    );


  var input =
    document.getElementById(
      'input-senha-veronica'
    );


  if (modal) {
    modal.style.display =
      'none';
  }


  if (input) {
    input.value =
      '';
  }
}


async function validarSenha() {

  var input =
    document.getElementById(
      'input-senha-veronica'
    );


  if (!input) {
    return;
  }


  if (
    input.value !==
    SENHA_PAINEL
  ) {

    alert(
      'Senha incorreta.'
    );

    input.value =
      '';

    input.focus();

    return;
  }


  fecharModal();


  document.getElementById(
    'conteudo-principal'
  ).style.display =
    'none';


  document.getElementById(
    'painel-privado'
  ).style.display =
    'flex';


  setarCabecalhoEspaco();


  /*
    Primeiro mostra o último cache.
  */

  carregarAgenda();
  carregarPlanilha();


  /*
    Depois busca o Google Sheets.
  */

  await sincronizarComNuvem(false);


  /*
    E inicia atualização automática.
  */

  iniciarSincronizacaoAutomatica();
}


function sairPainel() {

  document.getElementById(
    'painel-privado'
  ).style.display =
    'none';


  document.getElementById(
    'conteudo-principal'
  ).style.display =
    'flex';


  if (intervaloSincronizacao) {

    clearInterval(
      intervaloSincronizacao
    );

    intervaloSincronizacao =
      null;
  }
}


/* =========================================================
   CABEÇALHO DO ESPAÇO PRIVADO
   ========================================================= */

function setarCabecalhoEspaco() {

  var hoje =
    new Date();


  var elementoData =
    document.getElementById(
      'espaco-data'
    );


  var elementoComemora =
    document.getElementById(
      'espaco-comemora'
    );


  var reflexao =
    document.getElementById(
      'relex-txt'
    );


  if (elementoData) {

    elementoData.innerText =
      hoje.toLocaleDateString(
        'pt-BR',
        {
          weekday: 'long',
          day: 'numeric',
          month: 'long'
        }
      );
  }


  var comemoracoes = [

    'Dia da renovação',

    'Dia do autocuidado',

    'Dia da beleza',

    'Dia da gratidão',

    'Dia da leveza'
  ];


  if (elementoComemora) {

    elementoComemora.innerText =
      'Hoje comemoramos: ' +
      comemoracoes[
        obterDiaDoAno(hoje) %
        comemoracoes.length
      ];
  }


  var frasesReflexao = [

    'Cuide de você com o mesmo carinho que oferece aos outros.',

    'Cada pequeno cuidado também é uma forma de amor.',

    'Reserve um tempo para respirar, descansar e recomeçar.',

    'A delicadeza também mora nos pequenos momentos.',

    'Seu trabalho transforma cuidado em bem-estar.'
  ];


  if (reflexao) {

    reflexao.innerText =
      frasesReflexao[
        obterDiaDoAno(hoje) %
        frasesReflexao.length
      ];
  }
}


/* =========================================================
   EDITAR ATENDIMENTO
   ========================================================= */

function editarAtendimento(index) {

  var lista =
    lerListaLocal(
      CHAVE_ATENDIMENTOS
    );


  var item =
    lista[index];


  if (!item) {
    return;
  }


  document.getElementById(
    'edit-index'
  ).value = index;


  document.getElementById(
    'input-cliente'
  ).value =
    item.nome || '';


  document.getElementById(
    'input-data'
  ).value =
    item.data || '';


  document.getElementById(
    'input-retorno'
  ).value =
    item.retorno || '';


  document.getElementById(
    'input-valor'
  ).value =
    item.valor !== undefined &&
    item.valor !== null
      ? item.valor
      : '50,00';


  document.getElementById(
    'input-tempo'
  ).value =
    item.tempo || '';


  document.getElementById(
    'input-niver'
  ).value =
    item.niver || '';


  document.getElementById(
    'input-endereco'
  ).value =
    item.endereco || '';


  document.getElementById(
    'input-obs'
  ).value =
    item.obs || '';


  document
    .querySelectorAll('.pgto')
    .forEach(
      function(cb) {

        cb.checked =
          item.pgto
            ? item.pgto
                .split(',')
                .map(
                  function(valor) {
                    return valor.trim();
                  }
                )
                .includes(cb.value)
            : false;
      }
    );


  document.getElementById(
    'form-titulo'
  ).innerText =
    '✏️ EDITAR ATENDIMENTO';


  document.getElementById(
    'btn-salvar'
  ).innerText =
    'Atualizar Atendimento';


  document.getElementById(
    'btn-cancelar'
  ).style.display =
    'block';


  document.getElementById(
    'input-cliente'
  ).focus();


  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}


/* =========================================================
   LIMPAR FORMULÁRIO
   ========================================================= */

function limparForm() {

  document.getElementById(
    'edit-index'
  ).value =
    '-1';


  document.getElementById(
    'input-cliente'
  ).value =
    '';


  document.getElementById(
    'input-retorno'
  ).value =
    '';


  document.getElementById(
    'input-valor'
  ).value =
    '50,00';


  document.getElementById(
    'input-tempo'
  ).value =
    '';


  document.getElementById(
    'input-niver'
  ).value =
    '';


  document.getElementById(
    'input-endereco'
  ).value =
    '';


  document.getElementById(
    'input-obs'
  ).value =
    '';


  document
    .querySelectorAll('.pgto')
    .forEach(
      function(cb) {
        cb.checked = false;
      }
    );


  document.getElementById(
    'input-data'
  ).value =
    dataLocalISO();


  atualizarRetornoAutomatico();


  document.getElementById(
    'form-titulo'
  ).innerText =
    '📝 NOVO ATENDIMENTO';


  document.getElementById(
    'btn-salvar'
  ).innerText =
    'Salvar Cliente / Atendimento';


  document.getElementById(
    'btn-cancelar'
  ).style.display =
    'none';
}


/* =========================================================
   CARREGAR TABELA DE ATENDIMENTOS
   ========================================================= */

function carregarPlanilha() {

  var listaAtendimentos =
    lerListaLocal(
      CHAVE_ATENDIMENTOS
    );


  var tbody =
    document.getElementById(
      'tabela-corpo'
    );


  if (!tbody) {
    return;
  }


  tbody.innerHTML =
    '';


  var agora =
    new Date();


  var mesAtual =
    agora.getMonth();


  var anoAtual =
    agora.getFullYear();


  var totalMes =
    0;


  var totalAno =
    0;


  var quantidadeMes =
    0;


  var totaisPorMes =
    Array(12).fill(0);


  listaAtendimentos.forEach(
    function(registro, index) {

      var valor =
        converterValorParaNumero(
          registro.valor
        );


      var anoAtend =
        null;


      var mesAtend =
        null;


      if (registro.data) {

        var partes =
          registro.data.split('-');


        if (partes.length === 3) {

          anoAtend =
            Number(partes[0]);


          mesAtend =
            Number(partes[1]) - 1;
        }
      }


      if (
        anoAtend === anoAtual &&
        mesAtend >= 0 &&
        mesAtend <= 11
      ) {

        totalAno +=
          valor;


        totaisPorMes[
          mesAtend
        ] += valor;


        if (
          mesAtend ===
          mesAtual
        ) {

          quantidadeMes++;

          totalMes +=
            valor;
        }
      }


      var tr =
        document.createElement(
          'tr'
        );


      tr.innerHTML =

        '<td>' +
        (index + 1) +
        '</td>' +

        '<td class="texto-esquerda">' +
        escaparHTML(
          registro.nome
        ) +
        '</td>' +

        '<td>' +
        escaparHTML(
          formatarDataBR(
            registro.data
          )
        ) +
        '</td>' +

        '<td>' +
        escaparHTML(
          formatarDataBR(
            registro.retorno
          )
        ) +
        '</td>' +

        '<td>' +
        formatarMoeda(valor) +
        '</td>' +

        '<td>' +
        escaparHTML(
          registro.tempo
        ) +
        '</td>' +

        '<td class="texto-esquerda">' +
        escaparHTML(
          registro.obs
        ) +
        '</td>' +

        '<td>' +

        '<button ' +
        'type="button" ' +
        'class="btn-acao btn-editar" ' +
        'onclick="editarAtendimento(' +
        index +
        ')">' +

        'Editar' +

        '</button>' +

        '<button ' +
        'type="button" ' +
        'class="btn-acao btn-excluir" ' +
        'onclick="excluir(' +
        index +
        ')">' +

        'Excluir' +

        '</button>' +

        '</td>';


      tbody.appendChild(tr);
    }
  );


  /*
    Indicadores
  */

  var elementoQtd =
    document.getElementById(
      'tot-atend-mes'
    );


  var elementoValorMes =
    document.getElementById(
      'tot-valor-mes'
    );


  var elementoValorAno =
    document.getElementById(
      'tot-valor-ano'
    );


  var elementoMelhor =
    document.getElementById(
      'tot-melhor-mes'
    );


  var elementoPior =
    document.getElementById(
      'tot-pior-mes'
    );


  var elementoMedia =
    document.getElementById(
      'tot-media-mes'
    );


  if (elementoQtd) {

    elementoQtd.innerText =
      quantidadeMes;
  }


  if (elementoValorMes) {

    elementoValorMes.innerText =
      formatarMoeda(
        totalMes
      );
  }


  if (elementoValorAno) {

    elementoValorAno.innerText =
      formatarMoeda(
        totalAno
      );
  }


  /*
    Melhor / pior mês
  */

  var mesesComValores =
    totaisPorMes
      .map(
        function(valor, mes) {
          return {
            valor: valor,
            mes: mes
          };
        }
      )
      .filter(
        function(item) {
          return item.valor > 0;
        }
      );


  if (
    mesesComValores.length > 0
  ) {

    var maior =
      [...mesesComValores]
        .sort(
          function(a, b) {
            return b.valor - a.valor;
          }
        )[0];


    var menor =
      [...mesesComValores]
        .sort(
          function(a, b) {
            return a.valor - b.valor;
          }
        )[0];


    if (elementoMelhor) {

      elementoMelhor.innerText =
        String(
          maior.mes + 1
        ).padStart(2, '0') +
        '/' +
        anoAtual;
    }


    if (elementoPior) {

      elementoPior.innerText =
        String(
          menor.mes + 1
        ).padStart(2, '0') +
        '/' +
        anoAtual;
    }


    if (elementoMedia) {

      elementoMedia.innerText =
        formatarMoeda(
          totalAno /
          mesesComValores.length
        );
    }

  } else {

    if (elementoMelhor) {
      elementoMelhor.innerText = '-';
    }

    if (elementoPior) {
      elementoPior.innerText = '-';
    }

    if (elementoMedia) {
      elementoMedia.innerText =
        formatarMoeda(0);
    }
  }


  /*
    Se não houver registros.
  */

  if (
    listaAtendimentos.length === 0
  ) {

    tbody.innerHTML =
      '<tr>' +
      '<td colspan="8">' +
      'Nenhum atendimento registrado.' +
      '</td>' +
      '</tr>';
  }
}


/* =========================================================
   TECLA ENTER NA SENHA
   ========================================================= */

function configurarEventosSenha() {

  var input =
    document.getElementById(
      'input-senha-veronica'
    );


  if (!input) {
    return;
  }


  input.addEventListener(
    'keydown',
    function(evento) {

      if (
        evento.key === 'Enter'
      ) {

        validarSenha();
      }


      if (
        evento.key === 'Escape'
      ) {

        fecharModal(
          evento
        );
      }
    }
  );


  var modal =
    document.getElementById(
      'modal-senha'
    );


  if (modal) {

    modal.addEventListener(
      'click',
      function(evento) {

        if (
          evento.target.id ===
          'modal-senha'
        ) {

          fecharModal();
        }
      }
    );
  }
}


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

window.addEventListener(
  'load',
  function() {

    definirMomentoDoDia();

    setarCabecalhoEspaco();

    preencherDiasUteis();

    carregarAgenda();

    carregarPlanilha();

    configurarEventosSenha();


    /*
      O site público não precisa consultar
      a planilha o tempo todo.

      A sincronização começa quando
      o painel privado é aberto.
    */

    console.log(
      'Sistema Verônica Castro iniciado.'
    );
  }
);
