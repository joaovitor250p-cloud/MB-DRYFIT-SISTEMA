(function iniciarConfiguracoes(global) {
  'use strict';

  const KEY = 'pemato_config_v2';
  const DEFAULTS = {
    navegacao: 'pacote_emato',
    veiculo: 'carro',
    tempoParadaSegundos: 180,
    pontoInicial: null
  };

  function obter() {
    try {
      const salvo = JSON.parse(localStorage.getItem(KEY) || '{}');
      return Object.assign({}, DEFAULTS, salvo && typeof salvo === 'object' ? salvo : {});
    } catch (_) { return Object.assign({}, DEFAULTS); }
  }

  function salvar(parcial) {
    const cfg = Object.assign(obter(), parcial || {});
    try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (_) {}
    renderizar();
    try { global.dispatchEvent(new CustomEvent('pemato:config:update', { detail: cfg })); } catch (_) {}
    return cfg;
  }

  function renderizar() {
    const cfg = obter();
    const nav = document.getElementById('settingsNavigation');
    const veiculo = document.getElementById('settingsVehicle');
    const tempo = document.getElementById('settingsStopMinutes');
    if (nav) nav.value = cfg.navegacao;
    if (veiculo) veiculo.value = cfg.veiculo;
    if (tempo) tempo.value = String(Math.round(Number(cfg.tempoParadaSegundos || 180) / 60));
    const point = document.getElementById('settingsStartPoint');
    if (point) point.value = cfg.pontoInicial?.descricao || '';
  }

  function bind() {
    document.getElementById('settingsSaveBtn')?.addEventListener('click', () => {
      const navegacao = document.getElementById('settingsNavigation')?.value || 'pacote_emato';
      const veiculo = document.getElementById('settingsVehicle')?.value || 'carro';
      const tempoParadaSegundos = Math.max(0, Number(document.getElementById('settingsStopMinutes')?.value || 3) * 60);
      const current = obter();
      salvar({ navegacao, veiculo, tempoParadaSegundos, pontoInicial: current.pontoInicial });
      if (typeof global.notificar === 'function') global.notificar('Configurações salvas.');
    });
    renderizar();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();

  global.PacoteEMatoConfiguracoes = Object.freeze({ obter, salvar, renderizar });
})(window);
