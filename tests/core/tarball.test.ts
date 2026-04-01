import { afterAll, describe, expect, it } from "vitest";
import { readTarball } from "../../src/core/tarball.js";
import { cleanupFixtures, createFixtureTarball } from "../helpers.js";

afterAll(() => {
	cleanupFixtures();
});

describe("readTarball", () => {
	it("reads a fixture tarball and returns entries, manifest, and totalSize", async () => {
		const tgz = await createFixtureTarball([
			{ path: "src/index.ts", content: "export const x = 1;" },
			{ path: "README.md", content: "# Hello" },
		]);

		const result = await readTarball(tgz);

		// Should have 3 entries: package.json + 2 fixture files
		expect(result.entries).toHaveLength(3);
		expect(result.manifest).toEqual({ name: "test-package", version: "1.0.0" });
		expect(result.totalSize).toBeGreaterThan(0);
		expect(result.filePath).toBe(tgz);
	});

	it("strips package/ prefix from entry paths", async () => {
		const tgz = await createFixtureTarball([{ path: "src/index.ts", content: "hello" }]);

		const result = await readTarball(tgz);
		const paths = result.entries.map((e) => e.path);

		expect(paths).toContain("package.json");
		expect(paths).toContain("src/index.ts");

		// No entry should start with "package/"
		for (const p of paths) {
			expect(p.startsWith("package/")).toBe(false);
		}
	});

	it("parses package.json as manifest", async () => {
		const manifest = {
			name: "my-pkg",
			version: "2.3.4",
			description: "A test package",
		};
		const tgz = await createFixtureTarball([], manifest);

		const result = await readTarball(tgz);

		expect(result.manifest).toEqual(manifest);
	});

	it("throws on non-existent file", async () => {
		await expect(readTarball("/nonexistent/path.tgz")).rejects.toThrow();
	});

	it("computes totalSize as sum of all entry sizes", async () => {
		const content1 = "a".repeat(100);
		const content2 = "b".repeat(200);
		const tgz = await createFixtureTarball([
			{ path: "file1.txt", content: content1 },
			{ path: "file2.txt", content: content2 },
		]);

		const result = await readTarball(tgz);

		const manualSum = result.entries.reduce((sum, e) => sum + e.size, 0);
		expect(result.totalSize).toBe(manualSum);
	});

	it("stores file content as Buffer in each entry", async () => {
		const tgz = await createFixtureTarball([{ path: "hello.txt", content: "world" }]);

		const result = await readTarball(tgz);
		const entry = result.entries.find((e) => e.path === "hello.txt");

		expect(entry).toBeDefined();
		expect(Buffer.isBuffer(entry?.content)).toBe(true);
		expect(entry?.content.toString("utf-8")).toBe("world");
	});
});
