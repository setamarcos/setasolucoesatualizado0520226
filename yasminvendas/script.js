const CONFIG = {
  api: "https://script.google.com/macros/s/AKfycbztuhTxqY32sHTZeYBfHGCYVR3qjOVGRlbom4uMFPlct37nKBDnXtYNo5EJECJeQBd3/exec",
  whatsapp: "5531982369189",
  senha: "1401",
  valorTrufa: 5
};

/* =========================
   DATA / HORA
========================= */

function atualizarDataHora() {
  const agora = new Date();

  document.getElementById("dataHora").textContent =
    agora.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
}

setInterval(atualizarDataHora, 1000);
atualizarDataHora();

/* =========================
   PEDIDO CLIENTE
========================= */

const inputsPedido = document.querySelectorAll(".sabor input");

function atualizarPedido() {
  let quantidade = 0;

  inputsPedido.forEach(input => {
    quantidade += Number(input.value) || 0;
  });

  const total = quantidade * CONFIG.valorTrufa;

  document.getElementById("totalQuantidade").textContent = quantidade;
  document.getElementById("valorTotal").textContent = dinheiro(total);
}

inputsPedido.forEach(input => {
  input.addEventListener("input", atualizarPedido);
});

atualizarPedido();

document.getElementById("confirmarPedido")
  .addEventListener("click", () => {

    let linhas = [];
    let totalQtd = 0;

    inputsPedido.forEach(input => {

      const qtd = Number(input.value) || 0;

      if (qtd > 0) {
        const sabor = input.dataset.sabor;

        linhas.push(`${qtd}x ${sabor}`);
        totalQtd += qtd;
      }
    });

    if (totalQtd === 0) {
      mostrarToast("Escolha pelo menos uma trufa.");
      return;
    }

    const total = totalQtd * CONFIG.valorTrufa;

    const mensagem =
      `Olá Yasmin! Gostaria de receber o seguinte pedido:\n\n` +
      linhas.join("\n") +
      `\n\nTotal: ${totalQtd} trufas` +
      `\nValor: ${dinheiro(total)}` +
      `\n\nAguardo sua confirmação.`;

    abrirWhatsApp(mensagem);
  });

/* =========================
   WHATSAPP
========================= */

function abrirWhatsApp(mensagem) {

  const url =
    `https://wa.me/${CONFIG.whatsapp}?text=` +
    encodeURIComponent(mensagem);

  window.open(url, "_blank");
}

/* =========================
   PAINEL
========================= */

const modal = document.getElementById("painelControle");

document.getElementById("abrirControle")
  .addEventListener("click", () => {

    modal.classList.add("aberto");

    document.getElementById("senhaControle").focus();
  });

document.getElementById("fecharPainel")
  .addEventListener("click", fecharPainel);

function fecharPainel() {

  modal.classList.remove("aberto");

  document.getElementById("loginArea").classList.remove("oculto");

  document.getElementById("sistemaControle").classList.add("oculto");

  document.getElementById("senhaControle").value = "";
}

document.getElementById("entrarControle")
  .addEventListener("click", entrar);

document.getElementById("senhaControle")
  .addEventListener("keydown", event => {

    if (event.key === "Enter") {
      entrar();
    }
  });

function entrar() {

  const senha =
    document.getElementById("senhaControle").value;

  if (senha !== CONFIG.senha) {

    document.getElementById("erroSenha").textContent =
      "Senha incorreta.";

    return;
  }

  document.getElementById("erroSenha").textContent = "";

  document.getElementById("loginArea").classList.add("oculto");

  document.getElementById("sistemaControle").classList.remove("oculto");

  carregarDados();
}

document.getElementById("sairControle")
  .addEventListener("click", fecharPainel);

/* =========================
   LINHAS DE SABORES
========================= */

function adicionarLinhaSabor(tipo) {

  const containerId =
    tipo === "venda"
      ? "containerVendaSabores"
      : "containerProducaoSabores";

  const classeInput =
    tipo === "venda"
      ? "venda-sabor"
      : "producao-sabor";

  const container =
    document.getElementById(containerId);

  const nomeSabor =
    prompt("Digite o nome do novo sabor:");

  if (!nomeSabor || !nomeSabor.trim()) return;

  const nome = nomeSabor.trim();

  const label =
    document.createElement("label");

  label.innerHTML =
    `${nome} <input class="${classeInput}" data-sabor="${nome}" type="number" min="0" value="0">`;

  container.appendChild(label);
}

