// Windows AppContainer confinement for the Direct Chat companion.
// Bindings use the Harness runtime's own koffi dependency. No administrator rights are needed:
// the profile is per user, and access grants are added only to directories the user owns.
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { join } from 'node:path'

// The former shared QA profile, kept only so cleanup can remove it.
export const profileName = 'abinadwan.direct-chat.qa'
const S_OK = 0
const E_ALREADY_EXISTS = 0x800700b7 | 0
const PROC_THREAD_ATTRIBUTE_HANDLE_LIST = 0x00020002
const PROC_THREAD_ATTRIBUTE_JOB_LIST = 0x0002000d
const PROC_THREAD_ATTRIBUTE_SECURITY_CAPABILITIES = 0x00020009
const PROC_THREAD_ATTRIBUTE_CHILD_PROCESS_POLICY = 0x0002000e
const PROC_THREAD_ATTRIBUTE_ALL_APPLICATION_PACKAGES_POLICY = 0x0002000f
const EXTENDED_STARTUPINFO_PRESENT = 0x00080000
const CREATE_SUSPENDED = 0x4
const CREATE_UNICODE_ENVIRONMENT = 0x400
const DETACHED_PROCESS = 0x8
const STARTF_USESTDHANDLES = 0x100
const HANDLE_FLAG_INHERIT = 1
const JOB_OBJECT_LIMIT_ACTIVE_PROCESS = 0x8
const JOB_OBJECT_LIMIT_JOB_MEMORY = 0x200
const JOB_OBJECT_LIMIT_DIE_ON_UNHANDLED_EXCEPTION = 0x400
const JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x2000
const JobObjectExtendedLimitInformation = 9
const JobObjectBasicUIRestrictions = 4
// Every JOB_OBJECT_UILIMIT_* class: foreign USER handles, clipboard, system parameters, display
// settings, global atoms, desktop switching and logoff.
const JOB_OBJECT_UILIMIT_ALL = 0xff
const DESKTOP_ALL_ACCESS = 0x01ff | 0x000f0000
const SDDL_REVISION_1 = 1
const INFINITE = 0xffffffff

