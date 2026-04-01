import { afterAll, describe, expect, it } from "vitest";
import { readTarball } from "../../src/core/tarball.js";
import { rule } from "../../src/rules/required-files.js";
import { cleanupFixtures, createFixtureTarball } from "../helpers.js";

afterAll(() => {
	cleanupFixtures();
});

describe("required-files rule", () => {
	it("passes when README and LICENSE are present", async () => {
		const tgz = await createFixtureTarball([
			{ path: "README.md", content: "# My Package" },
			{ path: "LICENSE", content: "MIT License" },
		]);
		const contents = await readTarball(tgz);
		const results = rule.run(contents);

		expect(results).toHaveLength(0);
	});

	it("warns when README is missing", async () => {
		const tgz = await createFixtureTarball([{ path: "LICENSE", content: "MIT License" }]);
		const contents = await readTarball(tgz);
		const results = rule.run(contents);

		const readmeResult = results.find((r) => r.message.includes("README"));
		expect(readmeResult).toBeDefined();
		expect(readmeResult?.severity).toBe("warn");
	});

	it("warns when LICENSE is missing", async () => {
		const tgz = await createFixtureTarball([{ path: "README.md", content: "# Hello" }]);
		const contents = await readTarball(tgz);
		const results = rule.run(contents);

		const licenseResult = results.find((r) => r.message.includes("LICENSE"));
		expect(licenseResult).toBeDefined();
		expect(licenseResult?.severity).toBe("warn");
	});

	it("warns for both README and LICENSE when both are missing", async () => {
		const tgz = await createFixtureTarball([
			{ path: "src/index.ts", content: "export const x = 1;" },
		]);
		const contents = await readTarball(tgz);
		const results = rule.run(contents);

		const readmeResult = results.find((r) => r.message.includes("README"));
		const licenseResult = results.find((r) => r.message.includes("LICENSE"));
		expect(readmeResult).toBeDefined();
		expect(licenseResult).toBeDefined();
	});

	it("detects readme with different casing", async () => {
		const tgz = await createFixtureTarball([
			{ path: "readme.md", content: "# Hello" },
			{ path: "LICENSE", content: "MIT" },
		]);
		const contents = await readTarball(tgz);
		const results = rule.run(contents);

		expect(results).toHaveLength(0);
	});
});