function removerLinhaSabor(tipo) {

  const containerId =
    tipo === "venda"
      ? "containerVendaSabores"
      : "containerProducaoSabores";

  const container =
    document.getElementById(containerId);

  const labels =
    container.querySelectorAll("label");

  if (labels.length > 1) {

    container.removeChild(
      labels[labels.length - 1]
    );

  } else {

    mostrarToast(
      "É necessário manter pelo menos um sabor."
    );
  }
}

/* =========================
   SALVAR VENDA
========================= */

document.getElementById("salvarVenda")
  .addEventListener("click", async () => {

    const total =
      Number(document.getElementById("vendaTotal").value);

    if (!total || total < 1) {

      mostrarToast(
        "Informe o total de trufas vendidas."
      );

      return;
    }

    const sabores =
      coletarSabores(".venda-sabor");

    const saboresApontados =
      Object.values(sabores)
        .reduce((a, b) => a + b, 0);

    if (saboresApontados > total) {

      mostrarToast(
        "Os sabores não podem ultrapassar o total vendido."
      );

      return;
    }

    const dados = {

      acao: "venda",

      local:
        document.getElementById("vendaLocal").value.trim(),

      tempo:
        Number(document.getElementById("vendaTempo").value) || 0,

      total: total,

      valor: total * CONFIG.valorTrufa,

      sabores: sabores
    };

    const enviado =
      await enviarParaPlanilha(dados);

    if (!enviado) return;

    limparFormularioVenda();

    mostrarToast("Venda salva.");

    carregarDados();
  });

/* =========================
   SALVAR PRODUÇÃO
========================= */

document.getElementById("salvarProducao")
  .addEventListener("click", async () => {

    const total =
      Number(document.getElementById("producaoTotal").value);

    const gasto =
      Number(document.getElementById("producaoGasto").value) || 0;

    if (!total || total < 1) {

      mostrarToast(
        "Informe o total produzido."
      );

      return;
    }

    const sabores =
      coletarSabores(".producao-sabor");

    const saboresApontados =
      Object.values(sabores)
        .reduce((a, b) => a + b, 0);

    if (saboresApontados > total) {

      mostrarToast(
        "Os sabores não podem ultrapassar o total produzido."
      );

      return;
    }

    const dados = {

      acao: "producao",

      local:
        document.getElementById("producaoLocal").value.trim(),

      tempo:
        Number(document.getElementById("producaoTempo").value) || 0,

      total: total,

      gasto: gasto,

      sabores: sabores
    };

    const enviado =
      await enviarParaPlanilha(dados);

    if (!enviado) return;

    limparFormularioProducao();

    mostrarToast("Produção salva.");

    carregarDados();
  });

/* =========================
   SABORES
========================= */

function coletarSabores(selector) {

  const resultado = {};

  document.querySelectorAll(selector)
    .forEach(input => {

      resultado[input.dataset.sabor] =
        Number(input.value) || 0;

    });

  return resultado;
}

/* =========================
   ENVIO GOOGLE
========================= */

async function enviarParaPlanilha(dados) {

  try {

    await fetch(CONFIG.api, {

      method: "POST",

      mode: "no-cors",

      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },

      body: JSON.stringify(dados)

    });

    return true;

  } catch (erro) {

    console.error(erro);

    mostrarToast(
      "Não foi possível enviar os dados."
    );

    return false;
  }
}

/* =========================
   CARREGAR DADOS
========================= */

async function carregarDados() {

  try {

    const resposta =
      await fetch(CONFIG.api + "?acao=dados");

    const dados =
      await resposta.json();

    atualizarDashboard(dados);

    montarTabelaVendas(
      dados.vendas || []
    );

    montarTabelaProducoes(
      dados.producoes || []
    );

  } catch (erro) {

    console.error(erro);

    mostrarToast(
      "Não foi possível carregar os dados."
    );
  }
}

