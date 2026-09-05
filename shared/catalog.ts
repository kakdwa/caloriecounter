import type { Provider } from "./types";

/** Static facts about each provider. Kept free of SDK imports so the app shell stays small. */
export const PROVIDERS: Record<Provider, { label: string; model: string; env: string; keysUrl: string }> = {
  deepseek: { label: "DeepSeek", model: "deepseek-chat", env: "DEEPSEEK_API_KEY", keysUrl: "https://platform.deepseek.com/api_keys" },
  anthropic: { label: "Claude", model: "claude-opus-5", env: "ANTHROPIC_API_KEY", keysUrl: "https://console.anthropic.com/settings/keys" },
};
