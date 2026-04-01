import { afterAll, describe, expect, it } from "vitest";
import { readTarball } from "../../src/core/tarball.js";
import { getDefaultRules, getExitCode, runRules } from "../../src/rules/engine.js";
import { cleanupFixtures, createFixtureTarball } from "../helpers.js";

afterAll(() => {
	cleanupFixtures();
});

describe("engine", () => {
	describe("getDefaultRules", () => {
		it("returns 8 rules", () => {
			const rules = getDefaultRules();
			expect(rules).toHaveLength(8);
		});

		it("each rule has required properties", () => {
			const rules = getDefaultRules();
			for (const rule of rules) {
				expect(rule).toHaveProperty("name");
				expect(rule).toHaveProperty("description");
				expect(rule).toHaveProperty("defaultSeverity");
				expect(rule).toHaveProperty("run");
				expect(typeof rule.run).toBe("function");
			}
		});
	});

	describe("runRules", () => {
		it("collects results from all rules", async () => {
			const tgz = await createFixtureTarball([
				{ path: "src/index.ts", content: "export const x = 1;" },
				{ path: "README.md", content: "# Hello" },
				{ path: "LICENSE", content: "MIT" },
			]);
			const contents = await readTarball(tgz);
			const rules = getDefaultRules();
			const results = runRules(contents, rules);

			// Should be an array (may be empty if everything passes)
			expect(Array.isArray(results)).toBe(true);
		});

		it("returns results from multiple failing rules", async () => {
			const tgz = await createFixtureTarball([
				{ path: ".env", content: "SECRET=123" },
				{ path: "dist/index.js.map", content: "{}" },
				{ path: "tsconfig.json", content: "{}" },
			]);
			const contents = await readTarball(tgz);
			const rules = getDefaultRules();
			const results = runRules(contents, rules);

			const ruleNames = [...new Set(results.map((r) => r.rule))];
			expect(ruleNames).toContain("no-secrets");
			expect(ruleNames).toContain("no-exposed-source");
			expect(ruleNames).toContain("no-config");
		});
	});

	describe("getExitCode", () => {
		it("returns 0 when there are no errors", () => {
			const results = [
				{ rule: "test", severity: "warn" as const, message: "warning" },
				{ rule: "test", severity: "info" as const, message: "info" },
			];
			expect(getExitCode(results)).toBe(0);
		});

		it("returns 1 when there are errors", () => {
			const results = [
				{ rule: "test", severity: "warn" as const, message: "warning" },
				{ rule: "test", severity: "error" as const, message: "error" },
			];
			expect(getExitCode(results)).toBe(1);
		});

		it("returns 0 for empty results", () => {
			expect(getExitCode([])).toBe(0);
		});
	});
});
