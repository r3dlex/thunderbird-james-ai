/**
 * Post-build script: copies the active UI build output into dist/ui/
 * without touching the rest of dist/. Supports staged Angular -> Vite
 * migration by discovering the final UI artifact directory.
 */

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "fs"
import { resolve, dirname, join } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, "..")

const target = resolve(root, "dist/ui")
const explicitSource = process.argv[2] || process.env.CORVUS_UI_DIST_DIR
const defaultCandidates = [
  "src/ui/dist",
  "src/ui/dist/corvus-ui/browser",
]

function hasIndexHtml(directory) {
  return existsSync(join(directory, "index.html"))
}

function findNestedIndexHtml(directory) {
  if (!existsSync(directory)) return null

  const entries = readdirSync(directory, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => join(directory, entry.name))

  for (const entry of entries) {
    if (hasIndexHtml(entry)) {
      return entry
    }
  }

  return null
}

function resolveUiOutputDirectory() {
  const candidates = []

  if (explicitSource) {
    candidates.push(resolve(root, explicitSource))
  }

  for (const candidate of defaultCandidates) {
    candidates.push(resolve(root, candidate))
  }

  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue
    if (hasIndexHtml(candidate)) return candidate

    const nested = findNestedIndexHtml(candidate)
    if (nested) return nested
  }

  return null
}

function copyDirectoryContents(source, destination) {
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    cpSync(join(source, entry.name), join(destination, entry.name), { recursive: true })
  }
}

const uiOut = resolveUiOutputDirectory()

if (!uiOut) {
  console.error("UI build output not found.")
  console.error("Looked for an index.html in:")
  for (const candidate of [explicitSource, ...defaultCandidates].filter(Boolean)) {
    console.error(" -", resolve(root, candidate))
  }
  console.error("Run the UI build first or pass CORVUS_UI_DIST_DIR=/path/to/ui/output")
  process.exit(1)
}

if (!statSync(uiOut).isDirectory()) {
  console.error("Resolved UI output is not a directory:", uiOut)
  process.exit(1)
}

rmSync(target, { recursive: true, force: true })
mkdirSync(target, { recursive: true })
copyDirectoryContents(uiOut, target)

console.log("Merged UI output into dist/ui/")
console.log("Source:", uiOut)
console.log("Target:", target)
