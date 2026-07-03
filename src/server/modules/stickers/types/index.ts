export interface StickerItem {
  _id:    string;
  name:   string;
  url:    string;
  publicId?: string;
  emoji?: string;
  width:  number;
  height: number;
}

export interface StickerPackResponse {
  _id:           string;
  name:          string;
  description?:  string;
  coverUrl:      string;
  stickers:      StickerItem[];
  isSystem:      boolean;
  downloadCount: number;
}
