import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const [runtimeDirectory, mode] = process.argv.slice(2)
if (!runtimeDirectory || ![undefined, '--check'].includes(mode)) {
  throw new Error('Usage: node scripts/render-plugin-icons.mjs <renderer runtime directory> [--check]')
}
const require = createRequire(resolve(runtimeDirectory, 'package.json'))
const sharp = require('sharp')
if (sharp.versions.sharp !== '0.35.5' || sharp.versions.rsvg !== '2.63.2') {
  throw new Error('Expected sharp 0.35.5 with librsvg 2.63.2')
}

const repository = fileURLToPath(new URL('../', import.meta.url))
const sizes = [32, 64, 128, 256, 512]
const svgNamespace = 'http://www.w3.org/2000/svg'
const iconGrid = '0 0 24 24'
const glyphStrokeWidth = 1.8
const plugins = [
  {
    id: 'environment-context', label: 'Environment & Context', rootIcon: true,
    palette: { highlight: '#B9FFFA', accent: '#29E4DA', edge: '#0D8EAA', top: '#187D8A', middle: '#0C505F', base: '#062632' },
    glyph: [
      'M7.2 6.5h9.6a1.7 1.7 0 0 1 1.7 1.7v5.35a1.7 1.7 0 0 1-1.7 1.7H7.2a1.7 1.7 0 0 1-1.7-1.7V8.2a1.7 1.7 0 0 1 1.7-1.7Z',
      'M12 15.25v2.5m-3 0h6M8.4 9.4l1.6 1.5-1.6 1.5m4.1 0h2.65',
    ],
  },
  {
    id: 'humanizer', label: 'Humanizer', rootIcon: true, nativeControl: false,
    palette: { highlight: '#E8CBFF', accent: '#BD78FF', edge: '#7039E1', top: '#8149C0', middle: '#502C87', base: '#281442' },
    glyph: [
      'm6.2 17.8 1-4.1 7.65-7.65a1.65 1.65 0 0 1 2.34 0l.76.76a1.65 1.65 0 0 1 0 2.34L10.3 16.8l-4.1 1Z',
      'm13.35 7.55 3.1 3.1M13.4 17.8h4.4',
    ],
  },
  {
    id: 'personal-profile', label: 'My Profile', rootIcon: true,
    palette: { highlight: '#FFF0BE', accent: '#FFBD51', edge: '#E27320', top: '#AB5E24', middle: '#743814', base: '#3E1C11' },
    glyph: [
      'M14.8 8.4a2.8 2.8 0 1 1-5.6 0 2.8 2.8 0 1 1 5.6 0Z',
      'M6.2 17.65v-.35a4.1 4.1 0 0 1 4.1-4.1h3.4a4.1 4.1 0 0 1 4.1 4.1v.35Z',
    ],
  },
  {
    id: 'direct-chat', label: 'Direct Chat',
    palette: { highlight: '#C7F2FF', accent: '#5DA8FF', edge: '#304BE8', top: '#3667C4', middle: '#203D8D', base: '#131D53' },
    glyph: [
      'M7.5 6.5h9a2 2 0 0 1 2 2v4.75a2 2 0 0 1-2 2h-6.2L5.5 18V8.5a2 2 0 0 1 2-2Z',
      'M8.8 9.65h6.4m-6.4 2.6h4.2',
    ],
  },
  {
    id: 'conversation-lifecycle', label: 'Conversation Lifecycle',
    palette: { highlight: '#CCFFE5', accent: '#5DECAA', edge: '#138F70', top: '#247E65', middle: '#165344', base: '#0A3029' },
    glyph: [
      'm7.75 13.2-2.1 2.1V7.75c0-.9.75-1.65 1.65-1.65h7.25c.9 0 1.65.75 1.65 1.65v.55M8.2 9.4h4.4',
      'M18.8 14.85a3.95 3.95 0 1 1-7.9 0 3.95 3.95 0 1 1 7.9 0Z',
      'M14.85 12.9v2.2h1.55',
    ],
  },
  {
    id: 'adaptive-reasoning', label: 'Adaptive Reasoning',
    palette: { highlight: '#FFCEE9', accent: '#FF78BB', edge: '#C43F91', top: '#A04378', middle: '#69254F', base: '#36152E' },
    glyph: [
      'M6.5 15.45V18m5.5-5.3V18m5.5-6.5V18M6.5 11.55c4.1 0 5.1-4.55 9.15-4.55',
      'M19.35 7a1.85 1.85 0 1 1-3.7 0 1.85 1.85 0 1 1 3.7 0Z',
    ],
  },
]

