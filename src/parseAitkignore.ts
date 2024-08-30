import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const homeAitkignorePath = path.join(os.homedir(), '.aitkignore');
export let globalIgnoreRules = [];
try {
  if (fs.existsSync(homeAitkignorePath)) {
    globalIgnoreRules = fs.readFileSync(homeAitkignorePath, 'utf8').split('\n').filter(line => line.trim() !== '');
  }
} catch (err) {
  console.error(`Error reading global .aitkignore file: ${err.message}`);
}

export default function parseAitkignore(aitkignorePath) {
  if (!aitkignorePath) return [];
  try {
    return fs.readFileSync(aitkignorePath, 'utf8').split('\n').filter(line => line.trim() !== '');
  } catch (err) {
    console.error(`Error reading .aitkignore file: ${err.message}`);
    return [];
  }
}
