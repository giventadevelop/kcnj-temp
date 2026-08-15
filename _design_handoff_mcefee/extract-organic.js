const fs = require('fs');
const path = 'C:/project_workspace/kcnj-temp/public/images/KCNJ/Malayalees.US Homepage (Organic).html';
const outDir = 'C:/project_workspace/kcnj-temp/_design_handoff_mcefee';
const html = fs.readFileSync(path, 'utf8');

function getScript(type) {
  const open = `<script type="__bundler/${type}">`;
  const start = html.indexOf(open);
  if (start < 0) return null;
  const contentStart = start + open.length;
  const end = html.indexOf('</script>', contentStart);
  return html.slice(contentStart, end);
}

const templateRaw = getScript('template');
const manifestRaw = getScript('manifest');
const pageOrderRaw = getScript('page_order');
const extRaw = getScript('ext_resources');

console.log('template len', templateRaw ? templateRaw.length : 0);
console.log('manifest len', manifestRaw ? manifestRaw.length : 0);
console.log('page_order len', pageOrderRaw ? pageOrderRaw.length : 0);
console.log('ext_resources len', extRaw ? extRaw.length : 0);
console.log('template head', JSON.stringify(templateRaw.slice(0, 200)));
console.log('manifest head', JSON.stringify(manifestRaw.slice(0, 200)));
console.log('page_order head', JSON.stringify(pageOrderRaw.slice(0, 300)));

const template = JSON.parse(templateRaw);
const manifest = JSON.parse(manifestRaw);
const pageOrder = JSON.parse(pageOrderRaw);

console.log('template typeof', typeof template, typeof template === 'string' ? template.length : Object.keys(template).length);
console.log('manifest count', Object.keys(manifest).length);
console.log('pageOrder', pageOrder);

if (typeof template === 'string') {
  // Substitute uuids from manifest into template for preview of structure
  let resolved = template;
  let subst = 0;
  for (const [id, val] of Object.entries(manifest)) {
    if (typeof val !== 'string') continue;
    if (resolved.includes(id)) {
      // Only inline short text assets (css/html), not binary
      if (val.length < 500000 && (val.includes('<') || val.includes('{') || val.includes('@font'))) {
        resolved = resolved.split(id).join(`__ASSET_${id}__`);
        subst++;
      }
    }
  }
  fs.writeFileSync(`${outDir}/organic-template-raw.html`, template);
  console.log('wrote organic-template-raw.html', template.length);

  // Extract style blocks and structure
  const styleMatch = template.match(/<style[\s\S]*?<\/style>/gi) || [];
  console.log('style blocks in template', styleMatch.length);
  styleMatch.forEach((s, i) => {
    fs.writeFileSync(`${outDir}/organic-style-${i}.css`, s.replace(/^<style[^>]*>/i, '').replace(/<\/style>$/i, ''));
    console.log('style', i, s.length);
  });
}

// Dump page bundles
for (const id of pageOrder) {
  const text = manifest[id];
  if (typeof text === 'string') {
    const fname = `${outDir}/organic-page-${id.slice(0, 8)}.html`;
    fs.writeFileSync(fname, text);
    console.log('page', id.slice(0, 8), text.length, text.slice(0, 80).replace(/\n/g, ' '));
  } else {
    console.log('missing page', id);
  }
}

// Classify manifest entries
const summary = [];
for (const [id, val] of Object.entries(manifest)) {
  if (typeof val !== 'string') {
    summary.push({ id: id.slice(0, 8), type: typeof val });
    continue;
  }
  let kind = 'bin/text';
  if (val.trimStart().startsWith('<!DOCTYPE') || val.trimStart().startsWith('<html')) kind = 'html';
  else if (val.includes('{') && (val.includes('font-family') || val.includes('--'))) kind = 'css';
  else if (val.startsWith('data:') || /^[A-Za-z0-9+/=]{200,}/.test(val.slice(0, 300))) kind = 'b64';
  else if (val.trimStart().startsWith('@font') || val.includes('@keyframes')) kind = 'css';
  summary.push({ id: id.slice(0, 8), kind, len: val.length });
}
console.log(JSON.stringify(summary, null, 2));
