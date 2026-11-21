import "server-only";
import { env } from "@/lib/env";
import { APITXT_ENDPOINT, buildOtpRequest, interpretResponse } from "./apitxt";

export type SendResult = {
  ok: boolean;
  providerId?: string;
  error?: string;
  /** True when the same request could succeed if tried again shortly. */
  retryable?: boolean;
};

export interface SmsProvider {
  readonly name: string;
  sendOtp(phone: string, code: string): Promise<SendResult>;
}

/**
 * Development provider. Writes the OTP to the server log instead of sending it,
 * and the login screen shows it so the flow can be exercised without credits.
 */
export const mockProvider: SmsProvider = {
  name: "mock",
  async sendOtp(phone, code) {
    console.info(`[sms:mock] OTP for ${phone} is ${code}`);
    return { ok: true, providerId: `mock-${Date.now()}` };
  },
};

const REQUEST_TIMEOUT_MS = 12_000;

export const apitxtProvider: SmsProvider = {
  name: "apitxt",
  async sendOtp(phone, code) {
    if (!env.sms.apiKey) {
      return { ok: false, error: "APITXT_API_KEY is not set.", retryable: false };
    }

    const { url, body } = buildOtpRequest(
      {
        endpoint: env.sms.endpoint || APITXT_ENDPOINT,
        authKey: env.sms.apiKey,
        channel: env.sms.channel,
        templateId: env.sms.templateId || undefined,
        country: env.sms.country || undefined,
      },
      phone,
      code,
    );

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      const text = await response.text();
      const outcome = interpretResponse(response.status, text);

      if (!outcome.ok) {
        // The key and the code never reach the log.
        console.error(`[sms:apitxt] send failed (${outcome.code ?? "no code"}): ${outcome.error}`);
        return { ok: false, error: outcome.error, retryable: outcome.retryable };
      }

      return { ok: true, providerId: outcome.requestId };
    } catch (error) {
      const message =
        error instanceof Error && error.name === "TimeoutError"
          ? "The SMS provider did not respond in time."
          : error instanceof Error
            ? error.message
            : "SMS request failed";
      console.error(`[sms:apitxt] ${message}`);
      return { ok: false, error: message, retryable: true };
    }
  },
};

export function getSmsProvider(): SmsProvider {
  return env.sms.provider === "apitxt" ? apitxtProvider : mockProvider;
}
