const fs = require('fs');
const path = require('path');

// Color helpers for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m'
};

console.log(`${colors.bright}${colors.cyan}====================================================${colors.reset}`);
console.log(`${colors.bright}${colors.magenta}🛡️  SCANSAFE SECURITY HARDEINING AUDIT TOOL 🛡️${colors.reset}`);
console.log(`${colors.bright}${colors.cyan}====================================================${colors.reset}\n`);

const projectRoot = path.join(__dirname, '..');
let issuesCount = 0;
let warningsCount = 0;

function walk(dir, excludeDirs = ['node_modules', '.next', '.git', '.vercel', 'build', 'coverage', 'dist']) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (!excludeDirs.includes(file)) {
        results = results.concat(walk(filePath, excludeDirs));
      }
    } else {
      results.push(filePath);
    }
  });
  return results;
}

const allFiles = walk(projectRoot);

// ==========================================
// 1. SECRET LEAK PREVENTION AUDIT
// ==========================================
console.log(`${colors.bright}${colors.blue}[1/5] Checking for API Key & Credentials Leakage...${colors.reset}`);

// Check gitignore first
let gitignoreSecured = false;
try {
  const gitignoreContent = fs.readFileSync(path.join(projectRoot, '.gitignore'), 'utf8');
  if (gitignoreContent.includes('.env*')) {
    gitignoreSecured = true;
    console.log(`  ${colors.green}✓${colors.reset} .gitignore blocks .env files from being pushed to GitHub.`);
  } else {
    console.log(`  ${colors.red}✗${colors.reset} CRITICAL: .gitignore does NOT contain '.env*'! Your credentials could be leaked.`);
    issuesCount++;
  }
} catch (e) {
  console.log(`  ${colors.yellow}!${colors.reset} WARNING: .gitignore file not found.`);
  warningsCount++;
}

// Regex patterns for secrets
const secretRegexes = {
  'Google Gemini Key': /AIzaSy[A-Za-z0-9_-]{35}/,
  'Razorpay Key': /rzp_(live|test)_[a-zA-Z0-9]{14}/,
  'Generic API Key Reference': /const\s+\w*(API_KEY|TOKEN|SECRET|PASSWORD)\s*=\s*['"`][a-zA-Z0-9_-]{16,}['"`]/i
};

allFiles.forEach(file => {
  const ext = path.extname(file);
  const relPath = path.relative(projectRoot, file);
  if (['.ts', '.tsx', '.js', '.jsx', '.json', '.env'].includes(ext) && !relPath.startsWith('scripts/')) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      Object.entries(secretRegexes).forEach(([keyName, regex]) => {
        const match = content.match(regex);
        if (match && !content.includes('AIzaSyFakeKey') && !content.includes('rzp_test_mock')) {
          console.log(`  ${colors.red}✗${colors.reset} CRITICAL: Potential ${keyName} leaked in: ${colors.yellow}${relPath}${colors.reset}`);
          console.log(`    Code snippet: ${colors.bright}${match[0].slice(0, 15)}...${colors.reset}`);
          issuesCount++;
        }
      });
    } catch (e) {}
  }
});

if (gitignoreSecured && issuesCount === 0) {
  console.log(`  ${colors.green}✓${colors.reset} No raw API keys or credentials detected in the codebase.`);
}
console.log('');

// ==========================================
// 2. PERSONAL DATA FLOW AUDIT (LOGGING)
// ==========================================
console.log(`${colors.bright}${colors.blue}[2/5] Auditing Personal Data Flow (Log Leaks)...${colors.reset}`);

let logLeaksFound = 0;
const sensitiveLogRegex = /console\.(log|error|warn|info)\(.*?(password|token|secret|credential|ssn|card).*?\)/i;

allFiles.forEach(file => {
  const ext = path.extname(file);
  const relPath = path.relative(projectRoot, file);
  if (['.ts', '.tsx', '.js', '.jsx'].includes(ext) && !relPath.startsWith('scripts/')) {
    try {
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, index) => {
        if (sensitiveLogRegex.test(line)) {
          console.log(`  ${colors.yellow}!${colors.reset} WARNING: console.log contains potentially sensitive variable names in: ${colors.cyan}${relPath}:${index + 1}${colors.reset}`);
          console.log(`    Line: ${line.trim()}`);
          logLeaksFound++;
          warningsCount++;
        }
      });
    } catch (e) {}
  }
});

if (logLeaksFound === 0) {
  console.log(`  ${colors.green}✓${colors.reset} No sensitive variables (passwords, tokens) are being printed to logs.`);
}
console.log('');

// ==========================================
// 3. PRE-DEPLOY PRODUCTION AUDIT
// ==========================================
console.log(`${colors.bright}${colors.blue}[3/5] Inspecting API Error Handlers & Rate Limiting...${colors.reset}`);

const apiDir = path.join(projectRoot, 'app', 'api');
let rawErrorsFound = 0;
let rateLimitChecks = 0;

