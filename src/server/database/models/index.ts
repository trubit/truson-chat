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
