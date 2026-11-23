import "server-only";
import {
  detectStack,
  findMummies,
  findPoltergeists,
  findPossessedConfigs,
  findSkeletons,
  snapshot,
  type Finding,
  type ScanResult,
} from "@haunted/core";
import { lintCode } from "@haunted/core/code";
import type { RepoTree, SourceFile } from "@haunted/github";

interface Input {
  tree: RepoTree;
  codeFiles: SourceFile[];
  textFiles: SourceFile[];
  lockFiles: SourceFile[];
  notes: string[];
  repo: string;
}

/** Spiders, bats, zombies and possessed code via the ESLint pipeline; repo creatures from config and docs. */
export function runRepoScanners({ tree, codeFiles, textFiles, lockFiles, notes, repo }: Input): { findings: Finding[]; stack: ScanResult["stack"] } {
  const lint = lintCode(codeFiles);
  if (lint.skipped > 0) notes.push(`${lint.skipped} code file${lint.skipped === 1 ? "" : "s"} could not be parsed and were skipped.`);
  if (lint.truncated) notes.push("Many code findings: only the most severe 120 are shown.");

  const snap = snapshot(tree.paths, [...textFiles, ...codeFiles, ...lockFiles]);
  const codeText = codeFiles.map((f) => f.content).join("\n");
  const sqlFiles = [...new Set(lint.findings.filter((f) => f.rule === "spider/sql-concat").map((f) => f.file))];

  return {
    findings: [
      ...lint.findings,
      ...findPoltergeists(snap),
      ...findPossessedConfigs(snap),
      ...findMummies(snap, repo, codeText),
      ...findSkeletons(snap, codeFiles, sqlFiles),
    ],
    stack: detectStack(snap),
  };
}
