// Internal persistence rules. Only explicit management transactions may change
// opt-in or field policy; ordinary edits may carry an unchanged snapshot.
import {isDeepStrictEqual} from 'node:util'
import {entries, boolean} from '../core/schema.js'
import {normalize, guarded, failure, identity} from './codec.js'

export function ordinaryProfile(input, current) {
  return guarded(()=> {
    const supplied=Object.fromEntries(entries(input)), next=normalize(supplied)
    const previous=current || normalize({})
    if (Object.hasOwn(supplied,'permissionState') && !isDeepStrictEqual(next.permissionState,previous.permissionState)) failure()
    if (Object.hasOwn(supplied,'allowAgentUseApprovedProfileInformation') &&
        next.allowAgentUseApprovedProfileInformation!==previous.allowAgentUseApprovedProfileInformation) failure()
    // Omitted authority is preserved; definitions incompatible with that policy
    // must be resolved explicitly through management before editing the schema.
    return normalize({...next,permissionState:previous.permissionState,
      allowAgentUseApprovedProfileInformation:previous.allowAgentUseApprovedProfileInformation})
  })
}
export function managementProfile(current, input) {
  return guarded(()=> {
    if (!current) failure()
    const patch=Object.fromEntries(entries(input,['optIn','permissions']))
    if (!Object.keys(patch).length) failure()
    const next=normalize(current)
    if (Object.hasOwn(patch,'optIn')) next.allowAgentUseApprovedProfileInformation=boolean(patch.optIn)
    if (Object.hasOwn(patch,'permissions')) {
      for (const [id,fields] of entries(patch.permissions)) {
        identity(id)
        const previous=Object.hasOwn(next.permissionState.profiles,id)?next.permissionState.profiles[id]:{}
        next.permissionState.profiles={...next.permissionState.profiles,[id]:{...previous,...Object.fromEntries(entries(fields))}}
      }
    }
    return normalize(next)
  })
}
