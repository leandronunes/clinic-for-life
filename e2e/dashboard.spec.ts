import { test, expect } from "@playwright/test";
import { loginAs } from "./fixtures";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "admin");
  });

  test("mostra os KPIs administrativos", async ({ page }) => {
    // Escopado a <main> — "Alunos"/"Parceiros" também aparecem como links de
    // navegação na sidebar/bottom nav com o mesmo texto.
    const main = page.getByRole("main");
    await expect(main.getByText("Alunos", { exact: true })).toBeVisible();
    await expect(main.getByText("Personais", { exact: true })).toBeVisible();
    await expect(main.getByText("Parceiros", { exact: true })).toBeVisible();
    // .first() — "Avaliações" também é o nome da série no tooltip (oculto) do gráfico.
    await expect(main.getByText("Avaliações", { exact: true }).first()).toBeVisible();
    await expect(main.getByText("Treinos Ativos", { exact: true })).toBeVisible();
  });

  test("troca o período (dia/semana/mês/ano) sem quebrar a página", async ({ page }) => {
    await page.getByRole("tab", { name: "Ano" }).click();
    await expect(page.getByRole("tab", { name: "Ano" })).toHaveAttribute("data-state", "active");

    await page.getByRole("tab", { name: "Dia" }).click();
    await expect(page.getByRole("tab", { name: "Dia" })).toHaveAttribute("data-state", "active");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("mostra o card de assiduidade", async ({ page }) => {
    const main = page.getByRole("main");
    await expect(main.getByText("Assiduidade", { exact: true })).toBeVisible();
    await expect(main.getByText("Check-ins", { exact: true })).toBeVisible();
    await expect(main.getByText("Concluídos", { exact: true })).toBeVisible();
  });
});

test.describe("Dashboard — personal", () => {
  test("não mostra KPIs administrativos (Personais/Parceiros)", async ({ page }) => {
    await loginAs(page, "personal");
    const main = page.getByRole("main");
    await expect(main.getByText("Alunos", { exact: true })).toBeVisible();
    await expect(main.getByText("Personais", { exact: true })).not.toBeVisible();
    await expect(main.getByText("Parceiros", { exact: true })).not.toBeVisible();
  });
});
