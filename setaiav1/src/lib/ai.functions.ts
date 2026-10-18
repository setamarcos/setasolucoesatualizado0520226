import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface Analise {
  area: string;
  faltando: { pergunta: string; motivo: string }[];
  prompt: string;
  nota: number;
}

const SYSTEM = `Você é um engenheiro de prompts sênior. O usuário descreve uma ideia em linguagem natural.
1. Identifique a área de especialidade mais adequada (ex: marketing, finanças, saúde, jurídico, tecnologia, educação, vendas, família e relacionamento).
2. Liste até 5 informações essenciais que estão faltando para a IA responder bem, como perguntas curtas e diretas ao usuário.
3. Escreva um prompt final em português, em texto humano corrido (sem ### nem blocos técnicos), específico para a área, começando com "Atue como especialista sênior em <área>". Use o que foi informado; para o que falta, escreva [entre colchetes] o que o usuário deve completar. Inclua o que evitar e peça, ao final, que a IA avalie a própria resposta de 0 a 10.
4. Dê uma nota de 0 a 10 para a clareza da ideia original.
Seja pragmático. Não invente fatos.`;

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["area", "faltando", "prompt", "nota"],
  properties: {
    area: { type: "string" },
    faltando: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["pergunta", "motivo"],
        properties: { pergunta: { type: "string" }, motivo: { type: "string" } },
      },
    },
    prompt: { type: "string" },
    nota: { type: "number" },
  },
} as const;

export const analisarIdeia = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      ideia: z.string().min(3).max(4000),
      detalhes: z.string().max(4000).default(""),
      evitar: z.string().max(2000).default(""),
    }),
  )
  .handler(async ({ data }): Promise<{ ok: true; analise: Analise } | { ok: false; erro: string }> => {
    const { generateResponse, GatewayError } = await import("@lovable.dev/ai-gateway");
    try {
      const res = await generateResponse({
        model: "openai/gpt-6-astra",
        instructions: SYSTEM,
        input: `Ideia: ${data.ideia}\nDetalhes: ${data.detalhes || "(nenhum)"}\nEvitar: ${data.evitar || "(nada informado)"}`,
        text: { format: { type: "json_schema", name: "analise", strict: true, schema } },
      });
      const out = (res as any).output as any[] | undefined;
      const texto =
        (res as any).output_text ??
        out?.flatMap((o) => o.content ?? []).find((c: any) => c.type === "output_text")?.text;
      if (!texto) return { ok: false, erro: "A IA não retornou resposta. Tente de novo." };
      return { ok: true, analise: JSON.parse(texto) as Analise };
    } catch (e) {
      if (e instanceof GatewayError) {
        console.error("AI gateway", e.code, e.httpStatus);
        if (e.httpStatus === 429) return { ok: false, erro: "Muitas solicitações agora. Aguarde um pouco." };
        if (e.httpStatus === 402) return { ok: false, erro: "Créditos de IA esgotados no workspace." };
      } else console.error(e);
      return { ok: false, erro: "Não foi possível analisar agora. Tente novamente." };
    }
  });
