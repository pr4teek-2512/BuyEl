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
  sms: {
    provider: optional(process.env.SMS_PROVIDER, "mock") as "mock" | "apitxt",
    apiKey: optional(process.env.APITXT_API_KEY),
    requestUrl: optional(process.env.APITXT_REQUEST_URL),
    requestMethod: optional(process.env.APITXT_REQUEST_METHOD, "GET").toUpperCase(),
    senderId: optional(process.env.APITXT_SENDER_ID),
    templateId: optional(process.env.APITXT_TEMPLATE_ID),
    messageTemplate: optional(
      process.env.OTP_MESSAGE_TEMPLATE,
      "{OTP} is your BuyEl verification code. It is valid for 5 minutes. Do not share it with anyone.",
    ),
  },
  adminOwner: {
    username: optional(process.env.ADMIN_OWNER_USERNAME, "prateekchauhan"),
    password: optional(process.env.ADMIN_OWNER_PASSWORD, "Prateek@2512"),
    name: optional(process.env.ADMIN_OWNER_NAME, "Prateek Chauhan"),
    otpPhone: optional(process.env.ADMIN_OWNER_OTP_PHONE, "+917819812678"),
  },
  isProduction: process.env.NODE_ENV === "production",
};
