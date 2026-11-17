// Build/test-only package policy, never included in production.
const legacy = /^plugins\/personal-profile\/(?:core|storage|integration)\//
export function validatePackageFiles(files) {
  if(files.some(file=>file.path.startsWith('test-support/') ||
      file.path.startsWith('scripts/') || legacy.test(file.path))) {
    throw new Error('Development preview or tooling leaked into production package')
  }
}
