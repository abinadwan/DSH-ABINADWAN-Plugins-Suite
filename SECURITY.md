# Security Policy

**Status:** Experimental community plugin; no audited security guarantee.

## Reporting issues

For non-sensitive bugs, use [GitHub Issues](https://github.com/abinadwan/deepseek-harness-environment-sidebar/issues). **Do not post credentials, personal data or unredacted Session logs** in a public issue.

For vulnerabilities, contact the repository owner through GitHub and request a private reporting channel before sharing exploitation details.

## Current permissions and data handling

The extension is designed to read UI-facing session/workspace summary state and projected token usage. It does not intentionally execute shell commands, read local filesystem contents, export environment variables, request secrets or contact a telemetry endpoint. The optional **Check for updates** action makes a GET request to the public GitHub raw-file host for the repository's `main/package.json`; it runs only after a user's click, sends no credentials or session data, and never triggers an installation.

This describes the current source implementation, not a security guarantee about DeepSeek Harness, the user's other plugins or future versions. Users should inspect third-party code and test in a profile with limited access.
