import type { Page } from "@playwright/test";

/** Demo accounts seeded in the offline mock store (see src/lib/api/mock/fixtures.ts). */
export const DEMO_ACCOUNTS = {
  admin: { email: "admin@forlife.app", password: "Admin@2026" },
  personal: { email: "personal@forlife.app", password: "Personal@2026" },
  aluno: { email: "aluno@forlife.app", password: "Aluno@2026" },
} as const;

export type DemoRole = keyof typeof DEMO_ACCOUNTS;

/** Logs in through the real login form and waits for the post-login redirect. */
export async function loginAs(page: Page, role: DemoRole): Promise<void> {
  const { email, password } = DEMO_ACCOUNTS[role];
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  // exact: true — "Senha" would otherwise substring-match the eye-toggle
  // button's aria-label ("Mostrar/ocultar senha").
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL(role === "aluno" ? "/aluno" : "/dashboard");
}
