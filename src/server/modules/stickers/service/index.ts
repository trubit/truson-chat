import { StickerPackModel } from '../../../database/models/StickerPack.js';
import type { StickerPackResponse, StickerItem } from '../types/index.js';

const DEFAULT_SYSTEM_PACK: StickerPackResponse = {
  _id:      'system-emoji-pack',
  name:     'Emoji Stickers',
  description: 'Classic emoji stickers',
  coverUrl:    'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44d/emoji.svg',
  isSystem:    true,
  downloadCount: 0,
  stickers: [
    { _id: 's1',  name: 'Thumbs Up', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44d/emoji.svg', emoji: '👍', width: 72, height: 72 },
    { _id: 's2',  name: 'Heart',     url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/2764_fe0f/emoji.svg', emoji: '❤️', width: 72, height: 72 },
    { _id: 's3',  name: 'Laughing',  url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f602/emoji.svg', emoji: '😂', width: 72, height: 72 },
    { _id: 's4',  name: 'Crying',    url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f622/emoji.svg', emoji: '😢', width: 72, height: 72 },
    { _id: 's5',  name: 'Fire',      url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/emoji.svg', emoji: '🔥', width: 72, height: 72 },
    { _id: 's6',  name: 'Clap',      url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44f/emoji.svg', emoji: '👏', width: 72, height: 72 },
    { _id: 's7',  name: 'Party',     url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f389/emoji.svg', emoji: '🎉', width: 72, height: 72 },
    { _id: 's8',  name: 'Thinking',  url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f914/emoji.svg', emoji: '🤔', width: 72, height: 72 },
    { _id: 's9',  name: 'Cool',      url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f60e/emoji.svg', emoji: '😎', width: 72, height: 72 },
    { _id: 's10', name: 'Wave',      url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44b/emoji.svg', emoji: '👋', width: 72, height: 72 },
  ],
};

export class StickerService {
  async listPacks(): Promise<StickerPackResponse[]> {
    const packs = await StickerPackModel.find({ isActive: true }).lean().exec();
    if (packs.length === 0) return [DEFAULT_SYSTEM_PACK];

    return packs.map((p) => ({
      _id:           p._id.toString(),
      name:          p.name,
      description:   p.description,
      coverUrl:      p.coverUrl,
      isSystem:      p.isSystem,
      downloadCount: p.downloadCount,
      stickers:      p.stickers.map((s) => ({
        _id:     s._id.toString(),
        name:    s.name,
        url:     s.url,
        publicId: s.publicId,
        emoji:   s.emoji,
        width:   s.width,
        height:  s.height,
      } as StickerItem)),
    }));
  }

  async getPackStickers(packId: string): Promise<StickerPackResponse | null> {
    if (packId === 'system-emoji-pack') return DEFAULT_SYSTEM_PACK;

    const pack = await StickerPackModel.findOne({ _id: packId, isActive: true }).lean().exec();
    if (!pack) return null;

    return {
      _id:           pack._id.toString(),
      name:          pack.name,
      description:   pack.description,
      coverUrl:      pack.coverUrl,
      isSystem:      pack.isSystem,
      downloadCount: pack.downloadCount,
      stickers:      pack.stickers.map((s) => ({
        _id:     s._id.toString(),
        name:    s.name,
        url:     s.url,
        publicId: s.publicId,
        emoji:   s.emoji,
        width:   s.width,
        height:  s.height,
      } as StickerItem)),
    };
  }

  getDefaultPack(): StickerPackResponse {
    return DEFAULT_SYSTEM_PACK;
  }
}

export const stickerService = new StickerService();
