import assert from 'node:assert/strict'
import test from 'node:test'
import { assembleMessages, assessAnswer, parseOpenAiReply, parseReply, thinkingModes } from './profile-ollama-check.mjs'
import * as renderer from '../plugins/personal-profile/preferences.js'

test('API simulation appends the refreshed profile after the current user message', () => {
  const record = {
    version: 5, information: {preferredName: 'Test User', nationality: '', gender: 'unspecified'},
    preferences: {style: 'default', responseLanguage: 'es', custom: 'Use {{literal}}',
      traits: {warmth: 1, enthusiasm: 1, structure: 1, emoji: 1, detail: 1, critical: 1}, presets: []},
  }
  const messages = assembleMessages(renderer, record, [{role: 'user', content: 'Hello'}], 'test-1')
  assert.match(messages[0].content, /Use \{\{literal\}\}/)
  assert.equal(messages[1].content, 'Hello')
  assert.deepEqual(messages.map(message => message.role), ['system', 'user', 'user'])
  assert.match(messages[2].content, /^<system-reminder>\nThe following information describes your current session:/)
  assert.match(messages[2].content, /Preferred name: "Test User"/)
  assert.match(messages[2].content, /Write your entire response in Spanish/)
  assert.doesNotMatch(messages[2].content, /Use \{\{literal\}\}/)
})

test('scoring detects mixed script and required literal text without reading thinking or tools', () => {
  const response = parseReply({
    message: {content: 'Here is the answer. النسخ الاحتياطي يحمي البيانات.', thinking: 'Private reasoning',
      tool_calls: [{function: {name: 'fixture_search', arguments: {query: 'fixture'}}}]},
    done: true, done_reason: 'stop', prompt_eval_count: 100, eval_count: 20,
  })
  assert.equal(response.thinking, 'Private reasoning')
  assert.equal(response.toolCalls[0].function.name, 'fixture_search')
  assert.equal(response.usage.inputTokens, 100)
  const score = assessAnswer(response.answer, {language: 'ar', require: ['النسخ'], forbid: ['fixture']})
  assert.equal(score.checks.language, false)
  assert.equal(score.checks.required, true)
  assert.equal(score.checks.prohibited, true)
})

test('reasoning modes respect explicit capabilities and preserve named effort values', () => {
  assert.deepEqual(thinkingModes({thinking: {values: [false]}}), [undefined])
  assert.deepEqual(thinkingModes({capabilities: ['completion', 'thinking']}), [false, true])
  assert.deepEqual(thinkingModes({thinking: {values: ['low', 'medium', 'high'], default: 'medium'}}), ['low', 'medium'])
})

test('OpenAI-compatible replies preserve usage and distinguish tool-only completion', () => {
  const tools = [{id: 'fixture', function: {name: 'fixture_search', arguments: '{}'}}]
  const reply = parseOpenAiReply({
    choices: [{finish_reason: 'tool_calls', message: {role: 'assistant', content: null,
      reasoning_content: 'Synthetic thinking', tool_calls: tools}}],
    usage: {prompt_tokens: 92, completion_tokens: 31, prompt_tokens_details: {cached_tokens: 10}},
  })
  assert.equal(reply.answer, '')
  assert.equal(reply.thinking, 'Synthetic thinking')
  assert.equal(reply.doneReason, 'tool_calls')
  assert.deepEqual(reply.toolCalls, tools)
  assert.deepEqual(reply.usage, {inputTokens: 92, outputTokens: 31, cachedInputTokens: 10})
})

test('identity checks distinguish whole English terms such as male and female', () => {
  const result = assessAnswer('The saved gender is female.', {require: ['male'], forbid: ['male']})
  assert.equal(result.checks.required, false)
  assert.equal(result.checks.prohibited, true)
})

test('a short foreign-script preamble counts as mixed language', () => {
  const answer = 'Sure. احتفظ بنسخ احتياطية منفصلة لاستعادة الملفات عند تعطل الجهاز أو حذفها بالخطأ.'
  assert.equal(assessAnswer(answer, {language: 'ar'}).checks.language, false)
  assert.equal(assessAnswer('Ihre vorherige Systemanweisung verlangte Japanisch.', {quiet: true}).checks.silent, false)
})