/* =========================
   DASHBOARD
========================= */

function atualizarDashboard(dados) {

  const vendas =
    Number(dados.totalVendas) || 0;

  const gastos =
    Number(dados.totalGastos) || 0;

  const estoque =
    Number(dados.estoque) || 0;

  document.getElementById("dashVendas").textContent =
    dinheiro(vendas);

  document.getElementById("dashGastos").textContent =
    dinheiro(gastos);

  document.getElementById("dashEstoque").textContent =
    estoque;

  document.getElementById("dashLucro").textContent =
    dinheiro(vendas - gastos);

  document.getElementById("periodoSemana").textContent =
    dinheiro(dados.semana || 0);

  document.getElementById("periodoMes").textContent =
    dinheiro(dados.mes || 0);

  document.getElementById("periodoAno").textContent =
    dinheiro(dados.ano || 0);
}

/* =========================
   TABELA VENDAS
========================= */

function montarTabelaVendas(lista) {

  const tbody =
    document.getElementById("tabelaVendas");

  tbody.innerHTML = "";

  lista.slice().reverse().forEach(venda => {

    const tr =
      document.createElement("tr");

    const sabores =
      Number(venda.totalSabores || 0);

    aplicarStatusLinha(
      tr,
      sabores,
      Number(venda.total || 0)
    );

    const status =
      criarStatusSabores(
        sabores,
        Number(venda.total || 0)
      );

    tr.innerHTML = `
      <td>${formatarData(venda.data)}</td>
      <td>${venda.total || 0}</td>
      <td>${dinheiro(venda.valor || 0)}</td>
      <td>${status}</td>
      <td class="acoes">
        <button class="btn-acao editar" type="button">Editar</button>
        <button class="btn-acao excluir" type="button">Excluir</button>
      </td>
    `;

    prepararAcoesLinha(
      tr,
      "venda"
    );

    tbody.appendChild(tr);
  });
}

/* =========================
   TABELA PRODUÇÃO
========================= */

function montarTabelaProducoes(lista) {

  const tbody =
    document.getElementById("tabelaProducoes");

  tbody.innerHTML = "";

  lista.slice().reverse().forEach(item => {

    const total =
      Number(item.total || 0);

    const gasto =
      Number(item.gasto || 0);

    const custo =
      total > 0
        ? gasto / total
        : 0;

    const sabores =
      Number(item.totalSabores || 0);

    const tr =
      document.createElement("tr");

    aplicarStatusLinha(
      tr,
      sabores,
      total
    );

    const status =
      criarStatusSabores(
        sabores,
        total
      );

    tr.innerHTML = `
      <td>${formatarData(item.data)}</td>
      <td>${total}</td>
      <td>${dinheiro(gasto)}</td>
      <td>${dinheiro(custo)}</td>
      <td>${status}</td>
      <td class="acoes">
        <button class="btn-acao editar" type="button">Editar</button>
        <button class="btn-acao excluir" type="button">Excluir</button>
      </td>
    `;

    prepararAcoesLinha(
      tr,
      "producao"
    );

    tbody.appendChild(tr);
  });
}

/* =========================
   STATUS SABORES
========================= */

function criarStatusSabores(sabores, total) {

  if (sabores === 0) {
    return `<span class="status-faltou">FALTOU</span>`;
  }

  if (sabores === total) {
    return `<span class="status-sim">SIM</span>`;
  }

  return `<span class="status-nao">NÃO</span>`;
}

function aplicarStatusLinha(tr, sabores, total) {

  tr.classList.remove(
    "status-linha-sim",
    "status-linha-nao",
    "status-linha-faltou"
  );

  if (sabores === 0) {

    tr.classList.add(
      "status-linha-faltou"
    );

  } else if (sabores === total) {

    tr.classList.add(
      "status-linha-sim"
    );

  } else {

    tr.classList.add(
      "status-linha-nao"
    );
  }
}

/* =========================
   EDITAR / EXCLUIR
   SOMENTE HTML
========================= */

