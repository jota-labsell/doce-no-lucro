# Doce no Lucro

Aplicativo para confeiteiras: ingredientes, receitas com custos atualizados, precificação por margem, catálogo e orçamentos com três modelos de PDF. React + TypeScript estrito, Vite, Tailwind CSS, Supabase Auth/PostgreSQL/Storage, Decimal.js, jsPDF e AutoTable. Sem APIs pagas e sem cobrança implementada.

## Instalação e execução

Node.js 22 ou 24, npm e Git. Neste ambiente foi utilizado Node 24.

```bash
npm ci
cp .env.example .env.local
# Preencha as duas variáveis públicas de seu projeto Supabase.
npm run dev
```

`VITE_SUPABASE_URL` é a URL HTTPS do projeto e `VITE_SUPABASE_PUBLISHABLE_KEY` é a chave pública (publishable). Nunca coloque senha de banco, service_role ou tokens privados em variáveis `VITE_`: elas fazem parte do bundle público. `.env.local` está ignorado pelo Git. Variáveis alteradas exigem reinício do Vite/rebuild. Não há banco fictício de fallback: os registros comerciais são persistidos apenas no Supabase.

## Configuração do Supabase

1. No projeto correto, revise e aplique `supabase/migrations/202610270001_initial.sql` pelo SQL Editor. A migration é transacional e deve ser executada uma única vez. Alternativamente, com Supabase CLI autenticada: `supabase link --project-ref SEU_REF` e `supabase db push`. Nunca versione a senha usada pela CLI.
2. Auth → URL Configuration: configure Site URL e permita os redirects da origem local e, futuramente, da produção para `/app` e `/nova-senha`. Confirme o endereço/porta usados pelo Vite. Ative confirmação por e-mail.
3. Para testes controlados, desative novos cadastros públicos e crie/convide contas de teste pelo painel administrativo. A tela de cadastro usa Supabase Auth e respeita essa configuração. Só habilite inscrições públicas quando estiver preparado para recebê-las.
4. A migration cria o bucket **privado** `brand-assets`, com limite de 2 MB por arquivo, MIME PNG/JPEG/WebP e políticas por pasta `user_id`. Não torne esse bucket público. Imagens são lidas por URLs assinadas de curta duração. A interface não envia SVG.
5. Libere o domínio do projeto Supabase na rede do ambiente. Supabase utiliza HTTPS para Auth, REST e Storage. Nenhum banco local adicional é necessário para executar a aplicação.
6. Faça cadastro/login com uma conta de teste e percorra ingredientes → receitas → produtos → orçamentos. Confirme sair/entrar novamente e persistência dos registros.

A chave pública não tem poderes administrativos. Não é possível aplicar migrations ou criar políticas com ela. O projeto remoto não é alterado automaticamente por `npm install` nem pelo build.

## Cálculos e histórico

- Compras em kg e L são convertidas para quantidades compatíveis; peso, volume e contagem não são misturados.
- Decimal.js preserva a precisão intermediária. Preços comerciais e subtotais de orçamento são arredondados em centavos com `ROUND_HALF_UP`.
- Lote = (ingredientes + embalagens + mão de obra + outros) ÷ (1 − perda/100). Unidade = lote ÷ rendimento.
- Produto com receita = custo por unidade de rendimento × quantidade utilizada + embalagem adicional. Não repita a embalagem do lote como embalagem adicional.
- Preço sugerido = (custo + adicional) ÷ (1 − margem/100 − taxas/100). Margem é lucro/preço; markup é preço/custo. Lucro é estimativa.
- Orçamentos armazenam snapshots dos itens, com nome, descrição, quantidade e preço independente do catálogo. Subtotais, desconto e total são derivados; o banco valida o total, sem confiar no valor enviado pelo cliente.
- Somente rascunhos têm dados comerciais editáveis. Depois do envio, é possível mudar status ou duplicar; voltar para rascunho ou alterar dados comerciais é bloqueado no banco.
- As tabelas normalizadas `recipe_ingredients` e `quote_items` são mantidas por triggers a partir de `items` no registro pai. O cliente grava o pai atomicamente. Não grave diretamente nos filhos.

## Testes e validação

```bash
npm run lint
npm test
npm run build
npm run test:ui
```

`npm test`: cálculos financeiros, leitura dos PDFs multipágina e execução real da migration em PostgreSQL WASM (PGlite) com usuários, roles e RLS. Os schemas `auth` e `storage` são montados **apenas nos testes** para reproduzir os contratos usados na migration. Não cria contas no projeto remoto. Os testes verificam requisições SQL de contas distintas, FKs por proprietário, bloqueio de privilégios comerciais e imutabilidade.

