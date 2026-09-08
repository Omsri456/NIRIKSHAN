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

  const existingUser = await UserModel.findOne({ email: emailLower });
  if (existingUser) {
    throw new AppError(400, 'USER_EXISTS', 'An account with this email already exists.');
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(payload.password, salt);

  const user = await UserModel.create({
    name: payload.name.trim(),
    email: emailLower,
    passwordHash,
    role: payload.role || 'DISTRICT_AUTHORITY',
    scope: {
      state: payload.scope?.state || null,
      district: payload.scope?.district || null,
      constituency: payload.scope?.constituency || null,
    },
    isActive: true,
  });

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