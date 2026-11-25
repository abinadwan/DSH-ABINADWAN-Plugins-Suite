import test from 'node:test'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import {validatePackageFiles} from '../test-support/package-policy.js'
test('package rejects all development scripts, fixtures, retired DPAPI code and QA',()=>{
  for(const path of ['scripts/personal-profile-windows-probe.mjs','scripts/preview-personal-profile.mjs','test-support/client.js','test/example.js','qa/report.md']){
    assert.throws(()=>validatePackageFiles([{path}]),/Development preview or tooling/)
  }
})
test('actual package passes policy; retired encrypted storage is absent',()=>{
  const [packed]=JSON.parse(execFileSync(process.execPath,[process.env.npm_execpath,'pack','--dry-run','--json','--ignore-scripts'],{encoding:'utf8'}))
  assert.ok(packed.files.length>0)
  validatePackageFiles(packed.files)
  assert.ok(!packed.files.some(file=>/^plugins\/personal-profile\/(storage|core|integration)\//.test(file.path)))
})
test('package ships only active documentation, no superseded designs, prototype assets or secrets', () => {
  const [packed] = JSON.parse(execFileSync(process.execPath, [process.env.npm_execpath, 'pack', '--dry-run', '--json', '--ignore-scripts'], { encoding: 'utf8' }))
  const paths = packed.files.map(file => file.path)
  for (const path of paths) {
    assert.doesNotMatch(path, /PERSONAL_PROFILE_PHASE|docs\/(?:archive|research|superpowers)\/|personal-profile-phase4|probe|dpapi|\.env|\.pem$|\.key$/i, path)
  }
  for (const required of ['docs/DETAIL.md', 'docs/PERSONAL_PROFILE_LOCAL_SETTINGS.md', 'docs/README.md', 'docs/BRANDING.md',
    'docs/assets/environment-project.webp', 'docs/assets/environment-session.webp']) assert.ok(paths.includes(required), required)
  const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  assert.deepEqual(manifest.dependencies, {
    '@deepseek-ai/dsh-atomic-write': '0.2.2-rc.3',
    '@deepseek-ai/schemastery': '3.19.0',
  }, 'only the pinned Harness schema and atomic storage helpers at runtime')
})
