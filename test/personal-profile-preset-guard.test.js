import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {emptyRecord} from '../plugins/personal-profile/index.js'
import {profileContext} from '../plugins/personal-profile/preferences.js'

test('every behavior preset works in the current context, without duplicate fields',()=>{
  for(const preset of ['critical','no-fluff','grill-me','evidence','steps','action','code','humanizer']){
    const record=emptyRecord()
    record.information.preferredName='FICTIONAL_PROFILE_NAME'
    record.preferences.presets=[preset]
    const text=profileContext(record)
    assert.equal(text.match(/FICTIONAL_PROFILE_NAME/g)?.length,1)
    assert.match(text,/Response preferences/)
    assert.match(text,/Current My Profile settings/)
  }
})
test('removed consent guard never blocks continuation and no new direct transport is added',()=>{
  const host=readFileSync(new URL('../plugins/personal-profile/index.js',import.meta.url),'utf8')
  const helper=readFileSync(new URL('../plugins/personal-profile/preferences.js',import.meta.url),'utf8')
  assert.doesNotMatch(host+helper,/staleDisclosure|refuseStaleDisclosure|llm\/stream/)
  assert.match(host,/systemPrompt\.context\(/)
  assert.doesNotMatch(host,/\bfetch\(|child_process|node:fs/)
})
