import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');

describe('Code quality and project structure', () => {
  test('ESLint passes with zero errors', () => {
    let result;
    try {
      result = execSync('npx eslint . 2>&1', { cwd: ROOT, encoding: 'utf8' });
    } catch (err) {
      result = err.stdout || err.message;
      assert.fail(`ESLint found errors:\n${result}`);
    }
    // No assertion errors from ESLint
    assert.doesNotMatch(result, /\d+ errors?/, 'ESLint should report no errors');
  });

  test('No console.log in production source files (console.error/warn allowed)', () => {
    const srcFiles = [
      ...fs
        .readdirSync(path.join(ROOT, 'public'))
        .filter((f) => f.endsWith('.js'))
        .map((f) => `public/${f}`),
      'api/gemini.js',
    ];
    for (const file of srcFiles) {
      const code = fs.readFileSync(path.join(ROOT, file), 'utf8');
      // Allow console.error and console.warn, but flag console.log in production code
      const logLines = code.split('\n').filter((line) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return false;
        return /\bconsole\.log\b/.test(trimmed);
      });
      assert.equal(logLines.length, 0, `${file}: unexpected console.log — use console.error or console.warn instead`);
    }
  });

  test('No TODO or FIXME comments left in production code', () => {
    const files = ['api/gemini.js', 'public/app.js', 'public/fallbackEngine.js', 'public/core.js'];
    for (const file of files) {
      const code = fs.readFileSync(path.join(ROOT, file), 'utf8');
      assert.doesNotMatch(code, /\b(TODO|FIXME|HACK|XXX)\b/i, `${file}: found unresolved TODO/FIXME`);
    }
  });

  test('package.json has all required scripts: test, lint, format, coverage', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    for (const script of ['test', 'lint', 'lint:fix', 'format', 'format:check', 'coverage']) {
      assert.ok(pkg.scripts[script], `Missing script: ${script}`);
    }
  });

  test('package.json specifies Node engine requirement', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.engines?.node, 'engines.node must be specified');
    assert.match(pkg.engines.node, />=\d+/, 'engines.node should specify minimum version');
  });

  test('.editorconfig exists for consistent coding styles', () => {
    assert.ok(fs.existsSync(path.join(ROOT, '.editorconfig')), '.editorconfig must exist');
  });

  test('SECURITY.md exists with vulnerability reporting info', () => {
    const security = fs.readFileSync(path.join(ROOT, 'SECURITY.md'), 'utf8');
    assert.match(security, /vulnerabilit/i, 'SECURITY.md must mention vulnerability reporting');
  });

  test('CI workflow runs lint, format check, and coverage', () => {
    const ci = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8');
    assert.match(ci, /npm run lint/, 'CI must run lint');
    assert.match(ci, /npm run format:check/, 'CI must check formatting');
    assert.match(ci, /npm run coverage/, 'CI must run coverage');
  });

  test('No var declarations in public JS files (except core.js which is vendored)', () => {
    const files = fs.readdirSync(path.join(ROOT, 'public')).filter((f) => f.endsWith('.js') && f !== 'core.js');
    for (const file of files) {
      const code = fs.readFileSync(path.join(ROOT, 'public', file), 'utf8');
      const varLines = code.split('\n').filter((line) => {
        const t = line.trim();
        if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return false;
        return /\bvar\s+\w/.test(t);
      });
      assert.equal(varLines.length, 0, `public/${file}: found 'var' — use const or let`);
    }
  });
});
