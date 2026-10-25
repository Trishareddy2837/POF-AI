import { describe, it, expect } from 'vitest';
import { loginSchema, registerSchema, resetSchema } from '../../src/schemas/auth';
const ok = { fullName: 'Asha Rao', email: 'asha@example.com', password: 'Passw0rdX', confirm: 'Passw0rdX', terms: true };
describe('auth schemas', () => {
  it('accepts a valid registration', () => expect(registerSchema.safeParse(ok).success).toBe(true));
  it('rejects weak passwords', () => { expect(registerSchema.safeParse({ ...ok, password: 'short1', confirm: 'short1' }).success).toBe(false); expect(registerSchema.safeParse({ ...ok, password: 'nodigitshere', confirm: 'nodigitshere' }).success).toBe(false); });
  it('rejects mismatched confirmation', () => { const r = registerSchema.safeParse({ ...ok, confirm: 'Different1' }); expect(r.success).toBe(false); });
  it('requires accepted terms and a valid email', () => { expect(registerSchema.safeParse({ ...ok, terms: false }).success).toBe(false); expect(loginSchema.safeParse({ email: 'nope', password: 'x' }).success).toBe(false); });
  it('validates password reset', () => { expect(resetSchema.safeParse({ password: 'Passw0rdX', confirm: 'Passw0rdX' }).success).toBe(true); expect(resetSchema.safeParse({ password: 'Passw0rdX', confirm: 'x' }).success).toBe(false); });
});
