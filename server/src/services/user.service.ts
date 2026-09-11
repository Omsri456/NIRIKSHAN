import { UserModel } from '../models/User';
import { AppError } from '../utils';

/**
 * Lists all users with PENDING approval status, excluding passwordHash.
 */
export async function listPendingUsers() {
  return UserModel.find({ approvalStatus: 'PENDING' })
    .select('-passwordHash')
    .sort({ createdAt: -1 })
    .lean();
}

/**
 * Approves a user by setting approvalStatus to APPROVED.
 */
export async function approveUser(id: string) {
  const user = await UserModel.findByIdAndUpdate(
    id,
    { approvalStatus: 'APPROVED' },
    { new: true }
  )
    .select('-passwordHash')
    .lean();

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found.');
  }

  return user;
}

/**
 * Rejects a user by setting approvalStatus to REJECTED.
 */
export async function rejectUser(id: string) {
  const user = await UserModel.findByIdAndUpdate(
    id,
    { approvalStatus: 'REJECTED', isActive: false },
    { new: true }
  )
    .select('-passwordHash')
    .lean();

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found.');
  }

  return user;
}
