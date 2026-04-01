#!/usr/bin/env node

import { unlink } from "node:fs/promises";
import pc from "picocolors";
import { packProject } from "./core/packer.js";
import { readTarball } from "./core/tarball.js";
import { findSourceMaps } from "./rules/no-exposed-source.js";

const VERSION = "0.1.0";
const args = process.argv.slice(2);
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
			process.stdout.write(`publishguard v${VERSION} — checking ${name}@${version}\n\n`);

			if (sourceMaps.length === 0) {
				process.stdout.write(`${pc.green(pc.bold("PASS"))} No source maps found.\n`);
			} else {
				process.stdout.write(
					`${pc.red(pc.bold("FAIL"))} Found ${sourceMaps.length} source map file(s) exposing original source code:\n\n`,
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
