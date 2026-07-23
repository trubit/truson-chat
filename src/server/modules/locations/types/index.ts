export interface ShareLocationDto {
  conversationId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  name?: string;
  address?: string;
}

export interface SharedLocationResponse {
  _id: string;
  sharedBy: string;
  conversationId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  name?: string;
  address?: string;
  isLive: boolean;
  createdAt: string;
}
