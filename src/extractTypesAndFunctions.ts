import fs from 'node:fs';
import ts from 'typescript';

export default function extractTypesAndFunctions(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, fileContent, ts.ScriptTarget.Latest, true);

  let output = '';

  function visit(node) {
    if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isArrowFunction(node)) {
      const name = node.name ? node.name.getText(sourceFile) : 'anonymous';
      const params = node.parameters.map(p => p.getText(sourceFile)).join(', ');
      const returnType = node.type ? node.type.getText(sourceFile) : 'any';
      output += `${ts.isExportAssignment(node.parent) ? 'export ' : ''}function ${name}(${params}): ${returnType}\n\n`;
    } else if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
      output += `${node.getText(sourceFile)}\n\n`;
    } else if (ts.isClassDeclaration(node)) {
      output += `class ${node.name.getText(sourceFile)} {\n`;
      node.members.forEach(member => {
        if (ts.isMethodDeclaration(member) || ts.isPropertyDeclaration(member)) {
          output += `  ${member.getText(sourceFile)}\n`;
        }
      });
      output += '}\n\n';
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return output;
}
