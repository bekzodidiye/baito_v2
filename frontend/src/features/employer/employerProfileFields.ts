/** What an employer's profile needs before the platform will take a posting.
 *
 *  The completion widget counted `firstName, phone, region, aboutMe,
 *  profileImage` and called five out of five "Hammasi toʻldirilgan". Creating
 *  a job asks the server for `name, phone, region, email, bio` — so an
 *  employer with no email address read 100% on their own profile and was then
 *  refused at the posting form for an incomplete one.
 *
 *  The two lists are the same list now. `employerProfileFields.test.ts` reads
 *  the backend guard and fails if they drift apart again.
 */
import type { UserProfile } from '../../context/types';

export type Lang = 'uz' | 'ru' | 'en';

export interface ProfileField {
  /** The key on `UserProfile`. */
  key: keyof UserProfile;
  /** The column the server checks, so the two can be compared. */
  serverField: string;
  label: Record<Lang, string>;
}

/** Everything `POST /jobs` requires. Missing any of these stops a posting. */
export const REQUIRED_FIELDS: ProfileField[] = [
  {
    key: 'firstName',
    serverField: 'name',
    label: { uz: 'Kompaniya nomi', ru: 'Название компании', en: 'Company name' },
  },
  {
    key: 'phone',
    serverField: 'phone',
    label: { uz: 'Telefon', ru: 'Телефон', en: 'Phone' },
  },
  {
    key: 'region',
    serverField: 'region',
    label: { uz: 'Manzil', ru: 'Адрес', en: 'Address' },
  },
  {
    key: 'email',
    serverField: 'email',
    label: { uz: 'Elektron pochta', ru: 'Эл. почта', en: 'Email' },
  },
  {
    key: 'aboutMe',
    serverField: 'bio',
    label: { uz: 'Kompaniya haqida', ru: 'О компании', en: 'About' },
  },
];

/** Worth having, but nothing refuses a posting over it — so it does not count
 *  towards "complete". Saying a profile is unfinished because of a logo, while
 *  a missing email says nothing, is how the two got out of step. */
export const OPTIONAL_FIELDS: ProfileField[] = [
  {
    key: 'profileImage',
    serverField: '',
    label: { uz: 'Logotip', ru: 'Логотип', en: 'Logo' },
  },
];

export const isFilled = (profile: UserProfile | null, key: keyof UserProfile): boolean => {
  const value = profile ? profile[key] : undefined;
  if (Array.isArray(value)) return value.length > 0 && String(value[0]).trim() !== '';
  return value !== undefined && value !== null && String(value).trim() !== '';
};

export const missingFrom = (
  profile: UserProfile | null,
  fields: ProfileField[] = REQUIRED_FIELDS,
): ProfileField[] => fields.filter(f => !isFilled(profile, f.key));
