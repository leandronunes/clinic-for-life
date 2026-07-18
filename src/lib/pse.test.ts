import { describe, it, expect } from "vitest";
import { pseCategory, PSE_CATEGORY_META, formatPse } from "./pse";

describe("pseCategory", () => {
  it("classifies 1-3 as leve", () => {
    expect(pseCategory(1)).toBe("leve");
    expect(pseCategory(3)).toBe("leve");
  });

  it("classifies 4-6 as moderado", () => {
    expect(pseCategory(4)).toBe("moderado");
    expect(pseCategory(6)).toBe("moderado");
  });

  it("classifies 7-8 as intenso", () => {
    expect(pseCategory(7)).toBe("intenso");
    expect(pseCategory(8)).toBe("intenso");
  });

  it("classifies 9-10 as maximo", () => {
    expect(pseCategory(9)).toBe("maximo");
    expect(pseCategory(10)).toBe("maximo");
  });
});

describe("PSE_CATEGORY_META", () => {
  it("has a pt-br label for every category", () => {
    expect(PSE_CATEGORY_META.leve.label).toBe("Leve");
    expect(PSE_CATEGORY_META.moderado.label).toBe("Moderado");
    expect(PSE_CATEGORY_META.intenso.label).toBe("Intenso");
    expect(PSE_CATEGORY_META.maximo.label).toBe("Máximo");
  });
});

describe("formatPse", () => {
  it("combines the number and the category label", () => {
    expect(formatPse(7)).toBe("7 · Intenso");
    expect(formatPse(2)).toBe("2 · Leve");
  });
});
