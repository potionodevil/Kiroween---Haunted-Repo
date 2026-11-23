/** Node-only entry: the ESLint-based code pipeline. Import from "@haunted/core/code" on servers and in the CLI. */
export { lintCode, CODE_RULES, MAX_CODE_FINDINGS, type CodeFile } from "./lint";
export { scanLocalFiles, type LocalFile } from "./local";
