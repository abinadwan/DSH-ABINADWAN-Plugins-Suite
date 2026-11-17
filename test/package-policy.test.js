import test from 'node:test'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
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
