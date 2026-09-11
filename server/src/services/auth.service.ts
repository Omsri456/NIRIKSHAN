import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UserModel } from '../models/User';
import { AppError } from '../utils';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role?: 'MINISTRY' | 'STATE_AUTHORITY' | 'DISTRICT_AUTHORITY' | 'MP' | 'ADMIN';
  scope?: {
    state?: string | null;
    district?: string | null;
    constituency?: string | null;
  };
}

/**
 * Authenticates a user and issues a JWT.
 */
export async function login({ email, password }: LoginCredentials) {
  if (!email || !password) {
    throw new AppError(400, 'INVALID_REQUEST', 'Email and password are required.');
  }

  const user = await UserModel.findOne({ email: email.toLowerCase() });

  if (!user || !user.isActive) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  if (user.approvalStatus === 'REJECTED') {
    throw new AppError(403, 'ACCOUNT_REJECTED', 'Your account registration has been rejected by an administrator.');
  }

  if (user.approvalStatus !== 'APPROVED') {
    throw new AppError(403, 'PENDING_APPROVAL', 'Your account is pending admin approval.');
  }

  const token = jwt.sign({ userId: user._id }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as any,
  });

  return {
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      scope: user.scope,
    },
  };
}

/**
 * Registers a new user and issues a JWT.
 */
export async function register(payload: RegisterPayload) {
  const emailLower = payload.email.toLowerCase().trim();

  // Government Security Rule: Verify official government email domain
  const isGovDomain = /@.*(gov\.in|nic\.in|nirikshan\.gov\.in)$/i.test(emailLower);
  if (!isGovDomain) {
    throw new AppError(
      400,
      'UNAUTHORIZED_DOMAIN',
      'Registration is restricted to verified government personnel with official .gov.in or .nic.in email addresses.'
    );
  }

  // System Administration Rule: Exactly one designated system administrator exists
  if (payload.role === 'ADMIN') {
    throw new AppError(
      403,
      'FORBIDDEN_ROLE',
      'The System Administrator role is restricted and cannot be registered publicly. Please sign in using the designated administrator account.'
    );
  }

  const existingUser = await UserModel.findOne({ email: emailLower });
  if (existingUser) {
    throw new AppError(400, 'USER_EXISTS', 'An account with this email already exists.');
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(payload.password, salt);

  await UserModel.create({
    name: payload.name.trim(),
    email: emailLower,
    passwordHash,
    role: payload.role || 'DISTRICT_AUTHORITY',
    scope: {
      state: payload.role === 'MINISTRY' ? null : (payload.scope?.state || null),
      district: payload.role === 'MINISTRY' ? null : (payload.scope?.district || null),
      constituency: payload.role === 'MP' ? (payload.scope?.constituency || null) : null,
    },
    isActive: true,
    approvalStatus: 'PENDING',
  });

  return {
    message: 'Registration successful. Your account is pending admin approval.',
  };
}

/**
 * GET list of assignable users for investigation assignment (approved non-MP active users).
 */
export async function listUsers() {
  return UserModel.find(
    { isActive: true, approvalStatus: 'APPROVED', role: { $ne: 'MP' } },
    '_id name email role scope'
  ).lean();
}