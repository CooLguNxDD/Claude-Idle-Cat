// Builds a Claude plugin release snapshot: node tools/release-snapshot.mjs --tag afk-cat--v0.3.0 --out dist
// --preview writes the same files from HEAD before that tag exists.
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const NOTE_LIMIT = 80

export const expectedTag = (name, version) => `${name}--v${version}`

export function assertSameVersion(pluginVersion, marketplaceVersion, pluginName) {
  if (!marketplaceVersion) {
    throw new Error(`marketplace.json entry for ${pluginName} has no version. Set it to ${pluginVersion} so it matches plugin.json.`)
  }
  if (marketplaceVersion !== pluginVersion) {
    throw new Error(`Version mismatch: plugin.json says "${pluginVersion}" but marketplace.json says "${marketplaceVersion}".`)
  }
}

export function assertTag(tag, name, version) {
  const expected = expectedTag(name, version)
  if (tag !== expected) {
    throw new Error(`Tag ${tag} is not the Claude plugin release tag ${expected}.`)
  }
}

const bucketFor = subject => {
  const type = /^(\w+)(?:\([^)]+\))?!?:/.exec(subject)?.[1]
  if (type === 'feat') return 'Features'
  if (type === 'fix') return 'Fixes'
  if (type === 'docs') return 'Documentation'
  return 'Other'
}

export function groupContributions(commits) {
  const groups = { Features: [], Fixes: [], Documentation: [], Other: [] }
  for (const commit of commits) groups[bucketFor(commit.subject)].push(commit)
  return groups
}

export function inventory(names) {
  const count = pred => names.filter(pred).length
  const sources = prefix => count(name => name.startsWith(prefix) && name.endsWith('.ts') && !name.endsWith('.test.ts'))
  return {
    breeds: sources('hooks/content/breeds/'),
    moves: sources('hooks/content/moves/'),
    worlds: sources('hooks/content/worlds/'),
    namedCats: sources('hooks/content/cats/'),
    games: count(name => name.startsWith('hooks/arcade/games/') && name.endsWith('.ts') && !name.endsWith('/index.ts')),
    themes: count(name => name.startsWith('themes/') && name.endsWith('.json')),
    sounds: count(name => name.startsWith('assets/sfx/') && name.endsWith('.wav')),
    arcadeBundle: names.includes('server/public/arcade.js'),
  }
}

const git = (args, cwd = root) => execFileSync('git', args, {
  cwd,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
}).trim()

const parseRepo = remote => {
  const ssh = /^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/.exec(remote)
  if (ssh) return `${ssh[1]}/${ssh[2]}`
  const https = /^https:\/\/github\.com\/([^/]+)\/(.+?)(?:\.git)?$/.exec(remote)
  return https ? `${https[1]}/${https[2]}` : null
}

function readRelease(repo) {
  const plugin = JSON.parse(readFileSync(join(repo, '.claude-plugin', 'plugin.json'), 'utf8'))
  const marketplace = JSON.parse(readFileSync(join(repo, '.claude-plugin', 'marketplace.json'), 'utf8'))
  const entry = (marketplace.plugins ?? []).find(item => item.name === plugin.name)
  if (!entry) throw new Error(`marketplace.json has no entry named ${plugin.name}.`)
  assertSameVersion(plugin.version, entry.version, plugin.name)
  if (!plugin.version) throw new Error('plugin.json has no version.')
  return { plugin, marketplace, entry }
}

function previousTag(name, head) {
  let tags = []
  try {
    tags = git(['tag', '--list', `${name}--v*`]).split(/\r?\n/).filter(Boolean)
  } catch {
    return null
  }
  const ancestors = tags.filter(tag => {
    try {
      const commit = git(['rev-parse', `${tag}^{commit}`])
      if (commit === head) return false
      git(['merge-base', '--is-ancestor', commit, head])
      return true
    } catch {
      return false
    }
  })
  ancestors.sort((a, b) => git(['log', '-1', '--format=%ct', b]) - git(['log', '-1', '--format=%ct', a]))
  return ancestors[0] ?? null
}

function contributionsSince(from, to) {
  const range = from ? `${from}..${to}` : to
  const raw = git(['log', '--no-merges', '--format=%H%x1f%h%x1f%an%x1f%s', range])
  if (!raw) return []
  return raw.split(/\r?\n/).filter(Boolean).map(line => {
    const [sha, short, author, subject] = line.split('\u001f')
    return { sha, short, author, subject }
  })
}

