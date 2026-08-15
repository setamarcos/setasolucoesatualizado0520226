/* =========================================================
   VERÔNICA CASTRO - SCRIPT PRINCIPAL
   ---------------------------------------------------------
   Mantém:
   - Agendamentos
   - Atendimento
   - WhatsApp
   - Google Sheets
   - Exclusão
   - Edição
   - Senha
   - Momento do dia
   - Retorno automático
   - Estatísticas
   - Cache local
   - Sincronização entre aparelhos
   ========================================================= */

const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbyWTN1XC2JWhqWFPiVvxKSM8EUGUW8BvxSw59j5kQx8BD580ctuiqjiFW2uPPwjF3a9/exec";

const CHAVE_ATENDIMENTOS = "veronica_atendimentos";
const CHAVE_AGENDAMENTOS = "veronica_agendamentos";

let sincronizando = false;
let ultimaSincronizacao = 0;
let timerSincronizacao = null;


/* =========================================================
   FRASES
   ========================================================= */

var momentosDoAno = [
  { frase: "Recria tua vida, sempre.", autor: "Cora Coralina" },
  { frase: "Delicadeza das pequenas coisas.", autor: "Cecília Meireles" },
  { frase: "Renda-se ao que não conhece.", autor: "Clarice Lispector" },
  { frase: "O que a memória ama, fica eterno.", autor: "Adélia Prado" },
  { frase: "Tempo pra si é acalmar a alma.", autor: "Lya Luft" }
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


function escaparHTML(valor) {
  return String(valor == null ? "" : valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function numeroBR(valor) {
  if (valor == null || valor === "") return 0;

  var texto = String(valor)
    .replace("R$", "")
    .replace(/\s/g, "")
    .trim();

  if (texto.indexOf(",") >= 0) {
    texto = texto.replace(/\./g, "").replace(",", ".");
  }

  var n = parseFloat(texto);

  return isNaN(n) ? 0 : n;
}


function dinheiroBR(valor) {
  return "R$ " + numeroBR(valor)
    .toFixed(2)
    .replace(".", ",");
}


function hojeISO() {
  var d = new Date();

  var ano = d.getFullYear();
  var mes = String(d.getMonth() + 1).padStart(2, "0");
  var dia = String(d.getDate()).padStart(2, "0");

  return ano + "-" + mes + "-" + dia;
}


function dataBR(data) {
  if (!data) return "";

  var texto = String(data).trim();

  /* YYYY-MM-DD */
  if (/^\d{4}-\d{2}-\d{2}/.test(texto)) {
    var p = texto.substring(0, 10).split("-");
    return p[2] + "/" + p[1] + "/" + p[0];
  }

  /* DD/MM/YYYY */
  if (/^\d{2}\/\d{2}\/\d{4}/.test(texto)) {
    return texto.substring(0, 10);
  }

  /* Data do Google / JavaScript */
  var d = new Date(texto);

  if (!isNaN(d.getTime())) {
    return String(d.getDate()).padStart(2, "0") + "/" +
      String(d.getMonth() + 1).padStart(2, "0") + "/" +
      d.getFullYear();
  }

  return texto;
}


function normalizarDataISO(valor) {
  if (!valor) return "";

  var texto = String(valor).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    return texto;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(texto)) {
    var p = texto.split("/");
    return p[2] + "-" + p[1] + "-" + p[0];
  }

  var d = new Date(texto);

  if (!isNaN(d.getTime())) {
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }

  return texto;
}


/* =========================================================
   CORREÇÃO DE HORÁRIO VINDO DO GOOGLE SHEETS
   ========================================================= */

function normalizarHorario(valor) {
  if (valor == null || valor === "") return "";

  var texto = String(valor).trim();

  /*
     Se já estiver no formato HH:MM
  */
  var match = texto.match(/^(\d{1,2}):(\d{1,2})/);

  if (match) {
    var h = String(parseInt(match[1], 10)).padStart(2, "0");
    var m = String(parseInt(match[2], 10)).padStart(2, "0");

    return h + ":" + m;
  }

  /*
     Google pode mandar:
     Sat Dec 30 1899 17:20:00
  */
  var data = new Date(texto);

  if (!isNaN(data.getTime())) {
    return String(data.getHours()).padStart(2, "0") +
      ":" +
      String(data.getMinutes()).padStart(2, "0");
  }

  /*
     Número decimal do Sheets.
     Exemplo:
     0.7222 = aproximadamente 17:20
  */
  var n = parseFloat(texto);

  if (!isNaN(n) && n >= 0 && n < 1) {
    var minutos = Math.round(n * 24 * 60);

    var horas = Math.floor(minutos / 60);
    var mins = minutos % 60;

    return String(horas).padStart(2, "0") +
      ":" +
      String(mins).padStart(2, "0");
  }

  return texto;
}


/* =========================================================
   LEITURA DO CACHE
   ========================================================= */

function lerAtendimentosLocal() {
  try {
    return JSON.parse(
      localStorage.getItem(CHAVE_ATENDIMENTOS) || "[]"
    );
  } catch (e) {
    return [];
  }
}


function lerAgendamentosLocal() {
  try {
    return JSON.parse(
      localStorage.getItem(CHAVE_AGENDAMENTOS) || "[]"
    );
  } catch (e) {
    return [];
  }
}


function salvarAtendimentosLocal(lista) {
  localStorage.setItem(
    CHAVE_ATENDIMENTOS,
    JSON.stringify(lista || [])
  );
}


function salvarAgendamentosLocal(lista) {
  localStorage.setItem(
    CHAVE_AGENDAMENTOS,
    JSON.stringify(lista || [])
  );
}


/* =========================================================
   DIAS ÚTEIS
   ========================================================= */

function preencherDiasUteis() {
  var selectDia = document.getElementById("select-dia");

  if (!selectDia) return;

  selectDia.innerHTML = "";

  var hoje = new Date();
  var contador = 0;
  var d = new Date(hoje);

  while (contador < 10) {
    d.setDate(d.getDate() + 1);

    var diaSemana = d.getDay();

    if (diaSemana !== 0 && diaSemana !== 6) {
      var ano = d.getFullYear();
      var mes = String(d.getMonth() + 1).padStart(2, "0");
      var dia = String(d.getDate()).padStart(2, "0");

      var iso = ano + "-" + mes + "-" + dia;

      var textoFormatado = d.toLocaleDateString(
        "pt-BR",
        {
          weekday: "long",
          day: "numeric",
          month: "long"
        }
      );

      var opt = document.createElement("option");

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
   ENVIO DE AGENDAMENTO
   ========================================================= */

function enviarAgendamentoSite() {
  var nomeCliente =
    document.getElementById("input-nome-cliente").value.trim();

  var telCliente =
    document.getElementById("input-tel-cliente").value.trim();

  var diaSelecionado =
    document.getElementById("select-dia").value;

  var horarioSelecionado =
    document.getElementById("select-horario").value;

  if (!nomeCliente || !telCliente) {
    alert("Por favor, preencha seu nome e telefone para agendar.");
    return;
  }

  var btnAgendar =
    document.querySelector(".btn-agendar-site");

  if (btnAgendar) {
    btnAgendar.disabled = true;
    btnAgendar.innerText = "Agendando...";
    btnAgendar.style.opacity = "0.6";
  }

  var payload = {
    tipo: "agendamento",
    dataRegistro: new Date().toLocaleString("pt-BR"),
    nome: nomeCliente,
    telefone: telCliente,
    dia: diaSelecionado,
    horario: normalizarHorario(horarioSelecionado),
    status: "Pendente"
  };

  /*
     Cache imediato.
     Assim a tela responde sem esperar a internet.
  */
  var lista = lerAgendamentosLocal();

  lista.unshift(payload);

  salvarAgendamentosLocal(lista);

  carregarAgenda();

  /*
     Envia para o servidor sem bloquear a tela.
  */
  enviarParaServidor(payload)
    .then(function () {
      ultimaSincronizacao = 0;
    })
    .catch(function (erro) {
      console.warn("Agendamento enviado/pendente:", erro);
    })
    .finally(function () {
      if (btnAgendar) {
        btnAgendar.disabled = false;
        btnAgendar.innerText = "Agendar Horário";
        btnAgendar.style.opacity = "1";
      }
    });

  var dataFormatadaBr =
    dataBR(diaSelecionado);

  var textoZap =
    "Olá Verônica! Gostaria de agendar Manicure Pé e Mão.\n\n" +
    "👤 Nome: " + nomeCliente + "\n" +
    "📞 Telefone: " + telCliente + "\n" +
    "📅 Data: " + dataFormatadaBr + "\n" +
    "⏰ Horário: " + normalizarHorario(horarioSelecionado);

  var urlZap =
    "https://wa.me/5531991946163?text=" +
    encodeURIComponent(textoZap);

  document.getElementById("input-nome-cliente").value = "";
  document.getElementById("input-tel-cliente").value = "";

  window.open(urlZap, "_blank");
}


/* =========================================================
   POST CENTRALIZADO
   ========================================================= */

function enviarParaServidor(dados) {
  return fetch(URL_SCRIPT, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(dados)
  });
}


/* =========================================================
   AGENDA
   ========================================================= */

function carregarAgenda() {
  var lista = lerAgendamentosLocal();

  var tbody =
    document.getElementById("tabela-agenda-corpo");

  if (!tbody) return;

  tbody.innerHTML = "";

  if (!lista.length) {
    tbody.innerHTML =
      '<tr><td colspan="6">Nenhum agendamento registrado.</td></tr>';

    return;
  }

  lista.forEach(function (item, index) {
    var dataFormatada = dataBR(item.dia);
    var horario = normalizarHorario(item.horario);

    var tr = document.createElement("tr");

    tr.innerHTML =
      "<td>" + (index + 1) + "</td>" +
      '<td style="text-align:left">' +
      escaparHTML(item.nome || "") +
      "</td>" +
      "<td>" +
      escaparHTML(item.telefone || "") +
      "</td>" +
      "<td>" +
      escaparHTML(dataFormatada) +
      "</td>" +
      "<td>" +
      escaparHTML(horario) +
      "</td>" +
      "<td>" +
      '<button class="btn-acao btn-excluir" onclick="excluirAgenda(' +
      index +
      ')">Excluir</button>' +
      "</td>";

    tbody.appendChild(tr);
  });
}


/* =========================================================
   EXCLUIR AGENDAMENTO
   ========================================================= */

function excluirAgenda(index) {
  var lista = lerAgendamentosLocal();

  if (!lista[index]) return;

  var itemRemovido = lista.splice(index, 1)[0];

  salvarAgendamentosLocal(lista);

  carregarAgenda();

  enviarParaServidor({
    tipo: "excluir_agendamento",
    dados: itemRemovido
  })
  .then(function () {
    ultimaSincronizacao = 0;
  })
  .catch(function (e) {
    console.warn("Exclusão enviada:", e);
  });
}


/* =========================================================
   SALVAR ATENDIMENTO
   ========================================================= */

function salvarAtendimento() {
  var editIndex =
    parseInt(
      document.getElementById("edit-index").value,
      10
    );

  var btnSalvar =
    document.getElementById("btn-salvar");

  var dados = {
    tipo: "atendimento",
    dataRegistro: new Date().toLocaleString("pt-BR"),

    nome:
      document.getElementById("input-cliente").value.trim(),

    data:
      document.getElementById("input-data").value,

    retorno:
      document.getElementById("input-retorno").value,

    valor:
      document.getElementById("input-valor").value,

    tempo:
      document.getElementById("input-tempo").value,

    niver:
      document.getElementById("input-niver").value,

    endereco:
      document.getElementById("input-endereco").value,

    obs:
      document.getElementById("input-obs").value,

    pgto:
      Array.from(
        document.querySelectorAll(".pgto:checked")
      )
      .map(function (cb) {
        return cb.value;
      })
      .join(", ")
  };

  if (!dados.nome || !dados.valor || !dados.data) {
    alert(
      "Por favor, preencha pelo menos o Nome do Cliente, a Data e o Valor."
    );
    return;
  }

  if (btnSalvar) {
    btnSalvar.disabled = true;
    btnSalvar.innerText = "Salvando...";
    btnSalvar.style.opacity = "0.6";
  }

  var lista = lerAtendimentosLocal();

  /*
     Edição local.
  */
  if (editIndex >= 0 && lista[editIndex]) {
    lista[editIndex] = dados;
  } else {
    lista.unshift(dados);
  }

  salvarAtendimentosLocal(lista);

  carregarPlanilha();

  /*
     Continua enviando exatamente como atendimento,
     preservando o funcionamento do dpost existente.
  */
  enviarParaServidor(dados)
    .then(function () {
      ultimaSincronizacao = 0;
    })
    .catch(function (erro) {
      console.warn(
        "Atendimento enviado/pendente:",
        erro
      );
    })
    .finally(function () {
      limparForm();

      if (btnSalvar) {
        btnSalvar.disabled = false;
        btnSalvar.innerText =
          "Salvar Cliente / Atendimento";
        btnSalvar.style.opacity = "1";
      }
    });
}


/* =========================================================
   EXCLUIR ATENDIMENTO
   ========================================================= */

function excluir(index) {
  var lista = lerAtendimentosLocal();

  if (!lista[index]) return;

  var itemRemovido = lista.splice(index, 1)[0];

  salvarAtendimentosLocal(lista);

  carregarPlanilha();

  enviarParaServidor({
    tipo: "excluir_atendimento",
    dados: itemRemovido
  })
  .then(function () {
    ultimaSincronizacao = 0;
  })
  .catch(function (e) {
    console.warn("Exclusão enviada:", e);
  });
}


/* =========================================================
   MOMENTO DO DIA
   ========================================================= */

function definirMomentoDoDia() {
  var hoje = new Date();

  var txtData =
    document.getElementById("txt-data");

  if (txtData) {
    txtData.innerText =
      hoje.toLocaleDateString(
        "pt-BR",
        {
          weekday: "long",
          day: "numeric",
          month: "long"
        }
      );
  }

  var sel =
    momentosDoAno[
      obterDiaDoAno(hoje) %
      momentosDoAno.length
    ];

  var txtMomento =
    document.getElementById("txt-momento");

  var autor =
    document.getElementById("autor-momento");

  if (txtMomento) {
    txtMomento.innerText =
      '"' + sel.frase + '"';
  }

  if (autor) {
    autor.innerText =
      "— " + sel.autor;
  }

  var inputDataEl =
    document.getElementById("input-data");

  if (
    inputDataEl &&
    !inputDataEl.value
  ) {
    inputDataEl.value = hojeISO();
    atualizarRetornoAutomatico();
  }
}


/* =========================================================
   RETORNO AUTOMÁTICO
   ========================================================= */

function atualizarRetornoAutomatico() {
  var campo =
    document.getElementById("input-data");

  var retorno =
    document.getElementById("input-retorno");

  if (!campo || !retorno || !campo.value) {
    return;
  }

  var d =
    new Date(
      campo.value + "T00:00:00"
    );

  d.setDate(d.getDate() + 14);

  retorno.value =
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0");
}


/* =========================================================
   SENHA
   ========================================================= */

function solicitarSenha() {
  var modal =
    document.getElementById("modal-senha");

  if (!modal) return;

  modal.style.display = "flex";

  var campo =
    document.getElementById(
      "input-senha-veronica"
    );

  if (campo) campo.focus();
}


function fecharModal(e) {
  if (e) e.preventDefault();

  var modal =
    document.getElementById("modal-senha");

  if (modal) {
    modal.style.display = "none";
  }

  var campo =
    document.getElementById(
      "input-senha-veronica"
    );

  if (campo) campo.value = "";
}


function validarSenha() {
  var campo =
    document.getElementById(
      "input-senha-veronica"
    );

  if (!campo) return;

  if (campo.value === "1401") {
    fecharModal();

    document.getElementById(
      "conteudo-principal"
    ).style.display = "none";

    document.getElementById(
      "painel-privado"
    ).style.display = "flex";

    setarCabecalhoEspaco();

    carregarAgenda();
    carregarPlanilha();

    /*
       Ao entrar no espaço privado,
       força sincronização imediatamente.
    */
    sincronizarAgora(true);

  } else {
    alert("Senha incorreta.");
    campo.value = "";
  }
}


/* =========================================================
   SAIR
   ========================================================= */

function sairPainel() {
  document.getElementById(
    "painel-privado"
  ).style.display = "none";

  document.getElementById(
    "conteudo-principal"
  ).style.display = "flex";
}


/* =========================================================
   CABEÇALHO
   ========================================================= */

function setarCabecalhoEspaco() {
  var hoje = new Date();

  var campo =
    document.getElementById("espaco-data");

  if (campo) {
    campo.innerText =
      hoje.toLocaleDateString(
        "pt-BR",
        {
          weekday: "long",
          day: "numeric",
          month: "long"
        }
      );
  }

  var comem = [
    "Dia da renovação",
    "Dia do autocuidado",
    "Dia da beleza",
    "Dia da gratidão",
    "Dia da leveza"
  ];

  var campoComem =
    document.getElementById(
      "espaco-comemora"
    );

  if (campoComem) {
    campoComem.innerText =
      "Hoje comemoramos: " +
      comem[
        obterDiaDoAno(hoje) %
        comem.length
      ];
  }
}


/* =========================================================
   EDITAR ATENDIMENTO
   ========================================================= */

function editarAtendimento(index) {
  var lista = lerAtendimentosLocal();

  var item = lista[index];

  if (!item) return;

  document.getElementById(
    "edit-index"
  ).value = index;

  document.getElementById(
    "input-cliente"
  ).value = item.nome || "";

  document.getElementById(
    "input-data"
  ).value =
    normalizarDataISO(item.data || "");

  document.getElementById(
    "input-retorno"
  ).value =
    normalizarDataISO(item.retorno || "");

  document.getElementById(
    "input-valor"
  ).value =
    item.valor || "50,00";

  document.getElementById(
    "input-tempo"
  ).value =
    item.tempo || "";

  document.getElementById(
    "input-niver"
  ).value =
    normalizarDataISO(item.niver || "");

  document.getElementById(
    "input-endereco"
  ).value =
    item.endereco || "";

  document.getElementById(
    "input-obs"
  ).value =
    item.obs || "";

  document
    .querySelectorAll(".pgto")
    .forEach(function (cb) {
      cb.checked =
        item.pgto
          ? item.pgto.includes(cb.value)
          : false;
    });

  document.getElementById(
    "form-titulo"
  ).innerText =
    "✏️ EDITAR ATENDIMENTO";

  document.getElementById(
    "btn-salvar"
  ).innerText =
    "Atualizar Atendimento";

  document.getElementById(
    "btn-cancelar"
  ).style.display = "block";
}


/* =========================================================
   LIMPAR FORMULÁRIO
   ========================================================= */

function limparForm() {
  document.getElementById(
    "edit-index"
  ).value = "-1";

  document.getElementById(
    "input-cliente"
  ).value = "";

  document.getElementById(
    "input-retorno"
  ).value = "";

  document.getElementById(
    "input-valor"
  ).value = "50,00";

  document.getElementById(
    "input-tempo"
  ).value = "";

  document.getElementById(
    "input-niver"
  ).value = "";

  document.getElementById(
    "input-endereco"
  ).value = "";

  document.getElementById(
    "input-obs"
  ).value = "";

  document
    .querySelectorAll(".pgto")
    .forEach(function (cb) {
      cb.checked = false;
    });

  document.getElementById(
    "input-data"
  ).value = hojeISO();

  atualizarRetornoAutomatico();

  document.getElementById(
    "form-titulo"
  ).innerText =
    "📝 NOVO ATENDIMENTO";

  document.getElementById(
    "btn-salvar"
  ).innerText =
    "Salvar Cliente / Atendimento";

  document.getElementById(
    "btn-cancelar"
  ).style.display = "none";
}


/* =========================================================
   CARREGAR REGISTRO LOCAL
   ========================================================= */

function carregarPlanilha() {
  var lista =
    lerAtendimentosLocal();

  var tbody =
    document.getElementById(
      "tabela-corpo"
    );

  if (!tbody) return;

  tbody.innerHTML = "";

  var totalMesValorCalc = 0;
  var totalAnoValorCalc = 0;
  var qtdeMes = 0;

  var agora = new Date();

  var mesAtual =
    agora.getMonth();

  var anoAtual =
    agora.getFullYear();

  lista.forEach(function (r, i) {
    var valNum =
      numeroBR(r.valor);

    var dataISO =
      normalizarDataISO(r.data);

    var partes =
      dataISO
        ? dataISO.split("-")
        : [];

    var anoAtend =
      partes.length === 3
        ? parseInt(partes[0], 10)
        : anoAtual;

    var mesAtend =
      partes.length === 3
        ? parseInt(partes[1], 10) - 1
        : mesAtual;

    if (anoAtend === anoAtual) {
      totalAnoValorCalc += valNum;

      if (mesAtend === mesAtual) {
        qtdeMes++;
        totalMesValorCalc += valNum;
      }
    }

    var tr =
      document.createElement("tr");

    tr.innerHTML =
      "<td>" +
      (i + 1) +
      "</td>" +

      '<td style="text-align:left">' +
      escaparHTML(r.nome || "") +
      "</td>" +

      "<td>" +
      escaparHTML(
        dataBR(dataISO)
      ) +
      "</td>" +

      "<td>" +
      escaparHTML(
        dataBR(r.retorno)
      ) +
      "</td>" +

      "<td>" +
      dinheiroBR(valNum) +
      "</td>" +

      "<td>" +
      escaparHTML(r.tempo || "") +
      "</td>" +

      '<td style="text-align:left">' +
      escaparHTML(r.obs || "") +
      "</td>" +

      "<td>" +
      '<button class="btn-acao btn-editar" onclick="editarAtendimento(' +
      i +
      ')">Editar</button> ' +

      '<button class="btn-acao btn-excluir" onclick="excluir(' +
      i +
      ')">Excluir</button>' +

      "</td>";

    tbody.appendChild(tr);
  });

  var elAtend =
    document.getElementById(
      "tot-atend-mes"
    );

  var elMes =
    document.getElementById(
      "tot-valor-mes"
    );

  var elAno =
    document.getElementById(
      "tot-valor-ano"
    );

  if (elAtend) {
    elAtend.innerText = qtdeMes;
  }

  if (elMes) {
    elMes.innerText =
      dinheiroBR(totalMesValorCalc);
  }

  if (elAno) {
    elAno.innerText =
      dinheiroBR(totalAnoValorCalc);
  }

  calcularMelhorPiorMes(lista);
}


/* =========================================================
   MELHOR / PIOR / MÉDIA
   ========================================================= */

function calcularMelhorPiorMes(lista) {
  var totais = {};

  lista.forEach(function (item) {
    var data =
      normalizarDataISO(item.data);

    if (!data) return;

    var partes =
      data.split("-");

    if (partes.length !== 3) return;

    var chave =
      partes[0] + "-" + partes[1];

    if (!totais[chave]) {
      totais[chave] = 0;
    }

    totais[chave] += numeroBR(item.valor);
  });

  var chaves =
    Object.keys(totais);

  var melhor = null;
  var pior = null;

  chaves.forEach(function (chave) {
    var valor = totais[chave];

    if (!melhor || valor > melhor.valor) {
      melhor = {
        chave: chave,
        valor: valor
      };
    }

    if (!pior || valor < pior.valor) {
      pior = {
        chave: chave,
        valor: valor
      };
    }
  });

  var melhorEl =
    document.getElementById(
      "tot-melhor-mes"
    );

  var piorEl =
    document.getElementById(
      "tot-pior-mes"
    );

  var mediaEl =
    document.getElementById(
      "tot-media-mes"
    );

  if (!melhor) {
    if (melhorEl) melhorEl.innerText = "-";
    if (piorEl) piorEl.innerText = "-";
    if (mediaEl) mediaEl.innerText = "R$ 0,00";
    return;
  }

  function nomeMes(chave) {
    var p = chave.split("-");

    var d =
      new Date(
        parseInt(p[0], 10),
        parseInt(p[1], 10) - 1,
        1
      );

    return d.toLocaleDateString(
      "pt-BR",
      {
        month: "2-digit",
        year: "numeric"
      }
    );
  }

  if (melhorEl) {
    melhorEl.innerText =
      nomeMes(melhor.chave);
  }

  if (piorEl) {
    piorEl.innerText =
      nomeMes(pior.chave);
  }

  var soma = 0;

  chaves.forEach(function (c) {
    soma += totais[c];
  });

  var media =
    chaves.length
      ? soma / chaves.length
      : 0;

  if (mediaEl) {
    mediaEl.innerText =
      dinheiroBR(media);
  }
}


/* =========================================================
   SINCRONIZAÇÃO
   ---------------------------------------------------------
   O dger do seu Apps Script deve responder ao GET.
   O código aceita vários formatos de resposta para não
   quebrar caso o retorno esteja encapsulado em dados/data.
   ========================================================= */

function extrairDadosServidor(resposta) {
  if (!resposta) return null;

  var dados = resposta;

  if (typeof dados === "string") {
    try {
      dados = JSON.parse(dados);
    } catch (e) {
      return null;
    }
  }

  if (!dados) return null;

  /*
     Formato ideal:
     {
       atendimentos: [],
       agendamentos: []
     }
  */
  if (
    Array.isArray(dados.atendimentos) ||
    Array.isArray(dados.agendamentos)
  ) {
    return {
      atendimentos:
        Array.isArray(dados.atendimentos)
          ? dados.atendimentos
          : null,

      agendamentos:
        Array.isArray(dados.agendamentos)
          ? dados.agendamentos
          : null
    };
  }

  /*
     Outros formatos comuns.
  */
  if (
    dados.dados &&
    typeof dados.dados === "object"
  ) {
    return extrairDadosServidor(
      dados.dados
    );
  }

  if (
    dados.data &&
    typeof dados.data === "object"
  ) {
    return extrairDadosServidor(
      dados.data
    );
  }

  /*
     Se vierem duas listas com nomes diferentes.
  */
  if (
    Array.isArray(dados.agenda) ||
    Array.isArray(dados.atendimento)
  ) {
    return {
      atendimentos:
        Array.isArray(dados.atendimento)
          ? dados.atendimento
          : null,

      agendamentos:
        Array.isArray(dados.agenda)
          ? dados.agenda
          : null
    };
  }

  /*
     Se vier simplesmente uma lista.
  */
  if (Array.isArray(dados)) {
    var atend = [];
    var agenda = [];

    dados.forEach(function (item) {
      if (!item || typeof item !== "object") {
        return;
      }

      var tipo =
        String(
          item.tipo ||
          item.Tipo ||
          ""
        ).toLowerCase();

      if (
        tipo.includes("agendamento") ||
        item.horario ||
        item.telefone
      ) {
        agenda.push(item);
      } else {
        atend.push(item);
      }
    });

    return {
      atendimentos: atend,
      agendamentos: agenda
    };
  }

  return null;
}


/* =========================================================
   NORMALIZAÇÃO DOS DADOS DO SERVIDOR
   ========================================================= */

function normalizarAtendimentoServidor(item) {
  if (!item) return null;

  return {
    tipo: "atendimento",

    dataRegistro:
      item.dataRegistro ||
      item.DataRegistro ||
      "",

    nome:
      item.nome ||
      item.Nome ||
      item.cliente ||
      item.Cliente ||
      "",

    data:
      normalizarDataISO(
        item.data ||
        item.Data ||
        item.dataAtendimento ||
        item.DataAtendimento ||
        ""
      ),

    retorno:
      normalizarDataISO(
        item.retorno ||
        item.Retorno ||
        ""
      ),

    valor:
      item.valor ??
      item.Valor ??
      "0",

    tempo:
      item.tempo ||
      item.Tempo ||
      "",

    niver:
      normalizarDataISO(
        item.niver ||
        item.Niver ||
        item.aniversario ||
        item.Aniversario ||
        ""
      ),

    endereco:
      item.endereco ||
      item.Endereco ||
      "",

    obs:
      item.obs ||
      item.Obs ||
      item.observacao ||
      item.Observacao ||
      "",

    pgto:
      item.pgto ||
      item.Pgto ||
      item.formaPgto ||
      ""
  };
}


function normalizarAgendamentoServidor(item) {
  if (!item) return null;

  return {
    tipo: "agendamento",

    dataRegistro:
      item.dataRegistro ||
      item.DataRegistro ||
      "",

    nome:
      item.nome ||
      item.Nome ||
      item.cliente ||
      item.Cliente ||
      "",

    telefone:
      item.telefone ||
      item.Telefone ||
      item.tel ||
      item.Tel ||
      "",

    dia:
      normalizarDataISO(
        item.dia ||
        item.Dia ||
        item.data ||
        item.Data ||
        ""
      ),

    horario:
      normalizarHorario(
        item.horario ||
        item.Horario ||
        item.hora ||
        item.Hora ||
        ""
      ),

    status:
      item.status ||
      item.Status ||
      "Pendente"
  };
}


/* =========================================================
   SINCRONIZAÇÃO PRINCIPAL
   ========================================================= */

async function sincronizarAgora(forcar) {
  var agora = Date.now();

  /*
     Evita várias chamadas simultâneas.
  */
  if (sincronizando) return;

  /*
     Se acabou de sincronizar, não repete imediatamente.
  */
  if (
    !forcar &&
    agora - ultimaSincronizacao < 5000
  ) {
    return;
  }

  sincronizando = true;

  try {
    /*
       dger via GET.

       O parâmetro "dger=1" ajuda a identificar
       a leitura sem alterar o dpost.
    */
    var separador =
      URL_SCRIPT.includes("?")
        ? "&"
        : "?";

    var url =
      URL_SCRIPT +
      separador +
      "dger=1&_=" +
      Date.now();

    var resposta =
      await fetch(url, {
        method: "GET",
        cache: "no-store"
      });

    if (!resposta.ok) {
      throw new Error(
        "Servidor respondeu " +
        resposta.status
      );
    }

    var texto =
      await resposta.text();

    var dados =
      extrairDadosServidor(texto);

    /*
       Se o dger respondeu corretamente,
       atualiza o cache local dos aparelhos.
    */
    if (dados) {
      if (
        Array.isArray(
          dados.atendimentos
        )
      ) {
        var listaAtendimentos =
          dados.atendimentos
            .map(
              normalizarAtendimentoServidor
            )
            .filter(Boolean);

        salvarAtendimentosLocal(
          listaAtendimentos
        );
      }

      if (
        Array.isArray(
          dados.agendamentos
        )
      ) {
        var listaAgendamentos =
          dados.agendamentos
            .map(
              normalizarAgendamentoServidor
            )
            .filter(Boolean);

        salvarAgendamentosLocal(
          listaAgendamentos
        );
      }

      carregarAgenda();
      carregarPlanilha();

      ultimaSincronizacao =
        Date.now();
    }

  } catch (erro) {
    /*
       Se estiver sem internet,
       NÃO apaga o cache.

       Assim nada desaparece da tela.
    */
    console.warn(
      "Sincronização temporariamente indisponível:",
      erro
    );

  } finally {
    sincronizando = false;
  }
}


/* =========================================================
   SINCRONIZAÇÃO AUTOMÁTICA
   ========================================================= */

function iniciarSincronizacao() {
  if (timerSincronizacao) {
    clearInterval(
      timerSincronizacao
    );
  }

  /*
     Primeira leitura.
  */
  sincronizarAgora(true);

  /*
     A cada 10 segundos.
     Leve para Android.
  */
  timerSincronizacao =
    setInterval(function () {
      sincronizarAgora(false);
    }, 10000);
}


/* =========================================================
   QUANDO VOLTA PARA A ABA
   ========================================================= */

document.addEventListener(
  "visibilitychange",
  function () {
    if (
      document.visibilityState ===
      "visible"
    ) {
      sincronizarAgora(true);
    }
  }
);


/* =========================================================
   QUANDO A JANELA RECEBE FOCO
   ========================================================= */

window.addEventListener(
  "focus",
  function () {
    sincronizarAgora(true);
  }
);


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

window.onload = function () {

  /*
     Primeiro mostra o cache imediatamente.
     Isso deixa o Android rápido.
  */
  definirMomentoDoDia();

  setarCabecalhoEspaco();

  preencherDiasUteis();

  carregarAgenda();

  carregarPlanilha();

  /*
     Depois busca a versão central.
  */
  iniciarSincronizacao();
};
