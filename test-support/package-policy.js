// Test-only: reject development scripts and fixtures in published packages.
export function validatePackageFiles(files) {
  if(files.some(file=>file.path.startsWith('test-support/')||file.path.startsWith('scripts/')||file.path.startsWith('test/')||file.path.startsWith('qa/')||file.path.startsWith('client-src/')))throw new Error('Development preview or tooling leaked into production package')
}
