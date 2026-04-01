import { afterAll, describe, expect, it } from "vitest";
import { readTarball } from "../../src/core/tarball.js";
import { rule } from "../../src/rules/no-duplicates.js";
import { cleanupFixtures, createFixtureTarball } from "../helpers.js";

afterAll(() => {
	cleanupFixtures();
});

describe("no-duplicates rule", () => {
	it("flags files with identical content", async () => {
		const tgz = await createFixtureTarball([
			{ path: "src/data.json", content: '{"key": "value"}' },
			{ path: "dist/data.json", content: '{"key": "value"}' },
			{ path: "README.md", content: "# Hello" },
		]);
		const contents = await readTarball(tgz);
		const results = rule.run(contents);

		expect(results).toHaveLength(1);
		expect(results[0].severity).toBe("warn");
		expect(results[0].message).toContain("1 duplicate group");
	});

	it("does not flag files with different content", async () => {
		const tgz = await createFixtureTarball([
			{ path: "src/a.ts", content: "const a = 1;" },
			{ path: "src/b.ts", content: "const b = 2;" },
		]);
		const contents = await readTarball(tgz);
		const results = rule.run(contents);

		expect(results).toHaveLength(0);
	});

	it("detects multiple duplicate groups", async () => {
		const tgz = await createFixtureTarball([
			{ path: "a/config.json", content: '{"x":1}' },
			{ path: "b/config.json", content: '{"x":1}' },
			{ path: "a/utils.js", content: "module.exports = {}" },
			{ path: "b/utils.js", content: "module.exports = {}" },
		]);
		const contents = await readTarball(tgz);
		const results = rule.run(contents);

		expect(results).toHaveLength(1);
		expect(results[0].message).toContain("2 duplicate group");
	});

	it("ignores empty files", async () => {
		const tgz = await createFixtureTarball([
			{ path: "a/.gitkeep", content: "" },
			{ path: "b/.gitkeep", content: "" },
		]);
		const contents = await readTarball(tgz);
		const results = rule.run(contents);

		expect(results).toHaveLength(0);
	});

	it("reports wasted bytes", async () => {
		const tgz = await createFixtureTarball([
			{ path: "a/big.json", content: "x".repeat(10000) },
			{ path: "b/big.json", content: "x".repeat(10000) },
			{ path: "c/big.json", content: "x".repeat(10000) },
		]);
		const contents = await readTarball(tgz);
		const results = rule.run(contents);

		expect(results).toHaveLength(1);
		expect(results[0].message).toContain("wasted");
	});
});
