import path from 'node:path';
import fs from 'node:fs';

export default function findClosestAitkignore(dir) {
  let currentDir = dir;
  while (currentDir !== path.parse(currentDir).root) {
    const aitkignorePath = path.join(currentDir, '.aitkignore');
    if (fs.existsSync(aitkignorePath)) {
      return aitkignorePath;
    }
    currentDir = path.dirname(currentDir);
  }
  return null;
}
