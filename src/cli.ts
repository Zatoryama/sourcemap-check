#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pc from "picocolors";
import { packProject } from "./core/packer.js";
import { readTarball } from "./core/tarball.js";
import { findSourceMaps } from "./rules/no-exposed-source.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf-8"));
const VERSION: string = pkg.version;

const args = process.argv.slice(2);

if (args.includes("--version") || args.includes("-v")) {
	process.stdout.write(`sourcemap-check v${VERSION}\n`);
	process.exit(0);
}

if (args.includes("--help") || args.includes("-h")) {
	process.stdout.write(`sourcemap-check v${VERSION}

Check npm packages for source maps that expose source code.

Usage:
  sourcemap-check [options] [tarball]

Options:
  --json       Output results as JSON
  --help, -h   Show this help message
  --version, -v  Show version number

Examples:
  sourcemap-check              Check current project
  sourcemap-check ./pkg.tgz   Check an existing tarball
  sourcemap-check --json       JSON output for CI
`);
	process.exit(0);
}

const jsonMode = args.includes("--json");
const tarballArg = args.find((a) => !a.startsWith("--"));

async function run(): Promise<void> {
	let tgzPath: string;
	let cleanup = false;

	if (tarballArg) {
		tgzPath = tarballArg;
	} else {
		try {
			tgzPath = await packProject(process.cwd());
			cleanup = true;
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			process.stderr.write(`Error running npm pack: ${msg}\n`);
			process.exit(2);
		}
	}

	try {
		const { entries, name, version } = await readTarball(tgzPath);
		const sourceMaps = findSourceMaps(entries);

		if (jsonMode) {
			const report = {
				package: name,
				version,
				files: entries.length,
				sourceMaps,
				passed: sourceMaps.length === 0,
			};
			process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
		} else {
			process.stdout.write(`sourcemap-check v${VERSION} — checking ${name}@${version}\n\n`);

			if (sourceMaps.length === 0) {
				process.stdout.write(`${pc.green(pc.bold("PASS"))} No source maps found.\n`);
			} else {
				process.stdout.write(
					`${pc.red(pc.bold("FAIL"))} Found ${sourceMaps.length} source map file(s) exposing source code:\n\n`,
				);
				for (const file of sourceMaps) {
					process.stdout.write(`  ${pc.dim(file)}\n`);
				}
				process.stdout.write("\n");
			}
		}

		if (cleanup) {
			try {
				await unlink(tgzPath);
			} catch {
				// ignore
			}
		}

		process.exit(sourceMaps.length > 0 ? 1 : 0);
	} catch (err) {
		if (cleanup) {
			try {
				await unlink(tgzPath);
			} catch {
				// ignore
			}
		}
		const msg = err instanceof Error ? err.message : String(err);
		process.stderr.write(`Error: ${msg}\n`);
		process.exit(2);
	}
}

run();
