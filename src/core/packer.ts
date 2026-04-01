import { execFile } from "node:child_process";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

interface NpmPackOutput {
	filename: string;
}

export async function packProject(cwd: string): Promise<string> {
	const absoluteCwd = resolve(cwd);

	const { stdout } = await execFileAsync("npm", ["pack", "--json"], {
		cwd: absoluteCwd,
	});

	let parsed: unknown;
	try {
		parsed = JSON.parse(stdout);
	} catch {
		throw new Error(`Failed to parse npm pack output: ${stdout.slice(0, 200)}`);
	}

	if (!Array.isArray(parsed) || parsed.length === 0) {
		throw new Error(`Unexpected npm pack output format: ${stdout.slice(0, 200)}`);
	}

	const result = parsed[0] as NpmPackOutput;
	if (!result.filename || typeof result.filename !== "string") {
		throw new Error(`npm pack output missing filename: ${JSON.stringify(result).slice(0, 200)}`);
	}

	return join(absoluteCwd, result.filename);
}
