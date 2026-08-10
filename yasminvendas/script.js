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

const inputsPedido = document.querySelectorAll(
  ".sabor input"
);

function atualizarPedido() {

  let quantidade = 0;

  inputsPedido.forEach(input => {
    quantidade += Number(input.value) || 0;
  });

  const total = quantidade * CONFIG.valorTrufa;

  document.getElementById("totalQuantidade").textContent =
    quantidade;

  document.getElementById("valorTotal").textContent =
    dinheiro(total);
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
   ACRESCENTAR / EXCLUIR LINHAS (SABORES)
========================= */

function adicionarLinhaSabor(tipo) {
  const containerId = tipo === 'venda' ? 'containerVendaSabores' : 'containerProducaoSabores';
  const classeInput = tipo === 'venda' ? 'venda-sabor' : 'producao-sabor';
  const container = document.getElementById(containerId);
  
  const nomeSabor = prompt("Digite o nome do novo sabor:");
  if (!nomeSabor || !nomeSabor.trim()) return;

  const label = document.createElement("label");
  label.innerHTML = `${nomeSabor.trim()} <input class="${classeInput}" data-sabor="${nomeSabor.trim()}" type="number" min="0" value="0">`;
  container.appendChild(label);
}

function removerLinhaSabor(tipo) {
  const containerId = tipo === 'venda' ? 'containerVendaSabores' : 'containerProducaoSabores';
  const container = document.getElementById(containerId);
  const labels = container.querySelectorAll("label");
  
  if (labels.length > 1) {
    container.removeChild(labels[labels.length - 1]);
  } else {
    mostrarToast("É necessário manter pelo menos um sabor.");
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

    const sabores = coletarSabores(".venda-sabor");

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

    await enviarParaPlanilha(dados);

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

    await enviarParaPlanilha(dados);

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

    montarTabelaVendas(dados.vendas || []);

    montarTabelaProducoes(dados.producoes || []);

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

  const vendas = Number(dados.totalVendas) || 0;
  const gastos = Number(dados.totalGastos) || 0;
  const estoque = Number(dados.estoque) || 0;

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

    const tr = document.createElement("tr");

    const sabores =
      Number(venda.totalSabores || 0);

    if (sabores === Number(venda.total || 0) && sabores > 0) {
      tr.classList.add("status-linha-sim");
    } else if (sabores === 0) {
      tr.classList.add("status-linha-faltou");
    } else {
      tr.classList.add("status-linha-nao");
    }

    let status = "";

    if (sabores === Number(venda.total || 0)) {

      status =
        `<span class="status-sim">SIM</span>`;

    } else if (sabores === 0) {

      status =
        `<span class="status-faltou">FALTOU</span>`;

    } else {

      status =
        `<span class="status-nao">NÃO</span>`;
    }

    tr.innerHTML = `
      <td>${formatarData(venda.data)}</td>
      <td>${venda.total || 0}</td>
      <td>${dinheiro(venda.valor || 0)}</td>
      <td>${status}</td>
    `;

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
      total > 0 ? gasto / total : 0;

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${formatarData(item.data)}</td>
      <td>${total}</td>
      <td>${dinheiro(gasto)}</td>
      <td>${dinheiro(custo)}</td>
    `;

    tbody.appendChild(tr);
  });
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