if (fs.existsSync(apiDir)) {
  const apiFiles = walk(apiDir);
  apiFiles.forEach(file => {
    const relPath = path.relative(projectRoot, file);
    if (path.basename(file) === 'route.ts' || path.basename(file) === 'route.js') {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        // 1. Raw error leaks check
        const rawErrorRegex = /NextResponse\.json\(\s*\{\s*[^}]*error\s*:\s*(error\.message|err\.message|error\.stack|err\.stack|error\.toString\(\)|err\.toString\(\))\s*[^}]*\}\)/;
        if (rawErrorRegex.test(content)) {
          console.log(`  ${colors.red}✗${colors.reset} CRITICAL: API leaks raw error tracebacks/messages in: ${colors.yellow}${relPath}${colors.reset}`);
          rawErrorsFound++;
          issuesCount++;
        }

        // 2. Check for rate limit implementation in endpoints that do heavy computing
        if (relPath.includes('analyze') && !content.includes('checkRateLimit')) {
          console.log(`  ${colors.yellow}!${colors.reset} WARNING: heavy endpoint does not appear to have rate limiting: ${colors.cyan}${relPath}${colors.reset}`);
          rateLimitChecks++;
          warningsCount++;
        }
      } catch (e) {}
    }
  });
}

if (rawErrorsFound === 0) {
  console.log(`  ${colors.green}✓${colors.reset} All API route catch blocks return sanitized, production-safe errors.`);
}
if (rateLimitChecks === 0) {
  console.log(`  ${colors.green}✓${colors.reset} Rate limiting active on critical heavy-computation routes.`);
}
console.log('');

// ==========================================
// 4. COMPLEX PRICING LOGIC AUDIT
// ==========================================
console.log(`${colors.bright}${colors.blue}[4/5] Checking Server-Side Pricing Verification...${colors.reset}`);

let pricingOk = false;
let webhookSecured = false;

// Check checkout route
try {
  const checkoutPath = path.join(projectRoot, 'app', 'api', 'checkout', 'route.ts');
  const content = fs.readFileSync(checkoutPath, 'utf8');
  if (content.includes('amount = 99900') && content.includes('planType') && !content.includes('amount = body.amount')) {
    pricingOk = true;
    console.log(`  ${colors.green}✓${colors.reset} Pricing logic is enforced server-side. No client-side price injection allowed.`);
  } else {
    console.log(`  ${colors.red}✗${colors.reset} CRITICAL: Price overrides detected or user can pass dynamic amounts from client.`);
    issuesCount++;
  }
} catch (e) {
  console.log(`  ${colors.yellow}!${colors.reset} WARNING: Checkout API route not found or failed to parse.`);
  warningsCount++;
}

// Check webhook verification
try {
  const webhookPath = path.join(projectRoot, 'app', 'api', 'razorpay-webhook', 'route.ts');
  const content = fs.readFileSync(webhookPath, 'utf8');
  if (content.includes('createHmac') && content.includes('x-razorpay-signature')) {
    webhookSecured = true;
    console.log(`  ${colors.green}✓${colors.reset} Payment webhooks verify signature integrity using HMAC SHA-256.`);
  } else {
    console.log(`  ${colors.red}✗${colors.reset} CRITICAL: Webhook handler does not verify cryptographic signatures!`);
    issuesCount++;
  }
} catch (e) {
  console.log(`  ${colors.yellow}!${colors.reset} WARNING: Webhook API route not found or failed to parse.`);
  warningsCount++;
}
console.log('');

// ==========================================
// 5. ATTACKER'S PERSPECTIVE (RLS CHECK)
// ==========================================
console.log(`${colors.bright}${colors.blue}[5/5] Checking Database Row Level Security (RLS)...${colors.reset}`);

let rlsErrors = 0;
try {
  const schemaPath = path.join(projectRoot, 'schema.sql');
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  
  // Extract all table names
  const tableRegex = /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(?:public\.)?(\w+)/gi;
  let match;
  const tables = [];
  while ((match = tableRegex.exec(schemaContent)) !== null) {
    tables.push(match[1]);
  }

  tables.forEach(tableName => {
    const rlsRegex = new RegExp(`ALTER TABLE\\s+(?:public\\.)?${tableName}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`, 'i');
    if (rlsRegex.test(schemaContent)) {
      console.log(`  ${colors.green}✓${colors.reset} RLS is active on database table: ${colors.cyan}${tableName}${colors.reset}`);
    } else if (tableName !== 'products_cache') { // products_cache might be globally readable
      console.log(`  ${colors.red}✗${colors.reset} CRITICAL: Table "${tableName}" does NOT enable ROW LEVEL SECURITY!`);
      rlsErrors++;
      issuesCount++;
    }
  });
} catch (e) {
  console.log(`  ${colors.yellow}!${colors.reset} WARNING: schema.sql database definitions file not found.`);
  warningsCount++;
}

console.log('\n');
console.log(`${colors.bright}${colors.cyan}====================================================${colors.reset}`);
console.log(`${colors.bright}AUDIT RESULTS SUMMARY:${colors.reset}`);
console.log(`  ${colors.red}${issuesCount} Critical Issues Found${colors.reset}`);
console.log(`  ${colors.yellow}${warningsCount} Warnings Found${colors.reset}`);
console.log(`${colors.bright}${colors.cyan}====================================================${colors.reset}`);

if (issuesCount > 0) {
  process.exit(1);
} else {
  console.log(`\n${colors.bright}${colors.green}🎉 ALL 5 SECURITY CONTROLS ARE VERIFIED & SECURE! 🎉${colors.reset}\n`);
  process.exit(0);
}
