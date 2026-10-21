/** What the profile widget calls complete must be what the server accepts.
 *
 *  The widget kept its own list — company name, phone, address, about, logo —
 *  and called five out of five "Hammasi toʻldirilgan". `POST /jobs` asks for
 *  name, phone, region, email and bio. So an employer with no email address
 *  read 100% on their own profile and was then refused at the posting form for
 *  an incomplete one, with nothing on the page saying which field was missing.
 *
 *  This reads the guard out of the backend source, so the two cannot drift
 *  apart again without a failing test naming the field that moved.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { REQUIRED_FIELDS, OPTIONAL_FIELDS, missingFrom, isFilled } from './employerProfileFields';
import type { UserProfile } from '../../context/types';

const JOBS_ENDPOINT = path.resolve(
  __dirname, '../../../../backend/app/api/v1/endpoints/jobs/main.py',
);

/** The `all([...])` the job-creation guard is written as. */
const guardFields = (): string[] => {
  const src = fs.readFileSync(JOBS_ENDPOINT, 'utf8');
  const match = src.match(
    /if not all\(\[([^\]]*)\]\):\s*\n\s*raise HTTPException\([^)]*ish yaratishdan oldin/,
  );
  if (!match) throw new Error('job-creation profile guard not found in jobs.py');
  return match[1]
    .split(',')
    .map(part => part.trim().replace('current_user.', ''))
    .filter(Boolean);
};

const complete: UserProfile = {
  id: 'e1', firstName: 'Korzinka', lastName: '', phone: '+998901234567',
  email: 'hr@korzinka.uz', region: 'Toshkent', aboutMe: 'Savdo tarmogʻi',
  profileImage: null,
} as unknown as UserProfile;

describe('the employer profile checklist', () => {
  it('asks for exactly what the server asks for', () => {
    expect(new Set(REQUIRED_FIELDS.map(f => f.serverField)))
      .toEqual(new Set(guardFields()));
  });

  it('includes the email address', () => {
    // The one that was missing, named on its own so the reason is on the record.
    expect(REQUIRED_FIELDS.map(f => f.key)).toContain('email');
  });

  it('does not call a profile complete while the server would refuse it', () => {
    const noEmail = { ...complete, email: '' };
    expect(missingFrom(noEmail)).toHaveLength(1);
    expect(missingFrom(noEmail)[0].key).toBe('email');
  });

  it('calls a filled profile complete', () => {
    expect(missingFrom(complete)).toHaveLength(0);
  });

  it('does not hold a missing logo against it', () => {
    // Nothing refuses a posting over a logo, so it must not read as incomplete.
    expect(missingFrom({ ...complete, profileImage: null })).toHaveLength(0);
    expect(OPTIONAL_FIELDS.map(f => f.key)).toContain('profileImage');
  });

  it('names every field in all three languages', () => {
    for (const field of [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS]) {
      for (const lang of ['uz', 'ru', 'en'] as const) {
        expect(field.label[lang], `${String(field.key)}.${lang}`).toBeTruthy();
      }
      // Russian must not be the Uzbek string carried across.
      expect(field.label.ru).not.toBe(field.label.uz);
    }
  });

  it('treats blank space as unfilled', () => {
    expect(isFilled({ ...complete, email: '   ' } as UserProfile, 'email')).toBe(false);
    expect(isFilled(null, 'email')).toBe(false);
  });
});
