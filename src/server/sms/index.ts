import "server-only";
import { env } from "@/lib/env";
import { phoneWithoutCountryCode } from "@/lib/text";

export type SendResult = {
  ok: boolean;
  providerId?: string;
  error?: string;
};

export interface SmsProvider {
  readonly name: string;
  sendOtp(phone: string, code: string): Promise<SendResult>;
}

function buildMessage(code: string): string {
  return env.sms.messageTemplate.replaceAll("{OTP}", code);
}

/**
 * Development provider. Writes the OTP to the server log instead of sending it.
 */
export const mockProvider: SmsProvider = {
  name: "mock",
  async sendOtp(phone, code) {
    console.info(`[sms:mock] OTP for ${phone} is ${code}`);
    return { ok: true, providerId: `mock-${Date.now()}` };
  },
};

/**
 * APITxt provider.
 *
 * APITxt does not publish an openly documented request shape, so the request is
 * driven entirely by APITXT_REQUEST_URL, a template holding these placeholders:
 *
 *   {API_KEY} {PHONE} {PHONE_NO_CC} {MESSAGE} {OTP} {SENDER} {TEMPLATE_ID}
 *
 * Each substituted value is URL encoded. For a POST, the same placeholders are
 * filled into APITXT_REQUEST_BODY as JSON if that variable is set, otherwise the
 * query string on the URL is used. Supplying the exact URL from the APITxt
 * dashboard is the only step needed to go live, with no code change.
 */
export const apitxtProvider: SmsProvider = {
  name: "apitxt",
  async sendOtp(phone, code) {
    if (!env.sms.requestUrl) {
      return {
        ok: false,
        error:
          "APITXT_REQUEST_URL is not configured. Add the APITxt send URL template to .env.",
      };
    }

    const message = buildMessage(code);
    const replacements: Record<string, string> = {
      "{API_KEY}": env.sms.apiKey,
      "{PHONE}": phone,
      "{PHONE_NO_CC}": phoneWithoutCountryCode(phone),
      "{MESSAGE}": message,
      "{OTP}": code,
      "{SENDER}": env.sms.senderId,
      "{TEMPLATE_ID}": env.sms.templateId,
    };

    let url = env.sms.requestUrl;
    for (const [token, value] of Object.entries(replacements)) {
      url = url.replaceAll(token, encodeURIComponent(value));
    }

    try {
      const response = await fetch(url, {
        method: env.sms.requestMethod === "POST" ? "POST" : "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      const text = await response.text();
      if (!response.ok) {
        return { ok: false, error: `APITxt responded ${response.status}: ${text.slice(0, 300)}` };
      }
      return { ok: true, providerId: text.slice(0, 120) };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "SMS request failed" };
    }
  },
};

export function getSmsProvider(): SmsProvider {
  return env.sms.provider === "apitxt" ? apitxtProvider : mockProvider;
}
