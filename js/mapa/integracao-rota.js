(function integrarMapaComRotaExistente(global) {
  'use strict';

  let sincronizacaoAgendada = null;
  let wrappersInstalados = false;

  function hashTexto(texto) {
    let h = 0x811c9dc5;
    const s = String(texto || '');
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16).padStart(8, '0');
  }

  function numeroImovelDaChave(chave) {
    const m = String(chave || '').match(/_(\d+[a-z]?)(?:_s\d+)?$/i);
    return m ? m[1] : '';
  }

  function statusDaParada(pacotes) {
    const lista = Array.isArray(pacotes) ? pacotes : [];
    const bipados = lista.filter(codigo => global.pacotesBipados?.has(codigo)).length;
    return {
      quantidadeBipada: bipados,
      statusEntrega: lista.length > 0 && bipados >= lista.length
        ? 'concluida'
        : (bipados > 0 ? 'parcial' : 'pendente')
    };
  }

  function construirParadas() {
    const mapa = global.mapaRotas && typeof global.mapaRotas === 'object' ? global.mapaRotas : {};
    const nomes = global.nomeExibicao && typeof global.nomeExibicao === 'object' ? global.nomeExibicao : {};
    const stops = global.stopCorrespondente && typeof global.stopCorrespondente === 'object' ? global.stopCorrespondente : {};
    const anteriores = new Map(
      (Array.isArray(global.appState?.roteirizacao?.paradas) ? global.appState.roteirizacao.paradas : [])
        .map(p => [p.chaveFisica, p])
    );

    return Object.keys(mapa).map((chave, indice) => {
      const pacotes = Array.isArray(mapa[chave]) ? mapa[chave].slice() : [];
      const stopsRelacionados = [...new Set(
        pacotes
          .map(codigo => Number(stops[codigo]))
          .filter(Number.isFinite)
      )].sort((a, b) => a - b);

      const anterior = anteriores.get(chave) || {};
      const progresso = statusDaParada(pacotes);
      const ordemOriginal = stopsRelacionados.length ? stopsRelacionados[0] : (indice + 1);

      return {
        id: anterior.id || `parada-${hashTexto(chave)}`,
        chaveFisica: chave,
        ordemOriginal,
        ordemOtimizada: null,
        stopsRelacionados,
        enderecoOriginal: String(nomes[chave] || chave),
        enderecoNormalizado: chave,
        enderecoConsulta: anterior.enderecoConsulta || '',
        numeroImovel: numeroImovelDaChave(chave),
        pacotes,
        quantidadePacotes: pacotes.length,
        quantidadeBipada: progresso.quantidadeBipada,
        statusEntrega: progresso.statusEntrega,
        latitude: Number.isFinite(Number(anterior.latitude)) ? Number(anterior.latitude) : null,
        longitude: Number.isFinite(Number(anterior.longitude)) ? Number(anterior.longitude) : null,
        statusGeocodificacao: anterior.statusGeocodificacao || 'pendente',
        confiabilidade: anterior.confiabilidade ?? null,
        confiabilidadeRua: anterior.confiabilidadeRua ?? null,
        precisaoGeocodificacao: anterior.precisaoGeocodificacao || null,
        enderecoGeocodificado: anterior.enderecoGeocodificado || '',
        geocodificadoEm: anterior.geocodificadoEm || null,
        fonteCoordenada: anterior.fonteCoordenada || null,
        geocodificacao: anterior.geocodificacao || null,
        erroGeocodificacao: anterior.erroGeocodificacao || ''
      };
    }).sort((a, b) => a.ordemOriginal - b.ordemOriginal || a.enderecoOriginal.localeCompare(b.enderecoOriginal));
  }

  function garantirState() {
    if (!global.appState) return null;
    if (!global.appState.roteirizacao || typeof global.appState.roteirizacao !== 'object') {
      global.appState.roteirizacao = {};
    }
    const r = global.appState.roteirizacao;
    if (!Array.isArray(r.paradas)) r.paradas = [];
    if (!Array.isArray(r.ordem)) r.ordem = [];
    if (!('paradaSelecionadaId' in r)) r.paradaSelecionadaId = null;
    return r;
  }

  function exibirWorkspace(temRota) {
    const workspace = document.getElementById('routeWorkspace');
    if (!workspace) return;
    workspace.style.display = temRota ? 'block' : 'none';
  }

  function sincronizarRota(opcoes) {
    const r = garantirState();
    if (!r) return [];

    const paradas = construirParadas();
    r.paradas = paradas;
    r.ordem = paradas.map(p => p.id);
    r.geometria = null;
    r.distanciaTotalMetros = null;
    r.duracaoTotalSegundos = null;
    r.calculadoEm = null;

    if (!r.paradaSelecionadaId || !paradas.some(p => p.id === r.paradaSelecionadaId)) {
      r.paradaSelecionadaId = (paradas.find(p => p.statusEntrega !== 'concluida') || paradas[0] || {}).id || null;
    }

    exibirWorkspace(paradas.length > 0);
    global.PacoteEMatoMapa?.renderizar({ fit: opcoes?.fit === true });

    if (opcoes?.geocodificar === true && paradas.length && global.PacoteEMatoGeocodificacao) {
      global.PacoteEMatoGeocodificacao.cancelar();
      setTimeout(() => {
        global.PacoteEMatoGeocodificacao.geocodificarParadas(paradas)
          .catch(erro => console.warn('Pacote É Mato: geocodificação não concluída.', erro));
      }, 80);
    }

    return paradas;
  }

  function agendarSincronizacao(opcoes) {
    clearTimeout(sincronizacaoAgendada);
    sincronizacaoAgendada = setTimeout(() => sincronizarRota(opcoes || {}), 0);
  }

  function localizarParadaPorPacote(codigo) {
    const r = garantirState();
    if (!r || !codigo) return null;
    return r.paradas.find(p => Array.isArray(p.pacotes) && p.pacotes.includes(codigo)) || null;
  }

  function atualizarAposBipagem(codigoAntes, tamanhoAntes) {
    const r = garantirState();
    if (!r) return;

    const paradas = construirParadas();
    r.paradas = paradas;
    r.ordem = paradas.map(p => p.id);

    const tamanhoDepois = global.pacotesBipados?.size || 0;
    let codigoNovo = null;
    if (tamanhoDepois > tamanhoAntes) {
      for (const codigo of global.pacotesBipados || []) {
        if (!codigoAntes.has(codigo)) {
          codigoNovo = codigo;
          break;
        }
      }
    }

    if (codigoNovo) {
      const parada = localizarParadaPorPacote(codigoNovo);
      if (parada) r.paradaSelecionadaId = parada.id;
    }

    global.PacoteEMatoMapa?.renderizar();
  }

  function envolver(nome, depois) {
    const original = global[nome];
    if (typeof original !== 'function' || original.__pematoMapaWrapped) return;

    const wrapper = function(...args) {
      const retorno = original.apply(this, args);
      depois?.(args, retorno);
      return retorno;
    };
    wrapper.__pematoMapaWrapped = true;
    wrapper.__pematoOriginal = original;
    global[nome] = wrapper;
  }

  function instalarWrappers() {
    if (wrappersInstalados) return;
    wrappersInstalados = true;

    envolver('processarRegistrosCircuit', () => agendarSincronizacao({ geocodificar: true, fit: true }));
    envolver('processarLinhasExatas', () => agendarSincronizacao({ geocodificar: true, fit: true }));
    envolver('retomarRotaAnterior', () => agendarSincronizacao({ geocodificar: true, fit: true }));

    const processarOriginal = global.processarCodigo;
    if (typeof processarOriginal === 'function' && !processarOriginal.__pematoMapaWrapped) {
      const wrapperCodigo = function(...args) {
        const antes = new Set(global.pacotesBipados || []);
        const tamanhoAntes = antes.size;
        const retorno = processarOriginal.apply(this, args);
        setTimeout(() => atualizarAposBipagem(antes, tamanhoAntes), 0);
        return retorno;
      };
      wrapperCodigo.__pematoMapaWrapped = true;
      wrapperCodigo.__pematoOriginal = processarOriginal;
      global.processarCodigo = wrapperCodigo;
    }

    envolver('zerarRota', () => setTimeout(() => sincronizarRota({ geocodificar: false }), 0));
  }

  function iniciar() {
    instalarWrappers();
    const temRota = global.mapaRotas && Object.keys(global.mapaRotas).length > 0;
    if (temRota) sincronizarRota({ geocodificar: false });
    else exibirWorkspace(false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar, { once: true });
  } else {
    iniciar();
  }

  global.PacoteEMatoIntegracaoRota = Object.freeze({
    construirParadas,
    sincronizarRota,
    instalarWrappers
  });
})(window);
