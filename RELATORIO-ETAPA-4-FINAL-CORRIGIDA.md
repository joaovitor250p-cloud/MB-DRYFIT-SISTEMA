# Relatório — Pacote É Mato | ETAPA 4 FINAL CORRIGIDA

## Base utilizada

Esta correção foi feita incrementalmente sobre o conteúdo de `Pacote-Em-Mato-ETAPA-4-CORRIGIDA.zip`. O aplicativo não foi reconstruído do zero. O núcleo legado de login, Firebase, PDF, agrupamento físico e bipagem foi preservado.

## Causas encontradas

### 1. Importação XLSX

O importador anterior dependia de nomes de colunas muito específicos e tratava a primeira linha útil como cabeçalho. Planilhas com título antes do cabeçalho, nomes diferentes ou colunas equivalentes não eram interpretadas de forma confiável. Além disso, a leitura dependia do carregamento externo do SheetJS.

Correção: foi implementado leitor XLSX nativo para arquivos `.xlsx`, detecção de cabeçalho nas primeiras linhas, aliases mais robustos e uma tela de associação manual de colunas. O SheetJS permanece apenas como fallback e para `.xls` antigo. O sistema não informa sucesso quando nenhuma parada válida foi lida.

### 2. Geocodificação de paradas importadas

O XLSX armazenava o número do imóvel em `parada.numero`, porém a validação de geocodificação procurava prioritariamente `numeroImovel`/chave legada. Uma parada importada podia receber uma resposta correta do provedor e ainda assim ser rejeitada.

Correção: a validação agora usa `parada.numero`, depois os formatos legados, mantendo o requisito de número e confiança.

### 3. Coordenadas ausentes podiam virar 0,0

JavaScript converte `null` para o número `0`. Algumas validações faziam `Number(null)` e consideravam esse resultado finito. Assim, uma parada ainda sem geocodificação podia ser tratada como coordenada `(0,0)` e entrar no mapa/roteamento.

Correção: mapa, armazenamento de rota, geocodificação, navegação, configurações, serviço de rota e Worker agora rejeitam `null`, `undefined` e string vazia antes de converter coordenadas. A coordenada real `0,0` continua tecnicamente válida quando explicitamente fornecida.

### 4. Mapa pequeno e monocromático

A versão anterior usava o estilo `positron` e uma área de roteirização excessivamente limitada. Isso produzia aparência clara/monocromática e fazia o mapa parecer um quadro secundário.

Correção: o mapa passou para OpenFreeMap `liberty`, permanece 2D, sem pitch/rotação/prédios 3D, e o workspace desktop usa painel lateral de paradas + mapa como área principal. No celular existe alternância Mapa/Paradas.

### 5. Fluxo dependente do Worker sem diagnóstico claro

A URL do Worker podia permanecer vazia e a tela não oferecia um caminho operacional claro para configurar/testar o serviço. Geocodificação e otimização dependem dele.

Correção: Configurações possui campo de URL base, teste `/health` e mensagens específicas para Worker ausente ou secret Geoapify não configurado. Não existe fallback falso de otimização.

### 6. Configurações espalhadas

Veículo, tempo de parada e ponto inicial apareciam no planejamento principal.

Correção: essas preferências ficaram concentradas em Configurações e são aplicadas de verdade à Rota Ativa. Alterações que afetam cálculo invalidam geometria/otimização anterior para exigir novo cálculo.

## Fluxo corrigido

```text
Importar XLSX
  → detectar/associar colunas
  → criar paradas reais
  → geocodificar endereços
  → listar problemas de localização
  → mostrar paradas válidas no mapa
  → otimizar pelo Worker/Geoapify
  → obter geometria pelas ruas
  → desenhar rota
  → salvar Rota Ativa
  → disponibilizar na Bipagem
```

## Preservação

O arquivo `js/app.js` permaneceu byte a byte igual ao pacote recebido nesta correção. Também permaneceram byte a byte iguais `js/bipagem/rota-ativa-bridge.js`, `js/suporte.js`, `manifest.json` e `politica-privacidade.html`. O `rota-store.js` precisou ser corrigido somente na normalização de coordenadas nulas, pois isso afetava diretamente o erro de localização.

O agrupamento físico do PDF continua pertencendo ao legado. A nova Roteirização não reagrupa as paradas do PDF.

## Arquivos modificados nesta correção

- `index.html`
- `README.md`
- `css/app-shell.css`
- `css/mapa.css`
- `css/roteirizacao.css`
- `js/configuracoes/configuracoes.js`
- `js/core/rota-store.js`
- `js/importacao/xlsx.js`
- `js/mapa/config.js`
- `js/mapa/geocodificacao.js`
- `js/mapa/mapa.js`
- `js/navegacao/navegacao.js`
- `js/roteirizacao/roteirizacao.js`
- `js/roteirizacao/servico-rota.js`
- `cloudflare/geocodificacao-worker.js`