const optionRows = userConfig => Object.entries(userConfig ?? {}).map(([key, option]) => ({
  key,
  title: option.title ?? key,
  default: option.default ?? null,
}))

export function renderNotes(snapshot) {
  const { plugin, git: source, archive, inventory: pack, contributions, contributors } = snapshot
  const lines = [`# ${snapshot.title}`, '']
  if (snapshot.preview) {
    lines.push(`> Preview from \`${source.commit.slice(0, 7)}\`. The tag \`${source.tag}\` is not published yet.`, '')
  }
  if (snapshot.worktreeDirty) {
    lines.push('> Uncommitted changes are not in the zip. The archive is HEAD. Commit, then build again, before tagging.', '')
  }
  lines.push(
    `${plugin.displayName} (\`${plugin.name}\` ${plugin.version}) for the \`${plugin.marketplace}\` marketplace.`,
    '',
    plugin.description,
    '',
    '## Install',
    '',
    'Pin this tag, then install the plugin:',
    '',
    '```bash',
    `claude plugin marketplace add ${snapshot.repository}#${source.tag}`,
    `claude plugin install ${plugin.name}@${plugin.marketplace}`,
    '```',
    '',
    'Already tracking the default branch? Update after this commit is on that branch:',
    '',
    '```bash',
    `claude plugin marketplace update ${plugin.marketplace}`,
    `claude plugin update ${plugin.name}@${plugin.marketplace}`,
    '```',
    '',
    'Load the zip for one session:',
    '',
    '```bash',
    `claude --plugin-url ${archive.url}`,
    '```',
    '',
  )
  if (plugin.claudeCode) lines.push(`Needs Claude Code v${plugin.claudeCode} or later.`, '')
  lines.push(
    '## Release snapshot',
    '',
    '| Detail | Value |',
    '| --- | --- |',
    `| Plugin | \`${plugin.name}\` ${plugin.version} |`,
    `| Marketplace | \`${plugin.marketplace}\` |`,
    `| Tag | \`${source.tag}\` |`,
    `| Commit | \`${source.commit}\` |`,
    `| Date | ${source.committedAt} |`,
    `| License | ${plugin.license ?? 'see LICENSE'} |`,
    `| Author | ${plugin.author} |`,
    `| Archive | \`${archive.file}\` (${archive.bytes} bytes) |`,
    `| SHA-256 | \`${archive.sha256}\` |`,
    '',
    '### In this build',
    '',
    `- ${pack.breeds} breeds, ${pack.moves} moves, ${pack.worlds} worlds, ${pack.namedCats} named cats`,
    `- ${pack.games} arcade games${pack.arcadeBundle ? ', with the browser bundle' : ''}`,
    `- ${pack.themes} themes, ${pack.sounds} sound clips`,
  )
  if (snapshot.options.length) {
    lines.push(`- Settings: ${snapshot.options.map(option => `\`${option.key}\` (${option.title})`).join(', ')}`)
  }
  lines.push('', '## Contributions', '')
  const span = snapshot.previousTag
    ? `Since \`${snapshot.previousTag}\`.`
    : 'Since the first commit.'
  lines.push(`${span} ${contributions.length} change${contributions.length === 1 ? '' : 's'}.`, '')
  if (snapshot.previousTag) {
    lines.push(`[Compare ${snapshot.previousTag}...${source.tag}](${snapshot.compareUrl})`, '')
  } else {
    lines.push(`[History](${snapshot.historyUrl})`, '')
  }
  const groups = groupContributions(contributions)
  let shown = 0
  for (const [title, commits] of Object.entries(groups)) {
    if (!commits.length || shown >= NOTE_LIMIT) continue
    lines.push(`### ${title}`, '')
    for (const commit of commits) {
      if (shown >= NOTE_LIMIT) break
      lines.push(`- \`${commit.short}\` ${commit.subject}`)
      shown++
    }
    lines.push('')
  }
  const hidden = contributions.length - shown
  if (hidden > 0) lines.push(`${hidden} earlier changes are listed in \`release-snapshot.json\`.`, '')
  lines.push('### Contributors', '')
  if (contributors.length) lines.push(...contributors.map(name => `- ${name}`))
  else lines.push('- No non-merge commits in this range.')
  lines.push('')
  return lines.join('\n')
}