const escapeXml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
const raster = source => sharp(Buffer.from(source)).ensureAlpha().png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer()

function glyphGroup(icon, stroke, id = '') {
  return [
    `  <g${id} fill="none" stroke="${stroke}" stroke-width="${glyphStrokeWidth}" stroke-linecap="round" stroke-linejoin="round">`,
    ...icon.glyph.map(path => `    <path d="${path}"/>`),
    '  </g>',
  ].join('\n')
}

function vector(icon, size, badge) {
  const { highlight, accent, edge, top, middle, base } = icon.palette
  return [
    `<svg xmlns="${svgNamespace}" width="${size}" height="${size}" viewBox="${iconGrid}" role="img" aria-labelledby="title">`,
    `  <title id="title">${escapeXml(icon.label)}</title>`,
    ...(badge ? [
      '  <defs>',
      '    <linearGradient id="ring" x1="0" y1="0" x2=".8" y2="1">',
      `      <stop stop-color="${highlight}"/>`,
      `      <stop offset=".4" stop-color="${accent}"/>`,
      `      <stop offset="1" stop-color="${edge}"/>`,
      '    </linearGradient>',
      '    <linearGradient id="face" x2=".26" y2="1">',
      `      <stop stop-color="${top}"/>`,
      `      <stop offset=".51" stop-color="${middle}"/>`,
      `      <stop offset="1" stop-color="${base}"/>`,
      '    </linearGradient>',
      '    <radialGradient id="sheen" cx=".46" cy="0" r=".76" gradientTransform="scale(1 .56)">',
      `      <stop stop-color="${highlight}" stop-opacity=".34"/>`,
      `      <stop offset="1" stop-color="${highlight}" stop-opacity="0"/>`,
      '    </radialGradient>',
      '  </defs>',
      '  <rect x="1" y="1" width="22" height="22" rx="6" fill="url(#ring)"/>',
      '  <rect x="2.3" y="2.3" width="19.4" height="19.4" rx="4.8" fill="url(#face)"/>',
      '  <rect x="2.3" y="2.3" width="19.4" height="19.4" rx="4.8" fill="url(#sheen)"/>',
      `  <rect x="2.55" y="2.55" width="18.9" height="18.9" rx="4.55" fill="none" stroke="${highlight}" stroke-opacity=".24" stroke-width=".3"/>`,
      `  <path d="M8.8 2.6h6.4" fill="none" stroke="${highlight}" stroke-opacity=".72" stroke-width=".45" stroke-linecap="round"/>`,
    ] : []),
    glyphGroup(icon, badge ? '#FFFFFF' : 'currentColor', ' id="glyph"'),
    '</svg>',
    '',
  ].join('\n')
}

async function output(path, data) {
  const destination = resolve(repository, path)
  if (mode === '--check') {
    if (!(await readFile(destination)).equals(Buffer.from(data))) throw new Error(`Regenerate ${path}`)
    return
  }
  await mkdir(dirname(destination), { recursive: true })
  await writeFile(destination, data)
}

async function renderIcons(icon) {
  const root = `plugins/${icon.id}`
  const assets = `${root}/assets`
  const pngs = new Map()
  await output(`${assets}/icon.svg`, vector(icon, 24, true))
  await output(`${assets}/glyph.svg`, vector(icon, 24, false))
  for (const size of sizes) {
    const png = await raster(vector(icon, size, true))
    const { width, height, channels, format } = await sharp(png).metadata()
    const { channels: statistics } = await sharp(png).stats()
    if (width !== size || height !== size || channels !== 4 || format !== 'png' ||
        statistics[3].min !== 0 || statistics[3].max !== 255 || (size === 256 && png.length >= 256 * 1024)) {
      throw new Error(`Invalid ${size}px PNG for ${icon.id}`)
    }
    await output(`${assets}/png/icon-${size}.png`, png)
    if (size === 256 && icon.rootIcon) await output(`${root}/icon.png`, png)
    pngs.set(size, png)
  }
  return { ...icon, pngs }
}

