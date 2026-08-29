/**
 * Astro integration that preserves data-astro-source-file and data-astro-source-loc
 * attributes in production builds while hiding the dev toolbar.
 *
 * This works by intercepting .astro files during the load phase (before any transforms),
 * injecting source location attributes directly into the template HTML.
 */

import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

// Constants
const ASTRO_EXTENSION = '.astro'
const HTML_EXTENSION = '.html'
const NODE_MODULES = 'node_modules'
const DEFAULT_OUT_DIR = './dist'
const SRC_PAGES_PREFIX = 'src/pages'
const SRC_PREFIX = 'src/'
const INDEX_FILE = 'index'

const ATTR_SOURCE_FILE = 'data-astro-source-file'
const ATTR_SOURCE_LOC = 'data-astro-source-loc'

const PLUGIN_NAME = 'astro-source-info'
const VITE_PLUGIN_NAME = 'vite-plugin-astro-source-info'
const LOG_PREFIX = `[${PLUGIN_NAME}]`

const SKIP_TAGS = ['script', 'style', 'slot', 'fragment']
const MINIFIED_COLUMN_THRESHOLD = 200

// Track which files we've already processed to avoid infinite loops
const processedFiles = new Set()

/**
 * Resolves a path-like config value (string, URL, or object with pathname) to a string.
 */
function resolvePath(value, fallback = '') {
    if (!value) return fallback
    if (typeof value === 'string') return value
    if (value instanceof URL) return fileURLToPath(value)
    if (value.pathname) return value.pathname
    return fallback
}

/**
 * Creates a Vite plugin that injects source location data into Astro components
 * during the LOAD phase, before Astro's compiler sees the file.
 */
function createSourceInfoVitePlugin(rootDir) {
    return {
        name: VITE_PLUGIN_NAME,
        enforce: 'pre',

        // Use load hook to intercept files before any transforms
        load(id) {
            // Only process .astro files
            if (!id.endsWith(ASTRO_EXTENSION)) {
                return null
            }

            // Skip if already processed (avoid infinite loops)
            if (processedFiles.has(id)) {
                return null
            }

            // Get relative path from root directory
            let relativePath
            try {
                relativePath = path.relative(rootDir, id).replace(/\\/g, '/')
            } catch {
                relativePath = path.basename(id)
            }

            // Skip node_modules
            if (relativePath.includes(NODE_MODULES)) {
                return null
            }

            // Read the original file
            let code
            try {
                code = fs.readFileSync(id, 'utf-8')
            } catch (e) {
                console.error(`${LOG_PREFIX} Failed to read ${id}:`, e.message)
                return null
            }

            // Mark as processed
            processedFiles.add(id)

            // Parse the .astro file structure
            // Format: ---\nfrontmatter\n---\ntemplate
            const frontmatterRegex = /^(---\r?\n)([\s\S]*?)(\r?\n---\r?\n)([\s\S]*)$/
            const match = code.match(frontmatterRegex)

            let frontmatterPart = ''
            let template = ''
            let templateStartLine = 1

            if (match) {
                const [, fmStart, fmContent, fmEnd, tmpl] = match
                frontmatterPart = fmStart + fmContent + fmEnd
                template = tmpl
                // Count lines in frontmatter section to know where template starts
                templateStartLine = (frontmatterPart.match(/\n/g) || []).length + 1
            } else {
                // No frontmatter, entire file is template
                template = code
                templateStartLine = 1
            }

            // Inject data attributes into HTML elements in the template
            const transformedTemplate = injectSourceAttributes(template, relativePath, templateStartLine)

            if (transformedTemplate === template) {
                // No changes made, let Vite load the file normally
                processedFiles.delete(id)
                return null
            }

            const newCode = frontmatterPart + transformedTemplate

            console.log(`${LOG_PREFIX} Processed: ${relativePath} (template starts at line ${templateStartLine})`)

            return {
                code: newCode,
                map: null
            }
        }
    }
}

/**
 * Injects data-astro-source-* attributes into HTML elements.
 * Only processes lowercase HTML tags (not Astro/React components which are PascalCase).
 * Handles multi-line tags by processing the entire template at once.
 */
