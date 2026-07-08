import { test, expect } from "@playwright/test";
import { loginAs } from "./fixtures";

test.describe("Meu Treino (aluno)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "aluno");
  });

  test("mostra o primeiro treino ativo (posição 0) com seus exercícios", async ({ page }) => {
    // Apenas o treino selecionado é exibido por completo; os demais aparecem
    // como botões com o título cadastrado do treino — ver SortableWorkoutButton.
    // O título também aparece no cabeçalho do card do treino selecionado, então
    // usamos o role "button" pra mirar só o seletor, evitando ambiguidade.
    await expect(page.getByRole("button", { name: "Treino A" })).toBeVisible();
    await expect(page.getByText("Supino reto")).toBeVisible();
  });

  test("troca para o segundo treino ativo pelo seletor 'Treino B'", async ({ page }) => {
    await page.getByRole("button", { name: "Treino B" }).click();
    await expect(page.getByText("Agachamento livre")).toBeVisible();
    await expect(page.getByText("Cadeira extensora")).toBeVisible();
  });

  test("aba Arquivados mostra o treino arquivado, não os ativos", async ({ page }) => {
    await page.getByRole("tab", { name: "Arquivados" }).click();
    await expect(page.getByText("Arquivado", { exact: true })).toBeVisible();
    // Só existe 1 treino arquivado no fixture — só deve haver 1 seletor.
    await expect(page.getByRole("button", { name: "Treino C" })).toHaveCount(1);
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
    await expect(page.getByRole("button", { name: "Treino A" })).toBeVisible();

    await page.getByRole("button", { name: "Voltar ao meu perfil" }).click();
    await expect(page).toHaveURL("/usuarios");
  });

  test("admin adiciona um exercício de cardio ao treino do aluno", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/usuarios");
    await page.getByRole("row").filter({ hasText: "Júlia Ferreira" }).click();
    await expect(page).toHaveURL("/aluno");

    await page.getByRole("button", { name: "Adicionar cardio" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByPlaceholder("Ex.: Corrida na esteira").fill("Corrida no parque");
    await dialog.getByRole("button", { name: "Adicionar" }).click();

    await expect(page.getByText("Corrida no parque")).toBeVisible();
    await expect(page.getByRole("main").getByText("Cardio", { exact: true }).first()).toBeVisible();
  });

  test("admin adiciona um exercício de mobilidade ao treino do aluno", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/usuarios");
    await page.getByRole("row").filter({ hasText: "Júlia Ferreira" }).click();
    await expect(page).toHaveURL("/aluno");

    await page.getByRole("button", { name: "Adicionar mobilidade" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByPlaceholder("Ex.: Alongamento de quadril").fill("Alongamento de ombro");
    await dialog.getByRole("button", { name: "Adicionar" }).click();

    await expect(page.getByText("Alongamento de ombro")).toBeVisible();
    await expect(
      page.getByRole("main").getByText("Mobilidade", { exact: true }).first(),
    ).toBeVisible();
  });

  test("admin remove um treino do aluno", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/usuarios");
    await page.getByRole("row").filter({ hasText: "Júlia Ferreira" }).click();
    await expect(page).toHaveURL("/aluno");
    await expect(page.getByRole("button", { name: "Treino A" })).toBeVisible();

    await page.getByRole("button", { name: "Remover treino" }).click();
    await page.getByRole("button", { name: "Remover", exact: true }).click();

    await expect(page.getByText("Treino removido")).toBeVisible();
    // Só restava o Treino B ativo: um único seletor com esse título e o card
    // exibido é o dele — prova indireta de que o Treino A não existe mais. (Não
    // verificamos a ausência de "Treino A" diretamente: esse texto colide via
    // substring case-insensitive com "Novo treino" + "Ativos", ver docs/e2e.md.)
    await expect(page.getByRole("button", { name: "Treino B" })).toHaveCount(1);
    await expect(page.getByText("Agachamento livre")).toBeVisible();
  });
});
