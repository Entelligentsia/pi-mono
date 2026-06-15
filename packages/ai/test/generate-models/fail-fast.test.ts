import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { afterEach, describe, expect, it } from "vitest";
import { gunzipSync } from "zlib";
import { type FetchFn, generateModels } from "../../scripts/generate-models.ts";

const fixturesDir = join(fileURLToPath(new URL(".", import.meta.url)), "fixtures");

const URL_TO_FIXTURE: Record<string, string> = {
	"https://models.dev/api.json": "models-dev.json.gz",
	"https://openrouter.ai/api/v1/models": "openrouter.json.gz",
	"https://ai-gateway.vercel.sh/v1/models": "ai-gateway.json.gz",
	"https://integrate.api.nvidia.com/v1/models": "nvidia-nim.json.gz",
};

/** Fixture-backed fetch that throws for one chosen URL, to simulate an outage. */
function fetchFailingOn(failUrl: string): FetchFn {
	return async (url: string) => {
		if (url === failUrl) throw new Error(`simulated outage: ${url}`);
		const body = gunzipSync(readFileSync(join(fixturesDir, URL_TO_FIXTURE[url]))).toString("utf8");
		return { json: async () => JSON.parse(body) };
	};
}

describe("generate-models fail-fast", () => {
	afterEach(() => {
		delete process.env.ALLOW_PARTIAL;
	});

	it("aborts when a source fetch fails and ALLOW_PARTIAL is unset", async () => {
		await expect(
			generateModels({ fetchFn: fetchFailingOn("https://models.dev/api.json"), write: false }),
		).rejects.toThrow(/ALLOW_PARTIAL is not set/);
	});

	it("with ALLOW_PARTIAL set, the missing first-party source is caught by the validation gate", async () => {
		process.env.ALLOW_PARTIAL = "1";
		// models.dev down -> no first-party providers -> coverage gate must still fail.
		await expect(
			generateModels({ fetchFn: fetchFailingOn("https://models.dev/api.json"), write: false }),
		).rejects.toThrow(/validation failed/);
	});
});
