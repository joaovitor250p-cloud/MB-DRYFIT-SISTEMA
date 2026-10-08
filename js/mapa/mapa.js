(function iniciarMapaPacoteEMato(global) {
  'use strict';

  let mapa = null;
  let mapaPronto = false;
  let falhaMapa = false;
  let marcadores = new Map();
  let rotaAtualAssinatura = '';
  let ajusteInicialFeito = false;

  function state() {
    return global.appState?.roteirizacao || null;
  }

  function getParadas() {
    return Array.isArray(state()?.paradas) ? state().paradas : [];
  }

  function statusEntrega(parada) {
    const total = Number(parada.quantidadePacotes || parada.pacotes?.length || 0);
    const bipados = Number(parada.quantidadeBipada || 0);
    if (total > 0 && bipados >= total) return 'concluida';
    if (bipados > 0) return 'parcial';
    return 'pendente';
  }

  function textoGeo(parada) {
    switch (parada.statusGeocodificacao) {
      case 'ok': return 'Localizada';
      case 'consultando': return 'Localizando…';
      case 'ambiguo': return 'Endereço ambíguo';
      case 'nao_encontrado': return 'Endereço não localizado';
      case 'nao_configurado': return 'Geocodificação não configurada';
      case 'erro': return 'Falha ao localizar';
      default: return 'Aguardando localização';
    }
  }

  function coordenadaValida(parada) {
    return parada && parada.statusGeocodificacao === 'ok' &&
      Number.isFinite(Number(parada.latitude)) && Number.isFinite(Number(parada.longitude));
  }

  function assinaturaRota(paradas) {
    return paradas.map(p => p.id).join('|');
  }

  function mostrarFallback(mensagem) {
    falhaMapa = true;
    if (global.appState?.roteirizacao) global.appState.roteirizacao.mapaDisponivel = false;
    const box = document.getElementById('mapaFallback');
    const mapEl = document.getElementById('mapaRota');
    if (mapEl) mapEl.style.visibility = 'hidden';
    if (box) {
      box.style.display = 'flex';
      box.textContent = mensagem || 'Mapa indisponível. A lista, a bipagem e a rota continuam funcionando.';
    }
  }

  function ocultarFallback() {
    const box = document.getElementById('mapaFallback');
    const mapEl = document.getElementById('mapaRota');
    if (box) box.style.display = 'none';
    if (mapEl) mapEl.style.visibility = 'visible';
  }

  function garantirMapa() {
    if (mapa || falhaMapa) {
      try { mapa?.resize(); } catch (_) {}
      return mapa;
    }

    const container = document.getElementById('mapaRota');
    if (!container) return null;

    if (!global.maplibregl || typeof global.maplibregl.Map !== 'function') {
      mostrarFallback('Mapa indisponível neste dispositivo. A lista e a bipagem continuam funcionando.');
      return null;
    }

    try {
      const cfg = global.PEMATO_MAP_CONFIG || {};
      mapa = new global.maplibregl.Map({
        container,
        style: cfg.mapStyleUrl,
        center: cfg.initialCenter || [-51.9253, -14.2350],
        zoom: Number(cfg.initialZoom || 3.4),
        attributionControl: true
      });

      mapa.addControl(new global.maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      mapa.addControl(new global.maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true,
        fitBoundsOptions: { maxZoom: 15 }
      }), 'top-right');

      const loadGuard = setTimeout(() => {
        if (!mapaPronto) mostrarFallback('O mapa demorou para responder. A lista, a bipagem e a rota continuam funcionando.');
      }, 10000);

      mapa.on('load', () => {
        clearTimeout(loadGuard);
        mapaPronto = true;
        falhaMapa = false;
        if (global.appState?.roteirizacao) global.appState.roteirizacao.mapaDisponivel = true;
        ocultarFallback();
        renderizarMarcadores();
        if (!ajusteInicialFeito) ajustarTodos();
      });

      mapa.on('error', (event) => {
        const mensagem = String(event?.error?.message || '');
        if (!mapaPronto && mensagem) {
          console.warn('Pacote É Mato: falha no mapa:', mensagem);
        }
      });
    } catch (erro) {
      console.error('Pacote É Mato: não foi possível iniciar o mapa.', erro);
      mostrarFallback('Não foi possível abrir o mapa. A rota continua disponível na lista e no scanner.');
      mapa = null;
    }

    return mapa;
  }

  function criarElementoMarcador(parada) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'pemato-stop-marker';
    el.setAttribute('aria-label', `Parada ${parada.ordemOriginal || ''} - ${parada.enderecoOriginal || ''}`);

    const numero = document.createElement('span');
    numero.className = 'pemato-stop-marker-number';
    numero.textContent = String(parada.ordemOriginal || '•');

    const qtd = document.createElement('span');
    qtd.className = 'pemato-stop-marker-packages';
    qtd.textContent = String(parada.quantidadePacotes || 0);

    el.append(numero, qtd);
    el.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      selecionarParada(parada.id, 'mapa');
    });
    return el;
  }

  function aplicarClasseMarcador(el, parada) {
    if (!el) return;
    const status = statusEntrega(parada);
    el.classList.toggle('is-pendente', status === 'pendente');
    el.classList.toggle('is-parcial', status === 'parcial');
    el.classList.toggle('is-concluida', status === 'concluida');
    el.classList.toggle('is-selected', state()?.paradaSelecionadaId === parada.id);
    const badge = el.querySelector('.pemato-stop-marker-packages');
    if (badge) badge.textContent = String(parada.quantidadePacotes || 0);
    const number = el.querySelector('.pemato-stop-marker-number');
    if (number) number.textContent = String(parada.ordemOriginal || '•');
  }

  function renderizarMarcadores() {
    const paradas = getParadas();
    if (!mapa || !mapaPronto) return;

    const idsAtuais = new Set(paradas.filter(coordenadaValida).map(p => p.id));
    for (const [id, item] of marcadores.entries()) {
      if (!idsAtuais.has(id)) {
        try { item.marker.remove(); } catch (_) {}
        marcadores.delete(id);
      }
    }

    paradas.forEach(parada => {
      if (!coordenadaValida(parada)) return;

      let item = marcadores.get(parada.id);
      if (!item) {
        const element = criarElementoMarcador(parada);
        const marker = new global.maplibregl.Marker({ element, anchor: 'center' })
          .setLngLat([Number(parada.longitude), Number(parada.latitude)])
          .addTo(mapa);
        item = { marker, element };
        marcadores.set(parada.id, item);
      } else {
        item.marker.setLngLat([Number(parada.longitude), Number(parada.latitude)]);
      }

      aplicarClasseMarcador(item.element, parada);
    });
  }

  function criarBadge(texto, classe) {
    const span = document.createElement('span');
    span.className = `route-stop-badge ${classe || ''}`.trim();
    span.textContent = texto;
    return span;
  }

  function renderizarLista() {
    const container = document.getElementById('listaParadasMapa');
    const resumo = document.getElementById('routeStopsSummary');
    if (!container) return;

    const paradas = getParadas();
    container.replaceChildren();

    const concluidas = paradas.filter(p => statusEntrega(p) === 'concluida').length;
    if (resumo) resumo.textContent = `${concluidas} de ${paradas.length} concluídas`;

    if (!paradas.length) {
      const vazio = document.createElement('div');
      vazio.className = 'route-stops-empty';
      vazio.textContent = 'Carregue uma rota para visualizar as paradas.';
      container.appendChild(vazio);
      return;
    }

    paradas.forEach(parada => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `route-stop-card is-${statusEntrega(parada)}`;
      card.dataset.stopId = parada.id;
      card.classList.toggle('is-selected', state()?.paradaSelecionadaId === parada.id);

      const ordem = document.createElement('span');
      ordem.className = 'route-stop-order';
      ordem.textContent = String(parada.ordemOriginal || '•').padStart(2, '0');

      const corpo = document.createElement('span');
      corpo.className = 'route-stop-content';

      const endereco = document.createElement('strong');
      endereco.className = 'route-stop-address';
      endereco.textContent = parada.enderecoOriginal || 'Endereço não identificado';

      const meta = document.createElement('span');
      meta.className = 'route-stop-meta';
      meta.appendChild(criarBadge(
        `${parada.quantidadeBipada || 0}/${parada.quantidadePacotes || 0} pacotes`,
        'is-packages'
      ));
      meta.appendChild(criarBadge(textoGeo(parada), `is-geo-${parada.statusGeocodificacao || 'pendente'}`));

      corpo.append(endereco, meta);
      card.append(ordem, corpo);
      card.addEventListener('click', () => selecionarParada(parada.id, 'lista'));
      container.appendChild(card);
    });
  }

  function atualizarFicha(parada) {
    const sheet = document.getElementById('mapaSelectedSheet');
    if (!sheet) return;

    sheet.replaceChildren();
    if (!parada) {
      sheet.style.display = 'none';
      return;
    }

    sheet.style.display = 'block';
    const top = document.createElement('div');
    top.className = 'map-sheet-top';

    const titulo = document.createElement('div');
    const eyebrow = document.createElement('span');
    eyebrow.className = 'map-sheet-eyebrow';
    eyebrow.textContent = `PARADA ${parada.ordemOriginal || ''}`;
    const address = document.createElement('strong');
    address.textContent = parada.enderecoOriginal || 'Endereço não identificado';
    titulo.append(eyebrow, address);

    const status = document.createElement('span');
    status.className = `map-sheet-status is-${statusEntrega(parada)}`;
    status.textContent = statusEntrega(parada) === 'concluida'
      ? 'Concluída'
      : (statusEntrega(parada) === 'parcial' ? 'Parcial' : 'Pendente');

    top.append(titulo, status);

    const info = document.createElement('div');
    info.className = 'map-sheet-info';
    const stops = Array.isArray(parada.stopsRelacionados) && parada.stopsRelacionados.length
      ? `Circuit: ${parada.stopsRelacionados.map(n => 'P' + n).join(', ')}`
      : '';
    info.textContent = `${parada.quantidadeBipada || 0} de ${parada.quantidadePacotes || 0} pacotes${stops ? ' • ' + stops : ''}`;

    const geo = document.createElement('div');
    geo.className = 'map-sheet-geo';
    geo.textContent = textoGeo(parada);

    const actions = document.createElement('div');
    actions.className = 'map-sheet-actions';

    const navegar = document.createElement('button');
    navegar.type = 'button';
    navegar.className = 'map-sheet-action-primary';
    navegar.textContent = 'Abrir navegação';
    navegar.addEventListener('click', () => {
      if (typeof global.perguntarGps === 'function') {
        global.perguntarGps(parada.enderecoOriginal || '');
      }
    });

    const todas = document.createElement('button');
    todas.type = 'button';
    todas.className = 'map-sheet-action-secondary';
    todas.textContent = 'Ver todas';
    todas.addEventListener('click', ajustarTodos);

    actions.append(navegar, todas);
    sheet.append(top, info, geo, actions);
  }

  function selecionarParada(id, origem) {
    const r = state();
    if (!r) return;
    const parada = getParadas().find(p => p.id === id);
    if (!parada) return;

    r.paradaSelecionadaId = id;
    renderizarLista();
    renderizarMarcadores();
    atualizarFicha(parada);

    const card = document.querySelector(`.route-stop-card[data-stop-id="${id}"]`);
    if (card && origem === 'mapa') {
      try { card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (_) {}
    }

    if (coordenadaValida(parada) && mapa) {
      try {
        mapa.easeTo({
          center: [Number(parada.longitude), Number(parada.latitude)],
          zoom: Math.max(Number(mapa.getZoom?.() || 0), 16),
          duration: 550
        });
      } catch (_) {}
    }

    try {
      global.dispatchEvent(new CustomEvent('pemato:parada-selecionada', { detail: { id, origem } }));
    } catch (_) {}
  }

  function ajustarTodos() {
    if (!mapa || !mapaPronto) return;
    const localizadas = getParadas().filter(coordenadaValida);
    if (!localizadas.length) return;

    try {
      const bounds = new global.maplibregl.LngLatBounds();
      localizadas.forEach(p => bounds.extend([Number(p.longitude), Number(p.latitude)]));
      mapa.fitBounds(bounds, {
        padding: { top: 70, right: 50, bottom: 90, left: 50 },
        maxZoom: 16,
        duration: 650
      });
      ajusteInicialFeito = true;
    } catch (_) {}
  }

  function atualizarCabecalhoGeo() {
    const el = document.getElementById('routeGeoStatus');
    if (!el) return;
    const paradas = getParadas();
    const ok = paradas.filter(coordenadaValida).length;
    const consultando = paradas.filter(p => p.statusGeocodificacao === 'consultando').length;
    const problemas = paradas.filter(p => ['ambiguo', 'nao_encontrado', 'erro'].includes(p.statusGeocodificacao)).length;
    const naoConfigurado = paradas.some(p => p.statusGeocodificacao === 'nao_configurado');

    if (naoConfigurado) {
      el.textContent = 'Mapa pronto • geocodificação aguardando Worker';
      el.className = 'route-geo-status is-warning';
    } else if (consultando) {
      el.textContent = `Localizando paradas… ${ok}/${paradas.length}`;
      el.className = 'route-geo-status is-loading';
    } else if (paradas.length && ok === paradas.length) {
      el.textContent = `${ok}/${paradas.length} paradas localizadas`;
      el.className = 'route-geo-status is-ok';
    } else if (paradas.length) {
      el.textContent = `${ok}/${paradas.length} localizadas${problemas ? ` • ${problemas} revisar` : ''}`;
      el.className = problemas ? 'route-geo-status is-warning' : 'route-geo-status';
    } else {
      el.textContent = 'Aguardando rota';
      el.className = 'route-geo-status';
    }
  }

  function renderizarTudo(opcoes) {
    const paradas = getParadas();
    const assinatura = assinaturaRota(paradas);
    if (assinatura !== rotaAtualAssinatura) {
      rotaAtualAssinatura = assinatura;
      ajusteInicialFeito = false;
      const r = state();
      if (r && (!r.paradaSelecionadaId || !paradas.some(p => p.id === r.paradaSelecionadaId))) {
        const primeiraPendente = paradas.find(p => statusEntrega(p) !== 'concluida') || paradas[0] || null;
        r.paradaSelecionadaId = primeiraPendente?.id || null;
      }
    }

    renderizarLista();
    atualizarCabecalhoGeo();
    garantirMapa();
    renderizarMarcadores();

    const selecionada = paradas.find(p => p.id === state()?.paradaSelecionadaId) || null;
    atualizarFicha(selecionada);

    if (opcoes?.fit === true && mapaPronto) ajustarTodos();
    else if (mapa) setTimeout(() => { try { mapa.resize(); } catch (_) {} }, 0);
  }

  function alternarPainel(tipo) {
    const workspace = document.getElementById('routeWorkspace');
    if (!workspace) return;
    const mapaBtn = document.getElementById('routeTabMapa');
    const listaBtn = document.getElementById('routeTabParadas');
    const modo = tipo === 'lista' ? 'lista' : 'mapa';
    workspace.classList.toggle('view-mapa', modo === 'mapa');
    workspace.classList.toggle('view-paradas', modo === 'lista');
    mapaBtn?.classList.toggle('active', modo === 'mapa');
    listaBtn?.classList.toggle('active', modo === 'lista');
    if (modo === 'mapa') setTimeout(() => { try { mapa?.resize(); } catch (_) {} }, 80);
  }

  global.addEventListener('pemato:geo:update', () => renderizarTudo());
  global.addEventListener('pemato:geo:complete', () => renderizarTudo({ fit: true }));

  global.PacoteEMatoMapa = Object.freeze({
    garantirMapa,
    renderizar: renderizarTudo,
    renderizarLista,
    renderizarMarcadores,
    selecionarParada,
    alternarPainel,
    ajustarTodos
  });
})(window);
