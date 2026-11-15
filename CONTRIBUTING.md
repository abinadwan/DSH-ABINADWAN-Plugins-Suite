# Contributing

Thanks for considering improvements to Environment & Context.

## Before proposing a change

- Open an issue describing the behavior, affected DeepSeek Harness version, and expected outcome.
- For any new integration, point to a *documented* DSH API. Do not invent token totals, connected account metadata, file lists, or Git change results.
- Keep secrets and account identifiers out of screenshots, debug logs, examples and PRs.
- Prefer the native right-sidebar extension points. Avoid patching DSH internals or injecting elements via fragile DOM selectors.

## Development

Clone the repository, then run:

```bash
npm test
```

Review `package.json`, `cordis.patch.yml`, `index.js`, `client.js` and the metadata files. There is no compile step; the package ships its JavaScript entrypoints directly.

A proposed runtime change should include a test, a short explanation of DSH compatibility, and clear notes if Desktop UI execution was not verified.

## Licensing

This project is licensed under the [MIT License](LICENSE). Contributions are accepted under the same terms unless explicitly agreed otherwise.