## Arquivo criado nesta correção

- `RELATORIO-ETAPA-4-FINAL-CORRIGIDA.md`

Nenhum arquivo do pacote anterior foi removido nesta correção.

## Testes executados

### Testes executados com sucesso

1. Sintaxe de todos os arquivos JavaScript do frontend com `node --check`.
2. Sintaxe do Worker como ES Module.
3. Leitura real de arquivo XLSX gerado para teste com título acima do cabeçalho.
4. Detecção automática das colunas endereço, número, cidade, UF, complemento, código e observação.
5. Conversão real das linhas do XLSX em duas paradas, preservando números e códigos de pacote.
6. Conversão com mapeamento manual de colunas.
7. Validação de geocodificação: número correto/confiança alta aceito; número incorreto ou confiança baixa rejeitado.
8. Normalização: coordenadas `null` permanecem `null` e não viram `(0,0)`.
9. Mapa com mock do MapLibre: somente paradas com coordenadas válidas geram marcadores; estilo configurado é `liberty`.
10. Serviço de rota com Worker simulado: perfil moto enviado como `motorcycle`, ordem retornada aplicada e resposta de geometria `LineString` aceita.
11. Configurações persistindo navegação, veículo, tempo de parada e ponto inicial.
12. Ponte Rota Ativa → Bipagem: duas paradas, três pacotes, ordem e pacotes já bipados convertidos corretamente para as estruturas legadas.
13. Worker `/health`: origem autorizada aceita e origem indevida bloqueada.
14. Worker rejeita ponto inicial `null` como `invalid_start`, em vez de convertê-lo para `(0,0)`.
15. 318 IDs HTML verificados sem duplicidade.
16. Referências locais verificadas; única referência ausente continua sendo o vídeo legado `tutorial-pacote-e-mato.mp4`, que já não fazia parte do pacote recebido.
17. Hash SHA-256 do `js/app.js` comparado antes/depois: idêntico.
18. Hashes do bridge de Bipagem, `suporte.js`, `manifest.json` e política comparados antes/depois: idênticos.

### Limitação de teste interativo

O Chromium disponível no ambiente de execução está sujeito a uma política organizacional que bloqueia páginas `localhost` e `file://` (“Your organization doesn’t allow you to view this site”). Por isso não foi possível executar aqui um clique-a-clique visual completo no navegador real, nem capturar a tela desktop/mobile carregada.

Também não foi possível fazer chamadas reais para Geoapify porque o ambiente não possui a sua `GEOAPIFY_API_KEY` nem acesso aos seus serviços publicados. A integração foi testada com respostas simuladas e validação do Worker/cliente. Portanto, após publicar, faça o teste final no domínio HTTPS real com a chave e Worker configurados.

## Cloudflare — configuração necessária

1. Ajuste `ALLOWED_ORIGINS` em `cloudflare/wrangler.toml` para a origem exata do app.
2. Cadastre o secret:

```bash
wrangler secret put GEOAPIFY_API_KEY --config wrangler.toml
```

3. Publique:

```bash
wrangler deploy --config wrangler.toml
```

4. No aplicativo, abra **Configurações → Serviço de rota / Worker**, cole a URL `https://...workers.dev` e clique em **Testar conexão**.

O Worker de geocodificação/roteirização é separado do Worker de pagamentos.

## Firebase — configuração necessária

Nenhuma alteração é necessária no Firebase Authentication. Login, usuários, permissões, sessões e pagamentos continuam no fluxo existente.

A Rota Ativa funciona localmente em IndexedDB. Para sincronização remota, o app tenta utilizar `usuarios/{usuario}/rotas_v2/{rotaId}`. As regras Firestore devem permitir somente ao usuário autorizado acessar as próprias rotas. Se essa subcoleção não estiver liberada, o app continua localmente sem quebrar a Bipagem.

## Publicação no GitHub

Extraia o ZIP e envie o conteúdo da pasta `Pacote-Em-Mato/` preservando `css/`, `js/` e `cloudflare/`. Não achate os arquivos na raiz. O diretório `cloudflare/` fica como código-fonte e não é executado pelo GitHub Pages.

## Limitações restantes

- `tutorial-pacote-e-mato.mp4` continua ausente porque não está no pacote-base recebido.
- Geocodificação e otimização reais exigem Worker publicado e `GEOAPIFY_API_KEY`.
- GPS depende de HTTPS, permissão do usuário e hardware/navegador.
- Navegação web móvel pode sofrer restrições em segundo plano impostas pelo sistema operacional.
- O teste visual final com tiles reais deve ser feito no domínio publicado devido à política do navegador deste ambiente.
