import { test, expect } from "@playwright/test";
import { loginAs } from "./fixtures";

test.describe("Gestão de usuários (admin)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/usuarios");
  });

  test("lista os alunos seedados e filtra pela busca", async ({ page }) => {
    await expect(page.getByRole("cell", { name: "Júlia Ferreira" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Pedro Almeida" })).toBeVisible();

    await page.getByPlaceholder("Buscar...").fill("Júlia");
    await expect(page.getByRole("cell", { name: "Júlia Ferreira" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Pedro Almeida" })).not.toBeVisible();
  });

  test("cadastra um novo aluno", async ({ page }) => {
    await page.getByRole("button", { name: "Novo aluno" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Cadastrar aluno")).toBeVisible();

    // Os campos do diálogo não têm <label for> associado ao input (gap de
    // acessibilidade pré-existente no componente Field), então localizamos
    // por tipo/ordem: [Nome:text, Nascimento:date, E-mail:email, Telefone:text].
    const inputs = dialog.locator("input");
    await inputs.nth(0).fill("Aluno E2E");
    await inputs.nth(1).fill("1995-05-20");
    await inputs.nth(2).fill("aluno.e2e@example.com");
    await inputs.nth(3).fill("(11) 90000-0000");

    await dialog.getByRole("button", { name: "Salvar" }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole("cell", { name: "Aluno E2E" })).toBeVisible();
  });

  test("edita e remove um aluno", async ({ page }) => {
    const row = page.getByRole("row").filter({ hasText: "Pedro Almeida" });
    await row.locator("button").first().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const nameInput = dialog.locator("input").first();
    await nameInput.fill("Pedro Almeida Editado");
    await dialog.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByRole("cell", { name: "Pedro Almeida Editado" })).toBeVisible();

    const editedRow = page.getByRole("row").filter({ hasText: "Pedro Almeida Editado" });
    await editedRow.locator("button").nth(1).click();
    await expect(page.getByText("Remover aluno permanentemente?")).toBeVisible();
    await page.getByRole("button", { name: "Remover permanentemente" }).click();
    await expect(page.getByRole("cell", { name: "Pedro Almeida Editado" })).not.toBeVisible();
  });

  test("desativa e reativa o cartão de parceiros de um aluno", async ({ page }) => {
    // O mock offline guarda os dados só em memória (sem persistência em
    // localStorage) — qualquer page.goto() causa reload e perde a edição.
    // Por isso este teste navega só por interações client-side (clique em
    // linha para impersonar, "Voltar ao meu perfil" para retornar).
    const row = page.getByRole("row").filter({ hasText: "Pedro Almeida" });
    await row.locator("button").first().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("switch", { name: "Cartão de parceiros" }).click();
    await dialog.getByRole("button", { name: "Salvar" }).click();
    await expect(dialog).not.toBeVisible();

    await row.click();
    await expect(page).toHaveURL("/aluno");
    // O menu "Parceiros" continua visível — só o cartão virtual do aluno some.
    await page.getByRole("link", { name: "Parceiros" }).click();
    await expect(page).toHaveURL("/aluno/parceiros");
    await expect(page.getByLabel("Cartão virtual do aluno")).not.toBeVisible();
    await expect(page.getByText("NutriVida")).toBeVisible();

    await page.getByRole("button", { name: "Voltar ao meu perfil" }).click();
    await expect(page).toHaveURL("/usuarios");

    const row2 = page.getByRole("row").filter({ hasText: "Pedro Almeida" });
    await row2.locator("button").first().click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("switch", { name: "Cartão de parceiros" }).click();
    await dialog.getByRole("button", { name: "Salvar" }).click();
    await expect(dialog).not.toBeVisible();

    await row2.click();
    await expect(page).toHaveURL("/aluno");
    await page.getByRole("link", { name: "Parceiros" }).click();
    await expect(page).toHaveURL("/aluno/parceiros");
    await expect(page.getByLabel("Cartão virtual do aluno")).toBeVisible();
  });

  test("mostra a aba de Personais com os personais seedados", async ({ page }) => {
    await page.getByRole("tab", { name: "Personais" }).click();
    await expect(page.getByRole("cell", { name: "Rafael Monteiro" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Beatriz Lima" })).toBeVisible();
  });

  test("cadastra um novo personal", async ({ page }) => {
    await page.getByRole("tab", { name: "Personais" }).click();
    await page.getByRole("button", { name: "Novo personal" }).click();

    const dialog = page.getByRole("dialog");
    // [Nome:text, CPF:text, CREF:text, E-mail:email, Telefone:text]
    const inputs = dialog.locator("input");
    await inputs.nth(0).fill("Personal E2E");
    await inputs.nth(3).fill("personal.e2e@example.com");
    await inputs.nth(4).fill("(11) 91111-1111");

    await dialog.getByRole("button", { name: "Salvar" }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole("cell", { name: "Personal E2E" })).toBeVisible();
  });
});

test.describe("Gestão de usuários (personal)", () => {
  test("vê apenas 'Meus Alunos', sem abas de Personais", async ({ page }) => {
    await loginAs(page, "personal");
    await page.goto("/usuarios");
    await expect(page.getByRole("heading", { name: "Meus Alunos" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Personais" })).not.toBeVisible();
  });
});
