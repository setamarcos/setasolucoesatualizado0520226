/**
 * SISTEMA DE GESTÃO - CONFIGURAÇÃO E LÓGICA CENTRAL
 * Versão: 1.0.0
 * Desenvolvedor: Marcos Paulo
 * Local: Betim, Minas Gerais
 */

const CONFIG = {
  // URL de integração com o Apps Script (Google Sheets)
  api: "https://script.google.com/macros/s/AKfycbztuhTxqY32sHTZeYBfHGCYVR3qjOVGRlbom4uMFPlct37nKBDnXtYNo5EJECJeQBd3/exec",
  whatsapp: "5531982369189",
  senha: "1401",
  valorTrufa: 5
};

/* ==========================================================================
   MÓDULO: DATA E HORA EM TEMPO REAL
   Responsável: Atualizar o elemento com id="dataHora"
   ========================================================================== */

function atualizarDataHora() {
  const agora = new Date();
  const elemento = document.getElementById("dataHora");
  if (elemento) {
    elemento.textContent = agora.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }
}

// Inicialização do relógio a cada 1 segundo
setInterval(atualizarDataHora, 1000);
atualizarDataHora();

/* ==========================================================================
   MÓDULO: GESTÃO DE PEDIDOS (CLIENTE)
   Manipulação dos inputs com classe ".sabor"
   ========================================================================== */

const inputsPedido = document.querySelectorAll(".sabor input");

function atualizarPedido() {
  let quantidade = 0;
  inputsPedido.forEach(input => {
    quantidade += Number(input.value) || 0;
  });

  const total = quantidade * CONFIG.valorTrufa;
  const elQtd = document.getElementById("totalQuantidade");
  const elValor = document.getElementById("valorTotal");

  if (elQtd) elQtd.textContent = quantidade;
  if (elValor) elValor.textContent = dinheiro(total);
}

inputsPedido.forEach(input => {
  input.addEventListener("input", atualizarPedido);
});

