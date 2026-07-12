import { test, expect } from "@playwright/test";
import { loginAs } from "./fixtures";

test.describe("Check-in de treino (aluno)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "aluno");
  });

  test("inicia o treino, marca os exercícios e conclui automaticamente no último", async ({
    page,
  }) => {
    // Treino B (workout-s1-b) não tem check-in nas fixtures — Treino A já
    // vem com um check-in concluído semeado, o que atrapalharia este teste.
    await page.getByRole("button", { name: "Treino B" }).click();
    await expect(page.getByText("Agachamento livre")).toBeVisible();

    await page.getByRole("button", { name: "Iniciar treino" }).click();
    await expect(page.getByRole("button", { name: "Finalizar treino" })).toBeVisible();

    await page.getByRole("checkbox", { name: /Marcar "Agachamento livre"/ }).click();
    await expect(page.getByText("1/2 concluídos")).toBeVisible();

    await page.getByRole("checkbox", { name: /Marcar "Cadeira extensora"/ }).click();

    await expect(page.getByText("Treino concluído!")).toBeVisible();
    await expect(page.getByText("Treino concluído (2/2)")).toBeVisible();
    await expect(page.getByRole("button", { name: "Iniciar treino" })).toBeVisible();
  });

  test("finaliza o treino manualmente com conclusão parcial", async ({ page }) => {
    await page.getByRole("button", { name: "Treino B" }).click();
    await page.getByRole("button", { name: "Iniciar treino" }).click();

    await page.getByRole("checkbox", { name: /Marcar "Agachamento livre"/ }).click();
    await expect(page.getByText("1/2 concluídos")).toBeVisible();

    await page.getByRole("button", { name: "Finalizar treino" }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Finalizar", exact: true })
      .click();

    await expect(page.getByText("Treino finalizado")).toBeVisible();
    await expect(page.getByText("Treino concluído (1/2)")).toBeVisible();
  });
});

test.describe("Assiduidade", () => {
  test("personal vê o histórico do aluno e envia um feedback", async ({ page }) => {
    await loginAs(page, "personal");
    await page.goto("/alunos/student-1");
    await expect(page).toHaveURL("/aluno");

    await page.getByRole("link", { name: "Assiduidade" }).click();
    await expect(page).toHaveURL("/aluno/assiduidade");

    // Check-in semeado nas fixtures (workout-s1-a, 2/3 exercícios).
    await expect(page.getByText("Treino A")).toBeVisible();
    await expect(page.getByText("2/3 exercícios")).toBeVisible();

    await page.getByRole("button", { name: "Enviar feedback" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Mensagem").fill("Bora fechar a semana com tudo!");
    await dialog.getByRole("button", { name: "Enviar", exact: true }).click();

    await expect(page.getByText("Recado enviado")).toBeVisible();
    await expect(page.getByText("Bora fechar a semana com tudo!")).toBeVisible();
  });

  test("aluno vê os recados recebidos mas não pode enviar feedback", async ({ page }) => {
    await loginAs(page, "aluno");
    await page.getByRole("link", { name: "Assiduidade" }).click();
    await expect(page).toHaveURL("/aluno/assiduidade");

    // Feedback semeado nas fixtures.
    await expect(
      page.getByText("Mandou muito bem no treino de hoje, continue assim!"),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Enviar feedback" })).not.toBeVisible();
  });
});
