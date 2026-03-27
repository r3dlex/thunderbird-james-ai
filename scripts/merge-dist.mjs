/**
 * Post-build script: copies Angular output into dist/ui/
 * Angular builds to src/ui/dist/corvus-ui/browser/
 * This script merges it into dist/ui/ alongside background.js and manifest.
 */

import { cpSync, existsSync, mkdirSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, "..")

const angularOut = resolve(root, "src/ui/dist/corvus-ui/browser")
const target = resolve(root, "dist/ui")

if (!existsSync(angularOut)) {
  console.error("Angular build output not found at", angularOut)
  console.error("Run 'cd src/ui && npx ng build' first")
  process.exit(1)
}

mkdirSync(target, { recursive: true })
cpSync(angularOut, target, { recursive: true })

console.log("Merged Angular output into dist/ui/")
