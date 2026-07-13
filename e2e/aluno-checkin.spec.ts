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
    // Iniciar o check-in abre automaticamente o modal de execução guiada do
    // primeiro exercício — espera o modal aparecer e fecha, pra marcar os
    // exercícios pela lista mesmo.
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Finalizar treino" })).toBeVisible();

    await page.getByRole("button", { name: /Marcar "Agachamento livre"/ }).click();
    await expect(page.getByText("1/2 concluídos")).toBeVisible();

    await page.getByRole("button", { name: /Marcar "Cadeira extensora"/ }).click();

    await expect(page.getByText("Treino concluído!")).toBeVisible();
    await expect(page.getByText("Treino concluído (2/2)")).toBeVisible();
    await expect(page.getByRole("button", { name: "Iniciar treino" })).toBeVisible();
  });

  test("finaliza o treino manualmente com conclusão parcial", async ({ page }) => {
    await page.getByRole("button", { name: "Treino B" }).click();
    await page.getByRole("button", { name: "Iniciar treino" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();

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
  test("personal vê o histórico do aluno sem a ação de recado avulso", async ({ page }) => {
    await loginAs(page, "personal");
    await page.goto("/alunos/student-1");
    await expect(page).toHaveURL("/aluno");

    await page.getByRole("link", { name: "Assiduidade" }).click();
    await expect(page).toHaveURL("/aluno/assiduidade");

    // Check-in semeado nas fixtures (workout-s1-a, 2/3 exercícios).
    await expect(page.getByText("Treino A")).toBeVisible();
    await expect(page.getByText("2/3 exercícios")).toBeVisible();
    await expect(page.getByRole("button", { name: "Enviar feedback" })).not.toBeVisible();
  });

  test("aluno vê feedback e reação do personal dentro do detalhe do check-in", async ({ page }) => {
    await loginAs(page, "aluno");
    await page.getByRole("link", { name: "Assiduidade" }).click();
    await expect(page).toHaveURL("/aluno/assiduidade");

    // check-in-s1-a-2 (Treino A, 03/01/2026, viewed + reação + feedback) não é
    // o check-in mais recente (esse é o de 10/01, sem reação/feedback), então
    // a visão "Dia" por padrão não mostra esse dia — precisa ir pra "Mês".
    await page.getByRole("tab", { name: "Mês" }).click();
    await page.getByRole("button", { name: /03\/01\/2026/ }).click();

    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByText("Mandou muito bem no treino de hoje, continue assim!"),
    ).toBeVisible();
    await expect(dialog.getByText("Rafael Monteiro", { exact: false })).toBeVisible();
  });
});

test.describe("Treinos Concluídos (personal)", () => {
  test("personal revisa um treino concluído, reage com emoji e envia feedback", async ({
    page,
  }) => {
    await loginAs(page, "personal");
    await page.getByRole("link", { name: "Treinos Concluídos" }).click();
    await expect(page).toHaveURL("/treinos-concluidos");

    // check-in-s1-a-1 é o único não visto nas fixtures — cartão com "Novo".
    const newCard = page.getByRole("button", { name: /Novo/ });
    await expect(newCard).toBeVisible();
    await newCard.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByRole("button", { name: "Escolher emoji" }).click();
    await page.getByLabel("Type to search for an emoji").fill("flexed biceps");
    await page.locator('[data-unified="1f4aa"]').first().click();
    await expect(page.getByText("Reação enviada")).toBeVisible();

    await dialog.getByLabel("Mensagem").fill("Bora fechar a semana com tudo!");
    await dialog.getByRole("button", { name: "Enviar feedback" }).click();
    await expect(page.getByText("Feedback enviado")).toBeVisible();
    await expect(dialog.getByText("Bora fechar a semana com tudo!")).toBeVisible();

    await page.keyboard.press("Escape");

    // O cartão não é mais "Novo" e agora mostra o emoji da reação.
    await expect(page.getByRole("button", { name: /Novo/ })).toHaveCount(0);
  });
});