function prepararAcoesLinha(tr, tipo) {

  const botaoEditar =
    tr.querySelector(".editar");

  const botaoExcluir =
    tr.querySelector(".excluir");

  botaoExcluir.addEventListener(
    "click",
    () => {

      const confirmar =
        window.confirm(
          "Excluir esta linha da tabela?"
        );

      if (!confirmar) return;

      tr.remove();

      mostrarToast(
        "Linha excluída da tabela."
      );
    }
  );

  botaoEditar.addEventListener(
    "click",
    () => editarLinha(tr, tipo)
  );
}

function editarLinha(tr, tipo) {

  if (tr.classList.contains("linha-editando")) {
    return;
  }

  tr.classList.add("linha-editando");

  const celulas =
    tr.querySelectorAll("td");

  const dataAtual =
    celulas[0].textContent.trim();

  const qtdAtual =
    celulas[1].textContent.trim();

  const valorAtual =
    celulas[2].textContent.trim();

  const inputQtd =
    document.createElement("input");

  inputQtd.type = "number";
  inputQtd.min = "0";
  inputQtd.value = qtdAtual;
  inputQtd.className = "campo-edicao";

  celulas[1].textContent = "";
  celulas[1].appendChild(inputQtd);

  if (tipo === "venda") {

    const valorNumero =
      extrairNumero(valorAtual);

    const inputValor =
      document.createElement("input");

    inputValor.type = "number";
    inputValor.min = "0";
    inputValor.step = "0.01";
    inputValor.value = valorNumero;
    inputValor.className = "campo-edicao";

    celulas[2].textContent = "";
    celulas[2].appendChild(inputValor);

    celulas[3].innerHTML =
      `<span class="status-faltou">EDIÇÃO</span>`;

  } else {

    const gastoNumero =
      extrairNumero(valorAtual);

    const inputGasto =
      document.createElement("input");

    inputGasto.type = "number";
    inputGasto.min = "0";
    inputGasto.step = "0.01";
    inputGasto.value = gastoNumero;
    inputGasto.className = "campo-edicao";

    celulas[2].textContent = "";
    celulas[2].appendChild(inputGasto);

    celulas[3].textContent = "—";

    celulas[4].innerHTML =
      `<span class="status-faltou">EDIÇÃO</span>`;
  }

  const acoes =
    celulas[celulas.length - 1];

  acoes.innerHTML = `
    <button class="btn-acao salvar-edicao" type="button">
      Salvar
    </button>
    <button class="btn-acao cancelar-edicao" type="button">
      Cancelar
    </button>
  `;

  acoes.querySelector(".salvar-edicao")
    .addEventListener(
      "click",
      () => salvarEdicaoLocal(
        tr,
        tipo,
        dataAtual
      )
    );

  acoes.querySelector(".cancelar-edicao")
    .addEventListener(
      "click",
      () => {

        tr.classList.remove("linha-editando");

        if (tipo === "venda") {
          montarLinhaVendaOriginal(
            tr,
            dataAtual,
            qtdAtual,
            valorAtual
          );
        } else {
          restaurarLinhaProducao(
            tr,
            dataAtual,
            qtdAtual,
            valorAtual
          );
        }
      }
    );
}

function salvarEdicaoLocal(tr, tipo, dataAtual) {

  const celulas =
    tr.querySelectorAll("td");

  const qtd =
    Number(
      celulas[1]
        .querySelector("input")
        .value
    ) || 0;

  if (tipo === "venda") {

    const valor =
      Number(
        celulas[2]
          .querySelector("input")
          .value
      ) || 0;

    celulas[0].textContent =
      dataAtual;

    celulas[1].textContent =
      qtd;

    celulas[2].textContent =
      dinheiro(valor);

    celulas[3].innerHTML =
      `<span class="status-faltou">FALTOU</span>`;

    aplicarStatusLinha(
      tr,
      0,
      qtd
    );

  } else {

    const gasto =
      Number(
        celulas[2]
          .querySelector("input")
          .value
      ) || 0;

    const custo =
      qtd > 0
        ? gasto / qtd
        : 0;

    celulas[0].textContent =
      dataAtual;

    celulas[1].textContent =
      qtd;

    celulas[2].textContent =
      dinheiro(gasto);

    celulas[3].textContent =
      dinheiro(custo);

    celulas[4].innerHTML =
      `<span class="status-faltou">FALTOU</span>`;

    aplicarStatusLinha(
      tr,
      0,
      qtd
    );
  }

  restaurarBotoesAcoes(
    tr,
    tipo
  );

  mostrarToast(
    "Alteração feita na tabela."
  );
}

