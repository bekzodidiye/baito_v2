import { UserProfile } from '../context/types';

/**
 * Validates whether the user profile has filled all mandatory fields based on active role.
 * Employers require `aboutMe` (company info); Workers require `lastName`.
 */
export const isProfileComplete = (profile: UserProfile | null): boolean => {
  if (!profile) return false;

  const { selectedRole, firstName, phone, region, email } = profile;

  // Basic fields required for everyone
  if (!firstName?.trim() || !phone?.trim() || !region?.trim() || !email?.trim()) {
    return false;
  }

  if (selectedRole === 'employer') {
    // Employer also requires aboutMe (company description)
    const { aboutMe } = profile;
    if (!aboutMe?.trim()) {
      return false;
    }
  } else if (selectedRole === 'worker') {
    // Worker requires lastName
    const { lastName } = profile;
    if (!lastName?.trim()) {
      return false;
    }
  }

  return true;
};
