# Pacote É Mato — ETAPA 4 FINAL CORRIGIDA

Evolução incremental do Pacote É Mato com Roteirização profissional separada da Bipagem.

## Correções finais desta revisão

- Importação XLSX possui leitor nativo, detecção de cabeçalho em várias linhas e mapeamento manual de colunas quando necessário.
- A geocodificação passa a considerar corretamente o campo `numero` vindo do XLSX/manual.
- Coordenadas `null` deixam de ser convertidas indevidamente para `0,0`; paradas sem coordenadas válidas não entram no mapa nem na otimização.
- O mapa usa o estilo colorido `liberty` e ocupa a área principal da Roteirização no desktop, com alternância Mapa/Paradas no celular.
- Veículo, tempo médio, ponto inicial e navegação ficam em Configurações e são aplicados à Rota Ativa.
- O Worker pode ser configurado e testado pela própria tela de Configurações.
- A preferência Pacote É Mato/Waze/Google Maps é respeitada ao iniciar a rota.

O sistema legado continua responsável por login, Firebase, assinaturas, administração, leitura PDF, agrupamento físico de paradas, scanner, câmera, entrada manual, sons, TTS, histórico anterior, Waze e Google Maps. A nova arquitetura adiciona planejamento de rota sem substituir essas funções.

## Fluxo principal

```text
LOGIN
  ↓
INÍCIO
  ↓
ROTEIRIZAÇÃO ──→ NAVEGAÇÃO
  ↓
ROTA ATIVA
  ↓
BIPAGEM
  ↓
HISTÓRICO
```

Roteirização e Bipagem são telas e responsabilidades diferentes. Elas compartilham a mesma Rota Ativa por meio do `PacoteEMatoRotaStore`.

## Estrutura

```text
Pacote-Em-Mato/
├── index.html
├── README.md
├── manifest.json
├── politica-privacidade.html
├── termos-de-uso.html
├── licencas.html
├── css/
│   ├── style.css
│   ├── app-shell.css
│   ├── mapa.css
│   ├── roteirizacao.css
│   └── navegacao.css
├── js/
│   ├── app.js
│   ├── state.js
│   ├── suporte.js
│   ├── core/
│   │   └── rota-store.js
│   ├── ui/
│   │   └── app-shell.js
│   ├── importacao/
│   │   └── xlsx.js
│   ├── roteirizacao/
│   │   ├── roteirizacao.js
│   │   └── servico-rota.js
│   ├── mapa/
│   │   ├── config.js
│   │   ├── cache-geocodificacao.js
│   │   ├── geocodificacao.js
│   │   └── mapa.js
│   ├── navegacao/
│   │   └── navegacao.js
│   ├── bipagem/
│   │   └── rota-ativa-bridge.js
│   ├── historico/
│   │   └── historico-rotas.js
│   ├── configuracoes/
│   │   └── configuracoes.js
│   ├── exportacao/
│   │   └── pdf-rota.js
│   ├── paradas/
│   │   └── compatibilidade-enderecos.js
│   └── diagnosticos/
│       ├── diagnostico-rota.js
│       └── diagnostico-ui.js
└── cloudflare/
    ├── geocodificacao-worker.js
    └── wrangler.toml
```

## Preservação do sistema existente

- O agrupamento do PDF continua dentro de `js/app.js`.
- A nova Roteirização nunca reagrupa as paradas já criadas pelo fluxo PDF.
- Ao usar **Usar rota da Bipagem**, a nova rota recebe `mapaRotas`, `nomeExibicao`, `stopCorrespondente` e `pacotesBipados` já prontos.
- O bridge da Bipagem não recalcula agrupamento; ele apenas adapta uma Rota Ativa que já possui códigos de pacote para as estruturas globais que o scanner legado conhece.
- As funções antigas de compatibilidade de endereço foram consolidadas sem mudar sua lógica.

## Roteirização

A tela de Roteirização permite:

- importar XLSX, XLS ou CSV;
- usar a rota já carregada na Bipagem;
- adicionar, editar, duplicar e remover paradas;
- manter complemento, apartamento, bloco, sala, loja e observações;
- marcar Entregue ou Não entregue e registrar motivo/observação;
- geocodificar endereços com validação de confiança;
- escolher carro, moto ou caminhão;
- usar localização atual, endereço validado ou ponto inicial salvo;
- definir tempo médio de parada;
- otimizar a ordem pela rede viária;
- inverter a ordem e recalcular pelas ruas;
- mostrar distância, direção, tempo nas paradas, total e previsão de término;
- salvar automaticamente a rota como Rota Ativa;
- exportar PDF opcionalmente;
- iniciar navegação própria ou externa.

