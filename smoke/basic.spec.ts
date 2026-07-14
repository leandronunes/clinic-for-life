import { test, expect } from "@playwright/test";

/**
 * Runs against a real production deploy right after a release (see
 * .github/workflows/release.yml) — SMOKE_EMAIL/SMOKE_PASSWORD are a real
 * account, not a demo one, so this only asserts we left /login, not any
 * role-specific page (the account's role isn't guaranteed here).
 */
test("a aplicação carrega e a conta de smoke test consegue entrar", async ({ page }) => {
  await page.goto("/login");

  const email = process.env.SMOKE_EMAIL;
  const password = process.env.SMOKE_PASSWORD;
  if (!email || !password) {
    throw new Error("SMOKE_EMAIL/SMOKE_PASSWORD não configurados neste ambiente");
  }

  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();

  await expect(page).not.toHaveURL("/login");
});
