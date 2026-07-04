import { StickerPackModel } from '../../../database/models/StickerPack.js';
import type { StickerPackResponse, StickerItem } from '../types/index.js';

export class StickerService {
  async listPacks(): Promise<StickerPackResponse[]> {
    const packs = await StickerPackModel.find({ isActive: true }).lean().exec();

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
}

export const stickerService = new StickerService();
