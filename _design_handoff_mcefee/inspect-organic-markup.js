const fs = require('fs');
const outDir = 'C:/project_workspace/kcnj-temp/_design_handoff_mcefee';
const clean = fs.readFileSync(`${outDir}/organic-body-clean.html`, 'utf8');

// All style blocks
const styles = [...clean.matchAll(/<style>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
console.log('style blocks', styles.length, styles.map((s) => s.length));

// First style is DS; find page CSS after components
styles.forEach((s, i) => {
  fs.writeFileSync(`${outDir}/organic-full-style-${i}.css`, s);
});

// Extract HTML after last </style> / helmet
let html = clean;
const lastStyle = html.lastIndexOf('</style>');
if (lastStyle >= 0) html = html.slice(lastStyle + 8);
html = html.replace(/<\/?helmet>/gi, '').replace(/<\/?x-dc>/gi, '');
fs.writeFileSync(`${outDir}/organic-markup.html`, html.trim());

// Class list
const classes = new Set();
for (const m of html.matchAll(/class="([^"]+)"/g)) {
  m[1].split(/\s+/).forEach((c) => classes.add(c));
}
console.log('classes', [...classes].sort().join('\n'));

console.log('\n--- MARKUP HEAD ---\n');
console.log(html.trim().slice(0, 15000));
