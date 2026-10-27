import { useEffect, useState } from "react";
import type { Quote, QuoteStatus } from "../lib/types";
import type { PageProps } from "./Workshop";
import { saveRecord, removeRecord, changeQuoteStatus } from "../lib/data";
import { quoteTotals, money, snapshot, nonnegative } from "../lib/finance";
import {
  Field,
  NumberField,
  Empty,
  ErrorBox,
  errorText,
  Heading,
  Notice,
} from "../components/ui";
const statuses: QuoteStatus[] = [
  "rascunho",
  "enviado",
  "aprovado",
  "recusado",
  "expirado",
];
export function Quotes({ data, refresh }: PageProps) {
  const [form, setForm] = useState<Quote | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [date, setDate] = useState("");
  const [preview, setPreview] = useState("");
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const fresh = (): Quote => ({
    id: crypto.randomUUID(),
    customer: "",
    whatsapp: "",
    event_date: "",
    delivery_date: "",
    address: "",
    status: "rascunho",
    discount: "0",
    discount_type: "fixed",
    delivery: "0",
    validity: new Date(Date.now() + data.bakery.validity_days * 86400000)
      .toISOString()
      .slice(0, 10),
    payment: data.bakery.payment,
    deposit: "0",
    notes: "",
    message: data.bakery.message,
    template: "delicado",
    items: [],
  });
  const update = (k: keyof Quote, v: string) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));
  let totals: ReturnType<typeof quoteTotals> | undefined;
  let calculationError = "";
  try {
    if (form)
      totals = quoteTotals(
        form.items,
        form.discount,
        form.discount_type,
        form.delivery,
      );
  } catch (e) {
    calculationError = errorText(e);
  }
  async function pdf(q: Quote, mode: "download" | "preview" | "share") {
    setBusy(true);
    setError("");
    try {
      if (!q.items.length) throw new Error("Adicione itens ao orçamento.");
      const { makePdf } = await import("../lib/pdf");
      const doc = await makePdf(q, data.bakery);
      const name = `orcamento-${q.id.slice(0, 8)}.pdf`;
      if (mode === "preview")
        setPreview(URL.createObjectURL(doc.output("blob")));
      else if (mode === "share") {
        const file = new File([doc.output("blob")], name, {
          type: "application/pdf",
        });
        if (navigator.canShare?.({ files: [file] }))
          await navigator.share({ files: [file], title: "Seu orçamento" });
        else doc.save(name);
      } else doc.save(name);
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError"))
        setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Heading
        eyebrow="PROPOSTAS QUE VALORIZAM SEU TRABALHO"
        title="Orçamentos"
      >
        <button
          onClick={() => {
            setForm(fresh());
            setError("");
          }}
        >
          + Criar orçamento
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
              if (!form.items.length)
                throw new Error("Adicione pelo menos um item.");
              const t = quoteTotals(
                form.items,
                form.discount,
                form.discount_type,
                form.delivery,
              );
              if (nonnegative(form.deposit).gt(t.total))
                throw new Error("Entrada maior que o total.");
              const { created_at: _, total: __, ...record } = form;
              void _;
              void __;
              await saveRecord("quotes", {
                ...record,
                items: snapshot(form.items),
              });
              await refresh();
              setForm(null);
            } catch (e) {
              setError(errorText(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2>Uma proposta especial</h2>
          <div className="form-grid">
            <Field label="Nome da cliente">
              <input
                required
                value={form.customer}
                onChange={(e) => update("customer", e.target.value)}
              />
            </Field>
            <Field label="WhatsApp">
              <input
                type="tel"
                value={form.whatsapp}
                onChange={(e) => update("whatsapp", e.target.value)}
              />
            </Field>
            <Field label="Data do evento">
              <input
                type="date"
                value={form.event_date}
                onChange={(e) => update("event_date", e.target.value)}
              />
            </Field>
            <Field label="Data da entrega">
              <input
                type="date"
                value={form.delivery_date}
                onChange={(e) => update("delivery_date", e.target.value)}
              />
            </Field>
            <Field label="Endereço de entrega">
              <input
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
              />
            </Field>
          </div>
          <h3>Os doces da ocasião</h3>
          <Field label="Adicionar do catálogo">
            <select
              value=""
              onChange={(e) => {
                const p = data.products.find((p) => p.id === e.target.value);
                if (p)
                  setForm({
                    ...form,
                    items: [
                      ...form.items,
                      {
                        product_id: p.id,
                        name: p.name,
                        description: p.description,
                        quantity: "1",
                        price: p.price,
                      },
                    ],
                  });
              }}
            >
              <option value="">Selecione um produto</option>
              {data.products
                .filter((p) => p.active)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {money(p.price)}
                  </option>
                ))}
            </select>
          </Field>
          {form.items.map((item, index) => (
            <fieldset className="quote-item" key={index}>
              <legend>Item {index + 1}</legend>
              <div className="form-grid">
                <Field label="Produto / item avulso">
                  <input
                    required
                    value={item.name}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        items: form.items.map((i, j) =>
                          j === index ? { ...i, name: e.target.value } : i,
                        ),
                      })
                    }
                  />
                </Field>
                <Field label="Descrição">
                  <input
                    value={item.description}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        items: form.items.map((i, j) =>
                          j === index
                            ? { ...i, description: e.target.value }
                            : i,
                        ),
                      })
                    }
                  />
                </Field>
                <NumberField
                  label="Quantidade"
                  min={0.000001}
                  value={item.quantity}
                  onChange={(quantity) =>
                    setForm({
                      ...form,
                      items: form.items.map((i, j) =>
                        j === index ? { ...i, quantity } : i,
                      ),
                    })
                  }
                />
                <NumberField
                  label="Preço unitário (R$)"
                  value={item.price}
                  onChange={(price) =>
                    setForm({
                      ...form,
                      items: form.items.map((i, j) =>
                        j === index ? { ...i, price } : i,
                      ),
                    })
                  }
                />
              </div>
              <div className="actions">
                <strong>{totals && money(totals.subtotals[index])}</strong>
                <button
                  type="button"
                  className="text-button danger"
                  onClick={() =>
                    setForm({
                      ...form,
                      items: form.items.filter((_, j) => j !== index),
                    })
                  }
                >
                  Remover item
                </button>
              </div>
            </fieldset>
          ))}
          <button
            type="button"
            className="secondary"
            onClick={() =>
              setForm({
                ...form,
                items: [
                  ...form.items,
                  {
                    product_id: null,
                    name: "",
                    description: "",
                    quantity: "1",
                    price: "0",
                  },
                ],
              })
            }
          >
            + Item avulso
          </button>
          <div className="form-grid spaced">
            <NumberField
              label="Desconto"
              value={form.discount}
              onChange={(v) => update("discount", v)}
            />
            <Field label="Tipo de desconto">
              <select
                value={form.discount_type}
                onChange={(e) => update("discount_type", e.target.value)}
              >
                <option value="fixed">Reais (R$)</option>
                <option value="percent">Porcentagem (%)</option>
              </select>
            </Field>
            <NumberField
              label="Entrega / frete (R$)"
              value={form.delivery}
              onChange={(v) => update("delivery", v)}
            />
            <NumberField
              label="Entrada (R$)"
              value={form.deposit}
              onChange={(v) => update("deposit", v)}
            />
            <Field label="Validade">
              <input
                required
                type="date"
                value={form.validity}
                onChange={(e) => update("validity", e.target.value)}
              />
            </Field>
            <Field label="Condições de pagamento">
              <textarea
                value={form.payment}
                onChange={(e) => update("payment", e.target.value)}
              />
            </Field>
            <Field label="Observações">
              <textarea
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
              />
            </Field>
            <Field label="Mensagem de agradecimento">
              <textarea
                value={form.message}
                onChange={(e) => update("message", e.target.value)}
              />
            </Field>
            <Field label="Modelo do PDF">
              <select
                value={form.template}
                onChange={(e) => update("template", e.target.value)}
              >
                <option value="delicado">Delicado · rosa suave</option>
                <option value="elegante">Elegante · creme e chocolate</option>
                <option value="moderno">Moderno · minimalista</option>
              </select>
            </Field>
          </div>
          <ErrorBox error={calculationError} />
          {totals && (
            <div className="calculation">
              <span>Subtotal: {money(totals.subtotal)}</span>
              <span>Desconto: {money(totals.discount)}</span>
              <span>Entrega: {money(form.delivery)}</span>
              <strong>Total: {money(totals.total)}</strong>
            </div>
          )}
          <Notice>
            Os preços ficam copiados neste orçamento. Depois de enviado, os
            dados comerciais ficam bloqueados; duplique a proposta para fazer
            alterações.
          </Notice>
          <div className="actions">
            <button disabled={busy}>Salvar rascunho</button>
            <button
              type="button"
              className="secondary"
              disabled={busy || !form.customer || !form.validity}
              onClick={() => pdf(form, "preview")}
            >
              Visualizar PDF
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => setForm(null)}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
      <div className="toolbar">
        <input
          aria-label="Pesquisar cliente"
          placeholder="Pesquisar cliente…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="Filtrar status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Todos os status</option>
          {statuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <input
          aria-label="Emissão a partir de"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      {!data.quotes.length ? (
        <Empty>
          Seu primeiro orçamento merece uma apresentação especial. Crie uma
          proposta com os seus produtos ou itens avulsos.
        </Empty>
      ) : (
        <div className="card-grid">
          {data.quotes
            .filter(
              (q) =>
                q.customer.toLowerCase().includes(search.toLowerCase()) &&
                (!status || q.status === status) &&
                (!date || (q.created_at || "") >= date),
            )
            .map((q) => (
              <article className="panel" key={q.id}>
                <span className="badge">{q.status}</span>
                <h3>{q.customer}</h3>
                <small>
                  #{q.id.slice(0, 8)} ·{" "}
                  {q.created_at &&
                    new Date(q.created_at).toLocaleDateString("pt-BR")}
                </small>
                <p>{q.items.length} item(ns)</p>
                <strong>
                  {money(
                    quoteTotals(
                      q.items,
                      q.discount,
                      q.discount_type,
                      q.delivery,
                    ).total,
                  )}
                </strong>
                <div className="actions">
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() => pdf(q, "preview")}
                  >
                    Visualizar
                  </button>
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() => pdf(q, "download")}
                  >
                    Baixar PDF
                  </button>
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() => pdf(q, "share")}
                  >
                    Compartilhar
                  </button>
                  {q.status === "rascunho" && (
                    <button
                      className="text-button"
                      onClick={() => setForm(structuredClone(q))}
                    >
                      Editar
                    </button>
                  )}
                  <button
                    className="text-button"
                    onClick={() => {
                      const copy = {
                        ...structuredClone(q),
                        id: crypto.randomUUID(),
                        status: "rascunho" as const,
                      };
                      delete copy.created_at;
                      delete copy.total;
                      setForm(copy);
                    }}
                  >
                    Duplicar
                  </button>
                  <button
                    className="text-button danger"
                    onClick={async () => {
                      if (
                        !confirm(
                          `Excluir orçamento de ${q.customer}? Esta ação não pode ser desfeita.`,
                        )
                      )
                        return;
                      try {
                        await removeRecord("quotes", q.id);
                        await refresh();
                      } catch (e) {
                        setError(errorText(e));
                      }
                    }}
                  >
                    Excluir
                  </button>
                </div>
                <Field label="Status">
                  <select
                    value={q.status}
                    onChange={async (e) => {
                      const next = e.target.value;
                      if (
                        q.status === "rascunho" &&
                        !confirm(
                          "Ao sair de rascunho, os dados comerciais serão bloqueados. Continuar?",
                        )
                      )
                        return;
                      try {
                        await changeQuoteStatus(q.id, next);
                        await refresh();
                      } catch (e) {
                        setError(errorText(e));
                      }
                    }}
                  >
                    {statuses
                      .filter(
                        (s) => s !== "rascunho" || q.status === "rascunho",
                      )
                      .map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                  </select>
                </Field>
              </article>
            ))}
        </div>
      )}
      {preview && (
        <section
          className="pdf-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Prévia do orçamento"
        >
          <div className="actions">
            <h2>Seu orçamento em PDF</h2>
            <button onClick={() => setPreview("")}>Fechar prévia</button>
            <a
              className="button secondary"
              href={preview}
              target="_blank"
              rel="noreferrer"
            >
              Abrir PDF
            </a>
          </div>
          <iframe title="Prévia PDF" src={preview} />
        </section>
      )}
    </>
  );
}
