export const errMsg = (e: unknown): string => (e instanceof Error ? e.message : 'Something went wrong. Please try again.');
/** Only allow same-site redirect targets. */
export const safePath = (p: unknown): string => (typeof p === 'string' && p.startsWith('/') && !p.startsWith('//') ? p : '/dashboard');
