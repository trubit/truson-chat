export interface CreateSharedContactDto {
  conversationId: string;
  displayName:    string;
  phones:         { number: string; type: 'mobile' | 'home' | 'work' | 'other' }[];
  emails?:        { email: string; type: 'personal' | 'work' | 'other' }[];
  avatar?:        string;
  note?:          string;
}

export interface SharedContactResponse {
  _id:            string;
  sharedBy:       string;
  conversationId: string;
  displayName:    string;
  phones:         { number: string; type: string }[];
  emails:         { email: string; type: string }[];
  avatar?:        string;
  note?:          string;
  createdAt:      string;
}
