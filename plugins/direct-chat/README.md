# Direct Chat — Global Chat replacement (experimental)

This component keeps the suite identity \`abinadwan-direct-chat\` and imports the Codex Global Chat PoC architecture:
- a button in the native \`sidebar.footer.action\` slot;
- a Host-owned, authenticated \`/api/abinadwan-direct-chat/create\` route;
- native \`sessionController.create({ cwd })\` plus \`sessionPersistence.flush()\`;
- tool denial at \`tools/pre-execute\` and \`tools.guard\` for the dedicated profile path.

## Status and limits
This replacement deliberately **does not** import the speculative GPT-OSS \`ui-conversation\`, preset, or \`hidden: true\` Cordis rows. They were not verified against the installed Host. The Codex \`hiddenWorkspace.ts\` and \`HiddenWorkspaceProvider.tsx\` are not usable production modules and are not shipped.

**Not yet solved:** the native Desktop Workspace gate may prevent the composer from opening when the session's cwd has no registered Workspace. A folder under the profile is NOT the same as a registered hidden Workspace. A truly hidden, persistent internal Workspace must be implemented and verified against actual DSH Desktop. Creating a native session alone does not pass acceptance.

**Not included yet:** permanent deletion of DSH-managed Sessions, workspace hiding, post-restart Desktop smoke validation, and independent update/uninstall checks. These remain follow-up stages. Do not use the old companion/LPAC security tests as evidence for this implementation.

The previous Windows LPAC companion implementation is preserved in Git history on \`develop\`. This branch deliberately removes that code; do not consider its isolation guarantees transferred to the native-session approach. The component stays disabled by default. Do not merge into \`develop\` or release without owner approval and the Desktop acceptance gates.
