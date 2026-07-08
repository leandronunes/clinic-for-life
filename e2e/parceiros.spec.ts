import { test, expect } from "@playwright/test";
import { loginAs } from "./fixtures";

test.describe("Vitrine pública de parceiros", () => {
  test("aparece na tela de login com os parceiros seedados", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Nossos parceiros")).toBeVisible();
    await expect(page.getByText("NutriVida", { exact: true })).toBeVisible();
    await expect(page.getByText("FisioMove", { exact: true })).toBeVisible();
  });

  test("clicar num parceiro abre o modal de detalhes sem sair da página", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /NutriVida/ }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("NutriVida")).toBeVisible();
    await expect(
      dialog.getByText("10% de desconto na primeira consulta para alunos do Núcleo For Life."),
    ).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Visitar site" })).toHaveAttribute(
      "href",
      "https://nutrivida.example.com",
    );
    await expect(page).toHaveURL("/login");
  });
});

test.describe("Gestão de parceiros (admin)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/parceiros");
  });

  test("lista os parceiros seedados", async ({ page }) => {
    await expect(page.getByText("NutriVida", { exact: true })).toBeVisible();
    await expect(page.getByText("SuperSuplementos", { exact: true })).toBeVisible();
  });

  test("abre o modal de detalhes ao clicar em 'Ver detalhes'", async ({ page }) => {
    // NutriVida é o primeiro parceiro seedado (ordem estável tanto na API
    // real, ordenada por categoria+nome, quanto no mock offline, por ordem
    // de inserção — ver e2e/parceiros.spec.ts da vitrine pública).
    await page.getByRole("button", { name: "Ver detalhes" }).first().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("NutriVida")).toBeVisible();
    await expect(
      dialog.getByText("10% de desconto na primeira consulta para alunos do Núcleo For Life."),
    ).toBeVisible();
    await expect(page).toHaveURL("/parceiros");
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

test.describe("Parceiros (aluno)", () => {
  test("abre o modal de detalhes ao clicar em 'Ver detalhes'", async ({ page }) => {
    await loginAs(page, "aluno");
    await page.goto("/aluno/parceiros");

    await page.getByRole("button", { name: "Ver detalhes" }).first().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("NutriVida")).toBeVisible();
    await expect(
      dialog.getByText("10% de desconto na primeira consulta para alunos do Núcleo For Life."),
    ).toBeVisible();
    await expect(page).toHaveURL("/aluno/parceiros");
  });
});
