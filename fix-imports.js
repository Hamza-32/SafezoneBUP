// Fix import paths script
const fs = require('fs');
const path = require('path');

const filesToFix = [
  'app/api/admin/dashboard/route.ts',
  'app/api/complaint/report/route.ts', 
  'app/api/auth/profile/route.ts',
  'app/api/complaint/reports/route.ts',
  'app/api/auth/logout/route.ts',
  'app/api/auth/me/route.ts'
];

filesToFix.forEach(filePath => {
  try {
    const fullPath = path.join(__dirname, filePath);
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Fix the import paths
    content = content.replace(/from '\.\.\/\.\.\/\.\.\/lib\//g, "from '../../../../lib/");
    
    fs.writeFileSync(fullPath, content);
    console.log(`✅ Fixed: ${filePath}`);
  } catch (error) {
    console.log(`❌ Error fixing ${filePath}:`, error.message);
  }
});

console.log('🎉 Import path fixes completed!');
