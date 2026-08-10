# Architecture

## Request path

```text
page element
    │
    ▼
Shadow DOM overlay
    │  POST /__agent-feedback
    ▼
local framework integration
    ├── append .agent-feedback/feedback.jsonl
    └── print [agent-feedback:new] log block
```

There is no remote process in this path. The Vite integration registers the
broker as development-server middleware. The Next.js integration starts the
broker as a small local HTTP listener from the `withAgentFeedback` config
wrapper and rewrites `/__agent-feedback` to it; the legacy App Router route
handlers expose the same broker behavior for pre-15.3 projects.

## Browser boundary

The overlay is framework-independent and mounted in one Shadow DOM host. Its
styles do not escape that root. Highlighting uses a separate fixed-position box;
the selected application element is never given classes, attributes, inline
styles, or wrapper nodes.

Selection prefers an interactive ancestor. Selector generation first uses an ID
or `data-testid`, then useful stable attributes, and finally a short unique
structural path. Attribute capture uses an allowlist and deliberately excludes
form values and arbitrary data attributes.

Metadata providers are optional. Provider failures are swallowed because
component metadata may enrich a request but must never prevent submission. The
React provider reads the development Fiber pointer attached to the selected DOM
node and walks its owner chain. Applications without React receive the same
base payload.

## Broker boundary

The broker owns validation, ID generation, JSONL appends, status events, and
structured stdout output. Framework integrations do not duplicate those rules.

Writes are append-only. A pending record contains the full feedback payload. A
resolution is a later JSONL event with the same ID, `resolved` status, and a
timestamp. Consumers reconstruct current state by taking the latest event for
an ID.

The inbox is project-local and should remain untracked. The installer adds
`.agent-feedback/` to `.gitignore`.

## Development-only, off-by-default behavior

Everything is double-gated. The first gate is the `AGENT_FEEDBACK=1` environment
variable on the development server process: without it the Vite plugin is inert,
the Next config wrapper returns the configuration untouched, the endpoints
return 404, and the client probe (`GET /__agent-feedback/status`) fails so the
overlay never mounts. This keeps a committed installation invisible to
teammates and environments that have not opted in; the bundled skill opts in by
launching the dev server with the flag. The second gate is the existing
development-only behavior: Vite applies the plugin only while serving, the
client code is behind statically-eliminated `NODE_ENV` checks, and the broker
never starts in production builds. Agent Feedback is not intended to become an
application feature or production dependency.

## Transport decision

The MVP guarantees only JSONL persistence and structured logs. It does not
detect or configure a particular coding agent. This keeps delivery observable,
local, and portable across agents that already monitor a development server.

Agent-specific notification systems can be added later behind a transport
interface without changing the browser payload or framework integration.

## Agent workflow skill

`.agents/skills/run-agent-feedback/SKILL.md` is the local operational workflow
for agents.

`agent-feedback install` installs into every detected consumer-project
destination. `agent-feedback init` remains a compatibility alias.
Codex, Cursor, or OpenCode detection adds `.agents/skills`, while Claude
detection adds `.claude/skills`. When both agent families are present, both
copies are installed. With no detected agent, `.agents/skills` remains the
portable fallback. Detection inspects project and home configuration directories
and agent executables on `PATH`, but never writes outside the consumer project.

`agent-feedback skill` performs only that installation step. Modified local
skills are preserved unless the user passes `--force`.

`agent-feedback update` is the consumer synchronization boundary. It installs
the latest framework packages, calls the same idempotent setup path used by
`init`, and force-refreshes all detected workflow copies. A differing workflow
is copied to `.agent-feedback/backups/` before replacement. This lets overlay
and workflow changes ship together while keeping initialization conservative
and preserving recoverable local customizations.

Future setup changes should be implemented as idempotent reconciliation in the
shared initialization path so both new installs and updates converge on the
same supported configuration.

`agent-feedback uninstall` removes integration wiring, declared Agent Feedback
packages, and both known project-local workflow destinations. It backs up
modified owned route or skill files before removal. The append-only feedback
history and `.agent-feedback/` ignore rule remain in place; uninstalling runtime
code is separate from purging local user data.

The workflow keeps the framework development process attached to a persistent
terminal. The agent polls that process for structured log blocks, reads the full
JSONL record, implements and verifies the requested source change, calls the
resolution endpoint, and returns to monitoring.
