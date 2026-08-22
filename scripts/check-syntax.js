const fs = require('fs');
const path = require('path');
const vm = require('vm');

function checkDirectory(dir) {
  const files = fs.readdirSync(dir);
  let hasError = false;

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (file !== 'node_modules' && !file.startsWith('.')) {
        if (checkDirectory(fullPath)) {
          hasError = true;
        }
      }
    } else if (file.endsWith('.js')) {
      try {
        const code = fs.readFileSync(fullPath, 'utf8');
        // Compile the file without executing it to check for syntax errors
        new vm.Script(code, { filename: fullPath });
      } catch (err) {
        console.error(`\x1b[31mSyntax error in ${fullPath}:\x1b[0m`);
        console.error(err.stack || err.message);
        hasError = true;
      }
    }
  }
  return hasError;
}

console.log('Checking all JavaScript files for syntax errors...');
const hasErrors = checkDirectory(process.cwd());
if (hasErrors) {
  console.error('\x1b[31mSyntax check failed!\x1b[0m');
  process.exit(1);
} else {
  console.log('\x1b[32mAll JavaScript files are syntactically valid!\x1b[0m');
  process.exit(0);
}
