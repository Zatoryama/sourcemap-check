import { afterAll, describe, expect, it } from "vitest";
import { readTarball } from "../../src/core/tarball.js";
import { rule } from "../../src/rules/no-config.js";
import { cleanupFixtures, createFixtureTarball } from "../helpers.js";

afterAll(() => {
	cleanupFixtures();
});

describe("no-config rule", () => {
	it("flags .eslintrc.json", async () => {
		const tgz = await createFixtureTarball([{ path: ".eslintrc.json", content: "{}" }]);
		const contents = await readTarball(tgz);
		const results = rule.run(contents);

		expect(results).toHaveLength(1);
		expect(results[0].files).toContain(".eslintrc.json");
	});

	it("flags tsconfig.json", async () => {
		const tgz = await createFixtureTarball([{ path: "tsconfig.json", content: "{}" }]);
		const contents = await readTarball(tgz);
		const results = rule.run(contents);

		expect(results).toHaveLength(1);
		expect(results[0].files).toContain("tsconfig.json");
	});

	it("flags .vscode/settings.json", async () => {
		const tgz = await createFixtureTarball([{ path: ".vscode/settings.json", content: "{}" }]);
		const contents = await readTarball(tgz);
		const results = rule.run(contents);

		expect(results).toHaveLength(1);
		expect(results[0].files).toContain(".vscode/settings.json");
	});

	it("does NOT flag src/config.ts", async () => {
		const tgz = await createFixtureTarball([
			{ path: "src/config.ts", content: "export const config = {};" },
		]);
		const contents = await readTarball(tgz);
		const results = rule.run(contents);

		expect(results).toHaveLength(0);
	});

	it("returns severity 'warn'", async () => {
		const tgz = await createFixtureTarball([{ path: "tsconfig.json", content: "{}" }]);
		const contents = await readTarball(tgz);
		const results = rule.run(contents);

		expect(results).toHaveLength(1);
		expect(results[0].severity).toBe("warn");
	});

	it("flags multiple config files in one result", async () => {
		const tgz = await createFixtureTarball([
			{ path: ".eslintrc.json", content: "{}" },
			{ path: "tsconfig.json", content: "{}" },
			{ path: "biome.json", content: "{}" },
		]);
		const contents = await readTarball(tgz);
		const results = rule.run(contents);

		expect(results).toHaveLength(1);
		expect(results[0].files).toHaveLength(3);
	});
});