export function bind(runtime) {
  const koffi = createRequire(join(runtime, 'package.json'))('koffi')
  const userenv = koffi.load('userenv.dll')
  const advapi32 = koffi.load('advapi32.dll')
  const kernel32 = koffi.load('kernel32.dll')
  const kernelbase = koffi.load('kernelbase.dll')
  const SidAndAttributes = koffi.struct('SID_AND_ATTRIBUTES', { Sid: 'void *', Attributes: 'uint32' })
  const SecurityCapabilities = koffi.struct('SECURITY_CAPABILITIES', {
    AppContainerSid: 'void *', Capabilities: 'void *', CapabilityCount: 'uint32', Reserved: 'uint32',
  })
  const StartupInfo = koffi.struct('STARTUPINFOW', {
    cb: 'uint32', lpReserved: 'void *', lpDesktop: 'void *', lpTitle: 'void *', dwX: 'uint32', dwY: 'uint32',
    dwXSize: 'uint32', dwYSize: 'uint32', dwXCountChars: 'uint32', dwYCountChars: 'uint32',
    dwFillAttribute: 'uint32', dwFlags: 'uint32', wShowWindow: 'uint16', cbReserved2: 'uint16',
    lpReserved2: 'void *', hStdInput: 'void *', hStdOutput: 'void *', hStdError: 'void *',
  })
  const StartupInfoEx = koffi.struct('STARTUPINFOEXW', { StartupInfo, lpAttributeList: 'void *' })
  const ProcessInformation = koffi.struct('PROCESS_INFORMATION', {
    hProcess: 'void *', hThread: 'void *', dwProcessId: 'uint32', dwThreadId: 'uint32',
  })
  const BasicLimit = koffi.struct('JOBOBJECT_BASIC_LIMIT_INFORMATION', {
    PerProcessUserTimeLimit: 'int64', PerJobUserTimeLimit: 'int64', LimitFlags: 'uint32',
    MinimumWorkingSetSize: 'size_t', MaximumWorkingSetSize: 'size_t', ActiveProcessLimit: 'uint32',
    Affinity: 'uintptr_t', PriorityClass: 'uint32', SchedulingClass: 'uint32',
  })
  const IoCounters = koffi.struct('IO_COUNTERS', {
    a: 'uint64', b: 'uint64', c: 'uint64', d: 'uint64', e: 'uint64', f: 'uint64',
  })
  const ExtendedLimit = koffi.struct('JOBOBJECT_EXTENDED_LIMIT_INFORMATION', {
    BasicLimitInformation: BasicLimit, IoInfo: IoCounters, ProcessMemoryLimit: 'size_t',
    JobMemoryLimit: 'size_t', PeakProcessMemoryUsed: 'size_t', PeakJobMemoryUsed: 'size_t',
  })
  const SecurityAttributes = koffi.struct('SECURITY_ATTRIBUTES', { nLength: 'uint32', lpSecurityDescriptor: 'void *', bInheritHandle: 'int32' })
  const user32 = koffi.load('user32.dll')
  void SidAndAttributes
  return {
    koffi, StartupInfoEx, ProcessInformation, SecurityCapabilities, ExtendedLimit, SecurityAttributes,
    SetJobUiRestrictions: kernel32.func('bool __stdcall SetInformationJobObject(void *, int32, _In_ uint32 *, uint32)'),
    ConvertStringSecurityDescriptorToSecurityDescriptorW: advapi32.func('bool __stdcall ConvertStringSecurityDescriptorToSecurityDescriptorW(str16, uint32, _Out_ void **, void *)'),
    CreateDesktopW: user32.func('void * __stdcall CreateDesktopW(str16, void *, void *, uint32, uint32, SECURITY_ATTRIBUTES *)'),
    CloseDesktop: user32.func('bool __stdcall CloseDesktop(void *)'),
    CreateAppContainerProfile: userenv.func('int32 __stdcall CreateAppContainerProfile(str16, str16, str16, void *, uint32, _Out_ void **)'),
    DeriveAppContainerSidFromAppContainerName: userenv.func('int32 __stdcall DeriveAppContainerSidFromAppContainerName(str16, _Out_ void **)'),
    DeleteAppContainerProfile: userenv.func('int32 __stdcall DeleteAppContainerProfile(str16)'),
    ConvertSidToStringSidW: advapi32.func('bool __stdcall ConvertSidToStringSidW(void *, _Out_ void **)'),
    FreeSid: advapi32.func('void * __stdcall FreeSid(void *)'),
    LocalFree: kernel32.func('void * __stdcall LocalFree(void *)'),
    GetLastError: kernel32.func('uint32 __stdcall GetLastError()'),
    GetStdHandle: kernel32.func('void * __stdcall GetStdHandle(int32)'),
    SetHandleInformation: kernel32.func('bool __stdcall SetHandleInformation(void *, uint32, uint32)'),
    InitializeProcThreadAttributeList: kernel32.func('bool __stdcall InitializeProcThreadAttributeList(void *, uint32, uint32, _Inout_ size_t *)'),
    UpdateProcThreadAttribute: kernel32.func('bool __stdcall UpdateProcThreadAttribute(void *, uint32, uintptr_t, void *, size_t, void *, void *)'),
    DeleteProcThreadAttributeList: kernel32.func('void __stdcall DeleteProcThreadAttributeList(void *)'),
    CreateProcessW: kernel32.func('bool __stdcall CreateProcessW(str16, void *, void *, void *, bool, uint32, void *, str16, STARTUPINFOEXW *, _Out_ PROCESS_INFORMATION *)'),
    CreateJobObjectW: kernel32.func('void * __stdcall CreateJobObjectW(void *, void *)'),
    SetInformationJobObject: kernel32.func('bool __stdcall SetInformationJobObject(void *, int32, JOBOBJECT_EXTENDED_LIMIT_INFORMATION *, uint32)'),
    ResumeThread: kernel32.func('uint32 __stdcall ResumeThread(void *)'),
    WaitForSingleObject: kernel32.func('uint32 __stdcall WaitForSingleObject(void *, uint32)'),
    GetExitCodeProcess: kernel32.func('bool __stdcall GetExitCodeProcess(void *, _Out_ uint32 *)'),
    CloseHandle: kernel32.func('bool __stdcall CloseHandle(void *)'),
    DeriveCapabilitySidsFromName: kernelbase.func('bool __stdcall DeriveCapabilitySidsFromName(str16, _Out_ void **, _Out_ uint32 *, _Out_ void **, _Out_ uint32 *)'),
  }
}

