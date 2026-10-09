# Pacote É Mato — ETAPA 4 UI ROTA CORRIGIDA

Versão cumulativa do Pacote É Mato com a tela de Roteirização reorganizada para uma experiência mobile-first inspirada funcionalmente em aplicativos profissionais de entregas, sem copiar marca, código ou identidade proprietária.

## O que mudou nesta revisão

- O mapa passou a ocupar a área principal da Roteirização.
- No celular, a lista de paradas virou um painel inferior recolhível/expansível.
- O resumo recolhido mostra término, quantidade de paradas e distância quando esses dados existem.
- As ações secundárias saíram da tela principal e foram para um menu de ações.
- O menu lateral continua sendo a navegação principal do aplicativo.
- Veículo, tempo médio por parada, ponto inicial e navegação continuam em Configurações.
- A importação XLSX/XLS/CSV continua usando o leitor existente, com detecção de cabeçalho e mapeamento manual de colunas.
- Paradas sem coordenadas válidas não são enviadas ao mapa nem à rota.
- O mapa usa OpenFreeMap `liberty` como estilo principal e possui um mapa-base raster de contingência caso o estilo vetorial não carregue.
- A infraestrutura Cloudflare/Geoapify já existente no pacote NÃO foi configurada nem alterada nesta revisão.

## Fluxo da Roteirização nesta versão

```text
Importar XLSX/XLS/CSV
        ↓
Ler cabeçalho e colunas
        ↓
Criar paradas reais
        ↓
Revisar / editar paradas
        ↓
Mapa + lista sincronizados quando houver coordenadas válidas
```

Geocodificação automática e otimização por ruas continuam dependentes do serviço externo já previsto no projeto. Como esse serviço não será configurado nesta revisão, o aplicativo não inventa coordenadas nem simula otimização. As ações dependentes desse serviço ficam fora do menu enquanto ele não estiver disponível.

## Experiência mobile

- mapa em tela cheia;
- botão de menu flutuante;
- painel inferior de paradas;
- painel recolhido com resumo compacto;
- painel expandido com busca e lista;
- menu de ações em painel inferior;
- parada selecionada sincronizada entre lista e mapa;
- controles de mapa discretos;
- sem controles de veículo/tempo espalhados na tela de roteirização.

## Preservação do sistema principal

Os seguintes arquivos foram mantidos byte a byte iguais à base recebida nesta revisão:

- `js/app.js`
- `js/bipagem/rota-ativa-bridge.js`
- `js/suporte.js`
- `manifest.json`
- `politica-privacidade.html`
- `cloudflare/geocodificacao-worker.js`
- `cloudflare/wrangler.toml`

Isso preserva o núcleo existente de login/Firebase, PDF, agrupamento físico, câmera, scanner, bipagem e integração legada.

## Importação

O botão visível de importação abre o `input[type=file]` real e aceita:

- `.xlsx`
- `.xls`
- `.csv`

O leitor nativo de XLSX foi testado com uma planilha real contendo uma linha de título antes do cabeçalho. Quando as colunas não são reconhecidas, a importação não substitui a rota automaticamente: abre o mapeamento manual e só cria a rota depois da confirmação do usuário.

## Mapa

- MapLibre GL JS 5.24.0;
- OpenFreeMap `liberty` como estilo principal;
- fallback raster OSM apenas se o estilo principal falhar;
- visualização 2D;
- sem pitch/3D;
- marcadores somente para coordenadas válidas;
- uma parada física = um marcador;
- lista e mapa compartilham a mesma seleção.

## Configurações

A tela Configurações mantém:

- navegação preferida;
- tipo de veículo;
- tempo médio por parada;
- retorno ao ponto inicial;
- ponto de partida;
- aparência e voz.

A configuração visual do Worker foi retirada desta revisão para não exigir configuração de infraestrutura agora. Os arquivos de Worker permaneceram no pacote apenas porque já existiam na versão-base e podem ser usados em uma etapa futura.

## Publicação

1. Baixe o ZIP final.
2. Extraia a pasta `Pacote-Em-Mato/`.
3. Envie a estrutura inteira ao repositório, preservando as pastas `css/`, `js/` e demais diretórios.
4. Não envie apenas os arquivos soltos da raiz, pois isso quebra os caminhos relativos.

Consulte `RELATORIO-ETAPA-4-UI-ROTA-CORRIGIDA.md` para os testes executados e limitações do ambiente.
