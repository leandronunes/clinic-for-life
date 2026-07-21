import { test, expect } from "@playwright/test";
import { loginAs } from "./fixtures";

test.describe("Mensagens (personal)", () => {
  test("abre a lista de conversas, seleciona um aluno e envia uma mensagem", async ({ page }) => {
    await loginAs(page, "personal");
    // Navega direto pela URL — o item de menu "Mensagens" fica atrás da
    // feature flag VITE_FEATURE_CHAT (ver src/lib/feature-flags.ts), mas a
    // rota em si não é bloqueada, mesmo com a flag desligada (ex.: no CI).
    await page.goto("/mensagens");

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
    await page.goto("/mensagens");
    await page.getByRole("button", { name: /Júlia Ferreira/ }).click();

    await expect(
      page.getByText("Perfeito! Amanhã vamos focar em mobilidade, ok? 🧘"),
    ).toBeVisible();
  });
});

test.describe("Mensagens (aluno)", () => {
  test("vê e responde a conversa com o próprio personal", async ({ page }) => {
    await loginAs(page, "aluno");
    await page.goto("/aluno/mensagens");

    await expect(
      page.getByText("Perfeito! Amanhã vamos focar em mobilidade, ok? 🧘"),
    ).toBeVisible();

    await page.getByLabel("Mensagem", { exact: true }).fill("Combinado, até amanhã!");
    await page.getByLabel("Enviar mensagem").click();

    await expect(page.getByText("Combinado, até amanhã!")).toBeVisible();
  });
});