function injectSourceAttributes(template, sourceFile, startLine) {
    const lineOffsets = buildLineOffsetMap(template, startLine)

    let result = ''
    let lastIndex = 0

    // Multi-line regex to find opening lowercase HTML tags (including tags spanning multiple lines)
    // Uses [\s\S]*? to match any characters (including newlines) lazily until the first >
    const tagRegex = /<([a-z][a-z0-9-]*)([\s\S]*?)>/g

    let match
    while ((match = tagRegex.exec(template)) !== null) {
        const tagName = match[1]
        const tagContent = match[2]
        const matchStart = match.index
        const tagNameEnd = matchStart + 1 + tagName.length // Position after <tagname

        // Skip certain tags
        if (SKIP_TAGS.includes(tagName)) {
            continue
        }

        // Skip closing tags (e.g. if somehow matched)
        if (template[matchStart + 1] === '/') {
            continue
        }

        // Check if this tag already has source attributes
        if (tagContent.includes(ATTR_SOURCE_FILE)) {
            continue
        }

        const lineNumber = getLineNumberAtOffset(lineOffsets, matchStart)
        const colNumber = getColumnAtOffset(template, matchStart)

        const attributes = buildSourceAttributes(sourceFile, lineNumber, colNumber)

        // Insert attributes right after the tag name
        result += template.slice(lastIndex, tagNameEnd) + attributes
        lastIndex = tagNameEnd
    }

    result += template.slice(lastIndex)

    return result
}

/**
 * Build an array of { offset, line } pairs for mapping character offsets to line numbers.
 */
function buildLineOffsetMap(template, startLine) {
    const offsets = [{ offset: 0, line: startLine }]
    for (let i = 0; i < template.length; i++) {
        if (template[i] === '\n') {
            offsets.push({ offset: i + 1, line: startLine + offsets.length })
        }
    }
    return offsets
}

/**
 * Get the line number for a character offset using binary search.
 */
function getLineNumberAtOffset(lineOffsets, charOffset) {
    let low = 0
    let high = lineOffsets.length - 1
    while (low < high) {
        const mid = Math.ceil((low + high) / 2)
        if (lineOffsets[mid].offset <= charOffset) {
            low = mid
        } else {
            high = mid - 1
        }
    }
    return lineOffsets[low].line
}

/**
 * Get the column number (0-indexed) for a character offset within its line.
 */
function getColumnAtOffset(template, charOffset) {
    let lineStart = charOffset
    while (lineStart > 0 && template[lineStart - 1] !== '\n') {
        lineStart--
    }
    return charOffset - lineStart
}

/**
 * Builds source attribute string for injection.
 */
function buildSourceAttributes(sourceFile, lineNumber, colNumber) {
    return ` ${ATTR_SOURCE_FILE}="${sourceFile}" ${ATTR_SOURCE_LOC}="${lineNumber}:${colNumber}"`
}

/**
 * Recursively process HTML files in a directory (fallback post-processing)
 */
function processHtmlFiles(dir, rootOutDir) {
    if (!fs.existsSync(dir)) return

    const entries = fs.readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)

        if (entry.isDirectory()) {
            processHtmlFiles(fullPath, rootOutDir)
        } else if (entry.name.endsWith(HTML_EXTENSION)) {
            processHtmlFile(fullPath, rootOutDir)
        }
    }
}

/**
 * Derives the source page path from an HTML file path.
 */
function deriveSourcePagePath(filePath, relativePath) {
    const dirName = path.dirname(relativePath)
    const isRootDir = dirName === '.' || dirName === ''

    if (path.basename(filePath) === `${INDEX_FILE}${HTML_EXTENSION}`) {
        return isRootDir
            ? `${SRC_PAGES_PREFIX}/${INDEX_FILE}${ASTRO_EXTENSION}`
            : `${SRC_PAGES_PREFIX}/${dirName}/${INDEX_FILE}${ASTRO_EXTENSION}`
    }

    const pageName = path.basename(filePath, HTML_EXTENSION)
    return isRootDir
        ? `${SRC_PAGES_PREFIX}/${pageName}${ASTRO_EXTENSION}`
        : `${SRC_PAGES_PREFIX}/${dirName}/${pageName}${ASTRO_EXTENSION}`
}

/**
 * Process a single HTML file to clean up duplicate attributes and ensure correct source info
 */
