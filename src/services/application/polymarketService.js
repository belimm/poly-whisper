// src/services/polymarketService.js
// Minimal client for the Polymarket search API.
// Uses global fetch when available, otherwise dynamically imports node-fetch.
class PolymarketService {
  constructor(options = {}) {
    this.baseUrl =
       options.baseUrl ||
       process.env.POLYMARKET_API_BASE; 
    // default page/size can be adjusted
    this.defaultSize = options.defaultSize || 10;
  }

  async _getFetch() {
    if (typeof globalThis.fetch === 'function') return globalThis.fetch;
    // dynamic import in case node doesn't ship with fetch (Node <18)
    const mod = await import('node-fetch');
    return mod.default || mod;
  }

  // Simple search wrapper. Returns parsed JSON or throws on non-OK response.
  async search(q, { size = this.defaultSize, page = 0 } = {}) {
    if (!q) return { results: [] };
    const fetchFn = await this._getFetch();
    const url = `${this.baseUrl}/public-search?q=${encodeURIComponent(q)}&page=${encodeURIComponent(page)}&events_status=active`;

    const res = await fetchFn(url, { method: 'GET' });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Polymarket search failed: ${res.status} ${res.statusText} ${text}`);
    }

    // Polymarket may wrap results in a top-level object; return raw parsed JSON
    const data = await res.json();
    return data;
  }
}

export default PolymarketService;
