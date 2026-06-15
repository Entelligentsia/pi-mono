import { BASE_URLS } from "./constants.ts";
import type { ProviderDescriptor } from "./normalize.ts";

/** Bedrock is region-aware: `eu.`-prefixed model ids route to eu-central-1. */
export function getBedrockBaseUrl(modelId: string): string {
	return modelId.startsWith("eu.") ? BASE_URLS.bedrockEuCentral : BASE_URLS.bedrockUsEast;
}

/** Bedrock models that advertise tool support but can't actually be used here. */
function skipBedrockModel(modelId: string): boolean {
	// ai21.jamba: no tool use in streaming mode. mistral-7b-instruct-v0: no system messages.
	return modelId.startsWith("ai21.jamba") || modelId.startsWith("mistral.mistral-7b-instruct-v0");
}

/**
 * Providers whose models.dev entries map onto `Model` with no per-model
 * special-casing. Adding such a provider is one row here — no copy-pasted
 * loop body. Providers with bespoke logic (Cloudflare routing, OpenCode
 * npm-field dispatch, NVIDIA id remap, Together/github-copilot compat) keep
 * their hand-written blocks in generate-models.ts.
 */
export const CATALOG_DESCRIPTORS: ProviderDescriptor[] = [
	{ catalogKey: "amazon-bedrock", provider: "amazon-bedrock", api: "bedrock-converse-stream", baseUrl: getBedrockBaseUrl, skip: skipBedrockModel },
	{ catalogKey: "anthropic", provider: "anthropic", api: "anthropic-messages", baseUrl: BASE_URLS.anthropic },
	{ catalogKey: "google", provider: "google", api: "google-generative-ai", baseUrl: BASE_URLS.googleGenAI },
	{ catalogKey: "openai", provider: "openai", api: "openai-responses", baseUrl: BASE_URLS.openaiResponses },
	{ catalogKey: "groq", provider: "groq", api: "openai-completions", baseUrl: BASE_URLS.groq },
	{ catalogKey: "cerebras", provider: "cerebras", api: "openai-completions", baseUrl: BASE_URLS.cerebras },
	{ catalogKey: "xai", provider: "xai", api: "openai-completions", baseUrl: BASE_URLS.xai },
	{ catalogKey: "mistral", provider: "mistral", api: "mistral-conversations", baseUrl: BASE_URLS.mistral },
];
