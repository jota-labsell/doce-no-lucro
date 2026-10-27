import Decimal from "decimal.js";
import type { Ingredient, Recipe, Product, Unit, QuoteItem } from "./types";
Decimal.set({ precision: 32, rounding: Decimal.ROUND_HALF_UP });
export const d = (v: Decimal.Value) => {
  const n = new Decimal(v);
  if (!n.isFinite()) throw new Error("Informe um número válido.");
  return n;
};
export function nonnegative(v: Decimal.Value) {
  const n = d(v);
  if (n.isNegative()) throw new Error("O valor não pode ser negativo.");
  return n;
}
export function positive(v: Decimal.Value) {
  const n = nonnegative(v);
  if (n.isZero()) throw new Error("A quantidade deve ser maior que zero.");
  return n;
}
export const money = (v: Decimal.Value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    d(v).toNumber(),
  );
export const cents = (v: Decimal.Value) => d(v).toDecimalPlaces(2);
const units = {
  g: ["mass", 1],
  kg: ["mass", 1000],
  ml: ["volume", 1],
  L: ["volume", 1000],
  un: ["count", 1],
} as const;
export function convert(q: Decimal.Value, from: Unit, to: Unit) {
  if (units[from][0] !== units[to][0])
    throw new Error("Unidades incompatíveis: não convertemos peso em volume.");
  return nonnegative(q).mul(units[from][1]).div(units[to][1]);
}
export function ingredientCost(i: Ingredient, q: Decimal.Value, u: Unit) {
  return nonnegative(i.price)
    .mul(convert(q, u, i.unit))
    .div(positive(i.quantity));
}
export function recipeCost(r: Recipe, ingredients: Ingredient[]) {
  const ingredient = r.items.reduce((sum, item) => {
    const i = ingredients.find((i) => i.id === item.ingredient_id);
    if (!i) throw new Error("Ingrediente da receita não encontrado.");
    return sum.plus(ingredientCost(i, positive(item.quantity), item.unit));
  }, d(0));
  const waste = nonnegative(r.waste);
  if (waste.gte(100)) throw new Error("Perda deve ser menor que 100%.");
  const subtotal = ingredient
    .plus(nonnegative(r.packaging))
    .plus(nonnegative(r.labor))
    .plus(nonnegative(r.other));
  const total = subtotal.div(d(1).minus(waste.div(100)));
  return { ingredient, total, unit: total.div(positive(r.yield_quantity)) };
}
export function productCost(
  p: Product,
  recipes: Recipe[],
  ingredients: Ingredient[],
) {
  if (!p.recipe_id)
    return nonnegative(p.manual_cost).plus(nonnegative(p.packaging));
  const r = recipes.find((r) => r.id === p.recipe_id);
  if (!r) throw new Error("Receita não encontrada.");
  return recipeCost(r, ingredients)
    .unit.mul(positive(p.recipe_quantity))
    .plus(nonnegative(p.packaging));
}
export function pricing(
  cost: Decimal.Value,
  margin: Decimal.Value,
  fees: Decimal.Value,
  extra: Decimal.Value = 0,
  manual?: Decimal.Value,
) {
  const m = nonnegative(margin).div(100),
    f = nonnegative(fees).div(100);
  if (m.plus(f).gte(1))
    throw new Error("Margem + taxas devem ser menores que 100%.");
  const base = nonnegative(cost).plus(nonnegative(extra));
  const suggested = base.div(d(1).minus(m).minus(f));
  const price = manual === undefined ? suggested : positive(manual);
  const profit = price.mul(d(1).minus(f)).minus(base);
  return {
    suggested,
    price,
    profit,
    margin: price.isZero() ? d(0) : profit.div(price).mul(100),
    markup: base.isZero() ? null : price.div(base),
    difference: price.minus(suggested),
  };
}
export function quoteTotals(
  items: QuoteItem[],
  discount: Decimal.Value,
  kind: "fixed" | "percent",
  delivery: Decimal.Value,
) {
  const subtotals = items.map((i) =>
    cents(positive(i.quantity).mul(nonnegative(i.price))),
  );
  const subtotal = subtotals.reduce((a, b) => a.plus(b), d(0));
  const disc = nonnegative(discount);
  if (kind === "percent" && disc.gt(100))
    throw new Error("Desconto máximo: 100%.");
  const amount = cents(kind === "percent" ? subtotal.mul(disc).div(100) : disc);
  if (amount.gt(subtotal)) throw new Error("Desconto maior que o subtotal.");
  return {
    subtotals,
    subtotal,
    discount: amount,
    total: cents(subtotal.minus(amount).plus(nonnegative(delivery))),
  };
}
export function snapshot(items: QuoteItem[]) {
  return items.map(({ product_id, name, description, quantity, price }) => ({
    product_id,
    name,
    description,
    quantity: positive(quantity).toString(),
    price: cents(nonnegative(price)).toFixed(2),
  }));
}
