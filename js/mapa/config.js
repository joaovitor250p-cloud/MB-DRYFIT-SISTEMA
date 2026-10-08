(function configurarMapaPacoteEMato(global) {
  'use strict';

  const configuracaoExistente = global.PEMATO_MAP_CONFIG || {};

  global.PEMATO_MAP_CONFIG = Object.assign({
    mapStyleUrl: 'https://tiles.openfreemap.org/styles/liberty',
    geocodingEndpoint: 'https://pacote-emato-geocodificacao.joaovitor250p.workers.dev/geocode',
    geocodingProvider: 'geoapify-worker',
    geocodingRequestTimeoutMs: 12000,
    geocodingRequestGapMs: 220,
    geocodingCacheTtlMs: 90 * 24 * 60 * 60 * 1000,
    geocodingNegativeCacheTtlMs: 24 * 60 * 60 * 1000,
    geocodingMinConfidence: 0.90,
    geocodingMinStreetConfidence: 0.90,
    initialCenter: [-51.9253, -14.2350],
    initialZoom: 3.4
  }, configuracaoExistente);
})(window);