## XLSX

O importador reconhece nomes de colunas comuns para:

- endereço/logradouro;
- número;
- complemento;
- apartamento;
- bloco;
- sala;
- loja;
- bairro;
- cidade/estado/CEP;
- observação;
- ID da parada;
- pacote/código/tracking.

Sem ID de parada explícito, cada linha é tratada como uma parada e o sistema não inventa agrupamentos. Quando o arquivo traz o mesmo ID de parada em várias linhas com o mesmo endereço, os códigos de pacote podem ser agregados com segurança. ID repetido com endereço diferente é reportado como problema em vez de ser unido silenciosamente.

## Mapa

- MapLibre GL JS 5.24.0.
- Mapa base OpenFreeMap, estilo `liberty`, com ruas e rótulos coloridos e legíveis.
- Visualização 2D; rotação e pitch ficam desabilitados.
- Um marcador representa uma parada, nunca um pacote individual.
- A linha exibida vem da Routing API e segue as ruas reais.
- Mapa e lista compartilham uma única parada selecionada no estado central.

## Geocodificação

A geocodificação usa Geoapify pelo Worker Cloudflare e nunca expõe a chave no navegador.

O frontend valida, entre outros pontos:

- número do imóvel quando presente;
- confiança geral;
- confiança de rua;
- compatibilidade do logradouro;
- ambiguidade entre candidatos.

Se o endereço não for confiável, a parada fica com status de correção e não recebe uma coordenada inventada.

As coordenadas validadas são guardadas em um IndexedDB separado (`pacote_e_mato_geocache_v1`). Alterar o endereço invalida as coordenadas antigas e força nova geocodificação.

## Otimização e rota pelas ruas

O Worker usa dois serviços distintos do Geoapify:

1. **Route Planner API** para calcular uma ordem eficiente usando a rede viária.
2. **Routing API** para calcular a geometria real pelas ruas, distância, tempo e instruções.

Perfis atuais:

```text
Carro     → drive
Moto      → motorcycle
Caminhão  → light_truck
```

O frontend não possui fallback de ordenação por linha reta. Se o serviço real não estiver configurado ou falhar, a otimização é informada como indisponível.

## Rota Ativa e Bipagem

`js/core/rota-store.js` mantém uma única Rota Ativa em IndexedDB (`pacote_e_mato_rotas_v2`) e tenta espelhar as rotas no Firestore quando as regras da conta permitem.

Uma rota criada por XLSX pode ser usada diretamente na Bipagem quando contém códigos de pacote. Não é necessário exportar/reimportar PDF.

O bridge valida que o mesmo código de pacote não pertença a duas paradas diferentes antes de preparar a Bipagem.

A lógica de validação do scanner continua sendo a lógica existente em `js/app.js`. O bridge observa apenas os novos códigos aceitos e atualiza o status da Rota Ativa.

## Histórico

O histórico novo lê as rotas persistidas no IndexedDB, tenta mesclar as versões mais recentes da subcoleção `rotas_v2` do Firestore quando as regras permitem e oferece filtros por semana, data, período ou todas. O histórico antigo continua acessível separadamente.

O espelhamento no Firestore é complementar: se as regras não permitirem a gravação da coleção `rotas_v2`, a rota continua salva localmente sem quebrar o aplicativo.

## Navegação

Configurações disponíveis:

```text
Pacote É Mato
Waze
Google Maps
```

O modo Pacote É Mato usa:

- GPS do navegador;
- mapa 2D;
- geometria calculada pela Routing API;
- próxima parada;
- distância e ETA;
- paradas restantes;
- instruções da rota;
- avanço manual;
- recálculo da rota a partir da posição atual.

A navegação própria é uma navegação web operacional. Ela não deve ser apresentada como equivalente a todos os recursos nativos de Waze ou Google Maps.

## Cloudflare Worker — configuração obrigatória

O Worker desta etapa é separado do Worker de pagamentos/assinaturas.

### 1. Criar uma chave Geoapify

A chave precisa ter acesso aos serviços de geocodificação, Route Planner e Routing usados pelo projeto.

