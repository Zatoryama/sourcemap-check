import { afterAll, describe, expect, it } from "vitest";
import { readTarball } from "../../src/core/tarball.js";
import { rule } from "../../src/rules/size-limit.js";
import { cleanupFixtures, createFixtureTarball } from "../helpers.js";

afterAll(() => {
	cleanupFixtures();
});

describe("size-limit rule", () => {
	it("warns when totalSize exceeds 1MB", async () => {
		// Create files totaling > 1MB
		const bigContent = "x".repeat(600_000);
		const tgz = await createFixtureTarball([
			{ path: "dist/big1.js", content: bigContent },
			{ path: "dist/big2.js", content: bigContent },
		]);
		const contents = await readTarball(tgz);
		const results = rule.run(contents);

		expect(results).toHaveLength(1);
		expect(results[0].severity).toBe("warn");
		expect(results[0].message).toContain("exceeds");
	});

	it("passes when under 1MB limit", async () => {
		const tgz = await createFixtureTarball([
			{ path: "dist/index.js", content: "export const x = 1;" },
		]);
		const contents = await readTarball(tgz);
		const results = rule.run(contents);

		expect(results).toHaveLength(0);
	});

	it("reports top 5 largest files when over limit", async () => {
		const files = [];
		for (let i = 0; i < 7; i++) {
			files.push({
				path: `dist/file${i}.js`,
				content: "y".repeat(200_000),
			});
		}
		const tgz = await createFixtureTarball(files);
		const contents = await readTarball(tgz);
		const results = rule.run(contents);

		expect(results).toHaveLength(1);
		// The files array contains top 5 entries formatted as "path (size)"
		expect(results[0].files).toHaveLength(5);
		const reportedFiles = results[0].files ?? [];
		for (const entry of reportedFiles) {
			expect(entry).toMatch(/\(.+\)$/);
		}
	});
});
