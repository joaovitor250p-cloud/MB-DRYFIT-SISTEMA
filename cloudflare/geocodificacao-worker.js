const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 45;
const rateBuckets = new Map();

function corsHeaders(origin, allowed) {
  const headers = {
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'Content-Type, X-Pacote-Em-Mato-Client',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400'
  };
  if (allowed) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
}

function originAllowed(origin, env) {
  const lista = allowedOrigins(env);
  if (!origin || !lista.length) return false;
  return lista.includes(origin);
}

function json(payload, status, origin, env) {
  const allowed = originAllowed(origin, env);
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...corsHeaders(origin, allowed)
    }
  });
}

function checkRateLimit(request) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const now = Date.now();
  const atual = rateBuckets.get(ip);
  if (!atual || now - atual.startedAt >= RATE_WINDOW_MS) {
    rateBuckets.set(ip, { startedAt: now, count: 1 });
    return true;
  }
  atual.count += 1;
  if (atual.count > RATE_MAX_REQUESTS) return false;
  return true;
}

function sanitizeResult(item) {
  const rank = item?.rank || {};
  return {
    lat: Number(item?.lat),
    lon: Number(item?.lon),
    formatted: String(item?.formatted || ''),
    address_line1: String(item?.address_line1 || ''),
    housenumber: String(item?.housenumber || ''),
    street: String(item?.street || ''),
    city: String(item?.city || ''),
    state: String(item?.state || ''),
    postcode: String(item?.postcode || ''),
    country: String(item?.country || ''),
    country_code: String(item?.country_code || ''),
    result_type: String(item?.result_type || ''),
    rank: {
      confidence: Number(rank.confidence ?? 0),
      confidence_city_level: Number(rank.confidence_city_level ?? 0),
      confidence_street_level: Number(rank.confidence_street_level ?? 0),
      confidence_building_level: Number(rank.confidence_building_level ?? 0),
      match_type: String(rank.match_type || '')
    }
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = originAllowed(origin, env);
    const url = new URL(request.url);

    if (url.pathname !== '/geocode') {
      return json({ ok: false, error: 'not_found' }, 404, origin, env);
    }

    if (request.method === 'OPTIONS') {
      if (!allowed) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: corsHeaders(origin, true) });
    }

    if (!allowed) return json({ ok: false, error: 'origin_not_allowed' }, 403, origin, env);
    if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405, origin, env);
    if (!checkRateLimit(request)) return json({ ok: false, error: 'rate_limited' }, 429, origin, env);

    const client = request.headers.get('X-Pacote-Em-Mato-Client');
    if (client !== 'map-v1') return json({ ok: false, error: 'invalid_client' }, 400, origin, env);

    if (!env.GEOAPIFY_API_KEY) {
      return json({ ok: false, error: 'provider_not_configured' }, 503, origin, env);
    }

    let body;
    try {
      body = await request.json();
    } catch (_) {
      return json({ ok: false, error: 'invalid_json' }, 400, origin, env);
    }

    const address = String(body?.address || '').replace(/\s+/g, ' ').trim();
    if (address.length < 5 || address.length > 280) {
      return json({ ok: false, error: 'invalid_address' }, 400, origin, env);
    }

    const cacheUrl = new URL('https://pemato-geo-cache.internal/geocode');
    cacheUrl.searchParams.set('origin', origin);
    cacheUrl.searchParams.set('q', address.toLowerCase());
    const cacheKey = new Request(cacheUrl.toString(), { method: 'GET' });
    const cache = caches.default;
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    const providerUrl = new URL('https://api.geoapify.com/v1/geocode/search');
    providerUrl.searchParams.set('text', address);
    providerUrl.searchParams.set('format', 'json');
    providerUrl.searchParams.set('limit', '5');
    providerUrl.searchParams.set('apiKey', env.GEOAPIFY_API_KEY);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);

    try {
      const providerResponse = await fetch(providerUrl.toString(), {
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });

      if (!providerResponse.ok) {
        return json({ ok: false, error: 'provider_error', status: providerResponse.status }, 502, origin, env);
      }

      const providerData = await providerResponse.json();
      const results = Array.isArray(providerData?.results)
        ? providerData.results.map(sanitizeResult).filter(r => Number.isFinite(r.lat) && Number.isFinite(r.lon))
        : [];

      const payload = JSON.stringify({ ok: true, provider: 'geoapify', results });
      const headers = {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=86400',
        ...corsHeaders(origin, true)
      };
      const cacheResponse = new Response(payload, { status: 200, headers });
      await cache.put(cacheKey, cacheResponse.clone());
      return cacheResponse;
    } catch (erro) {
      const tipo = erro?.name === 'AbortError' ? 'provider_timeout' : 'provider_unavailable';
      return json({ ok: false, error: tipo }, 502, origin, env);
    } finally {
      clearTimeout(timeout);
    }
  }
};
