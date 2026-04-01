# publishguard

Pre-publish tarball validator for npm packages. Catches leaked secrets, bloat, duplicate files, and misconfigured exports **before** they hit the registry.

```
publishguard v0.1.0 — checking my-package@1.0.0

  47 files, 245 KB (unpacked)

 FAIL  no-secrets (1 files)
       Found 1 potentially sensitive file(s)
       .env.production

 WARN  no-duplicates (6 files)
       Found 2 duplicate group(s), 89.3 KB wasted
       2x identical (41.2 KB each, 41.2 KB wasted):
         src/data/schema.json
         dist/data/schema.json
       2x identical (24.0 KB each, 24.0 KB wasted):
         src/config/defaults.json
         dist/config/defaults.json

 FAIL  no-exposed-source (2 files)
       Found 2 source map file(s) that expose original source code
       dist/index.js.map
       dist/utils.js.map

 PASS  no-tests
 PASS  no-docs
 PASS  no-config
 PASS  size-limit
 PASS  required-files

2 errors, 1 warning — FAILED
```

## Why

Every time you run `npm publish`, a tarball is created and uploaded to the registry. You have almost no visibility into what's actually inside it. This leads to:

- **Leaked secrets** — `.env` files, private keys, API tokens shipped to the public registry
- **Bloat** — test fixtures, source maps, dev configs doubling your package size
- **Duplicate files** — the same JSON or config file copied across `src/` and `dist/`, wasting bandwidth for every install
- **Missing files** — no LICENSE, no README, broken exports

Tools like `publint` and `arethetypeswrong` validate *after* publishing. publishguard validates **before** — with a pass/fail exit code you can drop into any CI pipeline.

## Install

```bash
npm install -D publishguard
```

Or run directly:

```bash
npx publishguard
```

## Usage

### Validate current project

Runs `npm pack` internally, inspects the tarball, and reports issues:

```bash
publishguard
```

### Validate an existing tarball

```bash
publishguard check ./my-package-1.0.0.tgz
```

### CI mode (JSON output)

```bash
publishguard --json
```

Returns structured JSON for programmatic consumption:

```json
{
  "package": "my-package",
  "version": "1.0.0",
  "files": 47,
  "totalSize": 250880,
  "passed": false,
  "errors": 1,
  "warnings": 2,
  "results": [
    {
      "rule": "no-secrets",
      "severity": "error",
      "message": "Found 1 potentially sensitive file(s)",
      "files": [".env.production"]
    }
  ]
}
```

### Skip specific rules

```bash
publishguard --ignore no-exposed-source,no-docs
```

### Custom size limit

```bash
publishguard --max-size 2048  # 2 MB threshold (default: 1024 KB)
```

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | All checks passed (warnings are OK) |
| `1` | One or more errors found |
| `2` | Tool error (e.g. `npm pack` failed) |

## Default rules

All rules are enabled out of the box with zero configuration.

### `no-secrets` (error)

Flags files that may contain secrets or credentials:

- **By filename**: `.env`, `.env.local`, `.env.production`, `.npmrc`, `.netrc`, `id_rsa`, `id_ed25519`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, `*.jks`
- **By content**: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `-----BEGIN PRIVATE KEY-----`, GitHub PATs (`ghp_*`), npm tokens (`npm_*`), OpenAI keys (`sk-*`)
- **Safe**: `.env.example`, `.env.sample`, `.env.template` are excluded

### `no-exposed-source` (error)

Flags source map files that expose your original source code: `*.js.map`, `*.css.map`, `*.mjs.map`, `*.cjs.map`

Source maps contain mappings back to your original source — variable names, comments, file structure, and often the full source text via `sourcesContent`. Shipping them in an npm package gives anyone who installs it access to your unminified code.

### `no-tests` (warn)

Flags test files and directories:

`__tests__/`, `*.test.*`, `*.spec.*`, `test/`, `tests/`, `jest.config.*`, `vitest.config.*`, `cypress/`, `__mocks__/`, `__snapshots__/`

### `no-docs` (warn)

Flags internal documentation that shouldn't be published:

- Markdown files other than `README`, `LICENSE`, `CHANGELOG`, `CHANGES`, `HISTORY`
- `docs/`, `doc/`, `.github/` directories

### `no-config` (warn)

Flags dev config files at the package root:

`.eslintrc*`, `.prettierrc*`, `tsconfig*.json`, `biome.json`, `turbo.json`, `.editorconfig`, `.vscode/`, `.idea/`, `.husky/`, `Dockerfile`, `docker-compose*`, `webpack.config.*`, `rollup.config.*`

Smart exclusions:
- Files with `template` in the name are skipped (they generate configs for other projects)
- Config-like files inside `src/` or `dist/` are skipped (they're likely code, not dev configs)

### `no-duplicates` (warn)

Detects files with identical content by SHA-256 hash. Reports each duplicate group with:
- Number of copies
- Size per file
- Total wasted bytes

Common cause: shipping both `src/` and `dist/` with the same JSON, config, or asset files.

### `size-limit` (warn)

Warns when total unpacked tarball size exceeds the threshold (default: 1 MB). Reports the top 5 largest files.

Override with `--max-size <kb>`.

### `required-files` (error/warn)

- **Error** if `package.json` is missing
- **Warn** if no `README` file found
- **Warn** if no `LICENSE` file found

## Add to CI

### npm scripts (recommended)

```json
{
  "scripts": {
    "prepublishOnly": "publishguard"
  }
}
```

This runs automatically before every `npm publish`.

### GitHub Actions

```yaml
- name: Validate package
  run: npx publishguard
```

### With JSON output for custom processing

```yaml
- name: Validate package
  run: npx publishguard --json > publishguard-report.json

- name: Upload report
  uses: actions/upload-artifact@v4
  with:
    name: publishguard-report
    path: publishguard-report.json
```

## Programmatic API

publishguard exports its core functionality for use in other tools:

```typescript
import { readTarball, packProject, runRules, getDefaultRules, getExitCode } from "publishguard";

// Read and validate a tarball
const contents = await readTarball("./my-package-1.0.0.tgz");
const rules = getDefaultRules();
const results = runRules(contents, rules);

console.log(results); // RuleResult[]
console.log(getExitCode(results)); // 0 or 1

// Or pack a project first
const tgzPath = await packProject(process.cwd());
const contents2 = await readTarball(tgzPath);
```

### Types

```typescript
interface TarballEntry {
  path: string;    // relative path (without package/ prefix)
  size: number;
  content: Buffer;
}

interface TarballContents {
  entries: TarballEntry[];
  manifest: Record<string, unknown>;
  totalSize: number;
  filePath: string;
}

interface RuleResult {
  rule: string;
  severity: "error" | "warn" | "info";
  message: string;
  files?: string[];
}

interface Rule {
  name: string;
  description: string;
  defaultSeverity: "error" | "warn" | "info";
  run(contents: TarballContents): RuleResult[];
}
```

## Roadmap

- [ ] Config file (`.publishguard.json`) for custom rules, allowlists, and severity overrides
- [ ] `--fix` flag to auto-generate the `files` field in `package.json`
- [ ] pnpm / yarn / bun pack support
- [ ] Web checker — paste a package name, see what's inside
- [ ] GitHub Action with PR comment integration
- [ ] Plugin API for custom rules

## Requirements

- Node.js >= 20

## License

MIT
