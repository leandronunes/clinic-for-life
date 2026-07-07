import { test, expect } from "@playwright/test";
import { loginAs } from "./fixtures";

test.describe("Vitrine pública de parceiros", () => {
  test("aparece na tela de login com os parceiros seedados", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Nossos parceiros")).toBeVisible();
    // exact: true — o nome também aparece como substring do link (href)
    // exibido no cartão (ex.: "https://nutrivida.example.com").
    await expect(page.getByText("NutriVida", { exact: true })).toBeVisible();
    await expect(page.getByText("FisioMove", { exact: true })).toBeVisible();
  });
});

test.describe("Gestão de parceiros (admin)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/parceiros");
  });

  test("lista os parceiros seedados", async ({ page }) => {
    // exact: true — o nome também aparece como substring do link (href)
    // exibido no cartão (ex.: "https://nutrivida.example.com").
    await expect(page.getByText("NutriVida", { exact: true })).toBeVisible();
    await expect(page.getByText("SuperSuplementos", { exact: true })).toBeVisible();
  });

  test("cadastra um novo parceiro", async ({ page }) => {
    await page.getByRole("button", { name: "Novo parceiro" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Novo parceiro")).toBeVisible();

    await dialog.getByLabel("Nome").fill("Parceiro E2E");
    await dialog.getByRole("button", { name: "Cadastrar" }).click();

    await expect(dialog).not.toBeVisible();
    await expect(page.getByText("Parceiro E2E")).toBeVisible();
  });

  test("remove um parceiro", async ({ page }) => {
    await page.getByRole("button", { name: "Novo parceiro" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Nome").fill("Parceiro Para Remover");
    await dialog.getByRole("button", { name: "Cadastrar" }).click();
    await expect(page.getByText("Parceiro Para Remover")).toBeVisible();

    // Recém-criado é anexado ao fim da lista, então é o último cartão renderizado.
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Remover" }).last().click();
    await expect(page.getByText("Parceiro Para Remover")).not.toBeVisible();
  });
});
