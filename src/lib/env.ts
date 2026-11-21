import "server-only";

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env and fill it in.`,
    );
  }
  return value;
}

function optional(value: string | undefined, fallback = ""): string {
  return value && value.trim() !== "" ? value : fallback;
}

export const env = {
  get databaseUrl() {
    return required("DATABASE_URL", process.env.DATABASE_URL);
  },
  get jwtSecret() {
    return required("JWT_SECRET", process.env.JWT_SECRET);
  },
  supabase: {
    url: optional(process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: optional(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    serviceRoleKey: optional(process.env.SUPABASE_SERVICE_ROLE_KEY),
  },
  // Read lazily so a changed .env takes effect without a rebuild.
  sms: {
    get provider() {
      return optional(process.env.SMS_PROVIDER, "mock") as "mock" | "apitxt";
    },
    get apiKey() {
      return optional(process.env.APITXT_API_KEY);
    },
    get endpoint() {
      return optional(process.env.APITXT_ENDPOINT, "https://apitxt.com/api/sendOTP");
    },
    /** sms (default), whatsapp or voice. */
    get channel() {
      return optional(process.env.APITXT_CHANNEL, "sms");
    },
    /** Optional SMS template id from the APITxT dashboard. */
    get templateId() {
      return optional(process.env.APITXT_TEMPLATE_ID);
    },
    get country() {
      return optional(process.env.APITXT_COUNTRY, "91");
    },
  },
  adminOwner: {
    get username() {
      return optional(process.env.ADMIN_OWNER_USERNAME, "prateekchauhan");
    },
    get password() {
      return optional(process.env.ADMIN_OWNER_PASSWORD, "Prateek@2512");
    },
    get name() {
      return optional(process.env.ADMIN_OWNER_NAME, "Prateek Chauhan");
    },
    get otpPhone() {
      return optional(process.env.ADMIN_OWNER_OTP_PHONE, "+917819812678");
    },
  },
  isProduction: process.env.NODE_ENV === "production",
};
