import { afterAll, describe, expect, it } from "vitest";
import { readTarball } from "../../src/core/tarball.js";
import { rule } from "../../src/rules/no-tests.js";
import { cleanupFixtures, createFixtureTarball } from "../helpers.js";

afterAll(() => {
	cleanupFixtures();
});

describe("no-tests rule", () => {
	it("flags __tests__/foo.ts", async () => {
		const tgz = await createFixtureTarball([
			{ path: "__tests__/foo.ts", content: "test('x', () => {})" },
		]);
		const contents = await readTarball(tgz);
		const results = rule.run(contents);

		expect(results).toHaveLength(1);
		expect(results[0].files).toContain("__tests__/foo.ts");
	});

	it("flags *.test.ts files", async () => {
		const tgz = await createFixtureTarball([
			{ path: "src/utils.test.ts", content: "test('x', () => {})" },
		]);
		const contents = await readTarball(tgz);
		const results = rule.run(contents);

		expect(results).toHaveLength(1);
		expect(results[0].files).toContain("src/utils.test.ts");
	});

	it("flags *.spec.js files", async () => {
		const tgz = await createFixtureTarball([
			{ path: "lib/parser.spec.js", content: "describe('x', () => {})" },
		]);
		const contents = await readTarball(tgz);
		const results = rule.run(contents);

		expect(results).toHaveLength(1);
		expect(results[0].files).toContain("lib/parser.spec.js");
	});

	it("flags jest.config.js", async () => {
		const tgz = await createFixtureTarball([
			{ path: "jest.config.js", content: "module.exports = {};" },
		]);
		const contents = await readTarball(tgz);
		const results = rule.run(contents);

		expect(results).toHaveLength(1);
		expect(results[0].files).toContain("jest.config.js");
	});

	it("flags vitest.config.ts", async () => {
		const tgz = await createFixtureTarball([
			{ path: "vitest.config.ts", content: "export default {}" },
		]);
		const contents = await readTarball(tgz);
		const results = rule.run(contents);

		expect(results).toHaveLength(1);
		expect(results[0].files).toContain("vitest.config.ts");
	});

	it("does NOT flag src/utils.ts", async () => {
		const tgz = await createFixtureTarball([
			{
				path: "src/utils.ts",
				content: "export function add(a: number, b: number) { return a + b; }",
			},
		]);
		const contents = await readTarball(tgz);
		const results = rule.run(contents);

		expect(results).toHaveLength(0);
	});

	it("returns severity 'warn'", async () => {
		const tgz = await createFixtureTarball([
			{ path: "src/utils.test.ts", content: "test('x', () => {})" },
		]);
		const contents = await readTarball(tgz);
		const results = rule.run(contents);

		expect(results).toHaveLength(1);
		expect(results[0].severity).toBe("warn");
	});
});
