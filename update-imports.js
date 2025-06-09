import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Files that were renamed
const renamedFiles = [
  'src/contexts/AuthContext.jsx',
  'src/index.jsx',
  'src/components/auth/Login.jsx',
  'src/components/auth/ProtectedRoute.jsx',
  'src/components/InstagramFeed.jsx',
  'src/components/InstagramLogin.jsx',
  'src/App.test.jsx',
  'src/pages/InstagramFeedPage.jsx',
  'src/pages/Dashboard.jsx',
  'src/pages/InstagramCallback.jsx'
];

// Update imports in all JS and JSX files
function updateImports() {
  const files = [];
  
  // Find all JS and JSX files
  function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.name.endsWith('.js') || entry.name.endsWith('.jsx')) {
        files.push(fullPath);
      }
    }
  }

  walkDir('src');

  // Update imports in each file
  for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let updated = false;

    // Check each renamed file
    for (const renamedFile of renamedFiles) {
      const oldImport = renamedFile.replace(/\.jsx$/, '');
      const newImport = renamedFile;
      
      // Update import/require statements
      const importRegex = new RegExp(`(['"])(${oldImport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(['"])`, 'g');
      if (importRegex.test(content)) {
        content = content.replace(importRegex, `$1${newImport}$3`);
        updated = true;
      }
    }

    if (updated) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`Updated imports in ${file}`);
    }
  }
}

// Run the update
updateImports();
console.log('Import updates complete!');
