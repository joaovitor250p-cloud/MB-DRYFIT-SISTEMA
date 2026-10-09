# Relatório — ETAPA 4 XLSX + MAPA + LOCALIZAÇÃO CORRIGIDA

Base obrigatória utilizada: `Pacote-Em-Mato-ETAPA-4-UI-ROTA-CORRIGIDA.zip`.

## 1. Causa exata do erro `Cannot read properties of undefined (reading 'lng')`

O erro ocorria em `js/mapa/mapa.js`, na função que desenha o ponto de partida.

Sequência antiga:

```text
importação XLSX
→ renderizarTudo()
→ PacoteEMatoMapa.renderizar()
→ renderizarPartida()
→ new maplibregl.Marker(...).addTo(mapa)
→ somente depois setLngLat(...)
```

Quando havia um ponto inicial válido, o marcador era anexado ao MapLibre antes de receber uma posição. O MapLibre tentava atualizar o marcador e acessava internamente a longitude de uma coordenada ainda indefinida, produzindo o erro `.lng`.

A falha acontece na renderização do mapa e pode ocorrer logo após o XLSX disparar `renderizarTudo()`. Ela ocorre antes de qualquer necessidade de chamar o Worker de geocodificação.

Correção:

```text
new Marker(...)
→ setLngLat([lon, lat])
→ addTo(mapa)
```

O mesmo padrão seguro foi usado no novo marcador de localização atual.

## 2. Por que os endereços importados não apareciam no mapa

O XLSX criava corretamente a lista de paradas, porém as paradas comuns entravam com:

```text
latitude = null
longitude = null
statusGeocodificacao = pendente
```

O mapa, corretamente, só desenha marcadores para coordenadas válidas. Sem um serviço de geocodificação configurado, não existe uma fonte legítima de latitude/longitude e o aplicativo não deve inventar posições.

A correção tem três partes:

1. XLSX com colunas de `Latitude` e `Longitude` agora é reconhecido; pares válidos entram como coordenadas reais e aparecem imediatamente no mapa.
2. Coordenadas parciais, `null`, `undefined`, `NaN` ou fora da faixa são recusadas. Quando um par é inválido, ambos os valores são mantidos como `null`.
3. Quando não existe serviço de geocodificação, a rota/lista permanece salva e a interface informa quantas paradas estão aguardando localização. O usuário pode tentar localizar novamente sem reimportar o XLSX.

A otimização não é necessária para exibir marcadores que já tenham coordenadas válidas.

## 3. Localização atual automática

Foi criado `js/mapa/localizacao-atual.js`.

Comportamento:

- ao abrir a Roteirização, tenta obter a localização atual quando permitido;
- se a permissão já estiver concedida, não exige clique repetido;
- usa uma única captura, não `watchPosition`, para evitar consumo contínuo de bateria;
- evita nova solicitação quando a posição da sessão ainda é recente;
- mantém a última posição válida somente como referência da sessão se uma atualização falhar e a marca explicitamente como desatualizada;
- se a permissão for negada, não repete automaticamente a solicitação;
- existe botão discreto para tentativa manual;
- exige contexto seguro (HTTPS, ou localhost em desenvolvimento);
- a localização atual fica em `appState.roteirizacao.localizacaoAtual` e NÃO altera `pontoInicial`.

## 4. Arquivos criados

- `js/mapa/localizacao-atual.js`
- `RELATORIO-ETAPA-4-XLSX-MAPA-LOCALIZACAO-CORRIGIDA.md`

## 5. Arquivos modificados

- `README.md`
- `index.html`
- `css/mapa.css`
- `js/state.js`
- `js/importacao/xlsx.js`
- `js/mapa/mapa.js`
- `js/roteirizacao/roteirizacao.js`
- `js/ui/app-shell.js`

## 6. Arquivos críticos preservados byte a byte

- `js/app.js`
- `js/bipagem/rota-ativa-bridge.js`
- `js/suporte.js`
- `manifest.json`
- `politica-privacidade.html`
- `cloudflare/geocodificacao-worker.js`
- `cloudflare/wrangler.toml`

O Cloudflare não foi publicado, reconfigurado ou modificado.

## 7. Testes realmente executados

### Reproduzir o erro `.lng`

Foi executado um teste com um MapLibre controlado que reproduz o comportamento de `Marker.addTo()` ao exigir uma posição previamente definida.

Versão-base:

