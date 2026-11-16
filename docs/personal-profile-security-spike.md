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
