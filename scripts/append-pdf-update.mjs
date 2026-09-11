import fs from 'node:fs';

const [inputPath, title, ...rawLines] = process.argv.slice(2);

if (!inputPath || !title || rawLines.length === 0) {
  throw new Error('Usage: node scripts/append-pdf-update.mjs <pdf> <title> <line>...');
}

const original = fs.readFileSync(inputPath);
const source = original.toString('latin1');
const startxrefIndex = source.lastIndexOf('startxref');
if (startxrefIndex < 0) throw new Error(`No startxref found in ${inputPath}`);
const previousXref = Number(source.slice(startxrefIndex).match(/startxref\s+(\d+)/)?.[1]);
if (!Number.isInteger(previousXref)) throw new Error(`Invalid startxref in ${inputPath}`);

const trailerIndex = source.indexOf('trailer', previousXref);
const trailerEnd = source.indexOf('startxref', trailerIndex);
const trailer = source.slice(trailerIndex, trailerEnd).trim();
const size = Number(trailer.match(/\/Size\s+(\d+)/)?.[1]);
const root = trailer.match(/\/Root\s+(\d+)\s+0\s+R/)?.[1];
if (!Number.isInteger(size) || !root) throw new Error(`Invalid trailer in ${inputPath}`);

const rootObjectStart = source.indexOf(`${root} 0 obj`);
const rootObjectEnd = source.indexOf('endobj', rootObjectStart);
if (rootObjectStart < 0 || rootObjectEnd < 0) throw new Error('Catalog object not found');

const pagesObject = source.slice(rootObjectStart, rootObjectEnd);
const pagesObjectNumber = Number(pagesObject.match(/\/Pages\s+(\d+)\s+0\s+R/)?.[1]);
if (!Number.isInteger(pagesObjectNumber)) throw new Error('Pages object not found in catalog');
const pagesStart = source.indexOf(`${pagesObjectNumber} 0 obj`);
const pagesEnd = source.indexOf('endobj', pagesStart);
if (pagesStart < 0 || pagesEnd < 0) throw new Error('Pages object not found');
const pages = source.slice(pagesStart, pagesEnd);
const count = Number(pages.match(/\/Count\s+(\d+)/)?.[1]);
const kidsMatch = pages.match(/\/Kids\s*\[([^\]]*)\]/s);
if (!Number.isInteger(count) || !kidsMatch) throw new Error('Invalid pages tree');

const streamObjectNumber = size;
const pageObjectNumber = size + 1;
const contentLines = rawLines.flatMap((line) => line.split('\\n'));
const escapePdfText = (value) => value.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');
const content = [
  '0.567 w',
  '0.12 0.23 0.54 rg',
  '0 841.89 595.28 -62.36 re',
  'f',
  '0.94 0.27 0.27 rg',
  '0 779.53 595.28 -4.25 re',
  'f',
  'BT',
  '/F2 11 Tf',
  '1 g',
  '39.69 810.71 Td',
  '(CDRRMO BALIWAG CITY | DISASTRACE FEATURE UPDATE) Tj',
  'ET',
  'BT',
  '/F1 8.5 Tf',
  '0.12 0.23 0.54 rg',
  '39.69 758 Td',
  `(${escapePdfText(title)}) Tj`,
  'ET',
];

let y = 735;
for (const line of contentLines) {
  content.push('BT', '/F1 8.5 Tf', '0.12 0.16 0.22 rg', `45.35 ${y.toFixed(2)} Td`, `(${escapePdfText(line)}) Tj`, 'ET');
  y -= 19;
  if (y < 55) break;
}
const stream = `${content.join('\n')}\n`;

const updatedPages = `${pagesObjectNumber} 0 obj\n<<\n/Type /Pages\n/Kids [${kidsMatch[1].trim()} ${pageObjectNumber} 0 R ]\n/Count ${count + 1}\n>>\nendobj\n`;
const streamObject = `${streamObjectNumber} 0 obj\n<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}endstream\nendobj\n`;
const pageObject = `${pageObjectNumber} 0 obj\n<<\n/Type /Page\n/Parent ${pagesObjectNumber} 0 R\n/Resources 2 0 R\n/MediaBox [0 0 595.28 841.89]\n/Contents ${streamObjectNumber} 0 R\n>>\nendobj\n`;

const append = `${updatedPages}${streamObject}${pageObject}`;
const updatedPagesOffset = original.length;
const streamOffset = updatedPagesOffset + Buffer.byteLength(updatedPages, 'latin1');
const pageOffset = streamOffset + Buffer.byteLength(streamObject, 'latin1');
const xrefOffset = pageOffset + Buffer.byteLength(pageObject, 'latin1');
const padOffset = (offset) => `${offset}`.padStart(10, '0');
const xref = `xref\n${pagesObjectNumber} 1\n${padOffset(updatedPagesOffset)} 00000 n \n${streamObjectNumber} 2\n${padOffset(streamOffset)} 00000 n \n${padOffset(pageOffset)} 00000 n \n`;
const updatedTrailer = trailer
  .replace(/\/Size\s+\d+/, `/Size ${size + 2}`)
  .replace(/>>\s*$/, `/Prev ${previousXref}\n>>`);
const suffix = `${xref}${updatedTrailer}\nstartxref\n${xrefOffset}\n%%EOF\n`;

fs.writeFileSync(inputPath, Buffer.concat([original, Buffer.from(append + suffix, 'latin1')]));
console.log(`Appended page ${pageObjectNumber} to ${inputPath}`);
