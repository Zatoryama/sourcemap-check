import { resolve } from "node:path";
import * as tar from "tar";

export interface TarballEntry {
	path: string;
	size: number;
}

const PACKAGE_PREFIX = "package/";

function stripPackagePrefix(entryPath: string): string {
	if (entryPath.startsWith(PACKAGE_PREFIX)) {
		return entryPath.slice(PACKAGE_PREFIX.length);
	}
	return entryPath;
}

export async function readTarball(
	tgzPath: string,
): Promise<{ entries: TarballEntry[]; name: string; version: string }> {
	const absolutePath = resolve(tgzPath);
	const entries: TarballEntry[] = [];
	let manifestBuffer: Buffer | undefined;

	const bufferPromises: Promise<void>[] = [];

	await tar.list({
		file: absolutePath,
		onReadEntry(entry) {
			if (entry.type !== "File") {
				entry.resume();
				return;
			}

			const filePath = stripPackagePrefix(entry.path);

			if (filePath === "package.json") {
				const chunks: Buffer[] = [];
				const p = new Promise<void>((res, rej) => {
					entry.on("data", (chunk: Buffer) => chunks.push(chunk));
					entry.on("end", () => {
						manifestBuffer = Buffer.concat(chunks);
						res();
					});
					entry.on("error", rej);
				});
				bufferPromises.push(p);
			} else {
				entries.push({ path: filePath, size: entry.size ?? 0 });
				entry.resume();
			}
		},
	});

	await Promise.all(bufferPromises);

	let name = "unknown";
	let version = "0.0.0";
	if (manifestBuffer) {
		try {
			const manifest = JSON.parse(manifestBuffer.toString("utf-8"));
			name = manifest.name ?? "unknown";
			version = manifest.version ?? "0.0.0";
		} catch {
			// ignore parse errors
		}
	}

	return { entries, name, version };
}
