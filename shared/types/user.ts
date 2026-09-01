// ============================================================
// User & Role Contracts
// Matches: 04-DATABASE.md → users collection
// ============================================================

/** Roles determine dashboard access level and data scope */
export enum UserRole {
  MINISTRY = 'MINISTRY',
  STATE_AUTHORITY = 'STATE_AUTHORITY',
  DISTRICT_AUTHORITY = 'DISTRICT_AUTHORITY',
  MP = 'MP',
  ADMIN = 'ADMIN',
}

/** Geographic data scope — controls what data a user can see */
export interface UserScope {
  state: string | null;
  district: string | null;
  constituency: string | null;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  scope: UserScope;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Safe user object returned by the API (no password hash) */
export type SafeUser = Omit<User, 'passwordHash'>;
