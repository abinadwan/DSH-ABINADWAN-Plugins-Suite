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
const plugins = [
  ['direct-chat', 'Direct Chat'],
  ['conversation-lifecycle', 'Conversation Lifecycle'],
  ['adaptive-reasoning', 'Adaptive Reasoning'],
]
const sizes = [32, 64, 128, 256, 512]
const sizeSvg = (source, size) => Buffer.from(source.replace('width="24" height="24"', `width="${size}" height="${size}"`))
const raster = source => sharp(source).ensureAlpha().png({ compressionLevel: 9 }).toBuffer()

async function output(path, buffer) {
  const destination = resolve(repository, path)
  if (mode === '--check') {
    if (!(await readFile(destination)).equals(buffer)) throw new Error(`Regenerate ${path}`)
    return
  }
  await mkdir(dirname(destination), { recursive: true })
  await writeFile(destination, buffer)
}

const artwork = []
for (const [id, label] of plugins) {
  const assets = `plugins/${id}/assets`
  const master = await readFile(resolve(repository, assets, 'icon.svg'), 'utf8')
  if (!master.includes('viewBox="0 0 24 24"') || !master.includes('width="24" height="24"') ||
      /<(?:script|image|foreignObject|style)\b|\b(?:href|src|on\w+)=/i.test(master)) {
    throw new Error(`Unsafe or invalid SVG master for ${id}`)
  }
  const glyph = master.match(/<g id="glyph"[^>]*>([\s\S]*?)<\/g>/)?.[1]
  if (!glyph) throw new Error(`Missing foreground glyph in ${id}`)

  const pngs = new Map()
  for (const size of sizes) {
    const png = await raster(sizeSvg(master, size))
    const { width, height, channels, format } = await sharp(png).metadata()
    const { channels: statistics } = await sharp(png).stats()
    if (width !== size || height !== size || channels !== 4 || format !== 'png' ||
        statistics[3].min !== 0 || statistics[3].max !== 255 || (size === 256 && png.length > 256 * 1024)) {
      throw new Error(`Invalid ${size}px PNG for ${id}`)
    }
    await output(`${assets}/png/icon-${size}.png`, png)
    pngs.set(size, png)
  }
  artwork.push({ label, glyph, pngs })
}

function text(x, y, value, color, size, weight = 400) {
  return `<text x="${x}" y="${y}" fill="${color}" font-family="Segoe UI, sans-serif" font-size="${size}" font-weight="${weight}">${value}</text>`
}

for (const [theme, bg, panel, ink, muted, border] of [
  ['light', '#F1F5F9', '#FFFFFF', '#172033', '#4B5B70', '#D9E2EC'],
  ['dark', '#111827', '#1C2637', '#F1F5F9', '#B7C5D6', '#344357'],
]) {
  const markup = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="936" height="364" viewBox="0 0 936 364">',
    `<rect width="936" height="364" fill="${bg}"/>`,
    text(28, 45, 'ABINADWAN Suite', ink, 26, 700),
    text(28, 72, `${theme === 'light' ? 'Light' : 'Dark'} theme · badge artwork and native UI glyph sizes`, muted, 15),
  ]
  for (const [index, icon] of artwork.entries()) {
    const x = 28 + 300 * index
    markup.push(`<rect x="${x}" y="92" width="280" height="244" rx="15" fill="${panel}" stroke="${border}"/>`)
    markup.push(text(x + 16, 120, icon.label, ink, 17, 650))
    for (const [size, offset] of [[128, 16], [64, 155], [32, 232]]) {
      markup.push(`<image x="${x + offset}" y="${220 - size / 2}" width="${size}" height="${size}" href="data:image/png;base64,${icon.pngs.get(size).toString('base64')}"/>`)
      markup.push(text(x + offset + Math.max(0, (size - 23) / 2), 292, `${size}`, muted, 12))
    }
    markup.push(`<path d="M${x + 16} 303h248" stroke="${border}"/>`)
    markup.push(text(x + 16, 324, 'UI glyph', muted, 12))
    for (const [i, size] of [16, 20, 24].entries()) {
      const left = x + 81 + i * 59
      markup.push(`<svg x="${left}" y="${319 - size / 2}" width="${size}" height="${size}" viewBox="0 0 24 24"><g fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon.glyph}</g></svg>`)
      markup.push(text(left + 28, 324, `${size}`, muted, 11))
    }
  }
  markup.push('</svg>')
  await output(`docs/assets/new-plugins/contact-sheet-${theme}.png`, await raster(Buffer.from(markup.join(''))))
}

console.log(`${mode === '--check' ? 'Verified' : 'Rendered'} 15 transparent PNGs and 2 contact sheets.`)
