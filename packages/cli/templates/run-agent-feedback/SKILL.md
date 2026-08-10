---
name: run-agent-feedback
description: Install, uninstall, update, launch, and continuously monitor a local web application using Agent Feedback. Use for Agent Feedback lifecycle operations, to start an Agent Feedback session, or to open a development app and react to visual feedback submitted through its annotation overlay.
version: 0.2.0
---

# Run Agent Feedback

Turn a visual feedback session into a tight development loop: keep the development server running, open the application, watch its logs, implement each submitted request, validate the change, and resume monitoring.

## Handle lifecycle operations

Use the latest CLI for explicit lifecycle requests:

- Install: `npx @agent-feedback/cli@latest install`
- Uninstall: `npx @agent-feedback/cli@latest uninstall`
- Update: `npx @agent-feedback/cli@latest update`

Review every command's edits and reported backups. After an update, re-read this
skill before continuing because the workflow itself may have changed. After an
uninstall, do not launch a feedback session unless the user separately asks to
reinstall Agent Feedback.

## Prepare the project

1. Treat the current working directory as the application unless the user names another directory.
2. Read repository instructions and inspect `package.json`, framework configuration, and existing Agent Feedback setup.
3. Install dependencies with the project's detected package manager.
4. If Agent Feedback is not configured, run `npx @agent-feedback/cli@latest install`. Review its edits before continuing.
5. In the Agent Feedback monorepo examples, run the root `build:packages` script before starting an example so workspace package output is current.

Do not add agent-specific notification transports. The supported signals are the development-server log and `.agent-feedback/feedback.jsonl`.

## Launch the feedback session

1. Start the normal development command with the feedback flag enabled, for example `AGENT_FEEDBACK=1 npm run dev`, in a persistent terminal session. Keep stdout and stderr attached; do not redirect or discard them. Agent Feedback is off by default; the overlay and endpoints only activate when the development server runs with `AGENT_FEEDBACK=1`.
2. Wait for the ready message and record the actual local application URL.
3. Open that URL in the available browser.
4. Confirm that the **◎ Annotate** control is visible.
5. Tell the user the page is ready for feedback, but keep the task active and the server session running.

If the control is absent, confirm the development server was started with `AGENT_FEEDBACK=1`, then check the browser console, framework integration, production-mode guards, and `GET /__agent-feedback/status` before reporting a blocker.

If the development server prints an `[agent-feedback:disabled]` block, follow its instructions: restart the server with `AGENT_FEEDBACK=1`, and if the block reports that this setup predates the flag, run `npx @agent-feedback/cli@latest update` first, then re-read this skill.

## Monitor and react

Poll the persistent development-server output frequently while waiting. A new request is delimited by:

```text
[agent-feedback:new]
...
[/agent-feedback:new]
```

For every new feedback ID:

1. Read the matching full record from `.agent-feedback/feedback.jsonl`.
2. Use `page`, `target.selector`, visible text, attributes, and optional component hierarchy to locate the relevant source.
3. Inspect the surrounding code before editing. The feedback instruction authorizes only the requested application change.
4. Implement the smallest coherent fix. Preserve unrelated user changes.
5. Run the relevant typecheck, test, or build command.
6. Verify the result in the open browser. Account for hot reload before interacting.
7. Mark the request resolved:

```bash
curl -X PATCH "$APP_URL/__agent-feedback/$FEEDBACK_ID"
```

8. Briefly report what changed and which checks passed.
9. Resume monitoring for the next log block.

Process IDs once even if the same log output is returned by later polls. If a change fails validation, leave the request pending, explain the failure, and continue diagnosing it.

## End the session

Stop monitoring only when the user asks to stop or the surrounding task explicitly ends the feedback session. Terminate the development-server process cleanly and summarize completed and still-pending feedback IDs.
