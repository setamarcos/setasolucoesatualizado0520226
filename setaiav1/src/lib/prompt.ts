export type FeedbackTipo = "acertou" | "errou" | "faltou";
export interface Comentario {
  tipo: FeedbackTipo;
  texto: string;
}

export const AREAS: Record<string, string[]> = {
  marketing: ["marketing", "instagram", "post", "anúncio", "anuncio", "campanha", "redes sociais", "marca", "conteúdo"],
  "finanças": ["finança", "financeiro", "dinheiro", "orçamento", "orcamento", "investimento", "dívida", "divida", "custo", "planilha"],
  "educação": ["aula", "estudo", "escola", "prova", "aprender", "ensinar", "curso", "aluno"],
  "saúde": ["saúde", "saude", "dieta", "exercício", "exercicio", "treino", "médico", "medico", "dor", "sono"],
  tecnologia: ["código", "codigo", "app", "site", "sistema", "programa", "software", "html", "javascript", "api", "planilha google"],
  "jurídico": ["contrato", "lei", "advogado", "processo", "jurídico", "juridico", "direito"],
  vendas: ["venda", "vender", "cliente", "proposta", "orçamento de venda", "negociação", "negociacao", "whatsapp"],
  "família e relacionamento": ["filha", "filho", "esposa", "marido", "família", "familia", "relacionamento", "amigo", "mãe", "pai"],
};

export function detectarArea(texto: string): string {
  const t = texto.toLowerCase();
  let melhor = "geral";
  let max = 0;
  for (const [area, palavras] of Object.entries(AREAS)) {
    const n = palavras.filter((p) => t.includes(p)).length;
    if (n > max) {
      max = n;
      melhor = area;
    }
  }
  return melhor;
}

export interface Entrada {
  ideia: string;
  detalhes: string;
  evitar: string[];
  area: string;
}

export function montarPrompt(e: Entrada): string {
  const area = e.area === "geral" ? "na área deste pedido" : `em ${e.area}`;
  const linhas = [`Atue como um especialista sênior ${area}.`];
  if (e.ideia.trim()) linhas.push(`Preciso de: ${e.ideia.trim()}`);
  if (e.detalhes.trim()) linhas.push(`Contexto: ${e.detalhes.trim()}`);
  const ev = e.evitar.map((s) => s.trim()).filter(Boolean);
  if (ev.length) linhas.push(`Evite: ${ev.join(" ")}`);
  linhas.push(
    "Seja direto e prático, sem preâmbulo nem cortesia.",
    "Ao final, avalie sua resposta de 0 a 10 e diga o que faltaria para chegar a 10.",
  );
  return linhas.join("\n");
}

export function montarRefinamento(e: Entrada, respostaAnterior: string, comentarios: Comentario[]): string {
  const por = (t: FeedbackTipo) => comentarios.filter((c) => c.tipo === t && c.texto.trim()).map((c) => c.texto.trim());
  const linhas = [montarPrompt(e), ""];
  if (respostaAnterior.trim()) linhas.push(`Sua resposta anterior foi:\n"""\n${respostaAnterior.trim()}\n"""`);
  const m = por("acertou"), c = por("errou"), f = por("faltou");
  if (m.length) linhas.push(`Mantenha: ${m.join("; ")}.`);
  if (c.length) linhas.push(`Corrija: ${c.join("; ")}.`);
  if (f.length) linhas.push(`Considere também: ${f.join("; ")}.`);
  linhas.push("Reescreva a resposta aplicando essas correções e mantendo o que já estava certo.");
  return linhas.join("\n");
}

export function detalhesComFaltas(detalhes: string, comentarios: Comentario[]): string {
  const novos = comentarios.filter((c) => c.tipo === "faltou" && c.texto.trim()).map((c) => c.texto.trim());
  const atuais = detalhes.trim();
  const extra = novos.filter((n) => !atuais.includes(n));
  return [atuais, ...extra].filter(Boolean).join("\n");
}
