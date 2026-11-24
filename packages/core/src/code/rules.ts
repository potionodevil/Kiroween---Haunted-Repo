import type { Rule } from "eslint";

/*
 * Haunted Repo's own ESLint rules: spiders (insecure code), bats (slow code), possessed (AI agent risks)
 * and one zombie (floating promises). ESTree nodes are typed loosely on purpose: the rules read a few
 * well-known fields and must work for JS, TS and JSX alike.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- ESTree nodes from two parsers; fields checked at runtime
type N = any;

const SQL = /\b(select\s.+\sfrom|insert\s+into|update\s+\w+\s+set|delete\s+from)\b/i;
const QUERY_CALLEE = /^(query|execute|raw|exec|run|all|get|prepare|\$queryRawUnsafe|\$executeRawUnsafe|sql)$/;
const DB_CALL = /^(query|execute|find|findOne|findMany|findUnique|findFirst|findAll|findById|get|select|aggregate|count|fetch)$/;
const LLM_NAME = /(completion|response|answer|output|llm|reply|generated|choices|content|message)/i;
const USER_INPUT = /\b(req|request|ctx)\.(body|query|params)\b|searchParams|formData|userInput|input/;

function calleeName(node: N): string | undefined {
  const c = node?.callee;
  if (!c) return undefined;
  if (c.type === "Identifier") return c.name;
  if (c.type === "MemberExpression" && !c.computed && c.property?.type === "Identifier") return c.property.name;
  return undefined;
}

function hasExpressions(node: N): boolean {
  if (!node) return false;
  if (node.type === "TemplateLiteral") return node.expressions.length > 0;
  if (node.type === "BinaryExpression" && node.operator === "+") return true;
  return false;
}

function rawText(ctx: Rule.RuleContext, node: N): string {
  return ctx.sourceCode.getText(node);
}

function isInsideLoop(ctx: Rule.RuleContext, node: N): boolean {
  for (const a of ctx.sourceCode.getAncestors(node).reverse() as N[]) {
    if (["ForStatement", "ForInStatement", "ForOfStatement", "WhileStatement", "DoWhileStatement"].includes(a.type)) return true;
    if ((a.type === "ArrowFunctionExpression" || a.type === "FunctionExpression") && a.parent?.type === "CallExpression") {
      const n = calleeName(a.parent);
      if (n && ["forEach", "map"].includes(n)) return true;
      return false;
    }
    if (a.type === "FunctionDeclaration") return false;
  }
  return false;
}

const rule = (create: Rule.RuleModule["create"], fixable = false): Rule.RuleModule => ({
  meta: { type: "problem", fixable: fixable ? "code" : undefined, schema: [] },
  create,
});

export const HAUNTED_RULES: Record<string, Rule.RuleModule> = {
  // ---------- spiders ----------
  "spider-eval": rule((ctx) => ({
    CallExpression(node: N) {
      const n = calleeName(node);
      if (node.callee.type === "Identifier" && n === "eval") ctx.report({ node, message: "eval runs a string as code." });
      if ((n === "setTimeout" || n === "setInterval") && node.arguments[0] && hasExpressions(node.arguments[0])) {
        ctx.report({ node, message: `${n} with a built string runs it as code.` });
      }
    },
    NewExpression(node: N) {
      if (node.callee.type === "Identifier" && node.callee.name === "Function") ctx.report({ node, message: "new Function runs a string as code." });
    },
  })),
  "spider-inner-html": rule((ctx) => ({
    AssignmentExpression(node: N) {
      const p = node.left?.property?.name;
      if ((p === "innerHTML" || p === "outerHTML") && node.right.type !== "Literal" && !(node.right.type === "TemplateLiteral" && node.right.expressions.length === 0)) {
        ctx.report({ node, message: `${p} is set from a value that may contain user input.` });
      }
    },
    CallExpression(node: N) {
      if (calleeName(node) === "insertAdjacentHTML" && node.arguments[1] && node.arguments[1].type !== "Literal") {
        ctx.report({ node, message: "insertAdjacentHTML is called with a value that may contain user input." });
      }
    },
    JSXAttribute(node: N) {
      if (node.name?.name === "dangerouslySetInnerHTML") ctx.report({ node, message: "dangerouslySetInnerHTML renders raw HTML." });
    },
  })),
  "spider-sql-concat": rule((ctx) => ({
    CallExpression(node: N) {
      const n = calleeName(node);
      const arg = node.arguments[0];
      if (!n || !QUERY_CALLEE.test(n) || !arg || !hasExpressions(arg)) return;
      if (!SQL.test(rawText(ctx, arg))) return;
      ctx.report({ node, message: "A SQL statement is built from values with string concatenation." });
    },
  })),
  "spider-exec-input": rule((ctx) => ({
    CallExpression(node: N) {
      const n = calleeName(node);
      if ((n === "exec" || n === "execSync") && node.arguments[0] && hasExpressions(node.arguments[0])) {
        ctx.report({ node, message: `${n} runs a shell command built from values.` });
      }
    },
  })),
  "spider-weak-hash": rule((ctx) => ({
    CallExpression(node: N) {
      if (calleeName(node) !== "createHash") return;
      const a = node.arguments[0];
      if (a?.type === "Literal" && typeof a.value === "string" && /^(md5|sha1)$/i.test(a.value)) {
        ctx.report({ node, message: `${a.value} is too weak for passwords or signatures.` });
      }
    },
  })),
  "spider-tls-off": rule((ctx) => ({
    Property(node: N) {
      if (node.key?.name === "rejectUnauthorized" && node.value?.type === "Literal" && node.value.value === false) {
        ctx.report({ node, message: "TLS certificate checks are switched off." });
      }
    },
    AssignmentExpression(node: N) {
      const t = rawText(ctx, node.left);
      if (/NODE_TLS_REJECT_UNAUTHORIZED/.test(t)) ctx.report({ node, message: "NODE_TLS_REJECT_UNAUTHORIZED switches off TLS checks for the whole process." });
    },
  })),
  "spider-cors-wildcard": rule((ctx) => ({
    ObjectExpression(node: N) {
      const props = node.properties.filter((p: N) => p.type === "Property");
      const origin = props.find((p: N) => p.key?.name === "origin" && p.value?.type === "Literal" && (p.value.value === "*" || p.value.value === true));
      const creds = props.find((p: N) => p.key?.name === "credentials" && p.value?.type === "Literal" && p.value.value === true);
      if (origin && creds) ctx.report({ node, message: "CORS allows any origin together with credentials." });
    },
  })),

  // ---------- bats ----------
  "bat-query-in-loop": rule((ctx) => ({
    AwaitExpression(node: N) {
      const call = node.argument;
      if (call?.type !== "CallExpression") return;
      const n = calleeName(call);
      if (!n || !DB_CALL.test(n)) return;
      if (isInsideLoop(ctx, node)) ctx.report({ node, message: `\`${n}\` is awaited once per loop turn.` });
    },
  })),
  "bat-full-library-import": rule(
    (ctx) => ({
      ImportDeclaration(node: N) {
        const src = node.source.value;
        if (src !== "lodash" && src !== "moment" && src !== "underscore") return;
        const named = node.specifiers.filter((s: N) => s.type === "ImportSpecifier");
        const whole = node.specifiers.some((s: N) => s.type === "ImportDefaultSpecifier" || s.type === "ImportNamespaceSpecifier");
        if (src === "lodash" && named.length > 0 && !whole) {
          ctx.report({
            node,
            message: `The whole lodash bundle comes in for ${named.length} function${named.length === 1 ? "" : "s"}.`,
            fix: (f) =>
              f.replaceText(
                node,
                named.map((s: N) => `import ${s.local.name} from "lodash/${s.imported.name}";`).join("\n"),
              ),
          });
          return;
        }
        ctx.report({ node, message: `The whole ${src} library is imported.` });
      },
    }),
    true,
  ),
  "bat-listener-leak": rule((ctx) => ({
    CallExpression(node: N) {
      if (calleeName(node) !== "useEffect") return;
      const fn = node.arguments[0];
      if (!fn || !fn.body) return;
      const text = rawText(ctx, fn.body);
      if (/addEventListener\(/.test(text) && !/removeEventListener\(/.test(text)) {
        ctx.report({ node, message: "A listener is added in an effect and never removed." });
      }
    },
  })),
  "bat-sequential-await": rule((ctx) => ({
    BlockStatement(node: N) {
      const body = node.body;
      for (let i = 0; i + 1 < body.length; i++) {
        const a = body[i];
        const b = body[i + 1];
        const decl = (s: N) => (s?.type === "VariableDeclaration" && s.declarations.length === 1 && s.declarations[0].init?.type === "AwaitExpression" ? s.declarations[0] : null);
        const da = decl(a);
        const db = decl(b);
        if (!da || !db || da.id.type !== "Identifier") continue;
        if (new RegExp(`\\b${da.id.name}\\b`).test(rawText(ctx, db.init))) continue;
        ctx.report({ node: b, message: "Two independent calls wait for each other." });
        i++;
      }
    },
  })),

  // ---------- possessed ----------
  "possessed-llm-exec": rule((ctx) => ({
    CallExpression(node: N) {
      const n = calleeName(node);
      if (!n || !["exec", "execSync", "spawn", "eval", "query", "execute", "$queryRawUnsafe"].includes(n)) return;
      const arg = node.arguments[0];
      if (!arg) return;
      const t = rawText(ctx, arg);
      if (LLM_NAME.test(t) && /(choices|completion|content|output_text|\.text\b|llm|response)/i.test(t)) {
        ctx.report({ node, message: `Model output goes straight into ${n}.` });
      }
    },
  })),
  "possessed-prompt-injection": rule((ctx) => ({
    VariableDeclarator(node: N) {
      if (node.id?.type !== "Identifier" || !/prompt|system|instruction/i.test(node.id.name)) return;
      if (!node.init || !hasExpressions(node.init)) return;
      if (USER_INPUT.test(rawText(ctx, node.init))) {
        ctx.report({ node, message: "User input is pasted into a prompt without separation." });
      }
    },
  })),

  // ---------- zombies ----------
  "zombie-floating-promise": rule((ctx) => {
    const asyncNames = new Set<string>();
    return {
      FunctionDeclaration(node: N) {
        if (node.async && node.id) asyncNames.add(node.id.name);
      },
      VariableDeclarator(node: N) {
        if (node.id?.type === "Identifier" && (node.init?.type === "ArrowFunctionExpression" || node.init?.type === "FunctionExpression") && node.init.async) {
          asyncNames.add(node.id.name);
        }
      },
      "ExpressionStatement:exit"(node: N) {
        const e = node.expression;
        if (e?.type !== "CallExpression") return;
        const n = calleeName(e);
        // .then(ok, onError) handles the rejection just like .catch().
        const isThenWithoutCatch = n === "then" && (e.arguments?.length ?? 0) < 2 && !/\.catch\(/.test(rawText(ctx, e));
        const known = n === "fetch" || (e.callee.type === "Identifier" && asyncNames.has(n ?? ""));
        if (isThenWithoutCatch || known) ctx.report({ node, message: `The promise from ${n}() is neither awaited nor caught.` });
      },
    };
  }),
};
