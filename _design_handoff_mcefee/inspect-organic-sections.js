const fs = require('fs');
const html = fs.readFileSync('C:/project_workspace/kcnj-temp/_design_handoff_mcefee/organic-markup.html', 'utf8');
const labels = [...html.matchAll(/data-screen-label="([^"]+)"/g)].map((m) => m[1]);
console.log('sections:', labels.join(' | '));

// Write remaining markup chunks for key sections
const markers = [
  'Featured events',
  'Upcoming events',
  'What we do',
  'About',
  'Team',
  'Sponsors',
  'CTA',
  'Close',
  'Contact',
  'Services',
];
for (const label of labels) {
  const idx = html.indexOf(`data-screen-label="${label}"`);
  if (idx < 0) continue;
  const chunk = html.slice(idx, idx + 2500);
  console.log(`\n===== ${label} =====\n`);
  console.log(chunk.slice(0, 1800));
}
