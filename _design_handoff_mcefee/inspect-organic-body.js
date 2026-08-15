const fs = require('fs');
const outDir = 'C:/project_workspace/kcnj-temp/_design_handoff_mcefee';
const t = fs.readFileSync(`${outDir}/organic-template-raw.html`, 'utf8');
const body = t.match(/<body[\s\S]*/)?.[0] || '';
const clean = body
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/src="[0-9a-f-]{36}"/g, 'src="ASSET"');
fs.writeFileSync(`${outDir}/organic-body-clean.html`, clean);
console.log('body clean len', clean.length);

// Section outline: tags with class names
const sections = [...clean.matchAll(/<(section|header|footer|nav|main|div)[^>]*class="([^"]+)"/gi)]
  .map((m) => `${m[1]}.${m[2].split(/\s+/).slice(0, 4).join('.')}`)
  .slice(0, 80);
console.log(sections.join('\n'));

// Print first 12k of body for structure
console.log('\n--- BODY START ---\n');
console.log(clean.slice(0, 12000));
