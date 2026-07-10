import { test, expect } from "@playwright/test";
import { loginAs } from "./fixtures";

test.describe("Gerar Laudo (personal/admin)", () => {
  test("personal vê 'Gerar Laudo' ao visualizar um aluno e o laudo mostra os dados", async ({
    page,
  }) => {
    await loginAs(page, "personal");
    await page.goto("/usuarios");
    await page.getByRole("row").filter({ hasText: "Júlia Ferreira" }).click();
    await expect(page).toHaveURL("/aluno");

    await page.getByRole("link", { name: "Gerar Laudo" }).click();
    await expect(page).toHaveURL("/aluno/laudo");

    await expect(page.getByText("Laudo de Avaliação Física")).toBeVisible();
    await expect(page.getByText(/Júlia Ferreira/)).toBeVisible();

    // Avaliação Estrutural — dados seedados têm todos os itens como "Não".
    await expect(page.getByText("Escoliose")).toBeVisible();

    // Histórico de bioimpedância seedado para student-1 (sem fotos anexadas).
    await expect(page.getByText("65.9 kg")).toBeVisible();
    await expect(page.getByText(/Fotos insuficientes para comparação/)).toBeVisible();
  });

  test("admin também vê 'Gerar Laudo' no menu mobile 'Mais'", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loginAs(page, "admin");
    await page.goto("/usuarios");
    await page.getByRole("row").filter({ hasText: "Júlia Ferreira" }).click();
    await expect(page).toHaveURL("/aluno");

    await page.getByRole("button", { name: "Abrir mais opções" }).click();
    await page.getByRole("link", { name: "Gerar Laudo" }).click();
    await expect(page).toHaveURL("/aluno/laudo");
  });
});

test.describe("Gerar Laudo — restrito ao aluno", () => {
  test("aluno não vê 'Gerar Laudo' e é redirecionado se acessar a URL diretamente", async ({
    page,
  }) => {
    await loginAs(page, "aluno");

    await expect(page.getByRole("link", { name: "Gerar Laudo" })).not.toBeVisible();

    await page.goto("/aluno/laudo");
    await expect(page).toHaveURL("/aluno");
  });
});
