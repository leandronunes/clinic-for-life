import { test, expect } from "@playwright/test";
import { loginAs } from "./fixtures";

test.describe("Mensagens (personal)", () => {
  test("abre a lista de conversas, seleciona um aluno e envia uma mensagem", async ({ page }) => {
    await loginAs(page, "personal");
    await page.getByRole("link", { name: "Mensagens" }).click();
    await expect(page).toHaveURL("/mensagens");

    // Júlia Ferreira (student-1) já vem com histórico de mensagens semeado.
    await page.getByRole("button", { name: /Júlia Ferreira/ }).click();
    await expect(page.getByText("Chat direto")).toBeVisible();

    await page.getByLabel("Mensagem", { exact: true }).fill("Vamos treinar amanhã às 8h?");
    await page.getByLabel("Enviar mensagem").click();

    await expect(page.getByText("Vamos treinar amanhã às 8h?")).toBeVisible();
    await expect(page.getByLabel("Mensagem", { exact: true })).toHaveValue("");
  });

  test("mostra o histórico de mensagens já semeado para o aluno selecionado", async ({ page }) => {
    await loginAs(page, "personal");
    await page.getByRole("link", { name: "Mensagens" }).click();
    await page.getByRole("button", { name: /Júlia Ferreira/ }).click();

    await expect(
      page.getByText("Perfeito! Amanhã vamos focar em mobilidade, ok? 🧘"),
    ).toBeVisible();
  });
});

test.describe("Mensagens (aluno)", () => {
  test("vê e responde a conversa com o próprio personal", async ({ page }) => {
    await loginAs(page, "aluno");
    await page.getByRole("link", { name: "Mensagens" }).click();
    await expect(page).toHaveURL("/aluno/mensagens");

    await expect(
      page.getByText("Perfeito! Amanhã vamos focar em mobilidade, ok? 🧘"),
    ).toBeVisible();

    await page.getByLabel("Mensagem", { exact: true }).fill("Combinado, até amanhã!");
    await page.getByLabel("Enviar mensagem").click();

    await expect(page.getByText("Combinado, até amanhã!")).toBeVisible();
  });
});
