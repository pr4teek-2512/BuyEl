export type PaymentState = {
  status: "idle" | "submitted" | "error";
  error?: string;
};

export const initialPaymentState: PaymentState = { status: "idle" };
