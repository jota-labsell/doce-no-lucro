# Interface: direção e revisão

A stack React/TypeScript/Vite/Tailwind permanece. A camada financeira, serviços Supabase, migrations e gerador de PDFs não foram alterados neste redesign.

A estrutura separa resumo, análise financeira, listas e tarefas de cadastro. Após a primeira revisão, a usuária pediu mais brilho, cores vibrantes, sombras e personalidade de confeitaria. A direção visual foi ajustada com esse objetivo, mantendo a organização funcional.

## Sistema visual

Layout e componentes-base em `src/style.css`; tema expressivo em `src/confection.css`, carregado depois da base. Framboesa nas ações, creme e rosa no fundo, lilás, dourado e menta como apoio. Gradientes, reflexos internos e sombras criam profundidade nas ações e superfícies. Tipografia de sistema nos dados, serifada em destaques de marca. Valores financeiros mantêm algarismos tabulares e as cores semânticas de sucesso/erro.

Marca com símbolo de fatia de bolo e ilustração vetorial decorativa própria em `BakeryArt.tsx`, reutilizada na apresentação e no painel. Não representa produtos reais cadastrados. A ilustração é ignorada por leitores de tela e não carrega imagens remotas. Não há bibliotecas adicionais.

## Fluxos

- Navegação com estado ativo, caminho da seção, link de pular para conteúdo e menu móvel com estado expandido anunciado.
- Dashboard com indicadores do banco, seleção de produto para comparar custo/preço e acesso à calculadora. Sem margem desejada armazenada, não há preço sugerido inventado no dashboard. Resultado antes de taxas não equivale a lucro líquido.
- Precificação: atalhos para ingredientes e receita, campos separados por custo e condições de venda, resultado acessível com live region e explicação recolhível. As fórmulas foram mantidas.
- Formulários, autenticação, catálogo, orçamentos e landing usam os mesmos tokens. Mensagem de atualização após operações persistidas. Estados vazios com indicação clara do próximo cadastro.
- Movimento reduzido respeitado; campos e botões com área mínima de 44 px e foco visível.

## Verificação

`npm run lint`, `npm test`, `npm run build`, `npm run test:ui`.

Playwright usa API de teste isolada, desktop 1440 px, tablet 834 px e celular 390 px. Verifica cadastro/edição de ingrediente, receita, produto, orçamento e download, além de preço sugerido, taxas, preço abaixo do custo, percentuais inválidos e seleção do produto no dashboard. Capturas em `test-results`. Esses testes não substituem login/Storage com contas reais no Supabase nem experiência em dispositivo físico. A publicação não faz parte deste redesign: pushes para main podem acionar Cloudflare automaticamente.
