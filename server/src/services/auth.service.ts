import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UserModel } from '../models/User';
import { AppError } from '../utils';

export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Authenticates a user and issues a JWT.
 * - Looks up the user by (lowercased) email.
 * - Verifies the account is active and the password matches.
 * - Returns a signed token and the safe user payload (no password hash).
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