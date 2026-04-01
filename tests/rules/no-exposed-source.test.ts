import { afterAll, describe, expect, it } from "vitest";
import { readTarball } from "../../src/core/tarball.js";
import { rule } from "../../src/rules/no-exposed-source.js";
import { cleanupFixtures, createFixtureTarball } from "../helpers.js";

afterAll(() => {
	cleanupFixtures();
});

describe("no-exposed-source rule", () => {
	it("flags .js.map files", async () => {
		const tgz = await createFixtureTarball([
			{ path: "dist/index.js.map", content: '{"version":3}' },
		]);
		const contents = await readTarball(tgz);
		const results = rule.run(contents);

		expect(results).toHaveLength(1);
		expect(results[0].files).toContain("dist/index.js.map");
	});

	it("flags .css.map files", async () => {
		const tgz = await createFixtureTarball([
			{ path: "dist/styles.css.map", content: '{"version":3}' },
		]);
		const contents = await readTarball(tgz);
		const results = rule.run(contents);

		expect(results).toHaveLength(1);
		expect(results[0].files).toContain("dist/styles.css.map");
	});

	it("does NOT flag .js files", async () => {
		const tgz = await createFixtureTarball([
			{ path: "dist/index.js", content: "module.exports = {};" },
		]);
		const contents = await readTarball(tgz);
		const results = rule.run(contents);

		expect(results).toHaveLength(0);
	});

	it("returns severity 'warn'", async () => {
		const tgz = await createFixtureTarball([{ path: "dist/index.js.map", content: "{}" }]);
		const contents = await readTarball(tgz);
		const results = rule.run(contents);

		expect(results).toHaveLength(1);
		expect(results[0].severity).toBe("error");
	});

	it("flags multiple sourcemap files in a single result", async () => {
		const tgz = await createFixtureTarball([
			{ path: "dist/a.js.map", content: "{}" },
			{ path: "dist/b.mjs.map", content: "{}" },
			{ path: "dist/c.cjs.map", content: "{}" },
		]);
		const contents = await readTarball(tgz);
		const results = rule.run(contents);

		expect(results).toHaveLength(1);
		expect(results[0].files).toHaveLength(3);
	});
});
