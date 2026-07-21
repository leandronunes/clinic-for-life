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

test.describe("Recuperação de senha", () => {
  test("pede o link em /esqueci-senha a partir do login", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Esqueci minha senha" }).click();
    await expect(page).toHaveURL("/esqueci-senha");

    await page.getByLabel("E-mail").fill("aluno@forlife.app");
    await page.getByRole("button", { name: "Enviar link de redefinição" }).click();

    await expect(page.getByText(/receberá um link de redefinição/)).toBeVisible();
  });

  test("mostra a mesma mensagem genérica mesmo para um e-mail não cadastrado", async ({ page }) => {
    await page.goto("/esqueci-senha");
    await page.getByLabel("E-mail").fill("ninguem@forlife.app");
    await page.getByRole("button", { name: "Enviar link de redefinição" }).click();

    await expect(page.getByText(/receberá um link de redefinição/)).toBeVisible();
  });

  test("redefine a senha com um token válido e autentica automaticamente", async ({ page }) => {
    // Token fixo aceito pelo mock offline — ver MOCK_PASSWORD_RESET_TOKEN em
    // src/lib/api/mock/store.ts (não há entrega real de e-mail no modo offline).
    await page.goto("/redefinir-senha?token=mock-reset-token-fixed");

    await page.getByLabel("Nova senha", { exact: true }).fill("N3w@Str0ngPass");
    await page.getByLabel("Confirmar nova senha").fill("N3w@Str0ngPass");
    await page.getByRole("button", { name: "Redefinir senha" }).click();

    await expect(page).toHaveURL("/aluno");
    await expect(page.getByRole("heading", { name: "Meu Treino" })).toBeVisible();
  });

  test("mostra erro para um token inválido", async ({ page }) => {
    await page.goto("/redefinir-senha?token=token-invalido");

    await page.getByLabel("Nova senha", { exact: true }).fill("N3w@Str0ngPass");
    await page.getByLabel("Confirmar nova senha").fill("N3w@Str0ngPass");
    await page.getByRole("button", { name: "Redefinir senha" }).click();

    await expect(page.getByText("Link inválido ou expirado")).toBeVisible();
    await expect(page).toHaveURL("/redefinir-senha?token=token-invalido");
  });

  test("sem token na URL, oferece pedir um novo link", async ({ page }) => {
    await page.goto("/redefinir-senha");

    await expect(page.getByText("Este link de redefinição é inválido.")).toBeVisible();
    await page.getByRole("link", { name: "Pedir um novo link" }).click();
    await expect(page).toHaveURL("/esqueci-senha");
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
