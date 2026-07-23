export interface UploadedMediaResponse {
  _id: string;
  url: string;
  secureUrl: string;
  publicId: string;
  mimeType: string;
  size: number;
  originalName: string;
  width?: number;
  height?: number;
  duration?: number;
  thumbnail?: string;
  type: string;
  status: string;
  createdAt: string;
}

export interface MediaQuery {
  conversationId?: string;
  type?: string;
  page?: number;
  limit?: number;
}
