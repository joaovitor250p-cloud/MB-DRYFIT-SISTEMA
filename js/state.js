(function iniciarEstadoCentral(global) {
  'use strict';

  const LEGACY_KEYS = [
    'mapaRotas',
    'stopCorrespondente',
    'nomeExibicao',
    'todosPacotes',
    'pacotesBipados',
    'chaveStorageAtual',
    'enderecoSelecionadoGps',
    'filtroAtualModal',
    'rotaInicioEm',
    'resumoFinalJaExibido'
  ];

  const state = global.appState && typeof global.appState === 'object'
    ? global.appState
    : {};

  function valorInicial(chave) {
    switch (chave) {
      case 'mapaRotas':
      case 'stopCorrespondente':
      case 'nomeExibicao':
        return {};
      case 'todosPacotes':
      case 'pacotesBipados':
        return new Set();
      case 'chaveStorageAtual':
        return null;
      case 'enderecoSelecionadoGps':
        return '';
      case 'filtroAtualModal':
        return 'todos';
      case 'rotaInicioEm':
        return 0;
      case 'resumoFinalJaExibido':
        return false;
      default:
        return undefined;
    }
  }

  LEGACY_KEYS.forEach((chave) => {
    if (!(chave in state)) {
      state[chave] = valorInicial(chave);
    }
  });

  if (!state.roteirizacao || typeof state.roteirizacao !== 'object') {
    state.roteirizacao = {};
  }

  const roteirizacaoPadrao = {
    pontoInicial: null,
    paradas: [],
    ordem: [],
    paradasTravadas: [],
    retornarAoInicio: false,
    geometria: null,
    distanciaTotalMetros: null,
    duracaoTotalSegundos: null,
    calculadoEm: null,
    paradaSelecionadaId: null,
    mapaDisponivel: null,
    geocodificacaoResumo: null
  };

  Object.keys(roteirizacaoPadrao).forEach((chave) => {
    if (!(chave in state.roteirizacao)) {
      const valor = roteirizacaoPadrao[chave];
      state.roteirizacao[chave] = Array.isArray(valor) ? valor.slice() : valor;
    }
  });

  if (!state.navegacao || typeof state.navegacao !== 'object') {
    state.navegacao = {
      ativa: false,
      paradaAtualId: null,
      proximaParadaId: null,
      iniciadaEm: null,
      ultimaPosicao: null
    };
  }

  function resetarRotaLegada() {
    state.mapaRotas = {};
    state.stopCorrespondente = {};
    state.nomeExibicao = {};
    state.todosPacotes = new Set();
    state.pacotesBipados = new Set();
    state.chaveStorageAtual = null;
    state.enderecoSelecionadoGps = '';
    state.filtroAtualModal = 'todos';
    state.rotaInicioEm = 0;
    state.resumoFinalJaExibido = false;
    return state;
  }

  function resetarRoteirizacao() {
    state.roteirizacao.pontoInicial = null;
    state.roteirizacao.paradas = [];
    state.roteirizacao.ordem = [];
    state.roteirizacao.paradasTravadas = [];
    state.roteirizacao.retornarAoInicio = false;
    state.roteirizacao.geometria = null;
    state.roteirizacao.distanciaTotalMetros = null;
    state.roteirizacao.duracaoTotalSegundos = null;
    state.roteirizacao.calculadoEm = null;
    state.roteirizacao.paradaSelecionadaId = null;
    state.roteirizacao.mapaDisponivel = null;
    state.roteirizacao.geocodificacaoResumo = null;

    state.navegacao.ativa = false;
    state.navegacao.paradaAtualId = null;
    state.navegacao.proximaParadaId = null;
    state.navegacao.iniciadaEm = null;
    state.navegacao.ultimaPosicao = null;
    return state;
  }

  function snapshotLegado() {
    return {
      mapaRotas: state.mapaRotas,
      stopCorrespondente: state.stopCorrespondente,
      nomeExibicao: state.nomeExibicao,
      todosPacotes: Array.from(state.todosPacotes || []),
      pacotesBipados: Array.from(state.pacotesBipados || []),
      chaveStorageAtual: state.chaveStorageAtual,
      enderecoSelecionadoGps: state.enderecoSelecionadoGps,
      filtroAtualModal: state.filtroAtualModal,
      rotaInicioEm: state.rotaInicioEm,
      resumoFinalJaExibido: state.resumoFinalJaExibido
    };
  }

  function restaurarLegado(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') {
      return state;
    }

    state.mapaRotas = snapshot.mapaRotas || {};
    state.stopCorrespondente = snapshot.stopCorrespondente || {};
    state.nomeExibicao = snapshot.nomeExibicao || {};
    state.todosPacotes = new Set(snapshot.todosPacotes || []);
    state.pacotesBipados = new Set(snapshot.pacotesBipados || []);
    state.chaveStorageAtual = snapshot.chaveStorageAtual ?? null;
    state.enderecoSelecionadoGps = snapshot.enderecoSelecionadoGps || '';
    state.filtroAtualModal = snapshot.filtroAtualModal || 'todos';
    state.rotaInicioEm = Number(snapshot.rotaInicioEm || 0);
    state.resumoFinalJaExibido = snapshot.resumoFinalJaExibido === true;
    return state;
  }

  LEGACY_KEYS.forEach((chave) => {
    const descritorExistente = Object.getOwnPropertyDescriptor(global, chave);

    if (descritorExistente && descritorExistente.configurable === false) {
      throw new Error(`Pacote É Mato: não foi possível vincular o estado global "${chave}".`);
    }

    Object.defineProperty(global, chave, {
      configurable: true,
      enumerable: true,
      get() {
        return state[chave];
      },
      set(valor) {
        state[chave] = valor;
      }
    });
  });

  global.appState = state;
  global.PacoteEMatoState = Object.freeze({
    getState() {
      return state;
    },
    resetarRotaLegada,
    resetarRoteirizacao,
    snapshotLegado,
    restaurarLegado
  });
})(window);
