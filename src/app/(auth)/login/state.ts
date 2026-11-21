/**
 * Plain module, deliberately not "use server": a server action file may only
 * export async functions, so shared values live here.
 */
export type AuthStep = "phone" | "otp" | "profile";

export type AuthState = {
  step: AuthStep;
  phone: string;
  /** Present only while SMS_PROVIDER=mock, so development can sign in. */
  devCode?: string;
  error?: string;
};

export const initialAuthState: AuthState = { step: "phone", phone: "" };
