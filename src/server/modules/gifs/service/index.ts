import { getEnv } from '../../../config/env.js';
import { logger } from '../../../logger/index.js';
import { AppError } from '../../../middlewares/errorHandler.js';
import type { GifItem } from '../types/index.js';

const TENOR_BASE = 'https://tenor.googleapis.com/v2';

interface TenorMediaFormat {
  url:  string;
  dims: number[];
  size: number;
}

interface TenorResult {
  id:            string;
  title:         string;
  media_formats: Record<string, TenorMediaFormat>;
}

function parseTenorResult(r: TenorResult): GifItem {
  const gif  = r.media_formats['gif'];
  const nano = r.media_formats['nanogif'] ?? r.media_formats['tinygif'] ?? gif;
  return {
    id:      r.id,
    title:   r.title,
    url:     gif?.url ?? '',
    preview: nano?.url ?? gif?.url ?? '',
    width:   gif?.dims[0] ?? 0,
    height:  gif?.dims[1] ?? 0,
  };
}

export class GifService {
  async getTrending(limit = 20): Promise<GifItem[]> {
    const env = getEnv();
    if (!env.TENOR_API_KEY) throw new AppError('GIF service not configured', 503, 'SERVICE_UNAVAILABLE');

    try {
      const url = `${TENOR_BASE}/featured?key=${env.TENOR_API_KEY}&limit=${limit}&client_key=truson-chat&media_filter=gif`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Tenor API returned ${response.status}`);
      const data = await response.json() as { results: TenorResult[] };
      return data.results.map(parseTenorResult);
    } catch (err) {
      logger.warn('Tenor trending fetch failed', { err });
      throw new AppError('Failed to fetch trending GIFs', 502, 'UPSTREAM_ERROR');
    }
  }

  async search(query: string, limit = 20): Promise<GifItem[]> {
    const env = getEnv();
    if (!env.TENOR_API_KEY) throw new AppError('GIF service not configured', 503, 'SERVICE_UNAVAILABLE');

    try {
      const url = `${TENOR_BASE}/search?key=${env.TENOR_API_KEY}&q=${encodeURIComponent(query)}&limit=${limit}&client_key=truson-chat&media_filter=gif`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Tenor API returned ${response.status}`);
      const data = await response.json() as { results: TenorResult[] };
      return data.results.map(parseTenorResult);
    } catch (err) {
      logger.warn('Tenor search failed', { err, query });
      throw new AppError('Failed to search GIFs', 502, 'UPSTREAM_ERROR');
    }
  }
}

export const gifService = new GifService();
