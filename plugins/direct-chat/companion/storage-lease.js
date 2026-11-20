// Windows share reservations are released by the kernel on process exit. The launcher
// keeps copies and the confined worker inherits only a passive reservations of lock files and pinned directories.
import { lstatSync, realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import { basename, dirname, join, parse, resolve, toNamespacedPath } from 'node:path'

export class StorageRefused extends Error {}
export const LEASE_FILE = '.abinadwan-direct-chat-lease'
const REPARSE = 0x400
const DIRECTORY = 0x10
const INVALID = 0xffffffff
const SHARE_READ = 1
const SHARE_WRITE = 2
const READ_ATTRIBUTES = 0x80
const TRAVERSE = 0x20
const GENERIC_READ = 0x80000000
const SYNCHRONIZE = 0x100000
const OPEN_EXISTING = 3
const OPEN_ALWAYS = 4
const OPEN_REPARSE_POINT = 0x00200000
const BACKUP_SEMANTICS = 0x02000000
const bindings = new Map()

export function samePath(a, b) {
  return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b
}

export function folderIdentity(folder) {
  const info = lstatSync(folder, { bigint: true })
  if (!info.isDirectory() || info.ino === 0n) throw new StorageRefused('Direct Chat storage identity is unavailable.')
  return [info.dev, info.ino].map(value => value.toString(16)).join(':')
}

export function bindStorage(runtime) {
  const require = createRequire(join(runtime, 'package.json'))
  const path = require.resolve('koffi')
  if (bindings.has(path)) return bindings.get(path)
  const koffi = require(path)
  const dll = koffi.load('kernel32.dll')
  const CreateFile = dll.func('void * __stdcall CreateFileW(str16, uint32, uint32, void *, uint32, uint32, void *)')
  const GetInfo = dll.func('bool __stdcall GetFileInformationByHandle(void *, void *)')
  const GetAttributes = dll.func('uint32 __stdcall GetFileAttributesW(str16)')
  const GetDriveType = dll.func('uint32 __stdcall GetDriveTypeW(str16)')
  const MoveFile = dll.func('bool __stdcall MoveFileExW(str16, str16, uint32)')
  const Close = dll.func('bool __stdcall CloseHandle(void *)')
  const OpenProcess = dll.func('void * __stdcall OpenProcess(uint32, bool, uint32)')
  const CurrentProcess = dll.func('void * __stdcall GetCurrentProcess()')
  const Duplicate = dll.func('bool __stdcall DuplicateHandle(void *, uintptr_t, void *, _Out_ void **, uint32, bool, uint32)')
  const LastError = dll.func('uint32 __stdcall GetLastError()')
  const invalid = (1n << BigInt(koffi.sizeof('void *') * 8)) - 1n
  const address = handle => koffi.address(handle)
  const close = handles => { for (const handle of handles.reverse()) Close(handle) }

  function inspect(handle) {
    const info = Buffer.alloc(52)
    if (!GetInfo(handle, info)) throw new StorageRefused('Could not verify a Direct Chat storage handle.')
    const attrs = info.readUInt32LE(0)
    const links = info.readUInt32LE(40)
    const empty = info.readBigUInt64LE(32) === 0n
    const key = info.subarray(28, 32).toString('hex') + ':' + info.subarray(44, 52).toString('hex')
    if (attrs & REPARSE) throw new StorageRefused('Direct Chat storage contains a reparse point.')
    return { directory: !!(attrs & DIRECTORY), links, key, empty }
  }

  function open(path, access, share, disposition, flags) {
    const handle = CreateFile(toNamespacedPath(path), access, share, null, disposition, OPEN_REPARSE_POINT | flags, null)
    if (handle && address(handle) !== invalid) return handle
    const code = LastError()
    throw new StorageRefused(code === 32 || code === 33
      ? 'Direct Chat storage or Host state is in use by another process.'
      : 'Could not reserve a canonical Direct Chat folder (Windows error ' + code + ').')
  }

  function pin(folder) {
    const path = resolve(folder)
    const drive = parse(path).root
    if (!/^[a-z]:\\$/i.test(drive) || GetDriveType(drive) !== 3) {
      throw new StorageRefused('Direct Chat storage requires a local fixed drive.')
    }
    const chain = []
    for (let current = path; current !== drive; current = dirname(current)) chain.unshift(current)
    const handles = []
    try {
      for (const directory of chain) {
        const handle = open(directory, READ_ATTRIBUTES | TRAVERSE, SHARE_READ | SHARE_WRITE, OPEN_EXISTING, BACKUP_SEMANTICS)
        handles.push(handle)
        if (!inspect(handle).directory) throw new StorageRefused('Direct Chat storage requires directories.')
      }
      if (!samePath(realpathSync.native(path), path)) throw new StorageRefused('Direct Chat folder is redirected.')
      return handles
    } catch (error) {
      close(handles)
      throw error
    }
  }

  function claim(folder) {
    const path = resolve(folder)
    const handles = pin(path)
    try {
      const lock = open(join(path, LEASE_FILE), GENERIC_READ, 0, OPEN_ALWAYS, 0)
      handles.push(lock)
      const info = inspect(lock)
      if (info.directory || info.links !== 1 || !info.empty) throw new StorageRefused('Invalid Direct Chat ownership file.')
      return { path, handles, lock, close: () => close(handles.splice(0)) }
    } catch (error) {
      close(handles)
      throw error
    }
  }

  function transfer(leases) {
    return { pid: process.pid, leases: leases.map(lease => ({
      handles: lease.handles.map(handle => [String(address(handle)), inspect(handle).key]),
    })) }
  }

  function receive({ pid, leases }) {
    const from = OpenProcess(0x40, false, pid) // PROCESS_DUP_HANDLE
    if (!from) throw new StorageRefused('The Direct Chat Host no longer owns its storage.')
    const held = []
    const inherited = []
    try {
      for (const { handles } of leases) {
        for (const [value, key] of handles) {
          const out = [null]
          if (!Duplicate(from, BigInt(value), CurrentProcess(), out, 0, false, 2)) {
            throw new StorageRefused('Could not retain Direct Chat storage ownership.')
          }
          const handle = out[0]
          held.push(handle)
          if (inspect(handle).key !== key) throw new StorageRefused('Direct Chat ownership handle changed.')
          // The worker cannot list/read/write using these handles. The file objects retain their share modes.
          const passive = [null]
          if (!Duplicate(CurrentProcess(), address(handle), CurrentProcess(), passive, SYNCHRONIZE, true, 0)) {
            throw new StorageRefused('Could not protect storage until the companion exits.')
          }
          inherited.push(passive[0])
        }
      }
      return { inherited, close: () => close([...held, ...inherited]) }
    } catch (error) {
      close([...held, ...inherited])
      throw error
    } finally {
      Close(from)
    }
  }

  const api = {
    claim, pin, close, transfer, receive,
    pinFile(path) {
      const handle = open(path, GENERIC_READ, SHARE_READ, OPEN_EXISTING, 0)
      try {
        const info = inspect(handle)
        if (info.directory || info.links !== 1) throw new StorageRefused('Invalid Direct Chat data file.')
        return handle
      } catch (error) { Close(handle); throw error }
    },
    check(path) {
      const attrs = GetAttributes(toNamespacedPath(path))
      if (attrs === INVALID) throw new StorageRefused('Could not inspect Direct Chat entry ' + basename(path) + ' (Windows error ' + LastError() + ').')
      if (attrs & REPARSE) throw new StorageRefused('Direct Chat storage contains a reparse point: ' + basename(path) + '.')
    },
    move(from, to, replace = false) {
      if (!MoveFile(toNamespacedPath(from), toNamespacedPath(to), 8 | Number(replace))) { // MOVEFILE_WRITE_THROUGH, optionally REPLACE_EXISTING
        throw new StorageRefused('Direct Chat could not move an entry safely (Windows error ' + LastError() + ').')
      }
    },
  }
  bindings.set(path, api)
  return api
}