`npm run test:ui`: Chromium desktop e viewport Android, proteção de rota, formulários, cadastro/edição, fluxo receita-produto-orçamento e download PDF. Os testes da área autenticada interceptam a API com dados isolados em memória: validam a interface, **não comprovam integração remota**. Usam `/usr/bin/chromium`; em outra máquina configure `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` ou ajuste a configuração para um navegador instalado. Capturas ficam em `test-results` e PDFs em `artifacts/pdfs`, ignorados pelo Git.

### Verificação obrigatória no projeto remoto

Após aplicar a migration, use duas contas de teste. Com os tokens próprios obtidos por login, tente consultar/editar/excluir o UUID da conta A pela sessão B, por REST e Storage: SELECT deve retornar vazio e escritas devem falhar ou afetar zero linhas. Tente associar receita/produto da outra conta e inserir `entitlements`/`payment_orders`: deve falhar. Não use `service_role` nessa verificação, pois ela ignora RLS. Testes locais não substituem essa conferência após implantação.

Teste também envio de e-mail, confirmação, recuperação, logout/login, upload privado, PDF com logotipo e compartilhamento em um Android real. Não afirme que esses fluxos remotos foram aprovados sem executá-los.

## Build e futura Cloudflare Pages

`npm run build` verifica TypeScript e gera `dist`. Configure futuramente Cloudflare Pages com comando `npm ci && npm run build`, diretório `dist` e as duas variáveis públicas. `public/_redirects` habilita fallback da SPA. Nenhuma Function/Worker é necessária neste núcleo; operações administrativas futuras precisam de backend seguro. A publicação em produção exige autorização explícita e não faz parte dos scripts.

## Segurança e dados

RLS em tabelas privadas, políticas por `auth.uid()`, FKs compostas entre proprietário e recursos relacionados, bucket privado e nenhuma rota de ativação premium. Planos são legíveis por contas autenticadas; entitlements e pedidos só podem ser alterados por administração/backend confiável. Triggers `SECURITY DEFINER` têm `search_path` vazio, escrita limitada a filhos do registro pai e execução direta revogada. Não há servidor que aceite chaves administrativas do navegador.

O exportador nas Configurações gera JSON da conta atual. Guarde com segurança: contém dados pessoais de clientes. Para backup completo, o administrador deve exportar o PostgreSQL via ferramenta oficial/`supabase db dump` autenticada e baixar separadamente os objetos privados do Storage. Valide a restauração em projeto separado; o exportador da interface não restaura banco nem baixa imagens. Não há importador JSON nesta versão. Antes de excluir conta, remova seus arquivos do bucket; a exclusão em Auth remove os registros via cascata. Backups do plano gratuito e disponibilidade não devem ser presumidos: confirme os limites e políticas atuais no painel/documentação do Supabase. Monitore banco, armazenamento, tráfego, e-mails de Auth e eventual pausa por inatividade.

## Planos e futura integração de pagamentos

Fundadora: R$ 47,90, pagamento único, sem vencimento programado, sujeito aos termos definitivos. Mensal: R$ 14,90, modalidade futura indisponível. Não existe botão de compra ativo, pagamento fictício ou concessão pública de acesso.

Antes do checkout: um administrador pode conceder `entitlements` manualmente para testes autorizados pelo SQL Editor; nunca pelo navegador. O núcleo está disponível às contas de teste autorizadas, sem paywall; a verificação de plano será ligada ao checkout numa fase posterior. Para Mercado Pago: criar pedido no servidor a partir do preço da tabela confiável, validar webhook e consultar pagamento diretamente no provedor, processar eventos de forma idempotente, conferir moeda/valor/usuário, conceder ou revogar direitos pelo servidor e manter tokens no Worker/Function. Não confiar no redirect do cliente como confirmação. Nada disso está implementado como cobrança nesta versão.

## Pendências antes de lançamento

Aplicar/verificar a migration no Supabase real, validar Auth/Storage com contas autorizadas, concluir identidade do controlador e canais de atendimento dos textos legais, testar entrega de e-mails e Android real, revisar requisitos LGPD e implementar cobrança/controle de plano quando autorizado. As páginas legais são identificadas como preliminares para testes; não representam aconselhamento jurídico. Não existem depoimentos, vendas ou dados fictícios na aplicação.
