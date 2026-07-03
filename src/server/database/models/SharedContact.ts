import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IContactPhone {
  number: string;
  type: 'mobile' | 'home' | 'work' | 'other';
}

export interface IContactEmail {
  email: string;
  type: 'personal' | 'work' | 'other';
}

export interface ISharedContact extends Document {
  _id:            mongoose.Types.ObjectId;
  sharedBy:       mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  messageId?:     mongoose.Types.ObjectId;
  displayName:    string;
  phones:         IContactPhone[];
  emails:         IContactEmail[];
  avatar?:        string;
  note?:          string;
  createdAt:      Date;
  updatedAt:      Date;
}

const contactPhoneSchema = new Schema<IContactPhone>(
  {
    number: { type: String, required: true },
    type:   { type: String, enum: ['mobile','home','work','other'], default: 'mobile' },
  },
  { _id: false },
);

const contactEmailSchema = new Schema<IContactEmail>(
  {
    email: { type: String, required: true },
    type:  { type: String, enum: ['personal','work','other'], default: 'personal' },
  },
  { _id: false },
);

const sharedContactSchema = new Schema<ISharedContact>(
  {
    sharedBy:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    messageId:      { type: Schema.Types.ObjectId, ref: 'Message' },
    displayName:    { type: String, required: true, maxlength: 200 },
    phones:         { type: [contactPhoneSchema], default: [] },
    emails:         { type: [contactEmailSchema], default: [] },
    avatar:         { type: String },
    note:           { type: String, maxlength: 500 },
  },
  { timestamps: true },
);

sharedContactSchema.index({ sharedBy: 1 });
sharedContactSchema.index({ conversationId: 1 });
sharedContactSchema.index({ messageId: 1 });

export const SharedContactModel: Model<ISharedContact> = mongoose.model<ISharedContact>('SharedContact', sharedContactSchema);
