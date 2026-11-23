import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { lintCode } from "./lint";
import { isValidFinding } from "../validate";

const rules = (path: string, content: string) => lintCode([{ path, content }]).findings.map((f) => f.rule);

describe("code pipeline", () => {
  it("spiders", () => {
    expect(rules("a.ts", "const r = await db.query(`SELECT * FROM orders WHERE id = ${id}`);")).toContain("spider/sql-concat");
    expect(rules("a.js", "eval(userCode);")).toContain("spider/eval");
    expect(rules("a.js", "el.innerHTML = comment;")).toContain("spider/inner-html");
    expect(rules("a.js", "exec(`git log ${branch}`);")).toContain("spider/exec-input");
    expect(rules("a.js", "const h = crypto.createHash('md5');")).toContain("spider/weak-hash");
    expect(rules("a.js", "https.request({ rejectUnauthorized: false });")).toContain("spider/tls-off");
    expect(rules("a.js", "app.use(cors({ origin: '*', credentials: true }));")).toContain("spider/cors-wildcard");
    expect(rules("a.tsx", "export const A = () => <div dangerouslySetInnerHTML={{ __html: x }} />;")).toContain("spider/inner-html");
  });

  it("spider negatives", () => {
    expect(rules("a.ts", "await db.query('SELECT * FROM orders WHERE id = $1', [id]);")).not.toContain("spider/sql-concat");
    expect(rules("a.js", "el.innerHTML = '<b>hi</b>';")).not.toContain("spider/inner-html");
    expect(rules("a.js", "execFile('git', ['log', branch]);")).not.toContain("spider/exec-input");
  });

  it("bats", () => {
    expect(rules("a.ts", "async function f(ids) { for (const id of ids) { await db.findOne(id); } }")).toContain("bat/query-in-loop");
    expect(rules("a.ts", "import moment from 'moment';")).toContain("bat/full-library-import");
    expect(rules("a.tsx", "useEffect(() => { window.addEventListener('scroll', f); }, []);")).toContain("bat/listener-leak");
    expect(rules("a.tsx", "useEffect(() => { window.addEventListener('scroll', f); return () => window.removeEventListener('scroll', f); }, []);")).not.toContain("bat/listener-leak");
  });

  it("lodash named import gets a per-function patch", () => {
    const [f] = lintCode([{ path: "src/u.ts", content: "import { debounce, merge } from 'lodash';\nexport { debounce, merge };\n" }]).findings.filter((x) => x.rule === "bat/full-library-import");
    expect(f?.autoFixable).toBe(true);
    expect(f?.patch).toContain('+import debounce from "lodash/debounce";');
    expect(f?.patch).toContain('+import merge from "lodash/merge";');
  });

  it("possessed", () => {
    expect(rules("a.ts", "execSync(completion.choices[0].message.content);")).toContain("possessed/llm-exec");
    expect(rules("a.ts", "const systemPrompt = `You are a bot. User said: ${req.body.text}`;")).toContain("possessed/prompt-injection");
  });

  it("zombies with built-in rules and fix patches", () => {
    const out = lintCode([{ path: "src/auth.js", content: "if (role == 'admin') { grant(); }\nvar x = 1;\nfetch('/ping');\n" }]).findings;
    const r = out.map((f) => f.rule);
    expect(r).toEqual(expect.arrayContaining(["eqeqeq", "no-var", "zombie/floating-promise"]));
    const varFix = out.find((f) => f.rule === "no-var")!;
    expect(varFix.patch).toContain("+let x = 1;");
    for (const f of out) expect(isValidFinding(f)).toBe(true);
  });

  it("skips unparsable files and never throws", () => {
    const r = lintCode([{ path: "bad.ts", content: "const = = ;" }]);
    expect(r.skipped).toBe(1);
    fc.assert(
      fc.property(fc.string({ maxLength: 200 }), (s) => {
        expect(() => lintCode([{ path: "x.ts", content: s }])).not.toThrow();
      }),
      { numRuns: 60 },
    );
  });
});
