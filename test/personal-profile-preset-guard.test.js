import test from 'node:test'
import assert from 'node:assert/strict'
import {emptyRecord} from '../plugins/personal-profile/index.js'
import {responsePreferences, profileDisclosure, staleDisclosure} from '../plugins/personal-profile/preferences.js'

// Regression: v1.0.2 read nonexistent PROFILE_PRESETS[*][5] in the send guard.
// The renderer uses index 4, so every built-in preset was wrongly refused.
const PRESETS=['critical','no-fluff','grill-me','evidence','steps','action','code','humanizer']
const makeRequest=(...texts)=>({provider:'synthetic',model:'synthetic',messages:texts.map(text=>({
  role:'system',content:[{type:'text',text}],
}))})
const assemble=record=>[responsePreferences(record),profileDisclosure(record)].filter(Boolean).join('\n\n')
const makeRecord=share=>{
  const record=emptyRecord()
  record.information.preferredName='FICTIONAL_PROFILE_NAME'
  record.policies.preferredName=share?'allow':'private'
  return record
}

test('all eight built-in behavior presets are authorized on fresh turns and unchanged historical replay',()=>{
  for(const preset of PRESETS)for(const share of [false,true]){
    const record=makeRecord(share)
    record.preferences.presets=[preset]
    assert.equal(record.preferences.sendCustom,undefined,'custom-text consent remains off')
    const prompt=assemble(record)
    assert.match(prompt,/Response preferences/,preset)
    assert.equal(profileDisclosure(record).includes('FICTIONAL_PROFILE_NAME'),share)
    assert.equal(staleDisclosure(makeRequest(prompt),record),false,
      `new turn rejected built-in preset ${preset}, field sharing=${share}`)
    assert.equal(staleDisclosure(makeRequest('Host prologue\n\n'+prompt,'Current host\n\n'+prompt),record),false,
      `history replay rejected built-in preset ${preset}, field sharing=${share}`)
  }
})

test('all eight presets together remain authorized with private or allowed fields',()=>{
  for(const share of [false,true]){
    const record=makeRecord(share)
    record.preferences.presets=[...PRESETS]
    const prompt=assemble(record)
    assert.equal(staleDisclosure(makeRequest(prompt,prompt),record),false)
  }
})

test('preset fix does not weaken historical field revocation or edited-value refusal',()=>{
  const record=makeRecord(true)
  record.preferences.presets=['critical','steps']
  const oldPrompt=assemble(record)
  assert.equal(staleDisclosure(makeRequest(oldPrompt),record),false)

  const revoked=structuredClone(record)
  revoked.policies.preferredName='private'
  assert.equal(staleDisclosure(makeRequest(oldPrompt),revoked),true,'revoked field must remain blocked')

  const edited=structuredClone(record)
  edited.information.preferredName='FICTIONAL_CHANGED_NAME'
  assert.equal(staleDisclosure(makeRequest(oldPrompt),edited),true,'edited field must remain blocked')
  assert.equal(staleDisclosure(makeRequest(assemble(revoked)),revoked),false,'clean new turn must work')
})

test('multiline custom instructions, Windows line endings and subsequent consent revocation',()=>{
  const record=makeRecord(true)
  record.preferences.presets=['no-fluff','evidence']
  record.preferences.custom='Fictional custom paragraph one.\nSecond line.\n\nFictional paragraph two.'
  record.preferences.sendCustom=true
  const prompt=assemble(record)
  for(const separator of ['\n','\r\n','\r','\u0085','\u2028','\u2029']){
    const historical=prompt.replaceAll('\n',separator)
    assert.equal(staleDisclosure(makeRequest(historical,historical),record),false,
      `authorized multiline custom instructions rejected with separator ${JSON.stringify(separator)}`)
  }
  const revoked=structuredClone(record)
  delete revoked.preferences.sendCustom
  for(const separator of ['\n','\r\n','\r','\u0085','\u2028','\u2029']){
    assert.equal(staleDisclosure(makeRequest(prompt.replaceAll('\n',separator)),revoked),true,
      `revoked custom consent bypassed with separator ${JSON.stringify(separator)}`)
  }
  assert.equal(staleDisclosure(makeRequest(assemble(revoked)),revoked),false,
    'new turn without previously authorized custom text must remain usable')
})

test('unknown text appended as a profile instruction still fails closed',()=>{
  const record=makeRecord(false)
  record.preferences.presets=['action']
  assert.equal(staleDisclosure(makeRequest(assemble(record)+'\nUndeclared synthetic instruction.'),record),true)
  assert.equal(staleDisclosure({messages:[{role:'user',content:'Undeclared synthetic instruction.'}]},record),false,
    'normal user content must not be scanned as system prompt')
})
