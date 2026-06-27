// Gera ícones PWA: node scripts/generate-icons.js (requer: npm install sharp)
import { createRequire } from 'module'
import { readFileSync } from 'fs'
import { mkdir } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sizes = [72,96,128,144,152,192,384,512,32]

async function run() {
  let sharp
  try { const r = createRequire(import.meta.url); sharp = r('sharp') }
  catch { console.log('Execute: npm install sharp && node scripts/generate-icons.js'); return }
  
  await mkdir(path.join(__dirname,'../public/icons'), { recursive: true })
  const svg = readFileSync(path.join(__dirname,'../public/favicon.svg'))
  
  for (const s of sizes) {
    await sharp(svg).resize(s,s).png().toFile(path.join(__dirname,`../public/icons/icon-${s}.png`))
    console.log(`✅ icon-${s}.png`)
  }
}
run()
