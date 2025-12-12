const fs = require('fs');
const path = require('path');

const configPath = path.resolve('c:/Users/Claudiney/Viewers/rsbuild.config.ts');

console.log(`Checking config file: ${configPath}`);

if (!fs.existsSync(configPath)) {
  console.error('FAIL: rsbuild.config.ts not found!');
  process.exit(1);
}

const content = fs.readFileSync(configPath, 'utf8');

// We are looking for the headers configuration in the server object
// Specifically checking for Content-Security-Policy frame-ancestors *
const hasCspHeader =
  content.includes('Content-Security-Policy') && content.includes('frame-ancestors *');
const hasAccessControl = content.includes('Access-Control-Allow-Origin') && content.includes('*');

if (hasCspHeader) {
  console.log('PASS: Content-Security-Policy frame-ancestors * found.');
} else {
  console.error('FAIL: Content-Security-Policy frame-ancestors * NOT found.');
}

if (hasAccessControl) {
  console.log('PASS: Access-Control-Allow-Origin * found.');
} else {
  // This is optional but good practice
  console.warn('WARN: Access-Control-Allow-Origin * NOT found (Recommended).');
}

if (hasCspHeader) {
  console.log('\nSuccess: OHIF configuration has been updated to allow cross-origin embedding.');
  process.exit(0);
} else {
  console.log('\nFailure: Configuration update verification failed.');
  process.exit(1);
}
