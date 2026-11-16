# Personal Profile Phase 5: encrypted storage and backup foundations

**Security-review draft. Tested cryptographic components, not production-ready secure
storage. Production Personal Profile remains disabled and read-only.** No live
Harness, browser, agent, transport, telemetry, model injection or data collection
is connected. All fixtures are synthetic. Runtime entrypoints, exports, Phase 1–4
code and the existing UI are unchanged.

## Architecture and threat model

`storage/codec.js` serializes constructor input for the existing Phase 1
`createMasterProfile`, using the same field, instruction, definition, identity and
resource validation. This is a persistence adapter, not another schema/database.
There is one Master Profile per trusted storage identity; Harness environment
instructions remain part of that Master Profile. `access()` constructs disposable
Phase 2/3 consent capabilities from a detached validated snapshot. Changes through
these disposable management handles are in-memory only; explicit Host `save()` is
the persistence boundary. No automatic engine/UI synchronization is implemented.

AES-256-GCM protects confidentiality and authenticates content plus purpose and
identity. Nonces use Node `randomBytes(12)` and 16-byte tags. Keys never enter record
files. Record substitution between identities or local/recovery/backup domains fails.
This protects offline record disclosure/modification without the key. It does not
protect a compromised Host, malicious same-process plugins, debuggers, malware
running as the same user, stolen unlocked memory, OS administrators, deletion,
filesystem rollback to an older valid ciphertext or traffic/filename/size analysis.
There is no trusted monotonic rollback counter. Random nonces have probabilistic
uniqueness; key rotation/usage budgets require review before production.

No personal plaintext, password or key is intentionally written to disk, logs,
network, command arguments or crash files. Buffers owned by the implementation are
cleared where practical. JavaScript strings, returned detached snapshots and engine
closures cannot be reliably erased. Node/OpenSSL and Argon2 may retain copies;
Noble's Argon2 work memory is GC-managed and not fully wiped. Swap, hibernation,
core dumps, OS crash reports and external backup agents require separate Host/OS
policy. These tests do not prove absence of secrets from process memory or OS artifacts.

## Record formats and bounds

`envelope.js` exports internal Node-only operations, with no public package export.
Version 1 local record is UTF-8 JSON with exactly:

- `version: 1`, `algorithm: "AES-256-GCM"`;
- `domain: "abinadwan.personal-profile.local.v1"` (or `recovery.v1`);
- `identity`: trusted Host storage identifier, ASCII letters/digits/underscore/hyphen,
  1–64 characters; this is not browser-supplied identity or proof of authentication;
- canonical base64 `nonce`, `ciphertext`, `tag`.

AAD is UTF-8 JSON of the first four fields in the listed order. Decrypted JSON is
the normalized Phase 1 constructor input (`customFields`, `fields`, `instructions`,
`allowAgentUseApprovedProfileInformation`). Policies, sessions, grants and approvals
are not serialized. Unknown keys and unsupported versions fail closed. The encoded
record/backup cap is 2 MiB; plaintext/ciphertext payload cap is 1 MiB. Existing Phase 1
limits apply after authentication. Authentication completes before plaintext JSON
parsing or model validation. Failures use fixed messages without supplied values.

## Filesystem commits and recovery

The trusted Host must preprovision an absolute private storage root and stable,
trusted, non-renamable parents. Every component is checked for symlinks; root
realpath must match. POSIX root ownership must match effective process user and
mode must exclude group/other permissions. Record files must be regular, singly
linked and private. Fixed filenames are SHA-256(identity) plus `.record` or
`.recovery`; callers cannot supply filenames. Reads check lstat/fstat identity,
use O_NOFOLLOW where supported, and bound actual bytes read despite file growth.

Writes acquire an exclusive root `.writer-lock`, create a random exclusive 0600
ciphertext temporary file, fsync it, validate destination and lifecycle generation,
then rename atomically. POSIX attempts directory fsync. Existing record remains
unchanged on precommit failure; encrypted orphan temporaries are never promoted.
Readers see old or new complete records; corruption fails closed rather than
silently restoring old data. No plaintext temporary file exists.

