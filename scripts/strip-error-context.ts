/**
 * Remove Playwright's auto-generated `error-context` attachment from allure-results before
 * the report is generated. Playwright 1.6x attaches `error-context.md` to every failed test
 * unconditionally (no config switch) — it is an AI-debugging prompt that duplicates the error
 * message already shown in the report, so in Allure it is pure noise. The file stays available
 * under `test-results/` for local debugging; only the report copy is dropped.
 *
 * Run: tsx scripts/strip-error-context.ts [allure-results-dir]   (wired into `pnpm allure:generate`)
 */
import { existsSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

interface StepNode {
  name?: string
  steps?: StepNode[]
  attachments?: { name?: string; source?: string }[]
}

const dir = process.argv[2] ?? 'allure-results'
if (!existsSync(dir)) {
  console.log(`[strip-error-context] ${dir} not found — nothing to do`)
  process.exit(0)
}

const orphanedSources: string[] = []

function collectSources(node: StepNode): void {
  for (const a of node.attachments ?? []) {
    if (a.source) orphanedSources.push(a.source)
  }
  for (const s of node.steps ?? []) collectSources(s)
}

/** Drop error-context attachments + steps from a node tree; collect their source files. */
function prune(node: StepNode): boolean {
  let changed = false
  if (node.attachments?.some((a) => a.name === 'error-context')) {
    for (const a of node.attachments) {
      if (a.name === 'error-context' && a.source) orphanedSources.push(a.source)
    }
    node.attachments = node.attachments.filter((a) => a.name !== 'error-context')
    changed = true
  }
  if (node.steps) {
    const before = node.steps.length
    node.steps = node.steps.filter((s) => {
      if (s.name !== 'error-context') return true
      collectSources(s)
      return false
    })
    if (node.steps.length !== before) changed = true
    for (const s of node.steps) {
      if (prune(s)) changed = true
    }
  }
  return changed
}

let strippedFiles = 0
for (const file of readdirSync(dir)) {
  if (!file.endsWith('-result.json')) continue
  const path = join(dir, file)
  const result = JSON.parse(readFileSync(path, 'utf8')) as StepNode
  if (prune(result)) {
    writeFileSync(path, JSON.stringify(result))
    strippedFiles++
  }
}

for (const source of orphanedSources) {
  try {
    unlinkSync(join(dir, source))
  } catch {
    // attachment file already gone — fine
  }
}

console.log(
  `[strip-error-context] cleaned ${strippedFiles} result file(s), removed ${orphanedSources.length} attachment(s)`,
)