async function renderClientGlyphs() {
  const client = await readFile(resolve(repository, 'client.js'), 'utf8')
  const start = '    // Plugin glyphs generated by scripts/render-plugin-icons.mjs.'
  const end = '    // End generated plugin glyphs.'
  const first = client.indexOf(start)
  const last = client.indexOf(end)
  if (first < 0 || last < first) throw new Error('Missing plugin glyph block in client.js')
  const eol = client.includes('\r\n') ? '\r\n' : '\n'
  const lines = [start, `    const pluginGlyphStrokeWidth = ${glyphStrokeWidth}`, '    const pluginGlyphs = {']
  for (const { id, glyph } of plugins.filter(icon => icon.nativeControl !== false)) {
    lines.push(`      '${id}': [`, ...glyph.map(path => `        '${path}',`), '      ],')
  }
  lines.push('    }', end)
  await output('client.js', client.slice(0, first) + lines.join(eol) + client.slice(last + end.length))
}

function text(x, y, value, color, size, weight = 400, anchor = 'start') {
  return `<text x="${x}" y="${y}" fill="${color}" font-family="Segoe UI, sans-serif" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}">${escapeXml(String(value))}</text>`
}

await renderClientGlyphs()

const artwork = []
for (const icon of plugins) artwork.push(await renderIcons(icon))

const columns = 3
const cardWidth = 280
const cardHeight = 244
const cardGap = 20
const sideMargin = 28
const cardsTop = 92
const rows = Math.ceil(artwork.length / columns)
const sheetWidth = 2 * sideMargin + columns * cardWidth + (columns - 1) * cardGap
const sheetHeight = cardsTop + rows * cardHeight + (rows - 1) * cardGap + sideMargin

for (const [theme, bg, panel, ink, muted, border] of [
  ['light', '#F1F5F9', '#FFFFFF', '#172033', '#4B5B70', '#D9E2EC'],
  ['dark', '#111827', '#1C2637', '#F1F5F9', '#B7C5D6', '#344357'],
]) {
  const markup = [
    `<svg xmlns="${svgNamespace}" width="${sheetWidth}" height="${sheetHeight}" viewBox="0 0 ${sheetWidth} ${sheetHeight}">`,
    `<rect width="${sheetWidth}" height="${sheetHeight}" fill="${bg}"/>`,
    text(28, 45, 'ABINADWAN Suite', ink, 26, 700),
    text(28, 72, `${theme === 'light' ? 'Light' : 'Dark'} theme · badge artwork and native UI glyph sizes`, muted, 15),
  ]
  for (const [index, icon] of artwork.entries()) {
    const x = sideMargin + (index % columns) * (cardWidth + cardGap)
    const y = cardsTop + Math.floor(index / columns) * (cardHeight + cardGap)
    markup.push(`<rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" rx="15" fill="${panel}" stroke="${border}"/>`)
    markup.push(text(x + 16, y + 28, icon.label, ink, 17, 650))
    for (const [size, offset] of [[128, 16], [64, 155], [32, 232]]) {
      markup.push(`<image x="${x + offset}" y="${y + 128 - size / 2}" width="${size}" height="${size}" href="data:image/png;base64,${icon.pngs.get(size).toString('base64')}"/>`)
      markup.push(text(x + offset + size / 2, y + 200, size, muted, 12, 400, 'middle'))
    }
    markup.push(`<path d="M${x + 16} ${y + 211}h248" stroke="${border}"/>`)
    markup.push(text(x + 16, y + 232, 'UI glyph', muted, 12))
    for (const [i, size] of [16, 20, 24].entries()) {
      const left = x + 91 + i * 59 - size / 2
      markup.push(`<svg x="${left}" y="${y + 227 - size / 2}" width="${size}" height="${size}" viewBox="${iconGrid}" color="${ink}">${glyphGroup(icon, 'currentColor')}</svg>`)
      markup.push(text(x + 109 + i * 59, y + 232, size, muted, 11))
    }
  }
  markup.push('</svg>')
  await output(`docs/assets/new-plugins/contact-sheet-${theme}.png`, await raster(markup.join('')))
}

console.log(`${mode === '--check' ? 'Verified' : 'Rendered'} 6 SVG badge and glyph pairs, 30 PNG variants, 3 root icons and 2 contact sheets.`)