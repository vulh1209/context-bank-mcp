#!/usr/bin/env node

/**
 * Script to add shebang to built JavaScript files
 * This script will prepend "#!/usr/bin/env node" to all JavaScript files
 * in the build directory
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const buildDir = path.join(__dirname, '../build');

// Function to add shebang to a file
const addShebang = (filePath) => {
  const shebang = '#!/usr/bin/env node\n';
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Skip if shebang already exists
  if (content.startsWith('#!')) {
    console.log(`Shebang already exists in ${filePath}`);
    return;
  }
  
  // Add shebang to file
  fs.writeFileSync(filePath, shebang + content);
  console.log(`Added shebang to ${filePath}`);
};

// Function to process all JS files in a directory
const processDirectory = (directory) => {
  const files = fs.readdirSync(directory);
  
  files.forEach(file => {
    const filePath = path.join(directory, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      processDirectory(filePath); // Recursively process subdirectories
    } else if (file.endsWith('.js')) {
      addShebang(filePath);
    }
  });
};

// Check if build directory exists
if (fs.existsSync(buildDir)) {
  console.log('Adding shebang to JavaScript files...');
  processDirectory(buildDir);
  console.log('Shebang addition completed.');
} else {
  console.error(`Build directory not found: ${buildDir}`);
  process.exit(1);
} 