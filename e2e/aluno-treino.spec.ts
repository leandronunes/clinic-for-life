import { test, expect } from "@playwright/test";
import { loginAs } from "./fixtures";

test.describe("Meu Treino (aluno)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "aluno");
  });

  test("mostra o primeiro treino ativo (posição 0) com seus exercícios", async ({ page }) => {
    // Apenas o treino selecionado é exibido por completo; os demais aparecem
    // como botões com o título cadastrado do treino — ver SortableWorkoutButton.
    // O título também aparece no cabeçalho do card do treino selecionado, então
    // usamos o role "button" pra mirar só o seletor, evitando ambiguidade.
    await expect(page.getByRole("button", { name: "Treino A" })).toBeVisible();
    await expect(page.getByText("Supino reto")).toBeVisible();
  });

  test("troca para o segundo treino ativo pelo seletor 'Treino B'", async ({ page }) => {
    await page.getByRole("button", { name: "Treino B" }).click();
    await expect(page.getByText("Agachamento livre")).toBeVisible();
    await expect(page.getByText("Cadeira extensora")).toBeVisible();
  });

  test("aba Arquivados mostra o treino arquivado, não os ativos", async ({ page }) => {
    await page.getByRole("tab", { name: "Arquivados" }).click();
    await expect(page.getByText("Arquivado", { exact: true })).toBeVisible();
    // Só existe 1 treino arquivado no fixture — só deve haver 1 seletor.
    await expect(page.getByRole("button", { name: "Treino C" })).toHaveCount(1);
  });
});

