import { afterAll, describe, expect, it } from "vitest";
import { readTarball } from "../../src/core/tarball.js";
import { rule } from "../../src/rules/no-secrets.js";
import { cleanupFixtures, createFixtureTarball } from "../helpers.js";

afterAll(() => {
	cleanupFixtures();
});

describe("no-secrets rule", () => {
	it("flags .env files", async () => {
		const tgz = await createFixtureTarball([{ path: ".env", content: "SECRET=123" }]);
		const contents = await readTarball(tgz);
		const results = rule.run(contents);

		expect(results.length).toBeGreaterThanOrEqual(1);
		const fileResult = results.find((r) => r.files?.includes(".env"));
		expect(fileResult).toBeDefined();
		expect(fileResult?.severity).toBe("error");
	});

	it("flags .env.local and .env.production variants", async () => {
		const tgz = await createFixtureTarball([
			{ path: ".env.local", content: "DB_URL=x" },
			{ path: ".env.production", content: "API_KEY=y" },
		]);
		const contents = await readTarball(tgz);
		const results = rule.run(contents);

		expect(results.length).toBeGreaterThanOrEqual(1);
		const flaggedFiles = results.flatMap((r) => r.files ?? []);
		expect(flaggedFiles).toContain(".env.local");
		expect(flaggedFiles).toContain(".env.production");
	});

	it("flags .pem and .key files", async () => {
		const tgz = await createFixtureTarball([
			{ path: "cert.pem", content: "cert data" },
			{ path: "server.key", content: "key data" },
		]);
		const contents = await readTarball(tgz);
		const results = rule.run(contents);

		expect(results.length).toBeGreaterThanOrEqual(1);
		const flaggedFiles = results.flatMap((r) => r.files ?? []);
		expect(flaggedFiles).toContain("cert.pem");
		expect(flaggedFiles).toContain("server.key");
	});

	it("flags files containing AWS_ACCESS_KEY_ID=AKIA...", async () => {
		const tgz = await createFixtureTarball([
			{
				path: "src/config.ts",
				content: 'const key = "AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE";',
			},
		]);
		const contents = await readTarball(tgz);
		const results = rule.run(contents);

		expect(results.length).toBeGreaterThanOrEqual(1);
		const flaggedFiles = results.flatMap((r) => r.files ?? []);
		expect(flaggedFiles).toContain("src/config.ts");
	});

	it("flags files containing -----BEGIN RSA PRIVATE KEY-----", async () => {
		const tgz = await createFixtureTarball([
			{
				path: "src/auth.ts",
				content: "const pk = `-----BEGIN RSA PRIVATE KEY-----\nMIIE...`",
			},
		]);
		const contents = await readTarball(tgz);
		const results = rule.run(contents);

		expect(results.length).toBeGreaterThanOrEqual(1);
		const flaggedFiles = results.flatMap((r) => r.files ?? []);
		expect(flaggedFiles).toContain("src/auth.ts");
	});

	it("does NOT flag .env.example, .env.sample, .env.template", async () => {
		const tgz = await createFixtureTarball([
			{ path: ".env.example", content: "API_KEY=your-key-here" },
			{ path: ".env.sample", content: "DB_URL=your-db-url" },
			{ path: ".env.template", content: "SECRET=replace-me" },
		]);
		const contents = await readTarball(tgz);
		const results = rule.run(contents);

		const flaggedFiles = results.flatMap((r) => r.files ?? []);
		expect(flaggedFiles).not.toContain(".env.example");
		expect(flaggedFiles).not.toContain(".env.sample");
		expect(flaggedFiles).not.toContain(".env.template");
	});

	it("does NOT flag normal source files", async () => {
		const tgz = await createFixtureTarball([
			{ path: "src/index.ts", content: "export const hello = 'world';" },
			{
				path: "src/utils.ts",
				content: "export function add(a: number, b: number) { return a + b; }",
			},
		]);
		const contents = await readTarball(tgz);
		const results = rule.run(contents);

		expect(results).toHaveLength(0);
	});

	it("returns severity 'error'", async () => {
		const tgz = await createFixtureTarball([{ path: ".env", content: "X=1" }]);
		const contents = await readTarball(tgz);
		const results = rule.run(contents);

		for (const result of results) {
			expect(result.severity).toBe("error");
		}
	});
});
