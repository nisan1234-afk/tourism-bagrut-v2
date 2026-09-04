// בדיקת תחביר לכל קובצי ה-JS וה-Apps Script, בלי להריץ אותם.
// הרצה: npm run check
import { readdirSync, copyFileSync, mkdtempSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

const files = [
  ...readdirSync('.').filter((f) => f.endsWith('.js')),
  ...(existsSync('backend') ? readdirSync('backend').filter((f) => f.endsWith('.gs')).map((f) => join('backend', f)) : []),
];
const tmp = mkdtempSync(join(tmpdir(), 'check-'));
let bad = 0;
for (const f of files) {
  const target = join(tmp, f.replace(/[\\/]/g, '_').replace(/\.gs$/, '.js'));
  copyFileSync(f, target);
  try { execFileSync(process.execPath, ['--check', target], { stdio: 'pipe' }); console.log('ok   ' + f); }
  catch (e) { bad++; console.log('FAIL ' + f + '\n' + e.stderr.toString().split('\n').slice(0, 4).join('\n')); }
}
if (bad) process.exit(1);