### 2. Instalar Wrangler

Na pasta `cloudflare/`:

```bash
npm install -g wrangler
wrangler login
```

### 3. Cadastrar a chave como secret

```bash
wrangler secret put GEOAPIFY_API_KEY --config wrangler.toml
```

Nunca coloque a chave no `index.html`, `config.js` ou qualquer JavaScript público.

### 4. Conferir a origem autorizada

Em `cloudflare/wrangler.toml`, ajuste `ALLOWED_ORIGINS` para a origem exata do GitHub Pages ou domínio oficial. Exemplo:

```toml
[vars]
ALLOWED_ORIGINS = "https://joaovitor250p-cloud.github.io"
```

Se houver mais de uma origem, separe por vírgula.

### 5. Publicar

```bash
wrangler deploy --config wrangler.toml
```

O deploy retornará uma URL parecida com:

```text
https://pacote-emato-geocodificacao.<seu-subdominio>.workers.dev
```

### 6. Informar a URL ao frontend

Abra **Configurações → Serviço de rota / Worker**, cole a URL base retornada pelo deploy e clique em **Testar conexão**. O app salva essa URL localmente em `pemato_worker_base_url` e aplica os endpoints `/health`, `/geocode`, `/optimize` e `/route`.

A URL do Worker não é secreta; somente `GEOAPIFY_API_KEY` é secreta.

## Firebase

Nenhuma alteração obrigatória no Firebase Authentication é necessária.

O novo armazenamento tenta usar:

```text
usuarios/{whatsapp}/rotas_v2/{rotaId}
```

Esse espelhamento depende das regras Firestore do projeto. Antes de habilitá-lo em produção, confirme que cada usuário autenticado só pode ler/gravar as próprias rotas. Não abra a coleção publicamente apenas para fazer o recurso funcionar.

Se o Firestore bloquear a gravação, o IndexedDB continua funcionando como armazenamento local e o aplicativo não deve falhar por isso.

## Publicação no GitHub Pages

O conteúdo desta pasta deve permanecer com as mesmas pastas e caminhos. Não envie todos os arquivos achatados na raiz.

Estrutura mínima a preservar:

```text
index.html
css/
js/
cloudflare/
manifest.json
politica-privacidade.html
termos-de-uso.html
licencas.html
```

O diretório `cloudflare/` fica no repositório como código-fonte do Worker, mas não é executado pelo GitHub Pages.

## Limitações reais

- Geoapify usa créditos. Rotas grandes consomem mais créditos na otimização; o plano gratuito é adequado para desenvolvimento e testes, não necessariamente para muitos motoristas em produção.
- A otimização regular aceita até 300 coordenadas únicas por tarefa. O frontend limita a tarefa a 299 paradas mais o ponto inicial.
- O trânsito usado é `approximated`; não é trânsito ao vivo em tempo real.
- GPS em navegador depende de permissão, HTTPS, dispositivo e sistema operacional.
- Navegação web em segundo plano pode sofrer restrições do navegador móvel.
- O repositório-base recebido não continha `icon-192.png` e `icon-512.png`; estes dois ícones foram reconstruídos a partir do próprio logotipo SVG já embutido no `index.html`, sem copiar outro projeto.
- `tutorial-pacote-e-mato.mp4` continua ausente porque o repositório correto não contém esse vídeo; nenhum vídeo falso foi criado.

## Segurança

- Nenhum secret do Geoapify fica no frontend.
- O Worker valida origem, método, cliente e payload.
- O Worker aplica limite básico por IP e cache de geocodificação.
- O Worker de roteirização/geocodificação não é o Worker de pagamentos.
- Firebase e pagamentos legados permanecem no fluxo existente.


## Persistência e segurança operacional

O histórico v2 usa IndexedDB local e tenta espelhar as rotas em `usuarios/{usuario}/rotas_v2` no Firestore sem alterar as coleções antigas. Ao abrir o histórico, o app também tenta ler essa coleção e mesclar versões remotas mais recentes; se as regras do Firestore não permitirem, o app continua usando o armazenamento local.

O Worker contém uma limitação básica por IP como proteção complementar. Em produção, configure também uma regra de **Rate Limiting** na zona/Worker do Cloudflare, pois limites em memória dentro de uma instância Worker não substituem um controle distribuído da plataforma.
