import { test, expect } from "@playwright/test";
import { loginAs } from "./fixtures";

test.describe("Meu Treino (aluno)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "aluno");
  });

  test("mostra o primeiro treino ativo (posição 0) com seus exercícios", async ({ page }) => {
    // Apenas o treino selecionado é exibido por completo; os demais aparecem
    // como botões "Treino {posição}" (não pelo título) — ver SortableWorkoutButton.
    await expect(page.getByText("Treino A")).toBeVisible();
    await expect(page.getByText("Supino reto")).toBeVisible();
  });

  test("troca para o segundo treino ativo pelo seletor 'Treino 1'", async ({ page }) => {
    await page.getByRole("button", { name: "Treino 1" }).click();
    await expect(page.getByText("Treino B")).toBeVisible();
    await expect(page.getByText("Agachamento livre")).toBeVisible();
  });

  test("aba Arquivados mostra o treino arquivado, não os ativos", async ({ page }) => {
    await page.getByRole("tab", { name: "Arquivados" }).click();
    await expect(page.getByText("Treino C")).toBeVisible();
    await expect(page.getByText("Arquivado", { exact: true })).toBeVisible();
    // Só existe 1 treino arquivado no fixture — só deve haver 1 seletor "Treino {posição}".
    await expect(page.getByRole("button", { name: /^Treino \d+$/ })).toHaveCount(1);
  });
});

test.describe("Meu Treino (admin visualizando como aluno)", () => {
  test("admin pode entrar como aluno pela lista de usuários e ver o treino dele", async ({
    page,
  }) => {
    await loginAs(page, "admin");
    await page.goto("/usuarios");
    await page.getByRole("row").filter({ hasText: "Júlia Ferreira" }).click();

    await expect(page).toHaveURL("/aluno");
    await expect(page.getByText("Visualizando como aluno")).toBeVisible();
    await expect(page.getByText("Treino A")).toBeVisible();

    await page.getByRole("button", { name: "Voltar ao meu perfil" }).click();
    await expect(page).toHaveURL("/usuarios");
  });
});
