(function configurarMapaPacoteEMato(global) {
  'use strict';

  const existente = global.PEMATO_MAP_CONFIG || {};
  let workerBase = '';
  try {
    workerBase = String(
      existente.workerBaseUrl ||
      localStorage.getItem('pemato_worker_base_url') ||
      ''
    ).trim().replace(/\/+$/, '');
  } catch (_) {
    workerBase = String(existente.workerBaseUrl || '').trim().replace(/\/+$/, '');
  }

  global.PEMATO_MAP_CONFIG = Object.assign({
    mapStyleUrl: 'https://tiles.openfreemap.org/styles/positron',
    workerBaseUrl: workerBase,
    geocodingEndpoint: workerBase ? workerBase + '/geocode' : '',
    optimizeEndpoint: workerBase ? workerBase + '/optimize' : '',
    routeEndpoint: workerBase ? workerBase + '/route' : '',
    geocodingProvider: 'geoapify-worker',
    geocodingRequestTimeoutMs: 12000,
    routingRequestTimeoutMs: 45000,
    geocodingRequestGapMs: 400,
    geocodingCacheTtlMs: 90 * 24 * 60 * 60 * 1000,
    geocodingNegativeCacheTtlMs: 24 * 60 * 60 * 1000,
    geocodingMinConfidence: 0.90,
    geocodingMinStreetConfidence: 0.90,
    initialCenter: [-51.9253, -14.2350],
    initialZoom: 3.4
  }, existente);

  // Se o Worker foi definido depois do objeto inicial, derive os endpoints sem expor secrets.
  const cfg = global.PEMATO_MAP_CONFIG;
  const base = String(cfg.workerBaseUrl || '').trim().replace(/\/+$/, '');
  if (base) {
    if (!cfg.geocodingEndpoint) cfg.geocodingEndpoint = base + '/geocode';
    if (!cfg.optimizeEndpoint) cfg.optimizeEndpoint = base + '/optimize';
    if (!cfg.routeEndpoint) cfg.routeEndpoint = base + '/route';
  }
})(window);