/** Create or reuse the per-user profile and return its package SID. */
export function ensureProfile(api, name = profileName) {
  const out = [null]
  let hr = api.CreateAppContainerProfile(name, 'ABINADWAN Direct Chat', 'Confined Direct Chat companion', null, 0, out)
  if (hr === E_ALREADY_EXISTS) hr = api.DeriveAppContainerSidFromAppContainerName(name, out)
  if (hr !== S_OK) throw new Error(`AppContainer profile unavailable (0x${(hr >>> 0).toString(16)})`)
  try { return { pointer: out[0], sid: sidText(api, out[0]) } }
  catch (error) { api.FreeSid(out[0]); throw error }
}

function sidText(api, pointer) {
  const text = [null]
  if (!api.ConvertSidToStringSidW(pointer, text)) throw new Error('AppContainer SID conversion failed')
  try { return api.koffi.decode(text[0], 'char16_t', -1) }
  finally { api.LocalFree(text[0]) }
}

export function profileSid(api, name) {
  const pointer = [null]
  if (api.DeriveAppContainerSidFromAppContainerName(name, pointer) !== S_OK) {
    throw new Error('Could not derive the AppContainer SID')
  }
  try { return sidText(api, pointer[0]) } finally { api.FreeSid(pointer[0]) }
}

/** Resolve named capabilities (for example `registryRead`) to SID_AND_ATTRIBUTES entries. */
export function capabilitySids(api, names) {
  const { koffi } = api
  return names.map(name => {
    const groups = [null], groupCount = [0], sids = [null], sidCount = [0]
    if (!api.DeriveCapabilitySidsFromName(name, groups, groupCount, sids, sidCount) || sidCount[0] < 1) {
      throw new Error(`Unknown capability ${name}`)
    }
    const sid = koffi.decode(sids[0], 'void *')
    return { Sid: sid, Attributes: 4 } // SE_GROUP_ENABLED
  })
}

export function deleteProfile(api, name = profileName) {
  const hr = api.DeleteAppContainerProfile(name)
  if (hr !== S_OK && ![0x80070002, 0x80070490].includes(hr >>> 0)) {
    throw new Error(`AppContainer profile removal failed (0x${(hr >>> 0).toString(16)})`)
  }
}

const icacls = () => join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'icacls.exe')

/** Grant the package SID inheritable access to a directory tree the user owns. `rights` is RX or M. */
export function grant(path, sid, rights) {
  const listed = spawnSync(icacls(), [path], { encoding: 'utf8', windowsHide: true })
  if (listed.status !== 0) throw new Error(`Cannot read ACL for ${path}`)
  if (listed.stdout.includes(`${sid}:(OI)(CI)(${rights})`)) return false
  const result = spawnSync(icacls(), [path, '/grant', `*${sid}:(OI)(CI)${rights}`, '/T', '/Q', '/C'],
    { encoding: 'utf8', windowsHide: true })
  if (result.status !== 0) throw new Error(`Cannot grant ${rights} on ${path}: ${result.stdout}${result.stderr}`)
  return true
}

/** Remove every ACE for the package SID from a tree. Used by cleanup and stale-grant reconciliation. */
export function revoke(path, sid) {
  const result = spawnSync(icacls(), [path, '/remove:g', `*${sid}`, '/T', '/Q', '/C'], { encoding: 'utf8', windowsHide: true })
  if (result.status !== 0) throw new Error(`Cannot revoke on ${path}: ${result.stdout}${result.stderr}`)
}

