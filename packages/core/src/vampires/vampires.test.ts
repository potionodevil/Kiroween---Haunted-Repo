import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { parsePackageLock, parsePnpmLock, parseRequirements, parseYarnLock, splitNameVersion } from "./lockfiles";
import { compareVersions, mapVampires, minimalFix, osvSeverity, packageJsonPatch, type OsvVuln } from "./osv";
import { isValidFinding } from "../validate";

const LOCK_V3 = JSON.stringify({
  lockfileVersion: 3,
  packages: {
    "": { name: "shop" },
    "node_modules/express-utils": { version: "2.1.0" },
    "node_modules/express-utils/node_modules/lodash": { version: "4.17.15" },
    "node_modules/lodash": { version: "4.17.21" },
    "node_modules/@scope/pkg": { version: "1.0.0" },
    "node_modules/linked": { version: "1.0.0", link: true },
  },
});

const VULN: OsvVuln = {
  id: "GHSA-test-0001",
  summary: "Prototype pollution in lodash",
  database_specific: { severity: "CRITICAL", cwe_ids: ["CWE-1321"] },
  affected: [{ package: { name: "lodash", ecosystem: "npm" }, ranges: [{ type: "SEMVER", events: [{ introduced: "0" }, { fixed: "4.17.21" }] }] }],
  references: [{ url: "https://example.org/advisory" }],
};

describe("lockfile parsers", () => {
  it("package-lock v3: names, nesting paths, direct flag, scoped, links skipped", () => {
    const { packages } = parsePackageLock(LOCK_V3);
    const nested = packages.find((p) => p.name === "lodash" && p.version === "4.17.15")!;
    expect(nested.path).toEqual(["express-utils@2.1.0", "lodash@4.17.15"]);
    expect(nested.direct).toBe(false);
    expect(packages.find((p) => p.name === "@scope/pkg")?.direct).toBe(true);
    expect(packages.some((p) => p.name === "linked")).toBe(false);
  });

  it("package-lock v1 nested dependencies", () => {
    const v1 = JSON.stringify({ dependencies: { a: { version: "1.0.0", dependencies: { b: { version: "2.0.0" } } } } });
    const b = parsePackageLock(v1).packages.find((p) => p.name === "b")!;
    expect(b.path).toEqual(["a@1.0.0", "b@2.0.0"]);
  });

  it("pnpm keys v5, v6 and v9", () => {
    expect(splitNameVersion("/lodash/4.17.15")).toEqual({ name: "lodash", version: "4.17.15" });
    expect(splitNameVersion("/@scope/a@1.2.3")).toEqual({ name: "@scope/a", version: "1.2.3" });
    expect(splitNameVersion("react-dom@19.0.0(react@19.0.0)")).toEqual({ name: "react-dom", version: "19.0.0" });
    const r = parsePnpmLock({ importers: { ".": { dependencies: { lodash: {} } } }, packages: { "lodash@4.17.15": {} } });
    expect(r.packages[0]).toMatchObject({ name: "lodash", version: "4.17.15", direct: true });
  });

  it("yarn v1", () => {
    const y = `# yarn lockfile v1\n\n"@scope/a@^1.0.0", "@scope/a@^1.1.0":\n  version "1.1.2"\n  resolved "x"\n\nlodash@^4:\n  version "4.17.15"\n`;
    const names = parseYarnLock(y).packages.map((p) => `${p.name}@${p.version}`);
    expect(names).toEqual(["@scope/a@1.1.2", "lodash@4.17.15"]);
  });

  it("requirements: only exact pins", () => {
    const r = parseRequirements("Django==3.2.1\nrequests>=2\n# c\nflask[async]==2.0.0 ; python_version>'3'\n-r other.txt\n");
    expect(r.packages.map((p) => p.name)).toEqual(["django", "flask"]);
    expect(r.skipped).toBe(1);
  });

  it("property: parsers never throw on random input", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 400 }), (s) => {
        expect(() => parsePackageLock(s)).not.toThrow();
        expect(() => parseYarnLock(s)).not.toThrow();
        expect(() => parseRequirements(s)).not.toThrow();
        expect(() => parsePnpmLock({ packages: { [s]: {} } })).not.toThrow();
      }),
    );
  });
});

describe("OSV mapping", () => {
  it("compares versions numerically", () => {
    expect(compareVersions("4.17.21", "4.17.3")).toBe(1);
    expect(compareVersions("1.0.0-beta", "1.0.0")).toBe(-1);
    expect(compareVersions("2.0", "2.0.0")).toBe(0);
  });

  it("severity from GHSA label or CVSS number", () => {
    expect(osvSeverity(VULN)).toBe("critical");
    expect(osvSeverity({ id: "x", severity: [{ type: "CVSS_V3", score: "7.5" }] })).toBe("warning");
    expect(osvSeverity({ id: "x" })).toBe("warning");
  });

  it("builds one valid vampire with path, upgrade and patch", () => {
    const pkgs = parsePackageLock(LOCK_V3).packages.filter((p) => p.name === "lodash" && p.version === "4.17.15");
    pkgs[0]!.direct = true; // pretend direct so the patch is generated
    const pj = `{\n  "dependencies": {\n    "lodash": "^4.17.15"\n  }\n}`;
    const [f] = mapVampires(pkgs, { results: [{ vulns: [{ id: VULN.id }] }] }, new Map([[VULN.id, VULN]]), new Map([["package-lock.json", pj]]));
    expect(isValidFinding(f)).toBe(true);
    expect(f).toMatchObject({ kind: "vampire", severity: "critical", minimalUpgrade: "4.17.21", cwe: "CWE-1321", owasp: "A06:2021" });
    expect(f!.dependencyPath).toEqual(["express-utils@2.1.0", "lodash@4.17.15"]);
    expect(f!.patch).toContain('+    "lodash": "^4.17.21"');
    expect(f!.autoFixable).toBe(true);
  });

  it("skips packages without advisories and has no fix when none is published", () => {
    const pkgs = parsePackageLock(LOCK_V3).packages;
    expect(mapVampires(pkgs, { results: [] }, new Map())).toEqual([]);
    const noFix: OsvVuln = { ...VULN, affected: [{ package: { name: "lodash" }, ranges: [{ events: [{ introduced: "0" }] }] }] };
    const one = pkgs.filter((p) => p.version === "4.17.15");
    expect(minimalFix(noFix, one[0]!)).toBeUndefined();
    const [f] = mapVampires(one, { results: [{ vulns: [{ id: "GHSA-test-0001" }] }] }, new Map([["GHSA-test-0001", noFix]]));
    expect(f!.fix).toContain("No fixed version");
    expect(f!.autoFixable).toBe(false);
  });

  it("package.json patch only when the dependency line exists", () => {
    expect(packageJsonPatch(`{"dependencies": {}}`, "package.json", "lodash", "1.0.0")).toBeUndefined();
  });
});
