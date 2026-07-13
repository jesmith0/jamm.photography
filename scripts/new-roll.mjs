#!/usr/bin/env node
/**
 * Interactively scaffolds src/content/rolls/roll-NNN.md so a new roll doesn't
 * have to be hand-typed. Fills in the repetitive parts (frame numbers, image
 * paths, camera/lens/exposure boilerplate) with sane defaults; per-frame
 * titles still need a human pass afterward.
 *
 * Usage: npm run new-roll
 */
import { readdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const rollsDir = path.join(root, 'src/content/rolls');

// Plain callback-based readline, not readline/promises — the promises
// variant hangs on the second question() when stdin is piped, not a TTY.
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function prompt(text) {
  return new Promise((resolve) => rl.question(text, resolve));
}

async function ask(question, defaultValue) {
  const suffix = defaultValue ? ` [${defaultValue}]` : '';
  const answer = (await prompt(`${question}${suffix}: `)).trim();
  return answer || defaultValue || '';
}

async function askRequired(question, defaultValue) {
  while (true) {
    const answer = await ask(question, defaultValue);
    if (answer) return answer;
    console.log('  This one is required.');
  }
}

async function askYesNo(question, defaultYes) {
  const suffix = defaultYes ? 'Y/n' : 'y/N';
  const answer = (await prompt(`${question} (${suffix}): `)).trim().toLowerCase();
  if (!answer) return defaultYes;
  return answer.startsWith('y');
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

// Single-quoted YAML string; doubles any embedded single quotes to escape them.
function yamlString(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}

async function nextRollNumber() {
  const entries = await readdir(rollsDir).catch(() => []);
  const numbers = entries.map((f) => f.match(/^roll-(\d+)\.md$/)).filter(Boolean).map((m) => m[1]);
  if (numbers.length === 0) return '000';
  const width = Math.max(3, ...numbers.map((n) => n.length));
  const max = Math.max(...numbers.map((n) => parseInt(n, 10)));
  return String(max + 1).padStart(width, '0');
}

function buildExposure({ frame, title, image, location, date, camera, lens }) {
  return [
    `  - frame: ${frame}`,
    `    title: ${yamlString(title)}`,
    `    image: ${image}`,
    `    alt: ''`,
    `    location: ${yamlString(location)}`,
    `    date: ${date}`,
    `    camera: ${yamlString(camera)}`,
    `    lens: ${yamlString(lens)}`,
    `    aperture: 'auto'`,
    `    shutter: 'auto'`,
    `    iso: 'auto'`,
  ].join('\n');
}

async function main() {
  console.log('New roll scaffold — press Enter to accept the default in [brackets].\n');

  const rollNumber = await askRequired('Roll number', await nextRollNumber());
  const rollFile = path.join(rollsDir, `roll-${rollNumber}.md`);

  if (await stat(rollFile).catch(() => null)) {
    const overwrite = await askYesNo(`${path.relative(root, rollFile)} already exists — overwrite?`, false);
    if (!overwrite) {
      console.log('Aborted.');
      rl.close();
      return;
    }
  }

  const title = await askRequired('Roll title', `Roll ${rollNumber}`);
  const rollDate = await askRequired('Roll date (developed/posted)', todayISO());
  const shootDate = await askRequired('Shoot date (applied to every exposure)', rollDate);
  const location = await askRequired('Default location (applied to every exposure)');
  const camera = await askRequired('Camera', 'Minolta X-700');
  const lens = await askRequired('Lens', '45mm Stock');
  const includePreroll = await askYesNo('Include a preroll frame (_1.jpg)?', true);

  let range;
  while (true) {
    const input = await ask('Frame number range', '00-36');
    const match = input.match(/^(\d+)\s*-\s*(\d+)$/);
    if (match && parseInt(match[1], 10) <= parseInt(match[2], 10)) {
      range = [parseInt(match[1], 10), parseInt(match[2], 10)];
      break;
    }
    console.log('  Enter a range like 00-36 or 01-35.');
  }

  rl.close();

  const imageDir = `../../assets/photos/roll-${rollNumber}`;
  const exposures = [];

  if (includePreroll) {
    exposures.push(
      buildExposure({
        frame: -1,
        title: 'Preroll 0',
        image: `${imageDir}/_1.jpg`,
        location,
        date: shootDate,
        camera,
        lens,
      }),
    );
  }

  const [start, end] = range;
  for (let n = start; n <= end; n++) {
    exposures.push(
      buildExposure({
        frame: n,
        title: n === 0 ? 'Preroll 1' : `Frame ${n}`,
        image: `${imageDir}/${pad2(n)}.jpg`,
        location,
        date: shootDate,
        camera,
        lens,
      }),
    );
  }

  const frontmatter = [
    '---',
    `roll: ${yamlString(rollNumber)}`,
    `title: ${yamlString(title)}`,
    `date: ${rollDate}`,
    'exposures:',
    exposures.join('\n'),
    '---',
    '',
  ].join('\n');

  await writeFile(rollFile, frontmatter);
  console.log(`\n✓ wrote ${path.relative(root, rollFile)} (${exposures.length} exposures)`);
  console.log(`  Upload originals to R2 under roll-${rollNumber}/, then fill in per-frame titles/locations as needed.`);
}

main();
