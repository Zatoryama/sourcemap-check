import { afterAll, describe, expect, it } from "vitest";
import { readTarball } from "../../src/core/tarball.js";
import { findSourceMaps } from "../../src/rules/no-exposed-source.js";
import { cleanupFixtures, createFixtureTarball } from "../helpers.js";

afterAll(() => {
	cleanupFixtures();
});

describe("findSourceMaps", () => {
	it("flags .js.map files", async () => {
		const tgz = await createFixtureTarball([
			{ path: "dist/index.js.map", content: '{"version":3}' },
		]);
		const { entries } = await readTarball(tgz);
		const found = findSourceMaps(entries);

		expect(found).toContain("dist/index.js.map");
	});

	it("flags .css.map files", async () => {
		const tgz = await createFixtureTarball([
			{ path: "dist/styles.css.map", content: '{"version":3}' },
		]);
		const { entries } = await readTarball(tgz);
		const found = findSourceMaps(entries);

		expect(found).toContain("dist/styles.css.map");
	});

	it("flags .mjs.map and .cjs.map files", async () => {
		const tgz = await createFixtureTarball([
			{ path: "dist/a.mjs.map", content: "{}" },
			{ path: "dist/b.cjs.map", content: "{}" },
		]);
		const { entries } = await readTarball(tgz);
		const found = findSourceMaps(entries);

		expect(found).toHaveLength(2);
	});

	it("does NOT flag .js files", async () => {
		const tgz = await createFixtureTarball([
			{ path: "dist/index.js", content: "module.exports = {};" },
		]);
		const { entries } = await readTarball(tgz);
		const found = findSourceMaps(entries);

		expect(found).toHaveLength(0);
	});

	it("returns empty array when no source maps found", async () => {
		const tgz = await createFixtureTarball([
			{ path: "dist/index.js", content: "module.exports = {};" },
			{ path: "README.md", content: "# Hello" },
		]);
		const { entries } = await readTarball(tgz);
		const found = findSourceMaps(entries);

		expect(found).toHaveLength(0);
	});
});
