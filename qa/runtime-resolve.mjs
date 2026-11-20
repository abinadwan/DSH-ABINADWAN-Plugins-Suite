// Resolve bare @deepseek-ai/* imports from an extracted Harness runtime, so real-loop
// QA checks run against an exact rc without installing it into the project.
// Usage: ABINADWAN_TEST_RUNTIME=<runtime dir> node --import ./qa/runtime-resolve.mjs --test <check>
import {registerHooks} from 'node:module'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'

const root=process.env.ABINADWAN_TEST_RUNTIME
if(!root)throw new Error('ABINADWAN_TEST_RUNTIME must point to an extracted Harness runtime directory')
const parentURL=pathToFileURL(join(root,'package.json')).href
registerHooks({resolve(specifier,context,next){
  return next(specifier,specifier.startsWith('@deepseek-ai/')?{...context,parentURL}:context)
}})
