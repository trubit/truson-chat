// ---------------------------------------------------------------------------
// MongoDB Models — barrel export
// ---------------------------------------------------------------------------

export { UserModel } from './User.js';
export type { IUser } from './User.js';

export { ProfileModel } from './Profile.js';
export type { IProfile } from './Profile.js';

export { SessionModel } from './Session.js';
export type { ISession } from './Session.js';

export { DeviceModel } from './Device.js';
export type { IDevice } from './Device.js';

export { RefreshTokenModel } from './RefreshToken.js';
export type { IRefreshToken } from './RefreshToken.js';

export { VerificationTokenModel } from './VerificationToken.js';
export type { IVerificationToken } from './VerificationToken.js';

export { PasswordResetTokenModel } from './PasswordResetToken.js';
export type { IPasswordResetToken } from './PasswordResetToken.js';

export { UserPreferencesModel } from './UserPreferences.js';
export type { IUserPreferences } from './UserPreferences.js';

export { SecurityLogModel } from './SecurityLog.js';
export type { ISecurityLog, SecurityEventType } from './SecurityLog.js';

export { AuditLogModel } from './AuditLog.js';
export type { IAuditLog } from './AuditLog.js';

export { ContactModel } from './Contact.js';
export type { IContact } from './Contact.js';

export { FriendRequestModel } from './FriendRequest.js';
export type { IFriendRequest } from './FriendRequest.js';

export { FriendshipModel } from './Friendship.js';
export type { IFriendship } from './Friendship.js';

export { BlockedUserModel } from './BlockedUser.js';
export type { IBlockedUser } from './BlockedUser.js';

export { MutedUserModel } from './MutedUser.js';
export type { IMutedUser } from './MutedUser.js';

export { PresenceModel } from './Presence.js';
export type { IPresence } from './Presence.js';

export { PrivacySettingModel } from './PrivacySetting.js';
export type { IPrivacySetting } from './PrivacySetting.js';

export { ContactSyncLogModel } from './ContactSyncLog.js';
export type { IContactSyncLog } from './ContactSyncLog.js';

export { ConversationModel } from './Conversation.js';
export type { IConversation, ConversationType, ConversationStatus, IConversationLastMessage, IConversationMetadata } from './Conversation.js';

export { ConversationMemberModel } from './ConversationMember.js';
export type { IConversationMember, MemberRole } from './ConversationMember.js';

export { MessageModel } from './Message.js';
export type { IMessage, MsgType, MsgStatus, IMessageReaction, IReadReceipt, IDeliveryReceipt, IMessageMedia, IEditEntry } from './Message.js';