test.describe("Meu Treino (admin visualizando como aluno)", () => {
  test("admin pode entrar como aluno pela lista de usuários e ver o treino dele", async ({
    page,
  }) => {
    await loginAs(page, "admin");
    await page.goto("/usuarios");
    await page.getByRole("row").filter({ hasText: "Júlia Ferreira" }).click();

    await expect(page).toHaveURL("/aluno");
    await expect(page.getByText("Visualizando como aluno")).toBeVisible();
    await expect(page.getByRole("button", { name: "Treino A" })).toBeVisible();

    await page.getByRole("button", { name: "Voltar ao meu perfil" }).click();
    await expect(page).toHaveURL("/usuarios");
  });

  test("admin adiciona um exercício de cardio ao treino do aluno", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/usuarios");
    await page.getByRole("row").filter({ hasText: "Júlia Ferreira" }).click();
    await expect(page).toHaveURL("/aluno");

    await page.getByRole("button", { name: "Adicionar cardio" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByPlaceholder("Ex.: Corrida na esteira").fill("Corrida no parque");
    await dialog.getByRole("button", { name: "Adicionar" }).click();

    await expect(page.getByText("Corrida no parque")).toBeVisible();
    await expect(page.getByRole("main").getByText("Cardio", { exact: true }).first()).toBeVisible();
  });

  test("admin adiciona um exercício de mobilidade ao treino do aluno", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/usuarios");
    await page.getByRole("row").filter({ hasText: "Júlia Ferreira" }).click();
    await expect(page).toHaveURL("/aluno");

    await page.getByRole("button", { name: "Adicionar mobilidade" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByPlaceholder("Ex.: Alongamento de quadril").fill("Alongamento de ombro");
    await dialog.getByRole("button", { name: "Adicionar" }).click();

    await expect(page.getByText("Alongamento de ombro")).toBeVisible();
    await expect(
      page.getByRole("main").getByText("Mobilidade", { exact: true }).first(),
    ).toBeVisible();
  });

  test("admin remove um treino do aluno", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/usuarios");
    await page.getByRole("row").filter({ hasText: "Júlia Ferreira" }).click();
    await expect(page).toHaveURL("/aluno");
    await expect(page.getByRole("button", { name: "Treino A" })).toBeVisible();

    await page.getByRole("button", { name: "Remover treino" }).click();
    await page.getByRole("button", { name: "Remover", exact: true }).click();

    await expect(page.getByText("Treino removido")).toBeVisible();
    // Só restava o Treino B ativo: um único seletor com esse título e o card
    // exibido é o dele — prova indireta de que o Treino A não existe mais. (Não
    // verificamos a ausência de "Treino A" diretamente: esse texto colide via
    // substring case-insensitive com "Novo treino" + "Ativos", ver docs/e2e.md.)
    await expect(page.getByRole("button", { name: "Treino B" })).toHaveCount(1);
    await expect(page.getByText("Agachamento livre")).toBeVisible();
  });
});

test.describe("Copiar e colar treino entre alunos (personal)", () => {
  test("copia o Treino A de Júlia e cola no aluno Pedro", async ({ page }) => {
    await loginAs(page, "personal");

    // Origem: Júlia (student-1) tem "Treino A" com 3 exercícios — ver fixtures.
    await page.goto("/alunos/student-1");
    await expect(page).toHaveURL("/aluno");
    await expect(page.getByRole("button", { name: "Treino A" })).toBeVisible();

    await page.getByLabel("Copiar treino").click();
    await expect(page.getByText(/copiado/i)).toBeVisible();

    // Destino: Pedro (student-2), sem nenhum treino cadastrado nas fixtures.
    await page.goto("/alunos/student-2");
    await expect(page).toHaveURL("/aluno");
    await expect(page.getByText("Nenhum treino ativo.")).toBeVisible();

    const colarTrigger = page.getByRole("button", { name: /Colar treino/ });
    await expect(colarTrigger).toBeVisible();
    await expect(colarTrigger.getByText("3 ex.")).toBeVisible();
    await colarTrigger.click();

    // Field (@/routes/_app.aluno.index.tsx) renders <Label> without htmlFor —
    // getByLabel não funciona aqui; os inputs seguem a ordem "Novo título",
    // "Novo foco" do formulário (ver docs/e2e.md).
    const dialog = page.getByRole("dialog");
    const titleInput = dialog.getByRole("textbox").nth(0);
    const focusInput = dialog.getByRole("textbox").nth(1);
    await expect(titleInput).toHaveValue("Treino A");
    await expect(focusInput).toHaveValue("Superior");
    await dialog.getByRole("button", { name: "Colar treino", exact: true }).click();

    await expect(page.getByText(/Treino colado com 3 exercícios/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Treino A" })).toBeVisible();
    await expect(page.getByText("Supino reto")).toBeVisible();
    await expect(page.getByText("Puxada frente")).toBeVisible();
    await expect(page.getByText("Desenvolvimento com halteres")).toBeVisible();
  });

  test("o botão de colar some depois de limpar o treino copiado", async ({ page }) => {
    await loginAs(page, "personal");

    await page.goto("/alunos/student-1");
    await expect(page).toHaveURL("/aluno");
    await page.getByLabel("Copiar treino").click();

    await page.goto("/alunos/student-2");
    await expect(page).toHaveURL("/aluno");
    await expect(page.getByRole("button", { name: /Colar treino/ })).toBeVisible();

    await page.getByLabel("Limpar treino copiado").click();
    await expect(page.getByRole("button", { name: /Colar treino/ })).not.toBeVisible();
  });
});

test.describe("Meu Treino — layout mobile", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("não gera scroll horizontal com um título de treino longo (cabeçalho + seletor)", async ({
    page,
  }) => {
    await loginAs(page, "personal");
    await page.goto("/alunos/student-1");
    await expect(page).toHaveURL("/aluno");
    await page.getByRole("button", { name: "Treino A" }).click();

    await page.getByLabel("Editar treino").click();
    const dialog = page.getByRole("dialog");
    await dialog
      .getByRole("textbox")
      .first()
      .fill("Treino de Superiores com Ênfase em Peitoral e Ombros — Fase 2");
    await dialog.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByText("Treino de Superiores com Ênfase").first()).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });
});
