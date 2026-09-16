# CORUJA40 SPY

Site: https://corujalinks.github.io

## Uso

1. Entre com a conta de e-mail e senha já autorizada.
2. Em **Criar Link**, preencha nome interno, título e conteúdo. Confira a prévia e publique.
3. Em **Meus Links**, copie o endereço, edite ou desative a página. A edição conserva o código.
4. Em **Acessos**, acompanhe as visualizações acumuladas. Reaberturas contam novamente; não são visitantes únicos.
5. Em **Configurações**, salve nome de exibição e tipo de página padrão, ou exporte os links em JSON.

## Privacidade escolhida pelo proprietário

- Visitantes abrem o texto das páginas ativas pelo código único.
- Imagens são privadas, visíveis somente ao dono da conta autenticado. Não aparecem para visitantes sem login.
- O bucket link-images é privado. O upload aceita JPG, PNG e WebP até 5 MB.
- Prévia privada utiliza endereço assinado de 60 segundos. Uma cópia já baixada não pode ser recolhida.
- Nome interno, proprietário e dados da conta não são enviados pela consulta pública anônima.
- Desativar bloqueia novas aberturas da página pública.
- Não há coleta de localização, câmera ou identificação de visitantes pelo aplicativo. Os provedores de hospedagem podem manter seus registros operacionais.
- Cadastro público e login anônimo estão desativados no Supabase.

## Criar com IA

A interface e a função create-content estão publicadas. A geração real **aguarda OPENAI_API_KEY**, que ainda não foi fornecida. A função informa essa pendência e não simula um resultado de IA.

A chave deve ficar somente em Supabase → Edge Functions → Secrets. Nunca deve ser colocada neste repositório nem no navegador do site. A API possui cobrança própria conforme o uso.

Implementação: OpenAI Responses API, gpt-4.1-mini, saída estruturada, até 1600 tokens de saída por pedido, store:false. Limites no banco: 30 pedidos por dia por conta e intervalo mínimo de 10 segundos. Pedidos que chegam ao provedor podem consumir a cota mesmo se a geração falhar. O texto é um rascunho e só é publicado após revisão e confirmação no formulário.

Referências: [saídas estruturadas](https://developers.openai.com/api/docs/guides/structured-outputs) e [modelo](https://developers.openai.com/api/docs/models/gpt-4.1-mini).

## Manutenção

- index.html: login, painel, editor, listagem, estatísticas, preferências e renderização pública.
- create.html: compatibilidade com o endereço antigo; redireciona ao editor autenticado.
- view.html?c=CODIGO: entrada pública por código.
- supabase/migrations/20260915_coruja_links.sql: estrutura e políticas do banco.
- supabase/functions/create-content/index.ts: IA com validação de usuário e cota.
- supabase/functions/link-image/index.ts: endpoint privado adicional, exige autenticação, propriedade e link ativo. A interface utiliza URLs assinadas do Storage.

As funções no Supabase foram implantadas pelo painel; commits neste repositório não reimplantam as Edge Functions automaticamente. A publicação do frontend usa GitHub Pages. As funções mantêm a verificação de JWT habilitada e também validam o usuário no servidor. Nenhuma chave secreta está no frontend.

## Verificação em 15/09/2026

Passaram, em transação revertida no banco: criação e leitura pelo dono, código único, bloqueio de leitura/alteração por outra identidade simulada, bloqueio da tabela para acesso anônimo por RLS, leitura pública limitada, ausência de campos privados e imagem para anônimo, código inválido, incremento de contagem, edição, desativação/reativação, bucket privado e limites de IA.

Passaram no navegador: redirecionamento de create.html para login sem sessão, rejeição de credenciais inválidas, mensagem de link inexistente e layout de login/página indisponível com largura de 390 px sem transbordamento horizontal.

Pendentes: teste completo do formulário com login real (criar, enviar imagem, editar, preferências e sair), inspeção do painel autenticado em celular e teste real de geração após configurar a chave da API. Esses testes não devem ser considerados concluídos até serem executados.
