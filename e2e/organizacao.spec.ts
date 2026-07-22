import { test, expect } from "@playwright/test";
import { loginAs } from "./fixtures";

test.describe("Gestão da organização (admin)", () => {
  test("aparece no menu lateral do admin e permite editar nome/domínio", async ({ page }) => {
    await loginAs(page, "admin");

    await page.getByRole("link", { name: "Organização" }).click();
    await expect(page).toHaveURL("/organizacao");

    const nameInput = page.locator("main input").nth(0);
    const domainInput = page.locator("main input").nth(1);
    await expect(nameInput).toHaveValue("Clínica For Life");
    await expect(domainInput).toHaveValue("clinica-for-life");

    await nameInput.fill("Clínica For Life Renomeada");
    await page.getByRole("button", { name: "Salvar alterações" }).click();

    await expect(page.getByText("Organização atualizada")).toBeVisible();
    await expect(nameInput).toHaveValue("Clínica For Life Renomeada");
  });

  test("não aparece no menu lateral do personal, e a rota redireciona para /dashboard", async ({
    page,
  }) => {
    await loginAs(page, "personal");

    await expect(page.getByRole("link", { name: "Organização" })).not.toBeVisible();

    await page.goto("/organizacao");
    await expect(page).toHaveURL("/dashboard");
  });
});
