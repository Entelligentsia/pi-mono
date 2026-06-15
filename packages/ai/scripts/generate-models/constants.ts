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
} as const;
