import { useState } from "react";
import { PrivateImage } from "../components/PrivateImage";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { PageProps } from "./Workshop";
import { saveRecord, uploadImage } from "../lib/data";
import { requireClient } from "../lib/supabase";
import { money, d, quoteTotals, productCost } from "../lib/finance";
import { Field, Heading, ErrorBox, errorText, Notice } from "../components/ui";
export function Dashboard({ data }: PageProps) {
  const [selected, setSelected] = useState(data.products[0]?.id || "");
  const product = data.products.find((p) => p.id === selected);
  const cost = product
    ? productCost(product, data.recipes, data.ingredients)
    : null;
  const contribution = product && cost ? d(product.price).minus(cost) : null;
  const approved = data.quotes.filter((q) => q.status === "aprovado");
  const value = approved.reduce(
    (s, q) =>
      s.plus(
        quoteTotals(q.items, q.discount, q.discount_type, q.delivery).total,
      ),
    d(0),
  );
  return (
    <>
      <Heading eyebrow="VISÃO GERAL" title="Seu negócio, com mais clareza" />
      <div className="overview-actions">
        <p>Cadastros, custos e propostas da sua confeitaria.</p>
        <div className="actions">
          <Link className="button secondary" to="/app/ingredientes">
            Cadastrar ingrediente
          </Link>
          <Link className="button" to="/app/orcamentos">
            Criar orçamento <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
      <div className="stats">
        {[
          ["Produtos", data.products.length],
          ["Receitas", data.recipes.length],
          ["Orçamentos", data.quotes.length],
          ["Aprovados", approved.length],
        ].map(([label, value]) => (
          <article className="panel" key={label}>
            <p>{label}</p>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <section className="cost-overview" aria-label="Análise de produto">
        <div className="section-title">
          <div>
            <p className="eyebrow">CUSTO E PREÇO</p>
            <h2>Quanto fica em cada venda?</h2>
          </div>
          <Field label="Produto analisado">
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">Selecione um produto</option>
              {data.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {!p.active ? " · inativo" : ""}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {product && cost && contribution ? (
          <>
            <div className="financial-grid">
              <div>
                <span>Custo de produção</span>
                <strong>{money(cost)}</strong>
                <small>Por {product.unit}</small>
              </div>
              <div>
                <span>Preço cadastrado</span>
                <strong>{money(product.price)}</strong>
                <small>Por {product.unit}</small>
              </div>
              <div
                className={contribution.isNegative() ? "negative" : "positive"}
              >
                <span>Resultado antes de taxas</span>
                <strong>{money(contribution)}</strong>
                <small>
                  {d(product.price).gt(0)
                    ? contribution.div(product.price).mul(100).toFixed(1) +
                      "% do preço"
                    : "Percentual indisponível para preço zero"}
                </small>
              </div>
            </div>
            <p className="fine">
              Diferença entre preço e custo atual. Taxas de venda não estão
              incluídas; não representa lucro líquido.
            </p>
          </>
        ) : (
          <p className="analysis-empty">
            {data.products.length
              ? "Selecione um produto para consultar os valores reais."
              : "Cadastre um produto para comparar seu custo de produção com o preço de venda."}
          </p>
        )}
        <Link className="analysis-link" to="/app/precificacao">
          Calcular preço sugerido com margem e taxas <ArrowUpRight size={16} />
        </Link>
      </section>
      <section className="panel approved">
        <div>
          <p className="eyebrow">PROPOSTAS APROVADAS</p>
          <h2>{money(value)}</h2>
        </div>
        <p>
          Valor orçado aprovado.
          <br />
          <small>Não representa receita efetivamente recebida.</small>
        </p>
      </section>
      <div className="split spaced">
        <section className="panel">
          <div className="section-title">
            <h2>Últimos orçamentos</h2>
            <Link to="/app/orcamentos">
              Ver todos <ArrowUpRight size={14} />
            </Link>
          </div>
          {data.quotes.slice(0, 5).map((q) => (
            <div className="list-row" key={q.id}>
              <div>
                <strong>{q.customer}</strong>
                <p>{q.status}</p>
              </div>
              <span>
                {money(
                  quoteTotals(q.items, q.discount, q.discount_type, q.delivery)
                    .total,
                )}
              </span>
            </div>
          ))}
          {!data.quotes.length && (
            <p>
              Sua próxima encomenda começa com uma proposta. Crie seu primeiro
              orçamento, sem precisar cadastrar produtos antes.
            </p>
          )}
        </section>
        <section className="panel">
          <p className="eyebrow">ORGANIZAÇÃO</p>
          <h2>Cadastros essenciais</h2>
          {[
            [
              "1",
              "Minha confeitaria",
              "Deixe os PDFs com a sua identidade.",
              "confeitaria",
            ],
            [
              "2",
              "Cadastre ingredientes",
              "O começo de um custo bem calculado.",
              "ingredientes",
            ],
            [
              "3",
              "Crie sua primeira receita",
              "Descubra o valor de cada unidade.",
              "receitas",
            ],
          ].map(([n, title, desc, url]) => (
            <Link className="step" to={"/app/" + url} key={n}>
              <span>{n}</span>
              <div>
                <strong>{title}</strong>
                <p>{desc}</p>
              </div>
              <span>
                <ArrowUpRight size={16} />
              </span>
            </Link>
          ))}
        </section>
      </div>
    </>
  );
}
export function BakeryPage({ data, refresh }: PageProps) {
  const [form, setForm] = useState(data.bakery);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Heading
        eyebrow="A SUA IDENTIDADE EM CADA PROPOSTA"
        title="Minha confeitaria"
      />
      <ErrorBox error={error} />
      {saved && <Notice>Dados da confeitaria salvos.</Notice>}
      <form
        className="panel form-panel"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setSaved(false);
          try {
            await saveRecord("bakeries", {
              ...form,
              id: data.bakery.id || form.id,
            });
            await refresh();
            setSaved(true);
          } catch (e) {
            setError(errorText(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="form-grid">
          {(["name", "owner", "whatsapp", "instagram", "city"] as const).map(
            (k, index) => (
              <Field
                key={k}
                label={
                  [
                    "Nome da confeitaria",
                    "Nome da responsável",
                    "WhatsApp",
                    "Instagram (opcional)",
                    "Cidade (opcional)",
                  ][index]
                }
              >
                <input
                  required={index < 3}
                  value={form[k]}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                />
              </Field>
            ),
          )}
          <Field label="Cor da marca">
            <input
              type="color"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
            />
          </Field>
          <Field label="Validade padrão (dias)">
            <input
              type="number"
              min="1"
              max="365"
              required
              value={form.validity_days}
              onChange={(e) =>
                setForm({ ...form, validity_days: Number(e.target.value) })
              }
            />
          </Field>
          <Field label="Logotipo (PNG, JPG, WebP; até 2 MB)">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setBusy(true);
                try {
                  setForm({
                    ...form,
                    logo_path: await uploadImage(file, "logos"),
                  });
                  setSaved(false);
                } catch (e) {
                  setError(errorText(e));
                } finally {
                  setBusy(false);
                }
              }}
            />
            {form.logo_path && (
              <PrivateImage
                path={form.logo_path}
                alt="Logotipo da confeitaria"
              />
            )}
            {form.logo_path && (
              <small>Logotipo enviado. Salve para usar nos PDFs.</small>
            )}
          </Field>
          <Field label="Condições de pagamento padrão">
            <textarea
              value={form.payment}
              onChange={(e) => setForm({ ...form, payment: e.target.value })}
            />
          </Field>
          <Field label="Mensagem padrão / rodapé">
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </Field>
        </div>
        <button disabled={busy}>
          {busy ? "Salvando…" : "Salvar confeitaria"}
        </button>
      </form>
    </>
  );
}
export function Settings({ data }: PageProps) {
  const [message, setMessage] = useState("");
  return (
    <>
      <Heading eyebrow="SEU ESPAÇO" title="Configurações" />
      <section className="panel">
        <h2>Seus dados são seus</h2>
        <p>
          Baixe um arquivo JSON com seus cadastros e orçamentos. Guarde-o em um
          local seguro: ele contém informações de clientes.
        </p>
        <button
          className="secondary"
          onClick={() => {
            const url = URL.createObjectURL(
              new Blob([JSON.stringify(data, null, 2)], {
                type: "application/json",
              }),
            );
            const a = document.createElement("a");
            a.href = url;
            a.download = "doce-no-lucro-exportacao.json";
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }}
        >
          Exportar meus registros
        </button>
        <h3>Segurança da conta</h3>
        <button
          className="secondary"
          onClick={async () => {
            try {
              const c = requireClient();
              const {
                data: { user },
              } = await c.auth.getUser();
              if (user?.email) {
                const { error } = await c.auth.resetPasswordForEmail(
                  user.email,
                  { redirectTo: location.origin + "/nova-senha" },
                );
                if (error) throw error;
                setMessage("Confira seu e-mail para alterar a senha.");
              }
            } catch (e) {
              setMessage(errorText(e));
            }
          }}
        >
          Solicitar alteração de senha
        </button>
        {message && <Notice>{message}</Notice>}
        <p>
          Para excluir a conta durante os testes, solicite ao administrador a
          exclusão no Supabase Auth. Os registros vinculados são removidos em
          cascata; arquivos do Storage devem ser removidos antes.
        </p>
      </section>
      <section className="panel spaced">
        <span className="badge">PAGAMENTOS EM PREPARAÇÃO</span>
        <h2>Plano Fundadora</h2>
        <strong>R$ 47,90 · pagamento único</strong>
        <p>
          Sem vencimento programado, sujeito aos termos aplicáveis. Nenhuma
          cobrança está ativa. Acesso de teste é controlado pela configuração de
          autenticação do projeto, sem liberação pública de direitos comerciais.
        </p>
        <Link to="/termos">Consultar termos</Link>
      </section>
    </>
  );
}
