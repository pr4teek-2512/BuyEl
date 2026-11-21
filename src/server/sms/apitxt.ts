/**
 * APITxT unified OTP API.
 * Docs: https://apitxt.com/developer/otp-api
 *
 * POST https://apitxt.com/api/sendOTP  (application/x-www-form-urlencoded)
 *   authkey      required  account API key
 *   mobile       required  number with country code, e.g. 919999999999
 *   otp          required  the code we generated
 *   channel      optional  sms (default) | whatsapp | voice
 *   template_id  optional  SMS template id; omitted uses the account default
 *   country      optional  country code without +, default 91
 *
 * APITxT renders the message from the template registered on their side, which
 * is also what carries the DLT registration, so BuyEl never sends message text.
 *
 * The request builder and the response reader below are pure so they can be
 * unit tested without touching the network.
 */

export const APITXT_ENDPOINT = "https://apitxt.com/api/sendOTP";

export type ApitxtConfig = {
  endpoint: string;
  authKey: string;
  channel: string;
  templateId?: string;
  country?: string;
};

export type ApitxtRequest = {
  url: string;
  body: string;
};

/** APITxT wants digits only, with the country code and no plus sign. */
export function toApitxtMobile(phoneE164: string): string {
  return phoneE164.replace(/\D/g, "");
}

export function buildOtpRequest(
  config: ApitxtConfig,
  phoneE164: string,
  code: string,
): ApitxtRequest {
  const params = new URLSearchParams({
    authkey: config.authKey,
    mobile: toApitxtMobile(phoneE164),
    otp: code,
    channel: config.channel || "sms",
  });

  if (config.templateId) params.set("template_id", config.templateId);
  if (config.country) params.set("country", config.country);

  return { url: config.endpoint || APITXT_ENDPOINT, body: params.toString() };
}

/**
 * Documented codes from https://apitxt.com/developer/error-codes, plus the
 * HTTP style codes the live API was observed returning (400, 401, 429).
 */
const ERROR_CODES: Record<string, string> = {
  "400": "That mobile number was rejected by the SMS provider.",
  "401": "The APITxT authentication key was rejected.",
  "429": "The SMS provider is rate limiting this number. Try again in a minute.",
  "101": "Mobile number was missing in the request.",
  "102": "The OTP message template is missing on the APITxT account.",
  "103": "Sender ID is missing on the APITxT account.",
  "104": "SMS route is missing on the APITxT account.",
  "105": "APITxT authentication key is missing.",
  "106": "Country code was missing in the request.",
  "111": "Principal Entity ID (pe_id) is missing on the APITxT account.",
  "112": "DLT template ID is missing on the APITxT account.",
  "113": "SMS panel template ID is missing on the APITxT account.",
  "202": "That mobile number was rejected as invalid.",
  "203": "Sender ID on the APITxT account is invalid.",
  "204": "SMS route configured on the APITxT account is invalid.",
  "301": "The APITxT wallet is out of balance.",
  "302": "The SMS route is unavailable right now.",
  "303": "The APITxT account is blocked.",
  "304": "APITxT rejected the key, the method, or this server's IP.",
  "305": "The SMS template ID does not match the APITxT account.",
  "307": "Sender ID does not match the template on the APITxT account.",
  "311": "APITxT discarded a duplicate request sent within 15 seconds.",
};

export type ApitxtOutcome =
  | { ok: true; requestId?: string; cost?: number }
  | { ok: false; error: string; code?: string; retryable: boolean };

/** Codes where retrying the same request shortly could succeed. */
const RETRYABLE = new Set(["302", "311", "429"]);

export function interpretResponse(status: number, rawBody: string): ApitxtOutcome {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    parsed = null;
  }

  const payload = (parsed ?? {}) as {
    status?: string;
    message?: string;
    code?: string | number;
    data?: { request_id?: string; cost?: number };
  };

  // The API reports auth failures as a status string rather than a code.
  const statusText = String(payload.status ?? "").toLowerCase();
  const code =
    payload.code !== undefined
      ? String(payload.code)
      : statusText === "auth_failed"
        ? "401"
        : undefined;

  const succeeded = status >= 200 && status < 300 && statusText === "success";

  if (succeeded) {
    return { ok: true, requestId: payload.data?.request_id, cost: payload.data?.cost };
  }

  const mapped = code ? ERROR_CODES[code] : undefined;
  const message =
    mapped ??
    payload.message ??
    (rawBody.trim() ? rawBody.trim().slice(0, 200) : `APITxT responded with HTTP ${status}`);

  return {
    ok: false,
    error: message,
    code,
    retryable: code ? RETRYABLE.has(code) : status >= 500,
  };
}
