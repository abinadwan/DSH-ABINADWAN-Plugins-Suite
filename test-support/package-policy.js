// Build/test-only package policy; never included in the production package.
// Security PR #2 deliberately packages this opt-in DPAPI verification tool.
// Exact paths only: no directory exemption or path normalization.
const approvedScripts = new Set(['scripts/personal-profile-windows-probe.mjs'])

export function validatePackageFiles(files) {
  if (files.some(file => file.path.startsWith('test-support/') ||
      (file.path.startsWith('scripts/') && !approvedScripts.has(file.path)))) {
    throw new Error('Development preview or tooling leaked into production package')
  }
}