function processHtmlFile(filePath, rootOutDir) {
    let html = fs.readFileSync(filePath, 'utf-8')
    const relativePath = path.relative(rootOutDir, filePath)
    let modified = false

    // Check if there are duplicate data-astro-source-loc attributes (Astro adds wrong ones)
    // Pattern: data-astro-source-loc="X:Y" data-astro-source-loc="A:B"
    // We want to keep only the SECOND one (ours with correct line numbers)
    const duplicateLocRegex = new RegExp(`${ATTR_SOURCE_LOC}="(\\d+):(\\d+)"\\s+${ATTR_SOURCE_LOC}="(\\d+):(\\d+)"`, 'g')

    if (duplicateLocRegex.test(html)) {
        console.log(`${LOG_PREFIX} ${relativePath}: cleaning up duplicate attributes`)
        // Reset regex state
        duplicateLocRegex.lastIndex = 0

        html = html.replace(duplicateLocRegex, (match, line1, col1, line2, col2) => {
            // Keep the second one (lower column number typically indicates original source)
            // The first one from Astro has huge column numbers from minified output
            const col1Num = parseInt(col1, 10)
            const col2Num = parseInt(col2, 10)

            // If first has unreasonably high column, it's from minified output - remove it
            if (col1Num > MINIFIED_COLUMN_THRESHOLD) {
                return `${ATTR_SOURCE_LOC}="${line2}:${col2}"`
            }
            // Otherwise keep the one with smaller column (more likely to be correct)
            if (col2Num < col1Num) {
                return `${ATTR_SOURCE_LOC}="${line2}:${col2}"`
            }
            return `${ATTR_SOURCE_LOC}="${line1}:${col1}"`
        })
        modified = true
    }

    // Also clean up duplicate data-astro-source-file attributes if any
    const duplicateFileRegex = new RegExp(`${ATTR_SOURCE_FILE}="([^"]+)"\\s+${ATTR_SOURCE_FILE}="([^"]+)"`, 'g')
    if (duplicateFileRegex.test(html)) {
        duplicateFileRegex.lastIndex = 0
        html = html.replace(duplicateFileRegex, (match, file1, file2) => {
            // Prefer the one that starts with "src/" (our format)
            if (file2.startsWith(SRC_PREFIX)) {
                return `${ATTR_SOURCE_FILE}="${file2}"`
            }
            return `${ATTR_SOURCE_FILE}="${file1}"`
        })
        modified = true
    }

    // If no source attributes at all, add fallback
    if (!html.includes(ATTR_SOURCE_FILE)) {
        const sourcePage = deriveSourcePagePath(filePath, relativePath)
        const fallbackAttrs = buildSourceAttributes(sourcePage, 1, 0)

        console.log(`${LOG_PREFIX} ${relativePath}: adding fallback attributes`)

        html = html.replace(
            /(<html)(\s|>)/i,
            `$1${fallbackAttrs}$2`
        )

        html = html.replace(
            /(<body)(\s|>)/i,
            `$1${fallbackAttrs}$2`
        )
        modified = true
    }

    if (modified) {
        fs.writeFileSync(filePath, html)
        console.log(`${LOG_PREFIX} ${relativePath}: processed`)
    } else {
        console.log(`${LOG_PREFIX} ${relativePath}: no changes needed`)
    }
}

/**
 * Main Astro integration
 */
export default function sourceInfoIntegration(options = {}) {
    const {
        enabled = true,
        hideToolbar = true
    } = options

    let rootDir = ''
    let outDir = ''

    return {
        name: PLUGIN_NAME,
        hooks: {
            'astro:config:setup': ({ config, updateConfig, command }) => {
                if (!enabled) return

                // Clear processed files cache for new build
                processedFiles.clear()

                // Get root directory
                rootDir = resolvePath(config.root, process.cwd())

                console.log(`${LOG_PREFIX} Enabled for ${command} mode`)
                console.log(`${LOG_PREFIX} Root: ${rootDir}`)

                const vitePlugins = [createSourceInfoVitePlugin(rootDir)]

                // Configure Astro
                const configUpdates = {
                    vite: {
                        plugins: vitePlugins
                    }
                }

                // Hide the dev toolbar if requested
                if (hideToolbar) {
                    configUpdates.devToolbar = { enabled: false }
                }

                updateConfig(configUpdates)
            },

            'astro:config:done': ({ config }) => {
                outDir = resolvePath(config.outDir)
            },

            'astro:build:done': ({ dir }) => {
                if (!enabled) return

                const buildDir = resolvePath(dir, outDir || DEFAULT_OUT_DIR)

                if (buildDir && fs.existsSync(buildDir)) {
                    console.log(`${LOG_PREFIX} Verifying HTML files...`)
                    processHtmlFiles(buildDir, buildDir)
                    console.log(`${LOG_PREFIX} Build complete.`)
                }
            }
        }
    }
}