Rename is the commit point. Return `{committed, durable, cleanupComplete}` distinguishes
successful commit from durability uncertainty; postcommit directory sync failure
returns `committed: true, durable: false` and still revokes old capabilities. Windows
reports durable false because portable Node directory fsync is unavailable.
Cleanup failure may leave a writer lock (`cleanupComplete: false`). The Host must
show/reconcile these outcomes before offering retry; they are not rollback failures.
Disk-full, antivirus contention and actual power-loss behavior need platform testing.

Process death may leave a lock and encrypted temporary file. **Never reclaim a lock
merely by age or a PID check.** Writes fail closed until the trusted Host proves
exclusive ownership and all other writers terminated, validates the committed
record with the correct provider, then explicitly removes the stale lock/orphans.
The automated killed-child test exercises that controlled recovery. No automatic
stale-lock bypass is supplied. Node has no portable dirfd/openat API: checks cannot
eliminate hostile same-user ancestor replacement/junction races. OS sandbox/ACL and
stable-directory enforcement remain prerequisites for production.

On Windows, POSIX modes do not establish DACL protection. The future Host must
provision and verify owner-only DACLs (including inherited ACEs), reject unsafe
junctions/reparse points/aliases and test non-admin account access. Node checks are
foundations, not a complete Windows filesystem authorization boundary.

## Password backups and dependency

Pinned runtime dependency **`@noble/hashes@2.0.1`**, MIT, maintained JavaScript
implementation with no native addon, transitive runtime dependency or install
script; declared Node >=20.19 supports Node 22/24 on Windows/Linux. The lockfile pins
tarball integrity. Argon2id correctness is tested against RFC 9106's known-answer
vector; the CI matrix runs real exports/restores on all four target combinations.
This is not a new independent cryptographic audit. Updates need security review.

Backup JSON has exactly `version`, `algorithm`, `domain`, `kdf`, `salt`, `nonce`,
`ciphertext`, `tag`. Header/AAD order is the same list excluding the last three.
Domain is `abinadwan.personal-profile.backup.v1`; KDF is exactly
`{algorithm:"Argon2id",version:19,m:65536,t:3,p:1,dkLen:32}` (memory in KiB).
These are fixed minimum **and maximum** accepted v1 parameters, not attacker-tunable
options. Argon2 memory allocation is capped at 72 MiB; one KDF job per module instance
is allowed at a time (overlap fails, no unbounded queue). This does not enforce a
process-wide budget across workers. Async computation yields but still uses CPU;
a future authenticated Host should isolate it in a bounded worker and rate-limit.

Each export gets a fresh 16-byte salt and 12-byte nonce. Password is nonempty,
maximum 1,024 UTF-8 bytes, with no implicit normalization. Metadata, base64 lengths,
version and resource bounds are checked before KDF. Wrong passwords/tampering yield
the same generic failure. No alternative KDF or DPAPI fallback exists. Restoring a
portable backup needs only its password; passwords are not recoverable. Host must
obtain explicit user export authorization and write returned encrypted bytes safely;
this module does not implement file pickers or plaintext output files.

## Restore semantics

`review(id, incoming, mode='merge')` validates the entire imported model before
returning a Host-only opaque review handle and conflict identifiers (no values).
The exact ciphertext reviewed supplies its revision hash; apply rechecks it under
the writer lock. Other identities' reviews, forged handles, stale saves, repeat
applications and locks invalidate review authority.

Review & Merge adds absent definitions/fields/overrides and preserves all existing
values, definitions and global instruction text, including explicit empty strings.
Conflicts require `keepExisting: true`; conflicting custom types never reinterpret
existing values. Choosing incoming conflicting values requires a new separately
reviewed explicit edit; no silent overwrite option exists. Combined schema/capacity
is validated before commit. Replace requires `confirmReplace: true` and writes an
authenticated, separately domain-bound `.recovery` snapshot before replacing the
record. Snapshot failure leaves the original intact. Record-write failure preserves
the original and protected snapshot. Only one recovery slot per identity is kept.
`recover(id)` is a trusted Host rollback operation, not an agent/UI method; it
validates the snapshot and atomically writes it back. Host authentication and
explicit user confirmation must govern destructive rollback before integration.

