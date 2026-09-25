import {cpSync, rmSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

if (!process.env.VERCEL) process.exit(0);

const appDir = dirname(fileURLToPath(import.meta.url));
const target = resolve(appDir, '../../dist');
rmSync(target, {recursive: true, force: true});
cpSync(resolve(appDir, 'dist'), target, {recursive: true});
