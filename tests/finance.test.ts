import { describe, it, expect } from "vitest";
import {
  convert,
  ingredientCost,
  recipeCost,
  productCost,
  pricing,
  quoteTotals,
  snapshot,
} from "../src/lib/finance";
import type { Ingredient, Recipe, Product } from "../src/lib/types";
const chocolate: Ingredient = {
  id: "chocolate",
  name: "Chocolate",
  quantity: "1",
  unit: "kg",
  price: "32",
  notes: "",
};
const recipe: Recipe = {
  id: "recipe",
  name: "Brigadeiro",
  description: "",
  category: "",
  yield_quantity: "20",
  yield_unit: "un",
  items: [{ ingredient_id: "chocolate", quantity: "250", unit: "g" }],
  packaging: "3",
  labor: "6",
  other: "3",
  waste: "0",
};
describe("Cálculos financeiros", () => {
  it("converte unidades compatíveis com precisão", () => {
    expect(convert("1", "kg", "g").toString()).toBe("1000");
    expect(convert("250", "ml", "L").toString()).toBe("0.25");
    expect(() => convert(1, "g", "ml")).toThrow();
    expect(() => convert(1, "un", "kg")).toThrow();
  });
  it("custa 250g de um pacote de 1kg por 32 reais em 8 reais", () =>
    expect(ingredientCost(chocolate, 250, "g").toString()).toBe("8"));
  it("calcula custo, rendimento e unidade sem arredondar intermediários", () => {
    const c = recipeCost(recipe, [chocolate]);
    expect(c.total.toString()).toBe("20");
    expect(c.unit.toString()).toBe("1");
    expect(
      recipeCost({ ...recipe, yield_quantity: "3" }, [chocolate])
        .unit.mul(3)
        .toFixed(10),
    ).toBe("20.0000000000");
  });
  it("recalcula com preços novos e aplica perdas sobre aproveitamento", () => {
    expect(
      recipeCost(recipe, [{ ...chocolate, price: "40" }]).total.toString(),
    ).toBe("22");
    expect(
      recipeCost({ ...recipe, waste: "20" }, [chocolate]).total.toString(),
    ).toBe("25");
  });
  it("rejeita rendimento zero e perda inválida", () => {
    expect(() =>
      recipeCost({ ...recipe, yield_quantity: "0" }, [chocolate]),
    ).toThrow();
    expect(() =>
      recipeCost({ ...recipe, waste: "100" }, [chocolate]),
    ).toThrow();
  });
  it("considera seis unidades da receita mais embalagem da caixa", () => {
    const p: Product = {
      id: "p",
      name: "Caixa",
      description: "",
      category: "",
      recipe_id: "recipe",
      recipe_quantity: "6",
      manual_cost: "0",
      packaging: "2",
      price: "15",
      unit: "caixa",
      active: true,
      photo_path: null,
    };
    expect(productCost(p, [recipe], [chocolate]).toString()).toBe("8");
  });
  it("diferencia margem de markup e considera taxas apenas uma vez", () => {
    const p = pricing(10, 30, 10);
    expect(p.suggested.toFixed(2)).toBe("16.67");
    expect(p.margin.toFixed(2)).toBe("30.00");
    expect(p.markup?.toFixed(4)).toBe("1.6667");
    expect(pricing(10, 30, 10, 2).suggested.toString()).toBe("20");
    expect(pricing(10, 30, 10, 0, 20).profit.toString()).toBe("8");
  });
  it("rejeita percentuais inválidos e não finitos", () => {
    expect(() => pricing(10, 90, 10)).toThrow();
    expect(() => pricing(10, -1, 0)).toThrow();
    expect(() => pricing("Infinity", 10, 0)).toThrow();
  });
  it("calcula itens, descontos, frete e preserva snapshot", () => {
    const original = [
      {
        product_id: "p",
        name: "Caixa",
        description: "6 doces",
        price: "15.50",
        quantity: "3",
      },
    ];
    const copy = snapshot(original);
    original[0].price = "20";
    expect(copy[0].price).toBe("15.50");
    const totals = quoteTotals(copy, 10, "percent", 5);
    expect(totals.subtotal.toString()).toBe("46.5");
    expect(totals.discount.toString()).toBe("4.65");
    expect(totals.total.toString()).toBe("46.85");
    expect(quoteTotals(copy, 5, "fixed", 3).total.toString()).toBe("44.5");
  });
  it("rejeita desconto excessivo e arredonda valores finais", () => {
    expect(() => quoteTotals([], 1, "fixed", 0)).toThrow();
    expect(() => quoteTotals([], 101, "percent", 0)).toThrow();
    expect(
      quoteTotals(
        [
          {
            product_id: null,
            name: "a",
            description: "",
            quantity: "3",
            price: "0.10",
          },
        ],
        0,
        "fixed",
        0,
      ).total.toFixed(2),
    ).toBe("0.30");
  });
});
