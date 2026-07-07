import { test, expect } from "@playwright/test";
import { DEMO_ACCOUNTS, loginAs } from "./fixtures";

test.describe("Autenticação", () => {
  test("redireciona para /login quando não autenticado", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL("/login");
  });

  test("login com credenciais inválidas mostra erro e permanece em /login", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-mail").fill("admin@forlife.app");
    await page.getByLabel("Senha", { exact: true }).fill("SenhaErrada@123");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();

    await expect(page.getByText("Credenciais inválidas")).toBeVisible();
    await expect(page).toHaveURL("/login");
  });

  test("admin faz login e vê o Dashboard", async ({ page }) => {
    await loginAs(page, "admin");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    // Nome aparece tanto na sidebar quanto no header — basta confirmar que existe.
    await expect(page.getByText("Dra. Camila Andrade").first()).toBeVisible();
  });

  test("personal faz login e vê o Dashboard", async ({ page }) => {
    await loginAs(page, "personal");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("aluno faz login e é redirecionado para Meu Treino", async ({ page }) => {
    await loginAs(page, "aluno");
    await expect(page.getByRole("heading", { name: "Meu Treino" })).toBeVisible();
  });

  test("logout volta para a tela de login", async ({ page }) => {
    await loginAs(page, "admin");
    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL("/login");

    await page.goto("/dashboard");
    await expect(page).toHaveURL("/login");
  });
});

test.describe("Cadastro (fora do fluxo autenticado)", () => {
  test("link 'Criar conta' navega para /cadastro", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Criar conta" }).click();
    await expect(page).toHaveURL("/cadastro");
  });
});

test("contas de demonstração documentadas continuam válidas", async ({ page }) => {
  for (const role of Object.keys(DEMO_ACCOUNTS) as Array<keyof typeof DEMO_ACCOUNTS>) {
    await loginAs(page, role);
    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL("/login");
  }
});
