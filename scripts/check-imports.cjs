// 开发期校验：解析 src 下所有文件的 import/export，验证模块引用可解析
// 纯进程内（Babel 解析 + 文件系统检查），不派生子进程
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const root = path.join(__dirname, '..');

function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (f.name === 'node_modules' || f.name.startsWith('.')) continue;
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p, out);
    else if (/\.(jsx?|cjs)$/.test(f.name)) out.push(p);
  }
  return out;
}

function resolveSpecifier(fromFile, spec) {
  if (spec.startsWith('.')) {
    const base = path.resolve(path.dirname(fromFile), spec);
    const cands = [base, base + '.js', base + '.jsx', base + '.cjs',
      path.join(base, 'index.js'), path.join(base, 'index.jsx')];
    return cands.some((c) => fs.existsSync(c));
  }
  // Node 内置模块
  const BUILTINS = new Set(['fs', 'path', 'crypto', 'os', 'events', 'util', 'child_process', 'stream', 'buffer', 'url', 'http', 'https', 'net', 'tls', 'zlib', 'querystring', 'assert', 'module']);
  if (BUILTINS.has(spec.split('/')[0])) return true;
  // bare import: 检查 node_modules 顶层包存在
  const pkg = spec.split('/')[0];
  const nm = path.join(root, 'node_modules');
  const dirs = [pkg];
  if (pkg.startsWith('@')) dirs.push(pkg + '/' + spec.split('/')[1]);
  return dirs.some((d) => fs.existsSync(path.join(nm, d)));
}

const files = walk(path.join(root, 'src'));
let failed = 0;
for (const f of files) {
  const code = fs.readFileSync(f, 'utf8');
  let ast;
  try {
    ast = babel.parseSync(code, { filename: f, babelrc: false, configFile: false, parserOpts: { plugins: ['jsx'] } });
  } catch (err) {
    failed++;
    console.log('PARSE FAIL ' + path.relative(root, f) + ' -> ' + err.message.split('\n')[0]);
    continue;
  }
  for (const node of ast.program.body) {
    if (node.type === 'ImportDeclaration') {
      for (const s of node.specifiers) {
        if (!resolveSpecifier(f, node.source.value)) {
          failed++;
          console.log(`MISS ${path.relative(root, f)}: ${s.local.name} from '${node.source.value}'`);
        }
      }
    }
    if (node.type === 'ExportNamedDeclaration' && node.source) {
      if (!resolveSpecifier(f, node.source.value)) {
        failed++;
        console.log(`MISS ${path.relative(root, f)}: export from '${node.source.value}'`);
      }
    }
  }
}
// electron 侧 require 检查
for (const f of fs.readdirSync(path.join(root, 'electron')).filter((x) => x.endsWith('.js'))) {
  const full = path.join(root, 'electron', f);
  const code = fs.readFileSync(full, 'utf8');
  const ast = babel.parseSync(code, { filename: full, babelrc: false, configFile: false });
  for (const node of ast.program.body) {
    if (node.type === 'VariableDeclaration') {
      for (const d of node.declarations) {
        if (d.init && d.init.type === 'CallExpression' && d.init.callee.name === 'require' &&
            d.init.arguments[0] && d.init.arguments[0].type === 'StringLiteral') {
          const spec = d.init.arguments[0].value;
          if (!resolveSpecifier(full, spec)) {
            failed++;
            console.log(`MISS electron/${f}: require('${spec}')`);
          }
        }
      }
    }
  }
}
console.log(failed ? `\n${failed} 个引用问题` : '\n全部 import/require 引用解析通过');
process.exit(failed ? 1 : 0);
