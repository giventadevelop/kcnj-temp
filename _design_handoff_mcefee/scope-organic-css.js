const fs = require('fs');
const path = 'c:/project_workspace/kcnj-temp/src/styles/modernist-homepage.css';
let css = fs.readFileSync(path, 'utf8');

const brightButtons = `/* Event-card action buttons — solid bright fills (same weight as mh-btn-primary) */
body.modernist-home .mh-btn-details {
  background: #15803d;
  border-color: #15803d;
  color: #fff;
}

body.modernist-home .mh-btn-details:hover {
  background: #166534;
  border-color: #166534;
}

body.modernist-home .mh-btn-calendar {
  background: #ea580c;
  border-color: #ea580c;
  color: #fff;
}

body.modernist-home .mh-btn-calendar:hover {
  background: #c2410c;
  border-color: #c2410c;
}

body.modernist-home .mh-btn-readmore {
  background: #4f46e5;
  border-color: #4f46e5;
  color: #fff;
}

body.modernist-home .mh-btn-readmore:hover {
  background: #4338ca;
  border-color: #4338ca;
}

body.modernist-home .mh-btn-register {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

body.modernist-home .mh-btn-register:hover {
  background: #1d4ed8;
  border-color: #1d4ed8;
}

body.modernist-home .mh-btn-tickets {
  background: #db2777;
  border-color: #db2777;
  color: #fff;
}

body.modernist-home .mh-btn-tickets:hover {
  background: #be185d;
  border-color: #be185d;
}

body.modernist-home .mh-btn-donate {
  background: #0d9488;
  border-color: #0d9488;
  color: #fff;
}

body.modernist-home .mh-btn-donate:hover {
  background: #0f766e;
  border-color: #0f766e;
}

/* Organic homepage action buttons */
body.modernist-home.organic-home .mh-btn-details {
  background: var(--mh-accent-2);
  border-color: var(--mh-accent-2);
  color: var(--mh-bg);
}
body.modernist-home.organic-home .mh-btn-details:hover {
  background: var(--mh-accent-2-700);
  border-color: var(--mh-accent-2-700);
}
body.modernist-home.organic-home .mh-btn-calendar {
  background: var(--mh-accent-500);
  border-color: var(--mh-accent-500);
  color: var(--mh-bg);
}
body.modernist-home.organic-home .mh-btn-calendar:hover {
  background: var(--mh-accent-600);
  border-color: var(--mh-accent-600);
}
body.modernist-home.organic-home .mh-btn-readmore {
  background: var(--mh-accent-2-800);
  border-color: var(--mh-accent-2-800);
  color: var(--mh-bg);
}
body.modernist-home.organic-home .mh-btn-readmore:hover {
  background: var(--mh-neutral-900);
  border-color: var(--mh-neutral-900);
}
body.modernist-home.organic-home .mh-btn-register {
  background: var(--mh-accent-700);
  border-color: var(--mh-accent-700);
  color: var(--mh-bg);
}
body.modernist-home.organic-home .mh-btn-register:hover {
  background: var(--mh-accent-800);
  border-color: var(--mh-accent-800);
}
body.modernist-home.organic-home .mh-btn-tickets {
  background: var(--mh-accent);
  border-color: var(--mh-accent);
  color: var(--mh-bg);
}
body.modernist-home.organic-home .mh-btn-tickets:hover {
  background: var(--mh-accent-600);
  border-color: var(--mh-accent-600);
}
body.modernist-home.organic-home .mh-btn-donate {
  background: var(--mh-accent-2-700);
  border-color: var(--mh-accent-2-700);
  color: var(--mh-bg);
}
body.modernist-home.organic-home .mh-btn-donate:hover {
  background: var(--mh-accent-2-800);
  border-color: var(--mh-accent-2-800);
}`;

const start = css.indexOf('/* Event-card action buttons');
const end = css.indexOf('body.modernist-home .mh-btn svg');
if (start < 0 || end < 0) throw new Error('button block markers not found');
css = css.slice(0, start) + brightButtons + '\n\n' + css.slice(end);

// Scope organic remapping block
const remapStart = css.indexOf('/* ---------------------------------------------------------------------------\n   Organic remapping');
if (remapStart < 0) {
  // try alternate marker
  const alt = css.indexOf('Organic remapping');
  console.log('remap marker index', alt);
}
const remapMarker = css.indexOf('Organic remapping');
if (remapMarker < 0) throw new Error('remap not found');
// find start of comment containing it
const remapBlockStart = css.lastIndexOf('/*', remapMarker);
const remapBody = css.slice(remapBlockStart);

// Replace body.modernist-home with body.modernist-home.organic-home in remapping section only
// Careful: don't double-prefix ones already organic-home
let remapped = remapBody
  .replace(/body\.modernist-home\.organic-home/g, 'body.modernist-home')
  .replace(/body\.modernist-home(?!\.organic-home)/g, 'body.modernist-home.organic-home');

css = css.slice(0, remapBlockStart) + remapped;

// Scope hero washed filter to organic-home only (hero component is homepage-only but keep safe)
css = css.replace(
  /body\.modernist-home \.mh-poster-hero-img \{([\s\S]*?)filter: saturate\(0\.6\) contrast\(0\.85\) brightness\(1\.1\) opacity\(0\.94\);/,
  'body.modernist-home.organic-home .mh-poster-hero-img {$1filter: saturate(0.6) contrast(0.85) brightness(1.1) opacity(0.94);'
);

fs.writeFileSync(path, css);
console.log('patched action buttons + scoped organic remapping');