function build(options) {
  const { plugin, marketplace } = readRelease(root)
  const tag = options.tag ?? expectedTag(plugin.name, plugin.version)
  if (!options.preview) assertTag(tag, plugin.name, plugin.version)
  const head = git(['rev-parse', 'HEAD'])
  const worktreeDirty = git(['status', '--porcelain']) !== ''
  if (worktreeDirty && !options.preview) {
    throw new Error('Working tree is dirty. Commit first so the release snapshot matches the tag.')
  }
  if (!options.preview) {
    let tagged
    try {
      tagged = git(['rev-parse', `${tag}^{commit}`])
    } catch {
      throw new Error(`Tag ${tag} is not in this clone. Push it before publishing the release.`)
    }
    if (tagged !== head) throw new Error(`HEAD ${head} is not ${tag} (${tagged}). Check out the release tag first.`)
  }
  const repo = process.env.GITHUB_REPOSITORY || parseRepo(git(['remote', 'get-url', 'origin']))
  if (!repo) throw new Error('Could not read the GitHub owner/repo from GITHUB_REPOSITORY or origin.')
  const out = resolve(options.out)
  mkdirSync(out, { recursive: true })
  const zipName = `${plugin.name}-${plugin.version}.zip`
  const zipPath = join(out, zipName)
  // git on Windows treats backslashes in --output as escapes.
  const zipArg = zipPath.replaceAll('\\', '/')
  execFileSync('git', ['archive', '--format=zip', `--output=${zipArg}`, 'HEAD'], { cwd: root, stdio: 'inherit' })
  const bytes = statSync(zipPath).size
  const sha256 = createHash('sha256').update(readFileSync(zipPath)).digest('hex')
  writeFileSync(join(out, `${zipName}.sha256`), `${sha256}  ${zipName}\n`)
  const previous = previousTag(plugin.name, head)
  const commits = contributionsSince(previous, 'HEAD')
  const pack = inventory(git(['ls-tree', '-r', '--name-only', 'HEAD']).split(/\r?\n/).filter(Boolean))
  const committedAt = git(['log', '-1', '--format=%cI', 'HEAD'])
  const snapshot = {
    kind: 'claude-plugin-release',
    title: `${plugin.name} v${plugin.version}`,
    preview: options.preview,
    worktreeDirty,
    prerelease: plugin.version.includes('-'),
    plugin: {
      name: plugin.name,
      displayName: plugin.displayName ?? plugin.name,
      version: plugin.version,
      description: plugin.description ?? '',
      author: plugin.author?.name ?? 'unknown',
      license: plugin.license ?? null,
      homepage: plugin.homepage ?? null,
      repository: plugin.repository ?? `https://github.com/${repo}`,
      marketplace: marketplace.name,
      claudeCode: plugin.metadata?.claudeCode ?? null,
    },
    repository: repo,
    git: { tag, commit: head, committedAt },
    previousTag: previous,
    compareUrl: previous ? `https://github.com/${repo}/compare/${previous}...${tag}` : null,
    historyUrl: `https://github.com/${repo}/commits/${tag}`,
    archive: {
      file: zipName,
      bytes,
      sha256,
      url: `https://github.com/${repo}/releases/download/${tag}/${zipName}`,
    },
    inventory: pack,
    options: optionRows(plugin.userConfig),
    contributions: commits,
    contributors: [...new Set(commits.map(commit => commit.author))],
  }
  writeFileSync(join(out, 'release-snapshot.json'), `${JSON.stringify(snapshot, null, 2)}\n`)
  writeFileSync(join(out, 'RELEASE.md'), renderNotes(snapshot))
  console.log(`${snapshot.title} ${options.preview ? 'preview' : 'release'} -> ${out}`)
  console.log(`${zipName} ${sha256}`)
  return snapshot
}

const flag = name => {
  const index = process.argv.indexOf(name)
  if (index < 0) return null
  const value = process.argv[index + 1]
  if (!value || value.startsWith('--')) throw new Error(`${name} needs a value.`)
  return value
}

const invokedDirectly = () => {
  const entry = process.argv[1]
  if (!entry) return false
  const here = fileURLToPath(import.meta.url)
  const same = process.platform === 'win32'
    ? resolve(here).toLowerCase() === resolve(entry).toLowerCase()
    : resolve(here) === resolve(entry)
  return same || import.meta.url === pathToFileURL(entry).href
}

if (invokedDirectly()) {
  try {
    build({
      tag: flag('--tag'),
      out: flag('--out') ?? join(root, 'dist'),
      preview: process.argv.includes('--preview'),
    })
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}
