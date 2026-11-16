# Personal Profile: Windows key-protection security spike

**Status: Experimental, isolated, and NOT enabled in Desktop.** This is a phase-one capability probe; it does not store, read, transmit, or inject any real personal information. The existing Personal Profile Component remains an inert read-only design draft, disabled by default.

## Objective

Check two distinct building blocks before implementing Personal Profile:

1. **Data encryption:** Node.js Host-side AES-256-GCM with a fresh random 96-bit IV per record, 128-bit authentication tag, authenticated domain separation, and a random 256-bit data-encryption key.
2. **Windows key protection:** use Windows Data Protection API (`ProtectedData` with `DataProtectionScope.CurrentUser`) to wrap/unwrap that data key. This binds unwrap operations to the same Windows user context. A local PowerShell process accesses DPAPI; the key crosses anonymous stdin/stdout pipes only, never shell-interpolated arguments, command-line flags, URLs, logs, or environment variables.

No file/SQLite persistence, password-derived encrypted backup, consent engine, model context injection, app UI, or lock/unlock behavior is implemented in this spike. The tests use **random, synthetic fixtures only**.

## Files

- `plugins/personal-profile/security/crypto-envelope.js` — in-memory authenticated record encryption; no I/O.
- `plugins/personal-profile/security/windows-dpapi.js` — Windows-only, fail-closed experimental DPAPI CurrentUser wrapper; no I/O persistence.
- `test/personal-profile-security.test.js` — round-trips, tamper/invalid-key rejection, Windows DPAPI smoke test, and guard that the runtime Component remains inert.

## CI verification

The existing test workflow executes `npm test` on `windows-latest` and `ubuntu-latest` with Node.js 22 and 24. On Windows, the DPAPI test must run (not skip) and pass both wrap/unwrap and corrupted-blob rejection. On Linux, the Windows-specific test skips and the adapter must reject use; AES-GCM runs on both.

Run locally on a Windows machine using the same Windows account intended for DSH Desktop:

```powershell
npm ci --ignore-scripts
node --test test/personal-profile-security.test.js
```

### Interpretation

- **Windows CI PASS:** demonstrates feasibility on a GitHub-hosted Windows runner under its current user. It does **not** prove that the specific DeepSeek Harness Desktop distribution can spawn PowerShell or access DPAPI, nor does it test account switching, sleep/lock events, portable installations, or enterprise policy restrictions.
- **Real Desktop PASS (still required):** install a separate development build/profile and test Host process identity, PowerShell availability, `CurrentUser` round-trip after restart, failure under another user, profile boundaries, access revocation, cleanup, and locked workstation behavior.
- **Any failure:** do not fall back to plaintext keys, hardcoded keys, machine-wide DPAPI, or unencrypted storage. Keep Personal Profile disabled.

## Threat model and limitations

- DPAPI `CurrentUser` protects against casual disclosure of a wrapped key at rest, but **does not protect against malicious code running as that same user**, malware, or an untrusted DSH Host plugin with equivalent privileges.
- During encryption and unwrapping, the plaintext key exists transiently in Node and PowerShell memory and crosses local process pipes. No promise of hardware-backed isolation is made. A later implementation should consider a dedicated native bridge/key store rather than launching PowerShell on every secret access.
- A Windows user password/account recovery scenario may affect DPAPI recovery; the separately approved password-encrypted backup format must not depend on Windows DPAPI.
- The envelope file format shown here is only a probe; finalized data schemas, KDF parameters, migrations, validation, atomic disk writes, file ACLs, lock semantics, consent boundaries, and retention behavior require separate review and test.
- Encryption keys and personal records must never enter Git, CI secrets, test logs, the browser Client bundle, or the agent/model context without permission.

## Sources

- Microsoft Learn: [ProtectedData and Windows Data Protection API](https://learn.microsoft.com/en-us/dotnet/standard/security/how-to-use-data-protection).
- Node.js: [Crypto](https://nodejs.org/api/crypto.html) and [child_process](https://nodejs.org/api/child_process.html).
- DeepSeek Harness: [Storage subsystem](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/storage.md), which describes ordinary storage backends but not encrypted profile storage.

**Merge policy:** Do not treat this experiment as authorization to enable Personal Profile or to record personal data. A further explicit go/no-go decision is required after Windows CI plus Desktop integration checks.

## Local Windows cross-process probe (opt in)

The separate script `scripts/personal-profile-windows-probe.mjs` verifies Windows DPAPI use under the **actual signed-in Windows account**, without any personal profile data, API credentials, or model requests. This is an additional check beyond CI, but **not yet a DSH Host-process integration test**. It does not register a DSH plugin, and it cannot prove Host process access or Desktop permissions.

### Prerequisites

- Windows 10/11 with PowerShell 5.1 and Node.js 22 or 24 available in the PowerShell terminal. Running with a different Node version is unverified.
- Work from the `security/personal-profile-windows-dpapi-spike` branch checked out in a *separate* directory; do not replace or remove the installed suite.
- Run both commands as the **same Windows account**, preferably in the terminal you normally use alongside Desktop. No elevation is required; do not use `Run as administrator` or a different account.
- The probe stores a temporary, synthetic DPAPI-wrapped key under `%LOCALAPPDATA%\\ABINADWAN\\personal-profile-security-probe-v1.json`; it does not touch Desktop's profile files, real keys, settings, credentials, or any user profile fields. The default output does not include the Windows username or file contents.

### PowerShell instructions

From a fresh terminal, clone this *test branch* into a disposable folder:

```powershell
git clone --depth 1 --single-branch --branch security/personal-profile-windows-dpapi-spike https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite.git "$env:TEMP\\abinadwan-profile-security-check"
cd "$env:TEMP\\abinadwan-profile-security-check"
node --version
node scripts/personal-profile-windows-probe.mjs prepare
```

A successful preparation prints `PASS: synthetic key protected`. Now fully **Quit DeepSeek Harness Desktop from the application or tray** (closing the window may only hide it), restart it, return to the same PowerShell directory and run:

```powershell
node scripts/personal-profile-windows-probe.mjs verify
```

On success it prints `PASS` for the separate-process DPAPI restore, GCM authentication, and removal of the temporary probe file. Do **not** send the probe file or protected blob to anyone; copy only sanitized `PASS/FAIL` messages.

If the verification fails or you want to cancel, delete the synthetic file using:

```powershell
node scripts/personal-profile-windows-probe.mjs cleanup
```

If `prepare` says an existing probe is present, run `verify` or `cleanup` first; the script deliberately refuses to overwrite it. If `node` isn't available, stop; don't install unrelated runtimes or modify DSH solely to perform this check.

### What this test does NOT prove

- The script runs in the selected terminal's **Node.js process**, not the Electron RunAsNode **Host child process**. Reopening Desktop between commands proves account-bound persistence across time, **not actual access from inside Host**.
- This does not verify Native Windows sleep/session-lock callbacks, reloading or revoking permissions, encryption at rest of an actual SQLite database, application update migration, or how DSH handles multiple accounts.
- An actual Host probe and safety review are **required before making profile storage functional**. Do not copy this probe's child-process implementation directly into the production secret-handling service without code review.

### Automated checks

The repository also contains `test/personal-profile-desktop-probe.test.js`. Existing Windows CI runs `prepare` and `verify` as different Node processes with an isolated random directory, confirms the stored canary is encrypted, rejects record tampering and duplicate preparation, and verifies cleanup. Linux CI tests that the Windows-only entrypoint fails closed.
