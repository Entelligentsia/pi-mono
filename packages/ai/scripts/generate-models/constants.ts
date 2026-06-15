/**
 * Single home for the base URLs the generator assigns to first-party models.
 *
 * Provider-specific gateway URLs that are shared with the runtime providers
 * (e.g. Cloudflare) are imported from `src/providers/*` and intentionally not
 * duplicated here.
 */
export const BASE_URLS = {
	anthropic: "https://api.anthropic.com",
	openaiResponses: "https://api.openai.com/v1",
	googleGenAI: "https://generativelanguage.googleapis.com/v1beta",
	deepseek: "https://api.deepseek.com",
	xai: "https://api.x.ai/v1",
	mistral: "https://api.mistral.ai",
	together: "https://api.together.ai/v1",
	nvidia: "https://integrate.api.nvidia.com/v1",
	antLing: "https://api.ant-ling.com/v1",
	openRouter: "https://openrouter.ai/api/v1",
	aiGateway: "https://ai-gateway.vercel.sh",
	aiGatewayModels: "https://ai-gateway.vercel.sh/v1",
	groq: "https://api.groq.com/openai/v1",
	cerebras: "https://api.cerebras.ai/v1",
	bedrockUsEast: "https://bedrock-runtime.us-east-1.amazonaws.com",
	bedrockEuCentral: "https://bedrock-runtime.eu-central-1.amazonaws.com",
} as const;

/** Default limits applied when models.dev omits them. */
export const DEFAULT_CONTEXT_WINDOW = 4096;
export const DEFAULT_MAX_TOKENS = 4096;
