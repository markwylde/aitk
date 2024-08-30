import ignore from 'ignore';
import findClosestAitkignore from './findClosestAitkignore';
import parseAitkignore, { globalIgnoreRules } from './parseAitkignore';
import path from 'node:path';
import fs from 'node:fs';

export default function listFiles(dir, dumpContent = false, output = '', baseDir = '', depth = 0) {
  const closestAitkignore = findClosestAitkignore(dir);

  const ignoreRules = [
    ...parseAitkignore(closestAitkignore),
    ...globalIgnoreRules
  ];

  const ig = ignore().add(ignoreRules);

  const files = fs.readdirSync(dir, { withFileTypes: true });
  files.forEach((file, index) => {
    const filePath = path.join(dir, file.name);
    const relativePath = path.relative(process.cwd(), filePath);

    if (ig.ignores(relativePath)) {
      return;
    }

    const isLast = index === files.length - 1;
    const prefix = depth === 0 ? '' : '  '.repeat(depth - 1) + (isLast ? '└─ ' : '├─ ');

    if (file.isDirectory()) {
      if (!dumpContent) {
        output += `${prefix}${file.name}/\n`;
      }
      output = listFiles(filePath, dumpContent, output, relativePath, depth + 1);
    } else {
      if (dumpContent) {
        output += `# ${relativePath}\n`;
      } else {
        output += `${prefix}${file.name}\n`;
      }
      if (dumpContent) {
        output += "```\n";
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          output += content + "\n";
        } catch (err) {
          output += `Error reading file: ${err.message}\n`;
        }
        output += "```\n\n";
      }
    }
  });
  return output;
}
