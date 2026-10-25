export type AiErrorCode = 'not_configured' | 'not_deployed' | 'unauthorized' | 'provider_error' | 'provider_busy' | 'invalid_json' | 'rate_limited' | 'timeout' | 'unavailable' | 'invalid_response' | 'invalid_request';
export class AiError extends Error {
  code: AiErrorCode;
  constructor(code: AiErrorCode, message: string) { super(message); this.name = 'AiError'; this.code = code; }
}
const MESSAGES: Record<AiErrorCode, string> = {
  not_configured: 'The AI provider is not configured on the server. The AI_API_KEY and AI_MODEL secrets are missing.',
  not_deployed: 'The career-analysis function is not deployed on your Supabase project. Deploy it (see the README).',
  unauthorized: 'The server rejected your session. Sign out, sign in again and retry.',
  provider_error: 'The AI provider could not complete the request. Check provider settings or try again.',
  provider_busy: 'The AI provider is temporarily overloaded (this is on their side, not a problem with your setup). Please try again in a minute.',
  invalid_json: 'The AI provider returned an empty, incomplete or malformed answer. Please retry. If it continues, check that the configured model supports JSON output.',
  rate_limited: 'The AI provider is rate-limiting requests. Please wait a minute and try again.',
  timeout: 'The AI provider took too long to respond. Please try again.',
  unavailable: 'The request could not reach the function (network problem or unexpected server error). Please try again.',
  invalid_response: 'The AI returned an answer that failed validation, so it was not saved.',
  invalid_request: 'The deployed career-analysis function rejected the request format. Update the app and redeploy the latest function code, then retry.',
};
export const aiError = (code: AiErrorCode, detail?: string) => new AiError(code, detail ? `${MESSAGES[code]} (${detail.slice(0, 220)})` : MESSAGES[code]);
export function mapStatus(status?: number): AiErrorCode {
  if (status === 503) return 'not_configured'; if (status === 404) return 'not_deployed'; if (status === 400) return 'invalid_request'; if (status === 401 || status === 403) return 'unauthorized';
  if (status === 502) return 'provider_error'; if (status === 429) return 'rate_limited'; if (status === 504 || status === 408) return 'timeout'; return 'unavailable';
}
export const codeFromBody = (e?: string): AiErrorCode | undefined => (e === 'provider_busy' ? 'provider_busy' : e === 'bad_request' ? 'invalid_request' : e === 'invalid_json' ? 'invalid_json' : undefined);
