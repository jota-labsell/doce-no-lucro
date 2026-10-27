import { test, expect } from "@playwright/test";
test("landing, proteção de acesso, cadastro e recuperação", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Seu talento faz doces/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Vendas em preparação" }),
  ).toBeDisabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/landing-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.goto("/app");
  await expect(page).toHaveURL(/entrar/);
  await page.getByRole("button", { name: /Ainda não tem conta/ }).click();
  await expect(
    page.getByRole("button", { name: "Criar conta", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Esqueci minha senha" }).click();
  await expect(
    page.getByRole("button", { name: "Enviar instruções" }),
  ).toBeVisible();
});
test("cadastros e orçamento pela interface com API isolada de teste", async ({
  page,
}) => {
  const user = {
    id: "11111111-1111-4111-8111-111111111111",
    email: "teste@example.com",
    aud: "authenticated",
    role: "authenticated",
  };
  const token = [
    btoa("{}"),
    btoa(
      JSON.stringify({ ...user, exp: Math.floor(Date.now() / 1000) + 3600 }),
    ),
    "signature",
  ].join(".");
  await page.addInitScript(
    ({ token, user }) =>
      localStorage.setItem(
        "sb-doce-test-auth-token",
        JSON.stringify({
          access_token: token,
          refresh_token: "test-only",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          expires_in: 3600,
          token_type: "bearer",
          user,
        }),
      ),
    { token, user },
  );
  const tables: Record<string, Record<string, unknown>[]> = {
    ingredients: [],
    recipes: [],
    products: [],
    quotes: [],
    bakeries: [],
  };
  await page.route("https://doce-test.supabase.co/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.pathname.includes("/auth/")) return route.fulfill({ json: user });
    const table = url.pathname.split("/").pop()!;
    if (req.method() === "POST") {
      const record = req.postDataJSON();
      const index = tables[table].findIndex((r) => r.id === record.id);
      if (index >= 0) tables[table][index] = record;
      else tables[table].push(record);
      return route.fulfill({ status: 201, json: null });
    }
    return route.fulfill({ json: tables[table] || [] });
  });
  await page.goto("/app");
  await expect(
    page.getByRole("heading", { name: "Seu negócio, com mais clareza" }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/dashboard-${test.info().project.name}.png`,
    fullPage: true,
  });
  async function go(path: string) {
    await page.goto("/app/" + path);
    await expect(
      page.getByRole("heading", { name: "Seu negócio, com mais clareza" }),
    ).not.toBeVisible();
  }
  await go("ingredientes");
  await page.getByRole("button", { name: "+ Novo ingrediente" }).click();
  await page.getByLabel("Nome", { exact: true }).fill("Chocolate");
  await page.getByLabel("Preço de compra (R$)").fill("32");
  await page.getByLabel("Quantidade comprada").fill("1");
  await page.getByLabel("Unidade", { exact: true }).selectOption("kg");
  await page.getByRole("button", { name: "Salvar ingrediente" }).click();
  await expect(
    page.getByRole("heading", { name: "Chocolate", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await page.getByLabel("Preço de compra (R$)").fill("40");
  await page.getByRole("button", { name: "Salvar ingrediente" }).click();
  await expect.poll(() => tables.ingredients[0].price).toBe("40");
  await expect(
    page.getByRole("button", { name: "Salvar ingrediente" }),
  ).not.toBeVisible();
  await go("receitas");
  await page.getByRole("button", { name: "+ Nova receita" }).click();
  await page.getByLabel("Nome", { exact: true }).fill("Brigadeiro");
  await page.getByRole("button", { name: "+ Adicionar ingrediente" }).click();
  await page.getByLabel("Quantidade utilizada").fill("0.25");
  await page.getByLabel("Rendimento", { exact: true }).fill("20");
  await page.getByRole("button", { name: "Salvar receita" }).click();
  await expect(
    page.getByRole("heading", { name: "Brigadeiro", exact: true }),
  ).toBeVisible();
  await go("produtos");
  await page.getByRole("button", { name: "+ Novo produto" }).click();
  await page.getByLabel("Nome comercial").fill("Caixa especial");
  await page
    .getByLabel("Receita associada")
    .selectOption(String(tables.recipes[0].id));
  await page.getByLabel(/Unidades de rendimento/).fill("6");
  await page.getByLabel("Preço de venda (R$)").fill("15");
  await page.getByRole("button", { name: "Salvar produto" }).click();
  await expect(
    page.getByRole("heading", { name: "Caixa especial", exact: true }),
  ).toBeVisible();
  await go("orcamentos");
  await page.getByRole("button", { name: "+ Criar orçamento" }).click();
  await page.getByLabel("Nome da cliente").fill("Cliente de teste");
  await page
    .getByLabel("Adicionar do catálogo")
    .selectOption(String(tables.products[0].id));
  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(
    page.getByRole("heading", { name: "Cliente de teste", exact: true }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Baixar PDF" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.pdf$/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/quotes-${test.info().project.name}.png`,
    fullPage: true,
  });
  await go("precificacao");
  await page.getByLabel("Custo unitário (R$)").fill("10");
  await page.getByLabel("Taxas sobre a venda (%)").fill("10");
  const result = page.getByRole("region", {
    name: "Resultado da precificação",
  });
  await expect(result.locator(".price")).toHaveText(/16,67/);
  await expect(result).toContainText("30.00%");
  await page.getByLabel("Preço escolhido (opcional, R$)").fill("5");
  await expect(result.locator(".negative")).toContainText(/5,50/);
  const marginBounds = await page
    .getByLabel("Margem desejada (%)")
    .boundingBox();
  expect(marginBounds!.width).toBeGreaterThan(100);
  await page.getByLabel("Margem desejada (%)").fill("90");
  await expect(page.getByRole("alert")).toContainText("menores que 100%");
  await expect(result.locator(".price")).not.toBeVisible();
  await page.getByLabel("Margem desejada (%)").fill("30");
  await page.getByLabel("Preço escolhido (opcional, R$)").fill("");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/pricing-${test.info().project.name}.png`,
    fullPage: true,
  });
  if (test.info().project.name === "mobile") {
    await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
    await expect(page.locator(".mobile-menu")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await page
      .getByRole("navigation", { name: "Menu principal" })
      .getByRole("link", { name: "Visão geral" })
      .click();
  } else
    await page
      .getByRole("navigation", { name: "Menu principal" })
      .getByRole("link", { name: "Visão geral" })
      .click();
  await page
    .getByLabel("Produto analisado")
    .selectOption(String(tables.products[0].id));
  await expect(
    page.getByRole("region", { name: "Análise de produto" }),
  ).toContainText(/3,00/);
  await page.screenshot({
    path: `test-results/dashboard-populated-${test.info().project.name}.png`,
    fullPage: true,
  });
});