function quote(arg) {
  if (arg && !/[\s"]/.test(arg)) return arg
  return `"${arg.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/, '$1$1')}"`
}

/**
 * Start `exe args` in the AppContainer with standard handles and passive storage reservations as its only inherited handles.
 * The child cannot create processes, is killed when the returned job closes, and receives `env` only.
 * It runs on a private desktop that only its package SID and the owner can open, and its job blocks the
 * clipboard, foreign USER handles and global UI state, so it cannot read the user's screen, windows or clipboard.
 */
export function launch(api, { exe, args, cwd, env, appContainerSid, packageSid, lpac, capabilities = [], jobMemoryLimit, ownershipHandles = [] }) {
  if (!/^S-1-15-2(-\d+){7}$/.test(packageSid ?? '')) throw new Error('Confined launch requires the package SID')
  const { koffi } = api
  const handles = []
  for (const kind of [-10, -11, -12]) {
    const handle = api.GetStdHandle(kind)
    if (!handle) throw new Error('Confined launch requires piped standard handles')
    if (!handles.some(existing => koffi.address(existing) === koffi.address(handle))) handles.push(handle)
    if (!api.SetHandleInformation(handle, HANDLE_FLAG_INHERIT, HANDLE_FLAG_INHERIT)) throw new Error('Handle inheritance failed')
  }
  handles.push(...ownershipHandles)
  const [stdin, stdout, stderr] = [-10, -11, -12].map(kind => api.GetStdHandle(kind))
  const attributes = 5
  const size = [0]
  api.InitializeProcThreadAttributeList(null, attributes, 0, size)
  const list = Buffer.alloc(size[0])
  if (!api.InitializeProcThreadAttributeList(list, attributes, 0, size)) throw new Error('Attribute list failed')
  const securityCapabilities = koffi.alloc(api.SecurityCapabilities, 1)
  const granted = capabilitySids(api, capabilities)
  const grantedList = granted.length ? koffi.alloc('SID_AND_ATTRIBUTES', granted.length) : null
  if (granted.length) koffi.encode(grantedList, koffi.array('SID_AND_ATTRIBUTES', granted.length), granted)
  koffi.encode(securityCapabilities, api.SecurityCapabilities,
    { AppContainerSid: appContainerSid, Capabilities: grantedList, CapabilityCount: granted.length, Reserved: 0 })
  const handleList = koffi.alloc('void *', handles.length)
  koffi.encode(handleList, koffi.array('void *', handles.length), handles)
  const childPolicy = Buffer.alloc(4)
  childPolicy.writeUInt32LE(1) // PROCESS_CREATION_CHILD_PROCESS_RESTRICTED
  const packagesPolicy = Buffer.alloc(4)
  packagesPolicy.writeUInt32LE(1) // PROCESS_CREATION_ALL_APPLICATION_PACKAGES_OPT_OUT (LPAC)
  try {
    const update = (attribute, value, length) => {
      if (!api.UpdateProcThreadAttribute(list, 0, attribute, value, length, null, null)) {
        throw new Error(`Attribute 0x${attribute.toString(16)} failed (${api.GetLastError()})`)
      }
    }
    update(PROC_THREAD_ATTRIBUTE_SECURITY_CAPABILITIES, securityCapabilities, koffi.sizeof(api.SecurityCapabilities))
    update(PROC_THREAD_ATTRIBUTE_HANDLE_LIST, handleList, koffi.sizeof('void *') * handles.length)
    update(PROC_THREAD_ATTRIBUTE_CHILD_PROCESS_POLICY, childPolicy, 4)
    if (lpac) update(PROC_THREAD_ATTRIBUTE_ALL_APPLICATION_PACKAGES_POLICY, packagesPolicy, 4)

    const block = Buffer.from(Object.entries(env).map(([key, value]) => `${key}=${value}\0`).join('') + '\0', 'utf16le')
    const commandLine = Buffer.from([exe, ...args].map(quote).join(' ') + '\0', 'utf16le')
    const desktop = privateDesktop(api, packageSid)
    const desktopName = Buffer.from(`WinSta0\\${desktop.name}\0`, 'utf16le')
    const info = {
      StartupInfo: { cb: koffi.sizeof(api.StartupInfoEx), dwFlags: STARTF_USESTDHANDLES, lpDesktop: desktopName,
        hStdInput: stdin, hStdOutput: stdout, hStdError: stderr },
      lpAttributeList: list,
    }
    const created = {}
    const job = api.CreateJobObjectW(null, null)
    if (!job) { api.CloseDesktop(desktop.handle); throw new Error('Job creation failed') }
    const fail = message => {
      api.CloseHandle(job)
      api.CloseDesktop(desktop.handle)
      throw new Error(message)
    }
    const limits = {
      BasicLimitInformation: { LimitFlags: JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE | JOB_OBJECT_LIMIT_ACTIVE_PROCESS
        | JOB_OBJECT_LIMIT_DIE_ON_UNHANDLED_EXCEPTION | JOB_OBJECT_LIMIT_JOB_MEMORY, ActiveProcessLimit: 1 },
      JobMemoryLimit: jobMemoryLimit,
    }
    if (!api.SetInformationJobObject(job, JobObjectExtendedLimitInformation, limits, koffi.sizeof(api.ExtendedLimit))) {
      fail(`Job limits failed (${api.GetLastError()})`)
    }
    if (!api.SetJobUiRestrictions(job, JobObjectBasicUIRestrictions, [JOB_OBJECT_UILIMIT_ALL], 4)) {
      fail(`Job UI restrictions failed (${api.GetLastError()})`)
    }
    // Associate the job at creation. A killed launcher cannot strand a suspended child with live leases.
    const jobList = koffi.alloc('void *', 1)
    koffi.encode(jobList, koffi.array('void *', 1), [job])
    try { update(PROC_THREAD_ATTRIBUTE_JOB_LIST, jobList, koffi.sizeof('void *')) }
    catch (error) { fail(error.message) }
    if (!api.CreateProcessW(exe, commandLine, null, null, true,
      EXTENDED_STARTUPINFO_PRESENT | CREATE_SUSPENDED | CREATE_UNICODE_ENVIRONMENT | DETACHED_PROCESS,
      block, cwd, info, created)) {
      fail('Confined process creation failed (' + api.GetLastError() + ')')
    }
    const resumed = api.ResumeThread(created.hThread)
    api.CloseHandle(created.hThread)
    if (resumed === 0xffffffff) {
      api.CloseHandle(created.hProcess)
      fail('Confined process could not start')
    }
    return { job, desktop: desktop.handle, desktopName: desktop.name, process: created.hProcess, pid: created.dwProcessId }
  } finally {
    api.DeleteProcThreadAttributeList(list)
  }
}

/**
 * Create a desktop in the interactive window station whose DACL admits only the owner and the
 * package SID, with a low mandatory label so the low-integrity child can attach to it.
 */
function privateDesktop(api, packageSid) {
  const name = `abinadwan-direct-chat-${process.pid}-${Date.now().toString(36)}`
  const descriptor = [null]
  if (!api.ConvertStringSecurityDescriptorToSecurityDescriptorW(
    `D:P(A;;GA;;;OW)(A;;GA;;;${packageSid})S:(ML;;NW;;;LW)`, SDDL_REVISION_1, descriptor, null)) {
    throw new Error(`Desktop security descriptor failed (${api.GetLastError()})`)
  }
  try {
    const handle = api.CreateDesktopW(name, null, null, 0, DESKTOP_ALL_ACCESS,
      { nLength: api.koffi.sizeof(api.SecurityAttributes), lpSecurityDescriptor: descriptor[0], bInheritHandle: 0 })
    if (!handle) throw new Error(`Private desktop creation failed (${api.GetLastError()})`)
    return { name, handle }
  } finally {
    api.LocalFree(descriptor[0])
  }
}

export function wait(api, handle) {
  return new Promise((resolve, reject) => {
    api.WaitForSingleObject.async(handle, INFINITE, error => {
      if (error) { reject(error); return }
      const code = [0]
      api.GetExitCodeProcess(handle, code)
      resolve(code[0])
    })
  })
}
