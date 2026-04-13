const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'frontend_spa/src');

function findFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            findFiles(filePath, fileList);
        } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

const files = findFiles(directoryPath);
let modifiedCount = 0;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // Pattern for multiline destructuring: const { a, b } = useAnalysisStore()
    const regex = /const\s+\{([^}]+)\}\s*=\s*useAnalysisStore\(\)/g;

    content = content.replace(regex, (match, p1) => {
        changed = true;
        // Split by comma, handling newlines and spaces
        const vars = p1.split(',').map(v => v.trim()).filter(Boolean);
        return vars.map(v => {
            if (v.includes(':')) {
                const [key, alias] = v.split(':').map(x => x.trim());
                return `const ${alias} = useAnalysisStore(s => s.${key});`;
            }
            return `const ${v} = useAnalysisStore(s => s.${v});`;
        }).join('\n    ');
    });

    if (changed) {
        fs.writeFileSync(file, content);
        modifiedCount++;
        console.log(`Updated: ${file}`);
    }
}

console.log(`Finished. Modified ${modifiedCount} files.`);