// Evento de confirmação do pedido via WhatsApp
document.getElementById("confirmarPedido")?.addEventListener("click", () => {
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

  const mensagem = `Olá Yasmin! Gostaria de receber o seguinte pedido:\n\n${linhas.join("\n")}\n\nTotal: ${totalQtd} trufas\nValor: ${dinheiro(totalQtd * CONFIG.valorTrufa)}\n\nAguardo sua confirmação.`;
  
  const url = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(mensagem)}`;
  window.open(url, "_blank");
});

/* ==========================================================================
   MÓDULO: PAINEL DE CONTROLE (ADMIN)
   Login e Autenticação
   ========================================================================== */

const modal = document.getElementById("painelControle");

document.getElementById("abrirControle")?.addEventListener("click", () => {
  modal?.classList.add("aberto");
  document.getElementById("senhaControle")?.focus();
});

function fecharPainel() {
  modal?.classList.remove("aberto");
  document.getElementById("loginArea")?.classList.remove("oculto");
  document.getElementById("sistemaControle")?.classList.add("oculto");
  const senhaInput = document.getElementById("senhaControle");
  if (senhaInput) senhaInput.value = "";
}

document.getElementById("entrarControle")?.addEventListener("click", entrar);

function entrar() {
  const senhaInput = document.getElementById("senhaControle");
  const erro = document.getElementById("erroSenha");
  
  if (senhaInput.value !== CONFIG.senha) {
    if (erro) erro.textContent = "Senha incorreta.";
    return;
  }

  if (erro) erro.textContent = "";
  document.getElementById("loginArea")?.classList.add("oculto");
  document.getElementById("sistemaControle")?.classList.remove("oculto");
  carregarDados();
}

/* ==========================================================================
   MÓDULO: OPERAÇÕES DE DADOS (API G-SHEETS)
   Funções para salvar e buscar registros da Planilha (via URL configurada)
   ========================================================================== */

async function enviarParaPlanilha(dados) {
  try {
    await fetch(CONFIG.api, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(dados)
    });
    return true;
  } catch (erro) {
    console.error("Erro ao enviar:", erro);
    mostrarToast("Não foi possível enviar os dados ao servidor.");
    return false;
  }
}

async function carregarDados() {
  try {
    const resposta = await fetch(`${CONFIG.api}?acao=dados`);
    const dados = await resposta.json();
    atualizarDashboard(dados);
    montarTabelaVendas(dados.vendas || []);
    montarTabelaProducoes(dados.producoes || []);
  } catch (erro) {
    mostrarToast("Erro ao sincronizar com a planilha.");
  }
}

/* ==========================================================================
   MÓDULO: UTILITÁRIOS GERAIS
   Funções de formatação e feedback (Toast)
   ========================================================================== */

function dinheiro(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function mostrarToast(texto) {
  const toast = document.getElementById("toast");
  if (toast) {
    toast.textContent = texto;
    toast.classList.add("mostrar");
    setTimeout(() => toast.classList.remove("mostrar"), 2500);
  }
}

/* =========================
   TABELA VENDAS
========================= */

function montarTabelaVendas(lista) {
  const tbody = document.getElementById("tabelaVendas");
  if (!tbody) return;

  tbody.innerHTML = "";

  lista.slice().reverse().forEach(venda => {
    const tr = document.createElement("tr");
    const sabores = Number(venda.totalSabores || 0);

    aplicarStatusLinha(tr, sabores, Number(venda.total || 0));

    const status = criarStatusSabores(sabores, Number(venda.total || 0));

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

    prepararAcoesLinha(tr, "venda");
    tbody.appendChild(tr);
  });
}

/* =========================
   TABELA PRODUÇÃO
========================= */

function montarTabelaProducoes(lista) {
  const tbody = document.getElementById("tabelaProducoes");
  if (!tbody) return;

  tbody.innerHTML = "";

  lista.slice().reverse().forEach(item => {
    const total = Number(item.total || 0);
    const gasto = Number(item.gasto || 0);
    const custo = total > 0 ? gasto / total : 0;
    const sabores = Number(item.totalSabores || 0);

    const tr = document.createElement("tr");

    aplicarStatusLinha(tr, sabores, total);

    const status = criarStatusSabores(sabores, total);

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

    prepararAcoesLinha(tr, "producao");
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
    tr.classList.add("status-linha-faltou");
  } else if (sabores === total) {
    tr.classList.add("status-linha-sim");
  } else {
    tr.classList.add("status-linha-nao");
  }
}

/* =========================
   EDITAR / EXCLUIR
   SOMENTE HTML
========================= */

function prepararAcoesLinha(tr, tipo) {
  const botaoEditar = tr.querySelector(".editar");
  const botaoExcluir = tr.querySelector(".excluir");

  if (botaoExcluir) {
    botaoExcluir.addEventListener("click", () => {
      const confirmar = window.confirm("Excluir esta linha da tabela?");
      if (!confirmar) return;
      tr.remove();
      mostrarToast("Linha excluída da tabela.");
    });
  }

  if (botaoEditar) {
    botaoEditar.addEventListener("click", () => editarLinha(tr, tipo));
  }
}

function editarLinha(tr, tipo) {
  if (tr.classList.contains("linha-editando")) {
    return;
  }

  tr.classList.add("linha-editando");

  const celulas = tr.querySelectorAll("td");
  const dataAtual = celulas[0].textContent.trim();
  const qtdAtual = celulas[1].textContent.trim();
  const valorAtual = celulas[2].textContent.trim();

  const inputQtd = document.createElement("input");
  inputQtd.type = "number";
  inputQtd.min = "0";
  inputQtd.value = qtdAtual;
  inputQtd.className = "campo-edicao";

  celulas[1].textContent = "";
  celulas[1].appendChild(inputQtd);

  if (tipo === "venda") {
    const valorNumero = extrairNumero(valorAtual);
    const inputValor = document.createElement("input");
    inputValor.type = "number";
    inputValor.min = "0";
    inputValor.step = "0.01";
    inputValor.value = valorNumero;
    inputValor.className = "campo-edicao";

    celulas[2].textContent = "";
    celulas[2].appendChild(inputValor);

    celulas[3].innerHTML = `<span class="status-faltou">EDIÇÃO</span>`;
  } else {
    const gastoNumero = extrairNumero(valorAtual);
    const inputGasto = document.createElement("input");
    inputGasto.type = "number";
    inputGasto.min = "0";
    inputGasto.step = "0.01";
    inputGasto.value = gastoNumero;
    inputGasto.className = "campo-edicao";

    celulas[2].textContent = "";
    celulas[2].appendChild(inputGasto);

    celulas[3].textContent = "—";
    celulas[4].innerHTML = `<span class="status-faltou">EDIÇÃO</span>`;
  }

  const acoes = celulas[celulas.length - 1];

  acoes.innerHTML = `
    <button class="btn-acao salvar-edicao" type="button">Salvar</button>
    <button class="btn-acao cancelar-edicao" type="button">Cancelar</button>
  `;

  acoes.querySelector(".salvar-edicao").addEventListener("click", () => {
    salvarEdicaoLocal(tr, tipo, dataAtual);
  });

  acoes.querySelector(".cancelar-edicao").addEventListener("click", () => {
    tr.classList.remove("linha-editando");
    if (tipo === "venda") {
      montarLinhaVendaOriginal(tr, dataAtual, qtdAtual, valorAtual);
    } else {
      restaurarLinhaProducao(tr, dataAtual, qtdAtual, valorAtual);
    }
  });
}

function salvarEdicaoLocal(tr, tipo, dataAtual) {
  const celulas = tr.querySelectorAll("td");
  const qtd = Number(celulas[1].querySelector("input").value) || 0;

  if (tipo === "venda") {
    const valor = Number(celulas[2].querySelector("input").value) || 0;

    celulas[0].textContent = dataAtual;
    celulas[1].textContent = qtd;
    celulas[2].textContent = dinheiro(valor);
    celulas[3].innerHTML = `<span class="status-faltou">FALTOU</span>`;

    aplicarStatusLinha(tr, 0, qtd);
  } else {
    const gasto = Number(celulas[2].querySelector("input").value) || 0;
    const custo = qtd > 0 ? gasto / qtd : 0;

    celulas[0].textContent = dataAtual;
    celulas[1].textContent = qtd;
    celulas[2].textContent = dinheiro(gasto);
    celulas[3].textContent = dinheiro(custo);
    celulas[4].innerHTML = `<span class="status-faltou">FALTOU</span>`;

    aplicarStatusLinha(tr, 0, qtd);
  }

  restaurarBotoesAcoes(tr, tipo);
  mostrarToast("Alteração feita na tabela.");
}

function montarLinhaVendaOriginal(tr, data, qtd, valor) {
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

  aplicarStatusLinha(tr, 0, Number(qtd) || 0);
  restaurarBotoesAcoes(tr, "venda");
}

function restaurarLinhaProducao(tr, data, qtd, gasto) {
  const gastoNumero = extrairNumero(gasto);
  const qtdNumero = Number(qtd) || 0;
  const custo = qtdNumero > 0 ? gastoNumero / qtdNumero : 0;

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

  aplicarStatusLinha(tr, 0, qtdNumero);
  restaurarBotoesAcoes(tr, "producao");
}

function restaurarBotoesAcoes(tr, tipo) {
  const botaoEditar = tr.querySelector(".editar");
  const botaoExcluir = tr.querySelector(".excluir");

  if (botaoEditar) {
    botaoEditar.addEventListener("click", () => editarLinha(tr, tipo));
  }

  if (botaoExcluir) {
    botaoExcluir.addEventListener("click", () => {
      if (!window.confirm("Excluir esta linha da tabela?")) return;
      tr.remove();
      mostrarToast("Linha excluída da tabela.");
    });
  }

  tr.classList.remove("linha-editando");
}

function extrairNumero(valor) {
  if (typeof valor === "number") {
    return valor;
  }
  const texto = String(valor || "").replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  return Number(texto) || 0;
}

/* =========================
   LIMPAR
========================= */

function limparFormularioVenda() {
  const vTotal = document.getElementById("vendaTotal");
  const vLocal = document.getElementById("vendaLocal");
  const vTempo = document.getElementById("vendaTempo");
  if (vTotal) vTotal.value = "";
  if (vLocal) vLocal.value = "";
  if (vTempo) vTempo.value = "";

  document.querySelectorAll(".venda-sabor").forEach(i => i.value = "");
}

function limparFormularioProducao() {
  const pTotal = document.getElementById("producaoTotal");
  const pGasto = document.getElementById("producaoGasto");
  const pLocal = document.getElementById("producaoLocal");
  const pTempo = document.getElementById("producaoTempo");
  if (pTotal) pTotal.value = "";
  if (pGasto) pGasto.value = "";
  if (pLocal) pLocal.value = "";
  if (pTempo) pTempo.value = "";

  document.querySelectorAll(".producao-sabor").forEach(i => i.value = "");
}

/* =========================
   DASHBOARD
========================= */

function atualizarDashboard(dados) {
  const vendas = Number(dados.totalVendas) || 0;
  const gastos = Number(dados.totalGastos) || 0;
  const estoque = Number(dados.estoque) || 0;

  const elDV = document.getElementById("dashVendas");
  const elDG = document.getElementById("dashGastos");
  const elDE = document.getElementById("dashEstoque");
  const elDL = document.getElementById("dashLucro");
  const elPS = document.getElementById("periodoSemana");
  const elPM = document.getElementById("periodoMes");
  const elPA = document.getElementById("periodoAno");

  if (elDV) elDV.textContent = dinheiro(vendas);
  if (elDG) elDG.textContent = dinheiro(gastos);
  if (elDE) elDE.textContent = estoque;
  if (elDL) elDL.textContent = dinheiro(vendas - gastos);
  if (elPS) elPS.textContent = dinheiro(dados.semana || 0);
  if (elPM) elPM.textContent = dinheiro(dados.mes || 0);
  if (elPA) elPA.textContent = dinheiro(dados.ano || 0);
}

/* =========================
   UTILIDADES
========================= */

function formatarData(valor) {
  if (!valor) return "-";
  const data = new Date(valor);
  if (isNaN(data)) return valor;
  return data.toLocaleDateString("pt-BR");
}
