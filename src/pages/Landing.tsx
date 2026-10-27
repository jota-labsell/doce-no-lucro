import { Brand } from "../components/Brand";
import { Link } from "react-router-dom";
import { Calculator, FileText, Heart, ArrowUpRight, Check } from "lucide-react";
export function Landing() {
  return (
    <>
      <nav className="landing-nav">
        <Link className="brand" to="/">
          <Brand />
        </Link>
        <Link className="button secondary" to="/entrar">
          Entrar na minha conta <ArrowUpRight size={16} />
        </Link>
      </nav>
      <main className="landing">
        <section className="hero">
          <div>
            <p className="eyebrow">GESTÃO PARA CONFEITARIAS INDEPENDENTES</p>
            <h1>
              Seu talento faz doces.
              <br />
              <em>Seu trabalho merece valor.</em>
            </h1>
            <p className="lead">
              Descubra quanto custa produzir, defina preços com mais segurança e
              envie orçamentos que encantam.
            </p>
            <Link className="button" to="/entrar">
              Conhecer o aplicativo <ArrowUpRight size={18} />
            </Link>
            <p className="fine">
              Simples no celular. Cuidadoso com cada detalhe.
            </p>
          </div>
          <aside className="hero-paper" aria-label="Do custo à proposta">
            <p className="eyebrow">DO CUSTO À PROPOSTA</p>
            <h2>
              Seu trabalho tem valor.
              <br />
              Conheça cada parte dele.
            </h2>
            {[
              [
                "01",
                "Organize as compras",
                "Preço, quantidade e unidade de cada ingrediente.",
              ],
              [
                "02",
                "Encontre o custo real",
                "Receita, rendimento, embalagem e mão de obra.",
              ],
              [
                "03",
                "Decida como vender",
                "Margem, taxas e uma proposta com sua marca.",
              ],
            ].map(([n, title, text]) => (
              <div className="paper-row" key={n}>
                <span>{n}</span>
                <div>
                  <strong>{title}</strong>
                  <p>{text}</p>
                </div>
              </div>
            ))}
            <small>Um fluxo de trabalho para usar no dia a dia.</small>
          </aside>
        </section>
        <section className="feature-grid">
          {[
            [
              Calculator,
              "Cada ingrediente conta",
              "Converta unidades, acompanhe os custos das receitas e considere embalagens e mão de obra.",
            ],
            [
              Heart,
              "Preços com mais segurança",
              "Entenda a diferença entre margem e markup e inclua as taxas de venda.",
            ],
            [
              FileText,
              "Um orçamento à sua altura",
              "Três modelos em PDF, identidade da sua confeitaria e histórico de preços preservado.",
            ],
          ].map(([Icon, title, body]) => {
            const I = Icon as typeof Calculator;
            return (
              <article className="panel" key={String(title)}>
                <I />
                <h3>{String(title)}</h3>
                <p>{String(body)}</p>
              </article>
            );
          })}
        </section>
        <section className="offer panel">
          <div>
            <p className="eyebrow">CONDIÇÃO ESPECIAL DE LANÇAMENTO</p>
            <h2>Plano Fundadora</h2>
            <p>Para construir um negócio com mais organização.</p>
            <p>
              <Check size={16} /> Custos, receitas, produtos e orçamentos
            </p>
            <p>
              <Check size={16} /> Acesso sem data de vencimento programada,
              sujeito aos termos
            </p>
          </div>
          <div>
            <strong className="price">R$ 47,90</strong>
            <p>Pagamento único. Sem mensalidade.</p>
            <button disabled>Vendas em preparação</button>
            <small>O checkout ainda não está disponível.</small>
          </div>
        </section>
        <section className="faq">
          <h2>Antes de começar</h2>
          <details>
            <summary>Preciso entender de finanças?</summary>
            <p>
              Não. Você cadastra suas compras e receitas; o aplicativo apresenta
              os custos e explica os cálculos.
            </p>
          </details>
          <details>
            <summary>Posso usar no celular?</summary>
            <p>
              Sim. A interface se adapta ao celular e os PDFs podem ser baixados
              ou compartilhados quando o dispositivo permitir.
            </p>
          </details>
          <details>
            <summary>O lucro é garantido?</summary>
            <p>
              Não. Os valores são estimativas a partir dos custos informados.
              Demanda, perdas e despesas do negócio também influenciam o
              resultado.
            </p>
          </details>
          <details>
            <summary>Já posso comprar?</summary>
            <p>
              A cobrança ainda não está integrada. Nenhum pagamento é processado
              por este aplicativo nesta etapa.
            </p>
          </details>
        </section>
      </main>
      <footer>
        <span>
          <Brand />
        </span>
        <Link to="/privacidade">Privacidade</Link>
        <Link to="/termos">Termos de uso</Link>
        <Link to="/contato">Contato</Link>
      </footer>
    </>
  );
}
export function Legal({ kind }: { kind: string }) {
  return (
    <main className="legal panel">
      <Link to="/">← Voltar</Link>
      <h1>
        {kind === "privacidade"
          ? "Política de privacidade"
          : kind === "termos"
            ? "Termos de uso"
            : "Contato"}
      </h1>
      {kind === "privacidade" ? (
        <>
          <p>
            Versão preliminar para testes. Antes da oferta comercial, o
            responsável pelo produto deve completar a identificação do
            controlador e seu canal de atendimento.
          </p>
          <p>
            Tratamos e-mail, perfil e os registros comerciais inseridos para
            autenticar sua conta, calcular custos e armazenar orçamentos. Os
            dados são mantidos no Supabase, com acesso restrito por conta. Não
            insira dados sensíveis de clientes nas observações.
          </p>
          <p>
            A sessão é armazenada no navegador para manter o acesso. Não usamos
            cookies de publicidade. Você pode exportar seus registros nas
            configurações e excluir registros pelos cadastros. Solicitações de
            exclusão de conta dependem do administrador enquanto o canal de
            atendimento não estiver configurado.
          </p>
        </>
      ) : kind === "termos" ? (
        <>
          <p>
            Versão preliminar para testes. O sistema auxilia a organização e
            apresenta estimativas, sem garantia de lucro ou aconselhamento
            contábil. Confira dados e propostas antes de enviar.
          </p>
          <p>
            Não há checkout nem cobrança ativa. O Plano Fundadora está previsto
            por R$ 47,90, pagamento único, com acesso sem vencimento programado,
            sujeito aos termos comerciais definitivos. A modalidade mensal é
            futura e não contratável.
          </p>
          <p>
            Você é responsável pelos dados cadastrados e pelo uso autorizado das
            informações de suas clientes. Não utilize o serviço para atividades
            ilegais. A disponibilidade está sujeita à infraestrutura utilizada.
          </p>
        </>
      ) : (
        <p>
          O canal público de atendimento ainda precisa ser configurado pelo
          responsável antes do lançamento comercial. Durante os testes, contate
          a pessoa que forneceu seu acesso.
        </p>
      )}
    </main>
  );
}
