#!/usr/bin/env node

import { unlink } from "node:fs/promises";
import { Command } from "commander";
import { packProject } from "./core/packer.js";
import { readTarball } from "./core/tarball.js";
import { formatJsonReport } from "./reporters/json.js";
import { formatTextReport } from "./reporters/text.js";
import { getDefaultRules, getExitCode, runRules } from "./rules/engine.js";
import type { Rule } from "./rules/types.js";

const VERSION = "0.1.0";

interface CliOptions {
	json?: boolean;
	ignore?: string;
	maxSize?: string;
}

function filterRules(rules: Rule[], ignore: string | undefined): Rule[] {
	if (!ignore) return rules;

	const ignored = new Set(ignore.split(",").map((s) => s.trim()));
	return rules.filter((r) => !ignored.has(r.name));
}

async function runCheck(tgzPath: string, options: CliOptions): Promise<number> {
	const contents = await readTarball(tgzPath);
	const rules = filterRules(getDefaultRules(), options.ignore);
	const results = runRules(contents, rules);
	const ruleNames = rules.map((r) => r.name);

	const output = options.json
		? formatJsonReport(results, contents)
		: formatTextReport(results, contents, ruleNames);

	process.stdout.write(`${output}\n`);

	return getExitCode(results);
}

const program = new Command();

program
	.name("publishguard")
	.description("Pre-publish tarball validator for npm packages")
	.version(VERSION);

program
	.command("check")
	.description("Validate an existing .tgz tarball")
	.argument("<tarball>", "path to .tgz file")
	.option("--json", "output as JSON")
	.option("--ignore <rules>", "comma-separated rule names to skip")
	.option("--max-size <kb>", "override size-limit threshold in KB")
	.action(async (tarball: string, options: CliOptions) => {
		try {
			const exitCode = await runCheck(tarball, options);
			process.exit(exitCode);
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			process.stderr.write(`Error: ${message}\n`);
			process.exit(2);
		}
	});

// Default command — pack and validate
program
	.option("--json", "output as JSON")
	.option("--ignore <rules>", "comma-separated rule names to skip")
	.option("--max-size <kb>", "override size-limit threshold in KB")
	.action(async (options: CliOptions) => {
		let tgzPath: string | undefined;

		try {
			tgzPath = await packProject(process.cwd());
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			process.stderr.write(`Error running npm pack: ${message}\n`);
			process.exit(2);
		}

		try {
			const exitCode = await runCheck(tgzPath, options);

			// Clean up the generated tarball
			try {
				await unlink(tgzPath);
			} catch {
				// Ignore cleanup errors
			}

			process.exit(exitCode);
		} catch (err) {
			// Clean up on failure too
			try {
				await unlink(tgzPath);
			} catch {
				// Ignore cleanup errors
			}

			const message = err instanceof Error ? err.message : String(err);
			process.stderr.write(`Error: ${message}\n`);
			process.exit(2);
		}
	});

program.parse();
