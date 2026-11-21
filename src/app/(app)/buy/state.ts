export type ChatButtonState = {
  status: "idle" | "error" | "no_credits";
  error?: string;
};

export const initialChatButtonState: ChatButtonState = { status: "idle" };
