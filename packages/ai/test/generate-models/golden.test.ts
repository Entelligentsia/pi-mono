import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { gunzipSync } from "zlib";
import { type FetchFn, generateModels } from "../../scripts/generate-models.ts";

const fixturesDir = join(fileURLToPath(new URL(".", import.meta.url)), "fixtures");

const URL_TO_FIXTURE: Record<string, string> = {
	"https://models.dev/api.json": "models-dev.json.gz",
	"https://openrouter.ai/api/v1/models": "openrouter.json.gz",
	"https://ai-gateway.vercel.sh/v1/models": "ai-gateway.json.gz",
	"https://integrate.api.nvidia.com/v1/models": "nvidia-nim.json.gz",
};

/** Deterministic fetch backed by frozen, gzipped fixtures captured from the live APIs. */
const fixtureFetch: FetchFn = async (url: string) => {
	const fixture = URL_TO_FIXTURE[url];
	if (!fixture) throw new Error(`No fixture registered for URL: ${url}`);
	const body = gunzipSync(readFileSync(join(fixturesDir, fixture))).toString("utf8");
	return { json: async () => JSON.parse(body) };
};

describe("generate-models golden snapshot", () => {
	it("produces byte-identical output from frozen fixtures", async () => {
		const output = await generateModels({ fetchFn: fixtureFetch, write: false });
		await expect(output).toMatchFileSnapshot("./__snapshots__/models.generated.snap");
	});
});
