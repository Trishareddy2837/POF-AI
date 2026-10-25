import { z } from 'zod';
export const passwordRule = z.string().min(8, 'Use at least 8 characters.').regex(/[A-Za-z]/, 'Include a letter.').regex(/\d/, 'Include a number.');
const email = z.string().trim().email('Enter a valid email address.');
export const loginSchema = z.object({ email, password: z.string().min(1, 'Enter your password.') });
export const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name.').max(120),
  email, password: passwordRule, confirm: z.string(),
  terms: z.boolean().refine(v => v, 'Accept the terms to continue.'),
}).refine(d => d.password === d.confirm, { path: ['confirm'], message: 'Passwords do not match.' });
export const forgotSchema = z.object({ email });
export const resetSchema = z.object({ password: passwordRule, confirm: z.string() }).refine(d => d.password === d.confirm, { path: ['confirm'], message: 'Passwords do not match.' });
export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type ForgotValues = z.infer<typeof forgotSchema>;
export type ResetValues = z.infer<typeof resetSchema>;
