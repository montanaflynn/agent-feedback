# @agent-feedback/cli

Install Agent Feedback in a Vite or Next.js App Router project:

```bash
npx @agent-feedback/cli@latest install
```

The installer detects the framework and package manager, installs the matching
integration, configures the project, ignores local feedback records, and adds
the Agent Feedback workflow to the project. It uses
`.agents/skills/run-agent-feedback` when Codex, Cursor, or OpenCode is detected.
When Claude is detected, it also uses `.claude/skills/run-agent-feedback`. If
both agent families are present, both copies are installed. With no detected
agent it defaults to `.agents/skills/run-agent-feedback`.

`init` remains an alias for `install`.

Detection checks project and home configuration directories and executables on
`PATH`. The installer always writes the workflow inside the project.

The three lifecycle commands are:

```bash
npx @agent-feedback/cli@latest install
npx @agent-feedback/cli@latest uninstall
npx @agent-feedback/cli@latest update
```

`uninstall` removes framework wiring, installed Agent Feedback packages, and
both possible project-local workflow copies. It preserves feedback history,
backups, and the `.agent-feedback/` gitignore entry. Customized workflow and
owned route files are backed up before removal. Use `--keep-packages` or
`--keep-skill` for a partial uninstall.

`update` installs the latest Agent Feedback UI/runtime packages,
reconciles the framework setup, and refreshes every detected local workflow
copy. When a workflow differs from the packaged version, the command saves it
under `.agent-feedback/backups/` before replacing it. Use `--no-install` to
refresh only setup and workflows, or `--no-skill` to update only runtime
packages and setup.

Install only the local workflow with:

```bash
npx @agent-feedback/cli skill
```

Agent Feedback is development-only and sends feedback to structured dev-server
logs and `.agent-feedback/feedback.jsonl`.
