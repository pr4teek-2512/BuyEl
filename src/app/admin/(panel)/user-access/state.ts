export type OwnerEditState = {
  step: "idle" | "verify" | "done";
  maskedPhone?: string;
  /** Only present while SMS_PROVIDER=mock. */
  devCode?: string;
  error?: string;
  success?: string;
};

export const initialOwnerEditState: OwnerEditState = { step: "idle" };
