// Fix all imports to use absolute paths
const fs = require('fs');
const path = require('path');

// Manual list of all API route files that need fixing
const files = [
  'app/api/auth/register/route.ts',
  'app/api/auth/login/route.ts', 
  'app/api/emergency/report/route.ts',
  'app/api/emergency/reports/route.ts',
  'app/api/admin/dashboard/route.ts',
  'app/api/complaint/report/route.ts',
  'app/api/auth/profile/route.ts',
  'app/api/complaint/reports/route.ts',
  'app/api/auth/logout/route.ts',
  'app/api/auth/me/route.ts',
  'app/api/auth/change-password/route.ts',
  'app/api/emergency/my-reports/route.ts'
];

console.log('🔧 Fixing import paths in API files...\n');

files.forEach(filePath => {
  try {
    const fullPath = path.join(__dirname, filePath);
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️ Skipping ${filePath} (doesn't exist)`);
      return;
    }
    
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Fix all relative imports to use absolute imports
    const originalContent = content;
    content = content.replace(/from ['"](\.\.\/)+lib\//g, "from '@/lib/");
    
    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content);
      console.log(`✅ Fixed: ${filePath}`);
    } else {
      console.log(`✨ Already correct: ${filePath}`);
    }
  } catch (error) {
    console.log(`❌ Error fixing ${filePath}:`, error.message);
  }
});

console.log('\n🎉 Import path fixes completed!');
