import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('Running secret scan on git-tracked and untracked candidate files...');

const statusOutput = execSync('git status --porcelain', { encoding: 'utf8' });
const lines = statusOutput.split('\n').filter(Boolean);

const candidateFiles = [];
for (const line of lines) {
  const filePath = line.substring(3).trim();
  if (!filePath) continue;
  if (filePath.includes('.env') && !filePath.includes('.env.example')) continue;
  if (filePath.includes('node_modules')) continue;
  if (fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath);
    if (stat.isFile()) {
      candidateFiles.push(filePath);
    } else if (stat.isDirectory()) {
      const walk = (dir) => {
        const entries = fs.readdirSync(dir);
        for (const entry of entries) {
          const fullPath = path.join(dir, entry);
          if (entry === 'node_modules' || entry === '.git') continue;
          const s = fs.statSync(fullPath);
          if (s.isFile()) candidateFiles.push(fullPath);
          else if (s.isDirectory()) walk(fullPath);
        }
      };
      walk(filePath);
    }
  }
}

console.log(`Inspecting ${candidateFiles.length} candidate files...`);

const secretPatterns = [
  { name: 'Google/Gemini API Key', regex: /AIzaSy[A-Za-z0-9_-]{33}/ },
  { name: 'MongoDB Credential URI', regex: /mongodb(\+srv)?:\/\/[^\s:/?#]+:[^\s@/?#]+@[^\s/?#]+/i },
  { name: 'AWS Access Key', regex: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/ },
  { name: 'Private Key Block', regex: /-----BEGIN (?:RSA )?PRIVATE KEY-----/ },
  { name: 'GitHub Personal Access Token', regex: /gh[pousr]_[A-Za-z0-9_]{36,255}/ }
];

let issues = [];
for (const relFile of candidateFiles) {
  const normalized = relFile.replace(/\\/g, '/');
  if (/\.(png|jpg|jpeg|gif|svg|ico|pdf|zip|tar|gz|lock)$/i.test(normalized)) continue;
  if (normalized.endsWith('audit-secrets.js')) continue;

  const content = fs.readFileSync(relFile, 'utf8');

  for (const pattern of secretPatterns) {
    const match = pattern.regex.exec(content);
    if (match) {
      const isPlaceholder = match[0].includes('placeholder') || 
                            match[0].includes('your-') || 
                            match[0].includes('<') || 
                            match[0].includes('EXAMPLE') ||
                            match[0].includes('test_') ||
                            match[0].includes('localhost');
      issues.push({
        file: normalized,
        pattern: pattern.name,
        isPlaceholder,
        sample: isPlaceholder ? match[0] : '[REDACTED_SECRET_FOUND]'
      });
    }
  }
}

console.log(`\nScan finished. Total findings: ${issues.length}`);
if (issues.length > 0) {
  console.log('Findings details:');
  issues.forEach(iss => {
    console.log(`- [${iss.pattern}] in ${iss.file} (isPlaceholder: ${iss.isPlaceholder})`);
  });
} else {
  console.log('No secrets detected in any candidate files.');
}
