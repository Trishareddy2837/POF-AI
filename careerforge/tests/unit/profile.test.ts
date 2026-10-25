import { describe, it, expect } from 'vitest';
import { profileSchema, toForm, parseSkills } from '../../src/schemas/profile';
import { validateResume } from '../../src/services/profile';
const base = toForm({ fullName: 'Asha Rao' });
describe('profile validation', () => {
  it('accepts a minimal profile', () => expect(profileSchema.safeParse(base).success).toBe(true));
  it('rejects bad graduation years and phone numbers', () => { expect(profileSchema.safeParse({ ...base, institution: 'X', graduationYear: '1800' }).success).toBe(false); expect(profileSchema.safeParse({ ...base, phone: 'abc' }).success).toBe(false); });
  it('requires an institution when other education fields are filled', () => expect(profileSchema.safeParse({ ...base, degree: 'B.Tech' }).success).toBe(false));
  it('parses and de-duplicates skills', () => expect(parseSkills('Python, CAD, python,, CAD ')).toEqual(['Python', 'CAD', 'python']));
});
describe('resume validation', () => {
  it('accepts PDF and DOCX within 5 MB', () => { expect(validateResume({ type: 'application/pdf', size: 1000 })).toBeNull(); expect(validateResume({ type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 1000 })).toBeNull(); });
  it('rejects other types, empty and oversized files', () => { expect(validateResume({ type: 'image/png', size: 10 })).not.toBeNull(); expect(validateResume({ type: 'application/pdf', size: 0 })).not.toBeNull(); expect(validateResume({ type: 'application/pdf', size: 6 * 1024 * 1024 })).not.toBeNull(); });
});
