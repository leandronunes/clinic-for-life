import { test, expect } from "@playwright/test";
import { loginAs } from "./fixtures";

test.describe("Link de perfil no header", () => {
  test("admin (sem impersonar) acessa e edita o próprio perfil", async ({ page }) => {
    await loginAs(page, "admin");

    await page.getByRole("link", { name: /dra\. camila andrade/i }).click();
    await expect(page).toHaveURL("/perfil");

    // Field (@/routes/_app.perfil.tsx) renders <Label> without htmlFor —
    // getByLabel/getByRole(name) don't work here; select inputs by order
    // (ver docs/e2e.md, mesmo gap documentado para _app.usuarios.tsx).
    const nameInput = page.locator("main input").nth(0);
    const emailInput = page.locator("main input").nth(1);
    await expect(nameInput).toHaveValue("Dra. Camila Andrade");
    await expect(emailInput).toHaveValue("admin@forlife.app");

    await nameInput.fill("Camila Andrade Silva");
    await page.getByRole("button", { name: "Salvar alterações" }).click();

    await expect(page.getByText("Perfil atualizado")).toBeVisible();
    await expect(page.getByRole("link", { name: /camila andrade silva/i })).toBeVisible();
  });

  test("admin impersonando um aluno vê o perfil dele somente leitura", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/usuarios");
    await page.getByRole("row").filter({ hasText: "Júlia Ferreira" }).click();
    await expect(page).toHaveURL("/aluno");
    await expect(page.getByText("Visualizando como aluno")).toBeVisible();

    await page.getByRole("link", { name: /dra\. camila andrade/i }).click();
    await expect(page).toHaveURL("/perfil");

    await expect(page.getByRole("heading", { name: "Perfil de Júlia Ferreira" })).toBeVisible();
    await expect(page.getByText(/somente leitura/i)).toBeVisible();
    await expect(page.getByText("aluno@forlife.app")).toBeVisible();
    await expect(page.getByRole("button", { name: "Salvar alterações" })).not.toBeVisible();
    await expect(page.locator("main input")).toHaveCount(0);
  });

  test("aluno acessa e edita o próprio perfil (comportamento existente)", async ({ page }) => {
    await loginAs(page, "aluno");

    await page.getByRole("link", { name: /júlia ferreira/i }).click();
    await expect(page).toHaveURL("/perfil");

    await expect(page.locator("main input").nth(0)).toHaveValue("Júlia Ferreira");
    await expect(page.getByRole("button", { name: "Salvar alterações" })).toBeVisible();
    await expect(page.getByText("Meu Personal")).toBeVisible();
  });
});
