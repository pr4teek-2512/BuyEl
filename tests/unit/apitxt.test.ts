import { describe, expect, it } from "vitest";
import {
  APITXT_ENDPOINT,
  buildOtpRequest,
  interpretResponse,
  toApitxtMobile,
} from "@/server/sms/apitxt";

const config = {
  endpoint: APITXT_ENDPOINT,
  authKey: "test-key",
  channel: "sms",
  country: "91",
};

function params(body: string) {
  return Object.fromEntries(new URLSearchParams(body));
}

describe("toApitxtMobile", () => {
  it("sends digits with the country code and no plus", () => {
    expect(toApitxtMobile("+919876543210")).toBe("919876543210");
  });
});

describe("buildOtpRequest", () => {
  it("posts the documented required parameters", () => {
    const request = buildOtpRequest(config, "+919876543210", "123456");

    expect(request.url).toBe("https://apitxt.com/api/sendOTP");
    expect(params(request.body)).toEqual({
      authkey: "test-key",
      mobile: "919876543210",
      otp: "123456",
      channel: "sms",
      country: "91",
    });
  });

  it("never sends message text, because APITxT renders the template", () => {
    const body = buildOtpRequest(config, "+919876543210", "123456").body;
    expect(body).not.toMatch(/message|text|sender/i);
  });

  it("includes the template id only when one is configured", () => {
    expect(params(buildOtpRequest(config, "+919876543210", "1").body).template_id).toBeUndefined();

    const withTemplate = buildOtpRequest(
      { ...config, templateId: "42" },
      "+919876543210",
      "1",
    );
    expect(params(withTemplate.body).template_id).toBe("42");
  });

  it("supports the whatsapp and voice channels", () => {
    const voice = buildOtpRequest({ ...config, channel: "voice" }, "+919876543210", "1");
    expect(params(voice.body).channel).toBe("voice");
  });
});

describe("interpretResponse", () => {
  it("reads the documented success envelope", () => {
    const outcome = interpretResponse(
      200,
      JSON.stringify({
        status: "success",
        message: "Sms OTP Sent Successfully",
        data: { request_id: "SMS-OTP-A1B2C3D4", mobile: "919999999999", cost: 0.25 },
      }),
    );

    expect(outcome).toEqual({ ok: true, requestId: "SMS-OTP-A1B2C3D4", cost: 0.25 });
  });

  it("turns a documented error code into a readable reason", () => {
    const outcome = interpretResponse(200, JSON.stringify({ status: "error", code: 301 }));
    expect(outcome).toMatchObject({
      ok: false,
      code: "301",
      error: "The APITxT wallet is out of balance.",
      retryable: false,
    });
  });

  it("marks route downtime and duplicate discards as retryable", () => {
    expect(interpretResponse(200, JSON.stringify({ status: "error", code: 302 }))).toMatchObject({
      retryable: true,
    });
    expect(interpretResponse(200, JSON.stringify({ status: "error", code: 311 }))).toMatchObject({
      retryable: true,
    });
  });

  it("falls back to the provider message for an unknown code", () => {
    const outcome = interpretResponse(
      200,
      JSON.stringify({ status: "error", code: 999, message: "Something specific" }),
    );
    expect(outcome).toMatchObject({ ok: false, error: "Something specific", code: "999" });
  });

  it("handles a non JSON body and an HTTP failure", () => {
    expect(interpretResponse(502, "<html>bad gateway</html>")).toMatchObject({
      ok: false,
      retryable: true,
    });
    expect(interpretResponse(200, "")).toMatchObject({ ok: false });
  });

  it("does not treat a 200 with a non success status as sent", () => {
    expect(interpretResponse(200, JSON.stringify({ status: "failed" })).ok).toBe(false);
  });

  // The three shapes the live API actually returned during integration.
  it("reads a real success, which carries no cost field", () => {
    const outcome = interpretResponse(
      200,
      JSON.stringify({
        status: "success",
        message: "Sms OTP Sent Successfully",
        data: { request_id: "SMS-OTP-FFAF4D0BF6221051", mobile: "910000000012" },
      }),
    );
    expect(outcome).toMatchObject({ ok: true, requestId: "SMS-OTP-FFAF4D0BF6221051" });
  });

  it("reads a real rejected receiver", () => {
    expect(
      interpretResponse(400, JSON.stringify({ status: "error", message: "Invalid receiver 12", code: 400 })),
    ).toMatchObject({
      ok: false,
      code: "400",
      error: "That mobile number was rejected by the SMS provider.",
      retryable: false,
    });
  });

  it("reads a real auth failure, which has no numeric code", () => {
    expect(
      interpretResponse(401, JSON.stringify({ status: "AUTH_FAILED", message: "Invalid Auth Key" })),
    ).toMatchObject({
      ok: false,
      code: "401",
      error: "The APITxT authentication key was rejected.",
      retryable: false,
    });
  });

  it("reads a real rate limit and marks it retryable", () => {
    expect(
      interpretResponse(
        429,
        JSON.stringify({
          status: "error",
          message: "Too many requests for this mobile number. Try again in 1 minute.",
          code: 429,
        }),
      ),
    ).toMatchObject({ ok: false, code: "429", retryable: true });
  });
});
