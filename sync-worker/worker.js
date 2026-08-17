/**
 * Clarkitect Practice Sync
 * A tiny Cloudflare Worker that stores practice history so a streak survives
 * across phone, laptop, and a cleared browser cache.
 *
 * DEPLOY (one time, ~3 minutes, all in the Cloudflare dashboard):
 *   1. Workers & Pages  ->  Create  ->  Workers  ->  Start with Hello World  ->  Deploy
 *   2. Name it: clarkitect-practice-sync
 *   3. Edit code, paste this whole file over the default, Deploy
 *   4. Settings -> Bindings -> Add -> KV namespace
 *        Variable name: PRACTICE
 *        KV namespace : clarkitect-practice
 *      Save, then Deploy once more.
 *   5. Copy the worker URL (looks like
 *      https://clarkitect-practice-sync.<your-subdomain>.workers.dev )
 *      and paste it into the sync box on the audios page.
 *
 * Free tier covers this many times over: 100,000 reads and 1,000 writes a day.
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
};

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });

// Only allow sane sync codes, so the namespace cannot be used as open storage.
const validKey = (k) => typeof k === 'string' && /^[a-z0-9-]{8,64}$/.test(k);

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    if (!validKey(key)) return json({ error: 'bad key' }, 400);

    const store = `practice:${key}`;

    if (request.method === 'GET') {
      const saved = await env.PRACTICE.get(store);
      return json(saved ? JSON.parse(saved) : { plays: {}, days: [], total: 0 });
    }

    if (request.method === 'PUT') {
      let incoming;
      try { incoming = await request.json() } catch (e) { return json({ error: 'bad body' }, 400) }

      const prevRaw = await env.PRACTICE.get(store);
      const prev = prevRaw ? JSON.parse(prevRaw) : { plays: {}, days: [] };

      // Merge, never overwrite. A device that was offline cannot erase history.
      const days = [...new Set([...(prev.days || []), ...(incoming.days || [])])].sort();
      const plays = { ...(prev.plays || {}) };
      for (const [id, n] of Object.entries(incoming.plays || {})) {
        plays[id] = Math.max(plays[id] || 0, n || 0);
      }
      const total = Object.values(plays).reduce((a, b) => a + b, 0);

      const merged = { plays, days, total, updated: new Date().toISOString() };
      await env.PRACTICE.put(store, JSON.stringify(merged));
      return json(merged);
    }

    return json({ error: 'method not allowed' }, 405);
  },
};
