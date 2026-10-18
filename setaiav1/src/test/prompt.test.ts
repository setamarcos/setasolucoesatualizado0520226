import { describe, it, expect } from "vitest";
import { detectarArea, montarPrompt, montarRefinamento, detalhesComFaltas } from "@/lib/prompt";

const base = { ideia: "mensagem para minha filha", detalhes: "", evitar: [], area: "família e relacionamento" };

describe("prompt", () => {
  it("detecta área por palavras-chave", () => {
    expect(detectarArea("Escreva uma mensagem para minha filha")).toBe("família e relacionamento");
    expect(detectarArea("xyz")).toBe("geral");
  });
  it("prompt pede área e autoavaliação", () => {
    const p = montarPrompt(base);
    expect(p).toContain("especialista sênior em família e relacionamento");
    expect(p).toContain("de 0 a 10");
    expect(p).not.toContain("Contexto:");
  });
  it("refinamento separa manter/corrigir/considerar", () => {
    const p = montarRefinamento(base, "resp", [
      { tipo: "acertou", texto: "tom carinhoso" },
      { tipo: "errou", texto: "muito longo" },
      { tipo: "faltou", texto: "ela tem 10 anos" },
    ]);
    expect(p).toContain("Mantenha: tom carinhoso.");
    expect(p).toContain("Corrija: muito longo.");
    expect(p).toContain("Considere também: ela tem 10 anos.");
  });
  it("faltou contexto entra nos detalhes sem duplicar", () => {
    const c = [{ tipo: "faltou" as const, texto: "ela tem 10 anos" }];
    expect(detalhesComFaltas("ela tem 10 anos", c)).toBe("ela tem 10 anos");
    expect(detalhesComFaltas("", c)).toBe("ela tem 10 anos");
  });
});
