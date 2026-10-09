(function iniciarMapaRoteirizacao(global) {
  'use strict';

  let mapa = null;
  let pronto = false;
  let marcadores = new Map();
  let marcadorPartida = null;
  let fitFeito = false;
  const SOURCE_ROUTE = 'pemato-route-line';
  const LAYER_ROUTE = 'pemato-route-line-layer';

  function cfg() { return global.PEMATO_MAP_CONFIG || {}; }
  function state() { return global.appState?.roteirizacao || null; }
  function paradas() { return Array.isArray(state()?.paradas) ? state().paradas : []; }

  function coordenadaValida(p) {
    return Number.isFinite(Number(p?.latitude)) && Number.isFinite(Number(p?.longitude));
  }

  function ordem(p) {
    return Number(p?.ordemOtimizada || p?.ordemOriginal || 0) || '';
  }

  function statusEntrega(p) {
    if (p?.statusEntrega === 'nao_entregue') return 'nao-entregue';
    if (['entregue', 'concluida'].includes(p?.statusEntrega)) return 'concluida';
    if (Number(p?.quantidadeBipada || 0) > 0) return 'parcial';
    return 'pendente';
  }

  function mostrarFallback(texto) {
    const el = document.getElementById('mapaRoteirizacaoFallback');
    if (!el) return;
    el.textContent = texto || 'Mapa indisponível.';
    el.style.display = 'flex';
    if (state()) state().mapaDisponivel = false;
  }

  function ocultarFallback() {
    const el = document.getElementById('mapaRoteirizacaoFallback');
    if (el) el.style.display = 'none';
  }

  function garantirMapa() {
    if (mapa) return mapa;
    const container = document.getElementById('mapaRoteirizacao');
    if (!container) return null;
    if (!global.maplibregl) {
      mostrarFallback('A biblioteca do mapa não carregou. A lista de paradas continua disponível.');
      return null;
    }

    try {
      mapa = new global.maplibregl.Map({
        container,
        style: cfg().mapStyleUrl,
        center: cfg().initialCenter || [-51.9253, -14.2350],
        zoom: Number(cfg().initialZoom || 3.4),
        pitch: 0,
        bearing: 0,
        maxPitch: 0,
        dragRotate: false,
        touchPitch: false,
        attributionControl: true
      });
      mapa.touchZoomRotate.disableRotation();
      mapa.addControl(new global.maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      mapa.addControl(new global.maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: false,
        fitBoundsOptions: { maxZoom: 16 }
      }), 'top-right');

      mapa.on('load', () => {
        pronto = true;
        if (state()) state().mapaDisponivel = true;
        ocultarFallback();
        garantirCamadaRota();
        renderizar({ fit: !fitFeito });
      });
      mapa.on('error', event => {
        if (!pronto) console.warn('Pacote É Mato: mapa não carregou.', event?.error?.message || event?.error || '');
      });
    } catch (erro) {
      console.error('Pacote É Mato: erro ao iniciar mapa.', erro);
      mapa = null;
      mostrarFallback('Não foi possível abrir o mapa. A roteirização continua disponível pela lista.');
    }
    return mapa;
  }

  function garantirCamadaRota() {
    if (!mapa || !pronto) return;
    if (!mapa.getSource(SOURCE_ROUTE)) {
      mapa.addSource(SOURCE_ROUTE, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
    }
    if (!mapa.getLayer(LAYER_ROUTE)) {
      mapa.addLayer({
        id: LAYER_ROUTE,
        type: 'line',
        source: SOURCE_ROUTE,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#059669',
          'line-width': 5,
          'line-opacity': 0.88
        }
      });
    }
  }

  function atualizarRota() {
    if (!mapa || !pronto) return;
    garantirCamadaRota();
    const geometry = state()?.geometria;
    const source = mapa.getSource(SOURCE_ROUTE);
    if (!source) return;
    const feature = geometry ? { type: 'Feature', properties: {}, geometry } : null;
    source.setData({ type: 'FeatureCollection', features: feature ? [feature] : [] });
  }

  function criarMarcador(p) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'pemato-stop-marker';
    el.dataset.stopId = p.id;
    el.setAttribute('aria-label', `Parada ${ordem(p)}. ${p.enderecoOriginal || 'Endereço'}`);

    const numero = document.createElement('span');
    numero.className = 'pemato-stop-marker-number';
    numero.textContent = String(ordem(p) || '');
    const qtd = document.createElement('span');
    qtd.className = 'pemato-stop-marker-packages';
    qtd.textContent = String(Number(p.quantidadePacotes || p.pacotes?.length || 0));
    el.append(numero, qtd);
    el.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      global.PacoteEMatoRoteirizacao?.selecionarParada?.(p.id, 'mapa');
    });
    return el;
  }

  function atualizarClasse(el, p) {
    if (!el) return;
    ['is-pendente', 'is-parcial', 'is-concluida', 'is-nao-entregue', 'is-selected'].forEach(c => el.classList.remove(c));
    el.classList.add(`is-${statusEntrega(p)}`);
    if (state()?.paradaSelecionadaId === p.id) el.classList.add('is-selected');
    const n = el.querySelector('.pemato-stop-marker-number');
    if (n) n.textContent = String(ordem(p) || '');
    const q = el.querySelector('.pemato-stop-marker-packages');
    if (q) q.textContent = String(Number(p.quantidadePacotes || p.pacotes?.length || 0));
  }

  function renderizarPartida() {
    if (!mapa || !pronto) return;
    const start = state()?.pontoInicial;
    const valida = Number.isFinite(Number(start?.lat)) && Number.isFinite(Number(start?.lon));
    if (!valida) {
      if (marcadorPartida) { try { marcadorPartida.remove(); } catch (_) {} marcadorPartida = null; }
      return;
    }
    if (!marcadorPartida) {
      const el = document.createElement('div');
      el.className = 'pemato-start-marker';
      el.textContent = 'P';
      el.setAttribute('aria-label', 'Ponto de partida');
      marcadorPartida = new global.maplibregl.Marker({ element: el, anchor: 'center' }).addTo(mapa);
    }
    marcadorPartida.setLngLat([Number(start.lon), Number(start.lat)]);
  }

  function renderizarMarcadores() {
    if (!mapa || !pronto) return;
    const validas = paradas().filter(coordenadaValida);
    const ids = new Set(validas.map(p => p.id));
    for (const [id, item] of marcadores.entries()) {
      if (!ids.has(id)) {
        try { item.marker.remove(); } catch (_) {}
        marcadores.delete(id);
      }
    }
    validas.forEach(p => {
      let item = marcadores.get(p.id);
      if (!item) {
        const element = criarMarcador(p);
        const marker = new global.maplibregl.Marker({ element, anchor: 'center' })
          .setLngLat([Number(p.longitude), Number(p.latitude)])
          .addTo(mapa);
        item = { marker, element };
        marcadores.set(p.id, item);
      } else {
        item.marker.setLngLat([Number(p.longitude), Number(p.latitude)]);
      }
      atualizarClasse(item.element, p);
    });
  }

  function ajustarTodos() {
    if (!mapa || !pronto) return;
    const validas = paradas().filter(coordenadaValida);
    const start = state()?.pontoInicial;
    if (!validas.length && !(Number.isFinite(Number(start?.lat)) && Number.isFinite(Number(start?.lon)))) return;
    const bounds = new global.maplibregl.LngLatBounds();
    validas.forEach(p => bounds.extend([Number(p.longitude), Number(p.latitude)]));
    if (Number.isFinite(Number(start?.lat)) && Number.isFinite(Number(start?.lon))) bounds.extend([Number(start.lon), Number(start.lat)]);
    try {
      mapa.fitBounds(bounds, { padding: { top: 70, right: 55, bottom: 80, left: 55 }, maxZoom: 16, duration: 550 });
      fitFeito = true;
    } catch (_) {}
  }

  function centralizarParada(id) {
    if (!mapa || !pronto) return;
    const p = paradas().find(item => item.id === id);
    if (!coordenadaValida(p)) return;
    try { mapa.easeTo({ center: [Number(p.longitude), Number(p.latitude)], zoom: Math.max(mapa.getZoom(), 16), duration: 450 }); }
    catch (_) {}
  }

  function renderizar(opcoes) {
    garantirMapa();
    if (!mapa || !pronto) return;
    try { mapa.resize(); } catch (_) {}
    renderizarMarcadores();
    renderizarPartida();
    atualizarRota();
    if (opcoes?.fit) ajustarTodos();
  }

  function destruir() {
    marcadores.forEach(item => { try { item.marker.remove(); } catch (_) {} });
    marcadores.clear();
    if (marcadorPartida) { try { marcadorPartida.remove(); } catch (_) {} marcadorPartida = null; }
    if (mapa) { try { mapa.remove(); } catch (_) {} }
    mapa = null;
    pronto = false;
    fitFeito = false;
  }

  global.PacoteEMatoMapa = Object.freeze({
    garantirMapa,
    renderizar,
    renderizarMarcadores,
    atualizarRota,
    ajustarTodos,
    centralizarParada,
    destruir,
    coordenadaValida
  });
})(window);
