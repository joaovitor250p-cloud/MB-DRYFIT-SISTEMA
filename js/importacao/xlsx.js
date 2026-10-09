(function iniciarImportadorXlsx(global) {
  'use strict';

  const aliases = {
    endereco: ['endereco', 'endereço', 'address', 'endereco completo', 'endereço completo', 'local', 'destino'],
    logradouro: ['logradouro', 'rua', 'avenida', 'av', 'street'],
    numero: ['numero', 'número', 'num', 'nº', 'n°', 'number'],
    complemento: ['complemento', 'comp', 'complement', 'referencia', 'referência'],
    apartamento: ['apartamento', 'apto', 'apt', 'ap'],
    bloco: ['bloco', 'block'],
    sala: ['sala', 'suite'],
    loja: ['loja', 'store'],
    bairro: ['bairro', 'neighborhood'],
    cidade: ['cidade', 'city', 'municipio', 'município'],
    estado: ['estado', 'uf', 'state'],
    cep: ['cep', 'postal code', 'zipcode', 'zip'],
    observacao: ['observacao', 'observação', 'obs', 'nota', 'notas', 'notes', 'instructions', 'instrucoes', 'instruções'],
    id: ['id', 'stop id', 'parada id', 'codigo parada', 'código parada'],
    pacote: ['pacote', 'codigo pacote', 'código pacote', 'codigo', 'código', 'tracking', 'tracking code', 'etiqueta', 'package'],
    pacotes: ['pacotes', 'codigos pacotes', 'códigos pacotes', 'trackings', 'packages']
  };

  function normalizarCabecalho(v) {
    return String(v || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const aliasNorm = Object.fromEntries(Object.entries(aliases).map(([key, arr]) => [
    key,
    new Set(arr.map(normalizarCabecalho))
  ]));

  function identificarColunas(headers) {
    const mapa = {};
    headers.forEach((header, index) => {
      const norm = normalizarCabecalho(header);
      Object.entries(aliasNorm).forEach(([campo, conjunto]) => {
        if (!(campo in mapa) && conjunto.has(norm)) mapa[campo] = index;
      });
    });
    return mapa;
  }

  function valor(row, columns, key) {
    const idx = columns[key];
    return idx == null ? '' : String(row[idx] ?? '').trim();
  }

  function extrairPacotes(row, columns) {
    const textos = [];
    ['pacote', 'pacotes'].forEach(key => {
      const v = valor(row, columns, key);
      if (v) textos.push(v);
    });

    // Se a planilha não tem cabeçalho de pacote, ainda reconhece códigos BR inequívocos.
    if (!textos.length) {
      row.forEach(cell => {
        const t = String(cell ?? '');
        if (/\bBR[A-Za-z0-9]{8,25}\b/i.test(t)) textos.push(t);
      });
    }

    const encontrados = [];
    textos.forEach(texto => {
      const brs = String(texto).match(/BR[A-Za-z0-9]{8,25}/gi) || [];
      if (brs.length) {
        brs.forEach(v => encontrados.push(v.toUpperCase()));
      } else {
        String(texto).split(/[;,|\n]+/).map(v => v.trim()).filter(Boolean).forEach(v => encontrados.push(v));
      }
    });
    return [...new Set(encontrados)];
  }

  function montarEndereco(campos) {
    const base = campos.endereco || [campos.logradouro, campos.numero].filter(Boolean).join(', ');
    const localidade = [campos.bairro, campos.cidade, campos.estado, campos.cep].filter(Boolean).join(', ');
    return [base, localidade].filter(Boolean).join(' - ').replace(/\s+/g, ' ').trim();
  }

  function linhaVazia(row) {
    return !row.some(cell => String(cell ?? '').trim());
  }

  function hashLinha(row, index) {
    let h = 2166136261;
    const texto = `${index}|${row.map(v => String(v ?? '')).join('|')}`;
    for (let i = 0; i < texto.length; i++) {
      h ^= texto.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16);
  }

  function converterLinhas(matriz, nomeArquivo) {
    const rows = Array.isArray(matriz) ? matriz : [];
    if (!rows.length) throw new Error('A planilha está vazia.');

    const headerIndex = rows.findIndex(row => !linhaVazia(row));
    if (headerIndex < 0) throw new Error('A planilha não possui dados.');
    const headers = rows[headerIndex].map(v => String(v ?? '').trim());
    const columns = identificarColunas(headers);

    if (columns.endereco == null && columns.logradouro == null) {
      throw new Error('Não encontrei uma coluna de endereço/logradouro na planilha.');
    }

    const paradas = [];
    const erros = [];
    const porIdExplicito = new Map();
    for (let i = headerIndex + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || linhaVazia(row)) continue;

      const campos = {
        endereco: valor(row, columns, 'endereco'),
        logradouro: valor(row, columns, 'logradouro'),
        numero: valor(row, columns, 'numero'),
        complemento: valor(row, columns, 'complemento'),
        apartamento: valor(row, columns, 'apartamento'),
        bloco: valor(row, columns, 'bloco'),
        sala: valor(row, columns, 'sala'),
        loja: valor(row, columns, 'loja'),
        bairro: valor(row, columns, 'bairro'),
        cidade: valor(row, columns, 'cidade'),
        estado: valor(row, columns, 'estado'),
        cep: valor(row, columns, 'cep'),
        observacao: valor(row, columns, 'observacao')
      };
      const enderecoOriginal = montarEndereco(campos);
      if (!enderecoOriginal) {
        erros.push({ linha: i + 1, motivo: 'Endereço vazio' });
        continue;
      }

      const pacotes = extrairPacotes(row, columns);
      const idPlanilha = valor(row, columns, 'id');
      const idBase = idPlanilha ? `xlsx-${idPlanilha.replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 80)}` : `xlsx-${hashLinha(row, i)}`;

      // Um ID de parada explicitamente repetido é a única situação em que o importador
      // agrega linhas automaticamente. Sem ID explícito, cada linha continua sendo uma parada.
      if (idPlanilha && porIdExplicito.has(idBase)) {
        const existente = porIdExplicito.get(idBase);
        if (normalizarCabecalho(existente.enderecoOriginal) === normalizarCabecalho(enderecoOriginal)) {
          existente.pacotes = [...new Set([...(existente.pacotes || []), ...pacotes])];
          existente.quantidadePacotes = existente.pacotes.length;
          if (campos.observacao && !String(existente.observacao || '').includes(campos.observacao)) {
            existente.observacao = [existente.observacao, campos.observacao].filter(Boolean).join(' | ');
          }
          if (!Array.isArray(existente.fonte.linhas)) existente.fonte.linhas = [existente.fonte.linha];
          existente.fonte.linhas.push(i + 1);
          continue;
        }
        erros.push({ linha: i + 1, motivo: `ID de parada repetido com endereço diferente: ${idPlanilha}` });
      }

      const parada = {
        id: idPlanilha && porIdExplicito.has(idBase) ? `${idBase}-linha-${i + 1}` : idBase,
        ordemOriginal: paradas.length + 1,
        ordemOtimizada: null,
        enderecoOriginal,
        enderecoNormalizado: '',
        logradouro: campos.logradouro || campos.endereco,
        numero: campos.numero,
        complemento: campos.complemento,
        apartamento: campos.apartamento,
        bloco: campos.bloco,
        sala: campos.sala,
        loja: campos.loja,
        bairro: campos.bairro,
        cidade: campos.cidade,
        estado: campos.estado,
        cep: campos.cep,
        observacao: campos.observacao,
        pacotes,
        quantidadePacotes: pacotes.length,
        quantidadeBipada: 0,
        statusEntrega: 'pendente',
        statusGeocodificacao: 'pendente',
        latitude: null,
        longitude: null,
        origem: 'xlsx',
        fonte: { arquivo: nomeArquivo || '', linha: i + 1 }
      };
      paradas.push(parada);
      if (idPlanilha && !porIdExplicito.has(idBase)) porIdExplicito.set(idBase, parada);
    }

    if (!paradas.length) throw new Error('Nenhuma parada válida foi encontrada na planilha.');
    return { paradas, erros, headers, columns };
  }

  async function lerArquivo(file) {
    if (!global.XLSX) throw new Error('Biblioteca XLSX não carregada.');
    if (!file) throw new Error('Arquivo não informado.');
    const nome = String(file.name || '').toLowerCase();
    if (!/\.(xlsx|xls|csv)$/.test(nome)) throw new Error('Use um arquivo XLSX, XLS ou CSV.');

    const buffer = await file.arrayBuffer();
    const workbook = global.XLSX.read(buffer, { type: 'array', cellDates: false, raw: false });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error('A planilha não possui abas.');
    const sheet = workbook.Sheets[sheetName];
    const matrix = global.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false, raw: false });
    const resultado = converterLinhas(matrix, file.name);
    resultado.sheetName = sheetName;
    resultado.nomeArquivo = file.name;
    return resultado;
  }

  global.PacoteEMatoImportacaoXLSX = Object.freeze({
    lerArquivo,
    converterLinhas,
    identificarColunas,
    montarEndereco
  });
})(window);