All imports/recoveries force global opt-in OFF. No permissions are imported; fresh
Phase 2 instances start every field PRIVATE. Sessions, approvals and grants cannot
appear in the accepted schema and never restore. Commit revokes all old capability
wrappers. Instruction text remains inert storage, never automatically injected.

## Key provider and lock lifecycle

`createProductionStorage()` always throws `OS-protected key provider unavailable`.
There is no approved provider, production unlock, feature flag or environment
fallback. Internal `assembleStorage` is a trusted component construction seam,
not an authenticated public service. Synthetic assembly/provider exists only in
`test-support/personal-profile-storage.js`, which package policy excludes.

Future provider contract: authenticated `acquire()` returns an owned 32-byte Buffer;
`release()` disposes OS handles. The assembly copies and wipes the returned buffer;
lock wipes its owned key, drops it, invalidates reviews and capability generations,
and clears Phase 2 pending approvals/session grants. Old wrapper calls fail even
after a later unlock. Values already returned cannot be recalled. A Boolean is
only status reporting, never the protection. No raw consent instance is returned.

Inactivity locking is **optional, access-checked/Host-polled**, not an autonomous
background timer. Configure `inactivityMs: 900000` as the proposed 15-minute default;
the default null deliberately imposes no hidden timer in these isolated components.
Host must schedule `checkInactivity()` or `lock()` to release keys while idle.
Backward/nonfinite clocks lock on the next check. Actual timers, user-presence
checks, Windows session-lock/sleep/resume/quit/crash routing and Harness lifecycle
are Phase 6. OS credential protection can bind a key to an account/device but
normally cannot distinguish same-user malware or prove current human presence.

## Security PR #2 and integration prerequisites

PR #2 was reviewed as a separate feasibility spike: PowerShell CurrentUser DPAPI,
AES-GCM synthetic canary and two-process tests. None is copied, imported or enabled
here. No package allowlist exemption is expanded. Cross-process account-bound DPAPI
success is not actual Harness Host compatibility or user-presence proof. Future
reviewed providers may implement this abstraction, but portable backups must remain
independent of them. No existing PR is modified or merged.

Before activation: review actual Host resolver/authentication and canonical Profile
identity; provider authentication/key rotation/loss/recovery; DACLs and directory
race guarantees; bounded workers; lifecycle/disposal; authenticated management
transport and recovery confirmation; rollback/downgrade resistance and crash policy.
Do not expose these factories, keys, records or snapshots to a browser or agent.
Mandatory manual Windows tests: actual Electron RunAsNode Host process credential
access across restart/update; denied/unavailable credential store; other Windows
account denial; DACL inheritance and reparse/junction attacks; sleep/session lock/
unlock/quit; antivirus/disk-full/process kill/power-loss during snapshot and rename;
non-ASCII paths; backup exchange with Linux Node 22/24. Automated crypto and synthetic
filesystem tests do not establish these production guarantees. Stop for security review.

## Verification evidence

Local Linux Node 24: `npm test` and `npm run check:package` each pass 118 tests,
including 20 Phase 5 tests and all 98 Phase 1–4/suite regressions. Coverage includes
AEAD roundtrips/nonces/tampering, wrong/unavailable keys, schema/size bounds,
portable backup passwords/versions/KDF bounds, filesystem attacks, killed writes,
merge/type conflicts, confirmed replacement/recovery, stale-review races,
postcommit uncertainty, lock/grant/approval invalidation and key-buffer cleanup.
Package verification rejects test-support assets. GitHub Actions results on the
PR provide Windows/Linux Node 22/24 evidence; local success alone is not that evidence.
Independent read-only review identified four defects fixed before submission:
precommit lock cancellation, postcommit capability invalidation, exact reviewed-byte
revision binding and cleanup of both derived-key copies. Mandatory manual review
and Windows tests above remain outstanding.
