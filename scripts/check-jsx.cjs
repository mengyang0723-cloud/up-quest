// 开发期校验脚本：用 @vitejs/plugin-react 自带的 Babel 解析全部 JSX 源码
// （进程内解析，不派生子进程，可在受限环境中运行）
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let babel;
try {
  babel = require('@babel/core');
} catch (e) {
  console.error('未找到 @babel/core（需先 npm install）');
  process.exit(2);
}
let plugin;
try {
  plugin = require('@babel/plugin-transform-react-jsx');
} catch (e) {
  plugin = null;
}

function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (f.name === 'node_modules' || f.name.startsWith('.')) continue;
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p, out);
    else if (f.name.endsWith('.jsx')) out.push(p);
  }
  return out;
}

const files = walk(path.join(root, 'src'));
let failed = 0;
for (const f of files) {
  const code = fs.readFileSync(f, 'utf8');
  try {
    babel.transformSync(code, {
      filename: f,
      babelrc: false,
      configFile: false,
      parserOpts: { plugins: ['jsx'] },
      plugins: plugin ? [[plugin, { runtime: 'automatic' }]] : [],
    });
    console.log('OK  ' + path.relative(root, f));
  } catch (err) {
    failed++;
    console.log('FAIL ' + path.relative(root, f) + ' -> ' + err.message.split('\n')[0]);
  }
}
console.log(`\n${files.length - failed}/${files.length} JSX 文件语法通过`);
process.exit(failed ? 1 : 0);
