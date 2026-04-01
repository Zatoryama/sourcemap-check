import { afterAll, describe, expect, it } from "vitest";
import { readTarball } from "../../src/core/tarball.js";
import { cleanupFixtures, createFixtureTarball } from "../helpers.js";

afterAll(() => {
	cleanupFixtures();
});

describe("readTarball", () => {
	it("reads entries from a tarball", async () => {
		const tgz = await createFixtureTarball([
			{ path: "src/index.ts", content: "export const x = 1;" },
			{ path: "README.md", content: "# Hello" },
		]);

		const result = await readTarball(tgz);
		const paths = result.entries.map((e) => e.path);

		expect(paths).toContain("src/index.ts");
		expect(paths).toContain("README.md");
	});

	it("strips package/ prefix from entry paths", async () => {
		const tgz = await createFixtureTarball([{ path: "src/index.ts", content: "hello" }]);

		const result = await readTarball(tgz);

		for (const entry of result.entries) {
			expect(entry.path).not.toMatch(/^package\//);
		}
	});

	it("parses name and version from package.json", async () => {
		const tgz = await createFixtureTarball([], { name: "my-pkg", version: "2.0.0" });

		const result = await readTarball(tgz);

		expect(result.name).toBe("my-pkg");
		expect(result.version).toBe("2.0.0");
	});

	it("throws on non-existent file", async () => {
		await expect(readTarball("/nonexistent/path.tgz")).rejects.toThrow();
	});

	it("includes entry sizes", async () => {
		const tgz = await createFixtureTarball([{ path: "hello.txt", content: "world" }]);

		const result = await readTarball(tgz);
		const entry = result.entries.find((e) => e.path === "hello.txt");

		expect(entry).toBeDefined();
		expect(entry?.size).toBeGreaterThan(0);
	});
});
