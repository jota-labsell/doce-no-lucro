import { useState } from "react";
import { PrivateImage } from "../components/PrivateImage";
import type { Data } from "../lib/data";
import { saveRecord, removeRecord, uploadImage } from "../lib/data";
import type { Ingredient, Recipe, Product, Unit } from "../lib/types";
import {
  ingredientCost,
  recipeCost,
  productCost,
  pricing,
  money,
  d,
  positive,
} from "../lib/finance";
import {
  Field,
  NumberField,
  Empty,
  ErrorBox,
  errorText,
  Heading,
  Notice,
} from "../components/ui";
export interface PageProps {
  data: Data;
  refresh: () => Promise<void>;
}
const units: Unit[] = ["g", "kg", "ml", "L", "un"];
export function UnitSelect({
  value,
  onChange,
}: {
  value: Unit;
  onChange: (v: Unit) => void;
}) {
  return (
    <select
      aria-label="Unidade"
      value={value}
      onChange={(e) => onChange(e.target.value as Unit)}
    >
      {units.map((u) => (
        <option key={u}>{u}</option>
      ))}
    </select>
  );
}
export function Ingredients({ data, refresh }: PageProps) {
  const fresh = (): Ingredient => ({
    id: crypto.randomUUID(),
    name: "",
    price: "",
    quantity: "",
    unit: "g",
    notes: "",
  });
  const [form, setForm] = useState<Ingredient | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const update = (k: keyof Ingredient, v: string) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));
  return (
    <>
      <Heading eyebrow="A BASE DE CADA RECEITA" title="Ingredientes">
        <button
          onClick={() => {
            setForm(fresh());
            setError("");
          }}
        >
          + Novo ingrediente
        </button>
      </Heading>
      <ErrorBox error={error} />
      {form && (
        <form
          className="panel form-panel"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              positive(form.quantity);
              ingredientCost(form, 1, form.unit);
              await saveRecord("ingredients", form);
              await refresh();
              setForm(null);
            } catch (e) {
              setError(errorText(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2>
            {data.ingredients.some((i) => i.id === form.id)
              ? "Editar ingrediente"
              : "Novo ingrediente"}
          </h2>
          <div className="form-grid">
            <Field label="Nome">
              <input
                required
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
              />
            </Field>
            <NumberField
              label="Preço de compra (R$)"
              value={form.price}
              onChange={(v) => update("price", v)}
            />
            <NumberField
              label="Quantidade comprada"
              min={0.000001}
              value={form.quantity}
              onChange={(v) => update("quantity", v)}
            />
            <Field label="Unidade de compra">
              <UnitSelect
                value={form.unit}
                onChange={(v) => update("unit", v)}
              />
            </Field>
            <Field label="Observações">
              <input
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
              />
            </Field>
          </div>
          <div className="actions">
            <button disabled={busy}>
              {busy ? "Salvando…" : "Salvar ingrediente"}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => setForm(null)}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
      <div className="toolbar">
        <input
          aria-label="Pesquisar ingrediente"
          placeholder="Pesquisar ingrediente…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="Ordenação"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="name">Nome A–Z</option>
          <option value="price">Preço de compra</option>
        </select>
      </div>
      {!data.ingredients.length ? (
        <Empty>
          Cadastre o primeiro ingrediente para descobrir o custo das suas
          receitas.
        </Empty>
      ) : (
        <div className="card-grid">
          {data.ingredients
            .filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
            .sort((a, b) =>
              sort === "name"
                ? a.name.localeCompare(b.name)
                : Number(a.price) - Number(b.price),
            )
            .map((i) => (
              <article className="panel" key={i.id}>
                <span className="badge">
                  {i.quantity} {i.unit}
                </span>
                <h3>{i.name}</h3>
                <strong>{money(i.price)}</strong>
                <p>
                  {money(ingredientCost(i, 1, i.unit))} por {i.unit}{" "}
                  <small>(valor exibido arredondado)</small>
                </p>
                <small>
                  Custo exato:{" "}
                  {ingredientCost(i, 1, i.unit)
                    .toSignificantDigits(8)
                    .toString()}{" "}
                  R$/{i.unit}
                </small>
                <p>{i.notes}</p>
                <div className="actions">
                  <button className="secondary" onClick={() => setForm(i)}>
                    Editar
                  </button>
                  <button
                    className="text-button danger"
                    onClick={async () => {
                      if (
                        !confirm(
                          `Excluir ${i.name}? Ingredientes usados em receitas não podem ser excluídos.`,
                        )
                      )
                        return;
                      try {
                        await removeRecord("ingredients", i.id);
                        await refresh();
                      } catch (e) {
                        setError(errorText(e));
                      }
                    }}
                  >
                    Excluir
                  </button>
                </div>
              </article>
            ))}
        </div>
      )}
    </>
  );
}
export function Recipes({ data, refresh }: PageProps) {
  const fresh = (): Recipe => ({
    id: crypto.randomUUID(),
    name: "",
    description: "",
    category: "",
    yield_quantity: "1",
    yield_unit: "un",
    packaging: "0",
    labor: "0",
    other: "0",
    waste: "0",
    items: [],
  });
  const [form, setForm] = useState<Recipe | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const update = (k: keyof Recipe, v: string) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));
  let cost;
  try {
    if (form) cost = recipeCost(form, data.ingredients);
  } catch {
    /* Incomplete forms show a validation prompt on submission. */
  }
  return (
    <>
      <Heading eyebrow="DO SEU CADERNO PARA O SEU NEGÓCIO" title="Receitas">
        <button
          onClick={() => {
            setForm(fresh());
            setError("");
          }}
        >
          + Nova receita
        </button>
      </Heading>
      <ErrorBox error={error} />
      {form && (
        <form
          className="panel form-panel"
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            setBusy(true);
            try {
              if (!form.items.length)
                throw new Error("Adicione pelo menos um ingrediente.");
              recipeCost(form, data.ingredients);
              await saveRecord("recipes", form);
              await refresh();
              setForm(null);
            } catch (e) {
              setError(errorText(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2>{form.name || "Nova receita"}</h2>
          <div className="form-grid">
            <Field label="Nome">
              <input
                required
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
              />
            </Field>
            <Field label="Categoria">
              <input
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
              />
            </Field>
            <Field label="Descrição">
              <input
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
              />
            </Field>
            <NumberField
              label="Rendimento"
              min={0.000001}
              value={form.yield_quantity}
              onChange={(v) => update("yield_quantity", v)}
            />
            <Field label="Unidade de rendimento">
              <input
                required
                value={form.yield_unit}
                onChange={(e) => update("yield_unit", e.target.value)}
              />
            </Field>
          </div>
          <h3>Ingredientes do lote</h3>
          {form.items.map((item, index) => (
            <div className="item-row" key={index}>
              <select
                required
                aria-label="Ingrediente"
                value={item.ingredient_id}
                onChange={(e) => {
                  const i = data.ingredients.find(
                    (i) => i.id === e.target.value,
                  )!;
                  setForm({
                    ...form,
                    items: form.items.map((v, j) =>
                      j === index
                        ? { ...v, ingredient_id: i.id, unit: i.unit }
                        : v,
                    ),
                  });
                }}
              >
                {data.ingredients.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
              <input
                aria-label="Quantidade utilizada"
                required
                type="number"
                min="0.000001"
                step="any"
                value={item.quantity}
                onChange={(e) =>
                  setForm({
                    ...form,
                    items: form.items.map((v, j) =>
                      j === index ? { ...v, quantity: e.target.value } : v,
                    ),
                  })
                }
              />
              <UnitSelect
                value={item.unit}
                onChange={(unit) =>
                  setForm({
                    ...form,
                    items: form.items.map((v, j) =>
                      j === index ? { ...v, unit } : v,
                    ),
                  })
                }
              />
              <button
                type="button"
                className="secondary"
                aria-label="Remover ingrediente"
                onClick={() =>
                  setForm({
                    ...form,
                    items: form.items.filter((_, j) => j !== index),
                  })
                }
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            className="secondary"
            disabled={!data.ingredients.length}
            onClick={() =>
              setForm({
                ...form,
                items: [
                  ...form.items,
                  {
                    ingredient_id: data.ingredients[0].id,
                    quantity: "1",
                    unit: data.ingredients[0].unit,
                  },
                ],
              })
            }
          >
            + Adicionar ingrediente
          </button>
          {!data.ingredients.length && (
            <Notice>Cadastre ingredientes primeiro.</Notice>
          )}
          <div className="form-grid spaced">
            {(["packaging", "labor", "other", "waste"] as const).map((k, i) => (
              <NumberField
                key={k}
                label={
                  [
                    "Embalagens / lote (R$)",
                    "Mão de obra / lote (R$)",
                    "Outros custos / lote (R$)",
                    "Perdas (%)",
                  ][i]
                }
                value={form[k]}
                onChange={(v) => update(k, v)}
              />
            ))}
          </div>
          <small>
            Perdas: dividimos o custo total por (1 − percentual de perda). Ex.:
            perda de 10% aproveita 90% da produção.
          </small>
          {cost && (
            <div className="calculation">
              <span>Ingredientes: {money(cost.ingredient)}</span>
              <span>Embalagens: {money(form.packaging)}</span>
              <span>Mão de obra: {money(form.labor)}</span>
              <span>Outros: {money(form.other)}</span>
              <strong>Lote: {money(cost.total)}</strong>
              <strong>
                Por {form.yield_unit}: {money(cost.unit)}
              </strong>
            </div>
          )}
          <div className="actions">
            <button disabled={busy}>
              {busy ? "Salvando…" : "Salvar receita"}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => setForm(null)}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
      <input
        aria-label="Pesquisar receita"
        placeholder="Pesquisar receita…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {!data.recipes.length ? (
        <Empty>
          Suas receitas ficam aqui, com custos atualizados a cada mudança nos
          ingredientes.
        </Empty>
      ) : (
        <div className="card-grid spaced">
          {data.recipes
            .filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
            .map((r) => {
              const c = recipeCost(r, data.ingredients);
              return (
                <article className="panel" key={r.id}>
                  <span className="badge">{r.category || "Receita"}</span>
                  <h3>{r.name}</h3>
                  <p>{r.description}</p>
                  <div className="calculation">
                    <span>Lote: {money(c.total)}</span>
                    <strong>
                      {money(c.unit)} / {r.yield_unit}
                    </strong>
                  </div>
                  <p>
                    Rende {r.yield_quantity} {r.yield_unit}
                  </p>
                  <div className="actions">
                    <button
                      className="secondary"
                      onClick={() => setForm(structuredClone(r))}
                    >
                      Editar
                    </button>
                    <button
                      className="text-button danger"
                      onClick={async () => {
                        if (!confirm(`Excluir ${r.name}?`)) return;
                        try {
                          await removeRecord("recipes", r.id);
                          await refresh();
                        } catch (e) {
                          setError(errorText(e));
                        }
                      }}
                    >
                      Excluir
                    </button>
                  </div>
                </article>
              );
            })}
        </div>
      )}
    </>
  );
}
export function Pricing({ data }: PageProps) {
  const [source, setSource] = useState("");
  const [cost, setCost] = useState("0");
  const [margin, setMargin] = useState("30");
  const [fees, setFees] = useState("0");
  const [extra, setExtra] = useState("0");
  const [manual, setManual] = useState("");
  const [batch, setBatch] = useState("1");
  let result;
  let error = "";
  try {
    result = pricing(cost, margin, fees, extra, manual || undefined);
    positive(batch);
  } catch (e) {
    error = errorText(e);
  }
  return (
    <>
      <Heading eyebrow="VALORIZE CADA DOCE" title="Precificação" />
      <div className="split">
        <section className="panel">
          <h2>Seu preço, com clareza</h2>
          <Field label="Usar custo atual de">
            <select
              value={source}
              onChange={(e) => {
                setSource(e.target.value);
                const [kind, id] = e.target.value.split(":");
                if (kind === "r") {
                  const r = data.recipes.find((r) => r.id === id)!;
                  setCost(recipeCost(r, data.ingredients).unit.toString());
                }
                if (kind === "p") {
                  const p = data.products.find((p) => p.id === id)!;
                  setCost(
                    productCost(p, data.recipes, data.ingredients).toString(),
                  );
                }
              }}
            >
              <option value="">Informar manualmente</option>
              {data.recipes.map((r) => (
                <option key={r.id} value={"r:" + r.id}>
                  Receita: {r.name}
                </option>
              ))}
              {data.products.map((p) => (
                <option key={p.id} value={"p:" + p.id}>
                  Produto: {p.name}
                </option>
              ))}
            </select>
          </Field>
          <NumberField
            label="Custo unitário (R$)"
            value={cost}
            onChange={setCost}
          />
          <NumberField
            label="Margem desejada (%)"
            value={margin}
            onChange={setMargin}
          />
          <NumberField
            label="Taxas sobre a venda (%)"
            value={fees}
            onChange={setFees}
          />
          <NumberField
            label="Custo adicional por unidade (R$)"
            value={extra}
            onChange={setExtra}
          />
          <NumberField
            label="Quantidade no lote de venda"
            value={batch}
            onChange={setBatch}
            min={0.000001}
          />
          <Field label="Preço escolhido (opcional, R$)">
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
            />
          </Field>
          <small>
            Não repita aqui despesas já incluídas no custo da receita.
          </small>
        </section>
        <section className="panel price-result">
          <p className="eyebrow">PREÇO SUGERIDO</p>
          <ErrorBox error={error} />
          {result && !error && (
            <>
              <h2 className="price">{money(result.suggested)}</h2>
              <p>Para a margem e taxas que você informou.</p>
              <dl>
                <dt>Preço escolhido</dt>
                <dd>{money(result.price)}</dd>
                <dt>Lucro estimado / unidade</dt>
                <dd>{money(result.profit)}</dd>
                <dt>Margem real</dt>
                <dd>{result.margin.toFixed(2)}%</dd>
                <dt>Markup</dt>
                <dd>
                  {result.markup?.toFixed(3) ?? "Indefinido (custo zero)"}
                </dd>
                <dt>Preço do lote</dt>
                <dd>{money(result.price.mul(d(batch)))}</dd>
                <dt>Diferença para sugestão</dt>
                <dd>{money(result.difference)}</dd>
              </dl>
            </>
          )}
          <Notice>
            Margem é a parte do preço que sobra após custos e taxas. Markup é o
            multiplicador sobre o custo. Preço = custo ÷ (1 − margem − taxas).
            Estimativas não garantem lucro.
          </Notice>
        </section>
      </div>
    </>
  );
}
export function Products({ data, refresh }: PageProps) {
  const fresh = (): Product => ({
    id: crypto.randomUUID(),
    name: "",
    description: "",
    category: "",
    recipe_id: null,
    recipe_quantity: "1",
    manual_cost: "0",
    packaging: "0",
    price: "0",
    unit: "unidade",
    active: true,
    photo_path: null,
  });
  const [form, setForm] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const update = (k: keyof Product, v: string | null) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));
  return (
    <>
      <Heading eyebrow="O QUE A SUA CONFEITARIA OFERECE" title="Meus produtos">
        <button onClick={() => setForm(fresh())}>+ Novo produto</button>
      </Heading>
      <ErrorBox error={error} />
      {form && (
        <form
          className="panel form-panel"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              productCost(form, data.recipes, data.ingredients);
              await saveRecord("products", form);
              await refresh();
              setForm(null);
            } catch (e) {
              setError(errorText(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2>Detalhes do produto</h2>
          <div className="form-grid">
            <Field label="Nome comercial">
              <input
                required
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
              />
            </Field>
            <Field label="Descrição">
              <input
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
              />
            </Field>
            <Field label="Categoria">
              <input
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
              />
            </Field>
            <Field label="Receita associada">
              <select
                value={form.recipe_id || ""}
                onChange={(e) => update("recipe_id", e.target.value || null)}
              >
                <option value="">Custo manual</option>
                {data.recipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </Field>
            {form.recipe_id ? (
              <NumberField
                label="Unidades de rendimento por produto (ex.: 6)"
                value={form.recipe_quantity}
                onChange={(v) => update("recipe_quantity", v)}
                min={0.000001}
              />
            ) : (
              <NumberField
                label="Custo manual por produto (R$)"
                value={form.manual_cost}
                onChange={(v) => update("manual_cost", v)}
              />
            )}
            <NumberField
              label="Embalagem adicional por produto (R$)"
              value={form.packaging}
              onChange={(v) => update("packaging", v)}
            />
            <NumberField
              label="Preço de venda (R$)"
              value={form.price}
              onChange={(v) => update("price", v)}
            />
            <Field label="Unidade comercial">
              <input
                required
                value={form.unit}
                onChange={(e) => update("unit", e.target.value)}
              />
            </Field>
            <Field label="Foto (PNG, JPG, WebP; até 2 MB)">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setBusy(true);
                    try {
                      update("photo_path", await uploadImage(file, "products"));
                    } catch (e) {
                      setError(errorText(e));
                    } finally {
                      setBusy(false);
                    }
                  }
                }}
              />
              {form.photo_path && (
                <small>Foto armazenada com acesso privado.</small>
              )}
            </Field>
          </div>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />{" "}
            Produto ativo
          </label>
          <div className="actions">
            <button disabled={busy}>
              {busy ? "Salvando…" : "Salvar produto"}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => setForm(null)}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
      <input
        aria-label="Pesquisar produto"
        placeholder="Pesquisar produto…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {!data.products.length ? (
        <Empty>
          Transforme suas receitas em produtos. Uma caixa pode ter várias
          unidades da receita e sua própria embalagem.
        </Empty>
      ) : (
        <div className="card-grid spaced">
          {data.products
            .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
            .map((p) => (
              <article className="panel" key={p.id}>
                <span className="badge">
                  {p.active ? "Ativo" : "Inativo"} · {p.unit}
                </span>
                {p.photo_path && (
                  <PrivateImage path={p.photo_path} alt={p.name} />
                )}
                <h3>{p.name}</h3>
                <p>{p.description}</p>
                <strong>{money(p.price)}</strong>
                <p>
                  Custo atual:{" "}
                  {money(productCost(p, data.recipes, data.ingredients))}
                </p>
                <div className="actions">
                  <button className="secondary" onClick={() => setForm(p)}>
                    Editar
                  </button>
                  <button
                    className="text-button"
                    onClick={() =>
                      setForm({
                        ...p,
                        id: crypto.randomUUID(),
                        name: p.name + " (cópia)",
                      })
                    }
                  >
                    Duplicar
                  </button>
                  <button
                    className="text-button"
                    onClick={async () => {
                      try {
                        await saveRecord("products", {
                          ...p,
                          active: !p.active,
                        });
                        await refresh();
                      } catch (e) {
                        setError(errorText(e));
                      }
                    }}
                  >
                    {p.active ? "Desativar" : "Ativar"}
                  </button>
                </div>
              </article>
            ))}
        </div>
      )}
    </>
  );
}
