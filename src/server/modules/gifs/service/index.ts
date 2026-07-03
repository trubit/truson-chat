import { getEnv } from '../../../config/env.js';
import { logger } from '../../../logger/index.js';
import type { GifItem } from '../types/index.js';

const TENOR_BASE = 'https://tenor.googleapis.com/v2';

const STATIC_TRENDING_GIFS: GifItem[] = [
  { id: 'g1', title: 'Thumbs Up', url: 'https://media.tenor.com/OK5TZPB8dJ4AAAAC/thumbs-up-ok.gif',    preview: 'https://media.tenor.com/OK5TZPB8dJ4AAAAe/thumbs-up-ok.png',    width: 498, height: 498 },
  { id: 'g2', title: 'Dancing',   url: 'https://media.tenor.com/snTLPWMpIUYAAAAC/happy-dance.gif',     preview: 'https://media.tenor.com/snTLPWMpIUYAAAAe/happy-dance.png',     width: 498, height: 280 },
  { id: 'g3', title: 'Wow',       url: 'https://media.tenor.com/9MdKfCJKXp0AAAAC/wow-omg.gif',         preview: 'https://media.tenor.com/9MdKfCJKXp0AAAAe/wow-omg.png',         width: 498, height: 280 },
  { id: 'g4', title: 'Laughing',  url: 'https://media.tenor.com/HB-5CkpJD2sAAAAC/haha-laugh.gif',     preview: 'https://media.tenor.com/HB-5CkpJD2sAAAAe/haha-laugh.png',     width: 498, height: 280 },
  { id: 'g5', title: 'Clapping',  url: 'https://media.tenor.com/cBdmTnIoMiUAAAAC/clap-clapping.gif',  preview: 'https://media.tenor.com/cBdmTnIoMiUAAAAe/clap-clapping.png',  width: 498, height: 280 },
];

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
    if (!env.TENOR_API_KEY) return STATIC_TRENDING_GIFS.slice(0, limit);

    try {
      const url = `${TENOR_BASE}/featured?key=${env.TENOR_API_KEY}&limit=${limit}&client_key=truson-chat&media_filter=gif`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Tenor API returned ${response.status}`);
      const data = await response.json() as { results: TenorResult[] };
      return data.results.map(parseTenorResult);
    } catch (err) {
      logger.warn('Tenor trending fetch failed — using static fallback', { err });
      return STATIC_TRENDING_GIFS.slice(0, limit);
    }
  }

  async search(query: string, limit = 20): Promise<GifItem[]> {
    const env = getEnv();
    if (!env.TENOR_API_KEY) {
      return STATIC_TRENDING_GIFS.filter((g) =>
        g.title.toLowerCase().includes(query.toLowerCase()),
      ).slice(0, limit);
    }

    try {
      const url = `${TENOR_BASE}/search?key=${env.TENOR_API_KEY}&q=${encodeURIComponent(query)}&limit=${limit}&client_key=truson-chat&media_filter=gif`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Tenor API returned ${response.status}`);
      const data = await response.json() as { results: TenorResult[] };
      return data.results.map(parseTenorResult);
    } catch (err) {
      logger.warn('Tenor search failed — using static fallback', { err, query });
      return STATIC_TRENDING_GIFS.slice(0, limit);
    }
  }
}

export const gifService = new GifService();
