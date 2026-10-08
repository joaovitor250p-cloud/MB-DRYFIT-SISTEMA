# Pacote É Mato

Sistema de logística com leitura de PDF do Circuit, agrupamento físico de paradas, bipagem por câmera/scanner, histórico, Firebase, pagamentos e integração com Waze/Google Maps.

## Estrutura atual

```text
Pacote-Em-Mato/
├── index.html
├── manifest.json
├── politica-privacidade.html
├── README.md
├── css/
│   ├── style.css
│   └── mapa.css
├── js/
│   ├── app.js
│   ├── state.js
│   ├── suporte.js
│   ├── paradas/
│   │   └── compatibilidade-enderecos.js
│   ├── diagnosticos/
│   │   ├── diagnostico-rota.js
│   │   └── diagnostico-ui.js
│   └── mapa/
│       ├── config.js
│       ├── cache-geocodificacao.js
│       ├── geocodificacao.js
│       ├── mapa.js
│       └── integracao-rota.js
└── cloudflare/
    ├── geocodificacao-worker.js
    └── wrangler.toml
```

## Regra de preservação

O agrupamento físico continua sendo produzido pelo `js/app.js`. A camada de mapa recebe `mapaRotas`, `nomeExibicao`, `stopCorrespondente` e `pacotesBipados` já prontos. A ETAPA 4 não cria novo agrupamento e não altera a validação da bipagem.

## Mapa

- MapLibre GL JS 5.24.0, carregado como script clássico para preservar os handlers globais existentes.
- Base cartográfica OpenFreeMap (`liberty`).
- 1 parada física = 1 marcador.
- A lista e o mapa compartilham `appState.roteirizacao.paradaSelecionadaId`.
- O mapa não é obrigatório para login, PDF, bipagem, histórico ou retomada.

## Geocodificação segura

A geocodificação usa um Worker Cloudflare separado do Worker de pagamentos. A chave do Geoapify fica apenas no secret `GEOAPIFY_API_KEY` do Worker.

O frontend já está configurado para o Worker:

```text
https://pacote-emato-geocodificacao.joaovitor250p.workers.dev/geocode
```

### Deploy do Worker

Na pasta `cloudflare/`:

```bash
npx wrangler secret put GEOAPIFY_API_KEY --config wrangler.toml
npx wrangler deploy --config wrangler.toml
```

O `wrangler.toml` permite por padrão a origem `https://joaovitor250p-cloud.github.io`. Se o projeto usar outro domínio, inclua a origem em `ALLOWED_ORIGINS` antes do deploy.

Nenhuma chave secreta deve ser colocada no `index.html` ou nos arquivos `js/`.

## Cache

As coordenadas validadas ficam em um IndexedDB separado (`pacote_e_mato_geocache_v1`). O histórico original não é migrado nem alterado.