```text
Marker novo
→ addTo com posição indefinida
→ Cannot read properties of undefined (reading 'lng')
```

Versão corrigida:

```text
Marker novo
→ setLngLat
→ addTo
→ nenhum erro
```

### XLSX real — cabeçalho em linha posterior

Planilha real criada com linha de título antes do cabeçalho.

Resultado:

- cabeçalho identificado;
- 2 linhas lidas;
- 2 paradas criadas;
- número, complemento, cidade, UF, pacote e observação preservados.

### XLSX real — coordenadas válidas

Planilha com colunas `Latitude` e `Longitude`.

Resultado:

- 2 paradas importadas;
- 2 coordenadas validadas;
- 2 marcadores enviados ao mapa;
- nenhuma exceção JavaScript.

### XLSX real — sem coordenadas

Resultado:

- 2 paradas importadas;
- 0 coordenadas inventadas;
- 0 marcadores;
- lista preservada;
- status informa que as duas aguardam geocodificação.

### Coordenadas incompletas/inválidas

Resultado:

- a parada continua importada;
- latitude e longitude ficam ambas `null`;
- aviso é gerado;
- a parada não é enviada ao mapa.

### Arquivo XLSX vazio

Resultado:

- importação rejeitada com mensagem de planilha sem dados legíveis;
- nenhuma rota fictícia criada.

### Geocodificação sem serviço configurado

Resultado:

- lista permanece com o mesmo número de paradas;
- coordenadas permanecem `null`;
- status `nao_configurado` quando o módulo de geocodificação é acionado diretamente;
- nenhuma coordenada fictícia é gerada.

### Retry sem reimportar

Na mesma lista em memória:

1. primeira tentativa sem endpoint → `nao_configurado`;
2. endpoint de teste configurado em memória + resposta válida simulada;
3. nova tentativa → a mesma parada passa para `ok` e recebe latitude/longitude.

Nenhuma nova importação XLSX foi necessária.

### Endereço não localizado

Resposta realista simulada com `results: []`:

- status `nao_encontrado`;
- latitude/longitude continuam `null`.

### Validação de coordenadas no mapa

Testados:

- `null` → rejeitado;
- `undefined` → rejeitado;
- texto inválido/NaN → rejeitado;
- coordenada numérica válida → aceita.

### Localização atual

Cenários simulados no navegador:

- permissão concedida → localização válida armazenada;
- duas chamadas automáticas seguidas → apenas uma captura de GPS enquanto a posição está recente;
- permissão negada → status claro e sem alteração do ponto inicial;
- geolocalização indisponível → alternativa manual informada;
- timeout → erro controlado;
- o `pontoInicial` configurado permaneceu intacto em todos os testes.

### Rota Ativa → Bipagem

Foi executado o bridge real com uma rota de teste:

- 2 paradas;
- 3 pacotes;
- ordem da rota aplicada aos `stopCorrespondente`;
- pacote já bipado preservado;
- `mapaRotas`, `todosPacotes` e `pacotesBipados` populados sem alterar o arquivo do bridge.

### Validação estrutural

- todos os JavaScripts passaram em `node --check`;
- nenhuma referência local do `index.html` ficou ausente;
- nenhum ID duplicado no HTML;
- arquivos Cloudflare permaneceram com o mesmo SHA-256 da base.

## 8. O que ainda depende do Cloudflare/serviço externo

Nesta correção o Worker NÃO foi alterado.

Sem um endpoint de geocodificação já configurado:

- endereços textuais importados sem latitude/longitude continuam somente na lista;
- não existe geocodificação automática real desses endereços;
- otimização real pelas ruas continua indisponível.

Isso é intencional: o aplicativo não cria coordenadas aproximadas, aleatórias ou fictícias.

Se a instalação já possuir um endpoint previamente configurado, o módulo existente continua podendo utilizá-lo. Esta correção não publica nem modifica esse serviço.

## 9. Limitações do ambiente de teste

O Chromium do ambiente bloqueia navegação direta para `localhost` por política administrativa. Por isso os testes de componentes foram executados com o HTML/JavaScript reais através de `page.set_content()` e arquivos XLSX reais enviados ao `input[type=file]`.

Não foi possível testar:

- GPS físico de um aparelho Android;
- permissões reais do navegador do usuário;
- tiles externos reais no site publicado;
- Worker/Geoapify de produção sem credenciais/endpoint;
- Firebase de produção.

Essas partes não são declaradas como validadas em produção.
