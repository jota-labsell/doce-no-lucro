# Interface: direção e revisão

A stack React/TypeScript/Vite/Tailwind permanece. A camada financeira, serviços Supabase, migrations e gerador de PDFs não foram alterados neste redesign.

A auditoria encontrou o mesmo tratamento de card em indicadores, formulários e resultados, além de uma chamada promocional no painel de trabalho, flores tipográficas e bordas muito arredondadas. A revisão separa resumo, análise financeira, listas e tarefas de cadastro.

## Sistema visual

Tokens em `src/style.css`: creme para fundo, branco para superfícies, amora para ações e navegação, grafite para texto, verde para resultados positivos e vermelho para negativos. Tipografia de sistema, sem fontes externas. Números financeiros usam algarismos tabulares. Marca tipográfica compartilhada em `Brand.tsx`, sem emojis. Bordas de 5–7 px, sem sombras decorativas.

## Fluxos

- Navegação com estado ativo, caminho da seção, link de pular para conteúdo e menu móvel com estado expandido anunciado.
- Dashboard com indicadores do banco, seleção de produto para comparar custo/preço e acesso à calculadora. Sem margem desejada armazenada, não há preço sugerido inventado no dashboard. Resultado antes de taxas não equivale a lucro líquido.
- Precificação: atalhos para ingredientes e receita, campos separados por custo e condições de venda, resultado acessível com live region e explicação recolhível. As fórmulas foram mantidas.
- Formulários, autenticação, catálogo, orçamentos e landing usam os mesmos tokens. Mensagem de atualização após operações persistidas. Estados vazios sem decoração.
- Movimento reduzido respeitado; campos e botões com área mínima de 44 px e foco visível.

## Verificação

`npm run lint`, `npm test`, `npm run build`, `npm run test:ui`.

Playwright usa API de teste isolada, desktop 1440 px, tablet 834 px e celular 390 px. Verifica cadastro/edição de ingrediente, receita, produto, orçamento e download, além de preço sugerido, taxas, preço abaixo do custo, percentuais inválidos e seleção do produto no dashboard. Capturas em `test-results`. Esses testes não substituem login/Storage com contas reais no Supabase nem experiência em dispositivo físico. A publicação não faz parte deste redesign: pushes para main podem acionar Cloudflare automaticamente.