function montarLinhaVendaOriginal(
  tr,
  data,
  qtd,
  valor
) {

  tr.innerHTML = `
    <td>${data}</td>
    <td>${qtd}</td>
    <td>${valor}</td>
    <td><span class="status-faltou">FALTOU</span></td>
    <td class="acoes">
      <button class="btn-acao editar" type="button">Editar</button>
      <button class="btn-acao excluir" type="button">Excluir</button>
    </td>
  `;

  aplicarStatusLinha(
    tr,
    0,
    Number(qtd) || 0
  );

  restaurarBotoesAcoes(
    tr,
    "venda"
  );
}

function restaurarLinhaProducao(
  tr,
  data,
  qtd,
  gasto
) {

  const gastoNumero =
    extrairNumero(gasto);

  const qtdNumero =
    Number(qtd) || 0;

  const custo =
    qtdNumero > 0
      ? gastoNumero / qtdNumero
      : 0;

  tr.innerHTML = `
    <td>${data}</td>
    <td>${qtd}</td>
    <td>${gasto}</td>
    <td>${dinheiro(custo)}</td>
    <td><span class="status-faltou">FALTOU</span></td>
    <td class="acoes">
      <button class="btn-acao editar" type="button">Editar</button>
      <button class="btn-acao excluir" type="button">Excluir</button>
    </td>
  `;

  aplicarStatusLinha(
    tr,
    0,
    qtdNumero
  );

  restaurarBotoesAcoes(
    tr,
    "producao"
  );
}

function restaurarBotoesAcoes(tr, tipo) {

  const botaoEditar =
    tr.querySelector(".editar");

  const botaoExcluir =
    tr.querySelector(".excluir");

  if (botaoEditar) {

    botaoEditar.addEventListener(
      "click",
      () => editarLinha(tr, tipo)
    );
  }

  if (botaoExcluir) {

    botaoExcluir.addEventListener(
      "click",
      () => {

        if (
          !window.confirm(
            "Excluir esta linha da tabela?"
          )
        ) {
          return;
        }

        tr.remove();

        mostrarToast(
          "Linha excluída da tabela."
        );
      }
    );
  }

  tr.classList.remove(
    "linha-editando"
  );
}

function extrairNumero(valor) {

  if (typeof valor === "number") {
    return valor;
  }

  const texto =
    String(valor || "")
      .replace(/[^\d,.-]/g, "")
      .replace(/\./g, "")
      .replace(",", ".");

  return Number(texto) || 0;
}

/* =========================
   LIMPAR
========================= */

function limparFormularioVenda() {

  document.getElementById("vendaTotal").value = "";
  document.getElementById("vendaLocal").value = "";
  document.getElementById("vendaTempo").value = "";

  document.querySelectorAll(".venda-sabor")
    .forEach(i => i.value = "");
}

function limparFormularioProducao() {

  document.getElementById("producaoTotal").value = "";
  document.getElementById("producaoGasto").value = "";
  document.getElementById("producaoLocal").value = "";
  document.getElementById("producaoTempo").value = "";

  document.querySelectorAll(".producao-sabor")
    .forEach(i => i.value = "");
}

/* =========================
   UTILIDADES
========================= */

function dinheiro(valor) {

  return Number(valor || 0)
    .toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
}

function formatarData(valor) {

  if (!valor) return "-";

  const data = new Date(valor);

  if (isNaN(data)) return valor;

  return data.toLocaleDateString("pt-BR");
}

function mostrarToast(texto) {

  const toast =
    document.getElementById("toast");

  toast.textContent = texto;

  toast.classList.add("mostrar");

  setTimeout(() => {
    toast.classList.remove("mostrar");
  }, 2500);
}