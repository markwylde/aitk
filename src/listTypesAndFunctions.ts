import ignore from "ignore";
import findClosestAitkignore from "./findClosestAitkignore";
import parseAitkignore, { globalIgnoreRules } from "./parseAitkignore";
import fs from 'node:fs';
import path from 'node:path';
import extractTypesAndFunctions from "./extractTypesAndFunctions";

export default function listTypesAndFunctions(dir, output = '', baseDir = '', depth = 0) {
  const closestAitkignore = findClosestAitkignore(dir);

  const ignoreRules = [
    ...parseAitkignore(closestAitkignore),
    ...globalIgnoreRules
  ];

  const ig = ignore().add(ignoreRules);

  const files = fs.readdirSync(dir, { withFileTypes: true });
  files.forEach((file) => {
    const filePath = path.join(dir, file.name);
    const relativePath = path.relative(process.cwd(), filePath);

    if (ig.ignores(relativePath)) {
      return;
    }

    if (file.isDirectory()) {
      output = listTypesAndFunctions(filePath, output, relativePath, depth + 1);
    } else if (file.name.match(/\.(js|ts|jsx|tsx)$/)) {
      output += `# ${relativePath}\n`;
      const fileContent = extractTypesAndFunctions(filePath);
      if (fileContent.trim()) {
        output += fileContent;
        output += '\n';
      }
    }
  });
  return output;
}
