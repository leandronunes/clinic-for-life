import { describe, it, expect } from "vitest";
import { ANAMNESE_SECOES } from "@/lib/anamnese-secoes";

describe("ANAMNESE_SECOES — estrutura de seções", () => {
  const titulos = ANAMNESE_SECOES.map((s) => s.titulo);
  const allKeys = ANAMNESE_SECOES.flatMap((s) => s.itens.map((i) => i.key));

  it("tem exatamente 5 seções na ordem correta", () => {
    expect(titulos).toEqual([
      "Objetivos",
      "Dados Clínicos",
      "Quadro Clínico",
      "Histórico Ortopédico",
      "Hábitos de Vida",
    ]);
  });

  it("seção Objetivos contém apenas o campo objectives", () => {
    const secao = ANAMNESE_SECOES.find((s) => s.titulo === "Objetivos")!;
    expect(secao.itens).toHaveLength(1);
    expect(secao.itens[0].key).toBe("objectives");
  });

  it("seção Quadro Clínico contém medicines, supplements e notes", () => {
    const secao = ANAMNESE_SECOES.find((s) => s.titulo === "Quadro Clínico")!;
    const keys = secao.itens.map((i) => i.key);
    expect(keys).toEqual(["medicines", "supplements", "notes"]);
  });

  it("Quadro Clínico é a terceira seção (após Dados Clínicos)", () => {
    expect(ANAMNESE_SECOES[2].titulo).toBe("Quadro Clínico");
  });

  it("medicines, supplements e notes NÃO aparecem na seção Objetivos", () => {
    const secao = ANAMNESE_SECOES.find((s) => s.titulo === "Objetivos")!;
    const keys = secao.itens.map((i) => i.key);
    expect(keys).not.toContain("medicines");
    expect(keys).not.toContain("supplements");
    expect(keys).not.toContain("notes");
  });

  it("nenhuma chave está duplicada entre seções", () => {
    const unique = new Set(allKeys);
    expect(unique.size).toBe(allKeys.length);
  });

  it("18 campos editáveis estão distribuídos entre as seções", () => {
    // id e student_id não aparecem na UI — apenas os 18 campos editáveis
    expect(allKeys).toHaveLength(18);
  });
});
