import { test, expect } from "@playwright/test";
import { loginAs } from "./fixtures";

test.describe("Evolução Física (aluno)", () => {
  test("mostra os cartões de métricas e o gráfico de peso", async ({ page }) => {
    await loginAs(page, "aluno");
    await page.goto("/aluno/evolucao");

    await expect(page.getByText("Evolução Física")).toBeVisible();
    await expect(page.getByRole("button", { name: /Gordura corporal/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Massa muscular/ })).toBeVisible();
  });
});

test.describe("Evolução Física — layout mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("não gera scroll horizontal ao visualizar como aluno (upload cards visíveis)", async ({
    page,
  }) => {
    // Os cartões de upload (Bioimpedância/Foto) só aparecem para quem tem
    // canWrite — reproduz melhor via impersonation do admin, que é como o
    // bug original foi relatado.
    await loginAs(page, "admin");
    await page.goto("/usuarios");
    await page.getByRole("row").filter({ hasText: "Júlia Ferreira" }).click();
    await expect(page).toHaveURL("/aluno");

    await page.goto("/aluno/evolucao");
    await expect(page.getByText("Upload de Bioimpedância (InBody)")).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });
});
