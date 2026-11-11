import type { Table } from 'dexie'
import { db, seedDemo } from './db'

let version = 0
let suspended = true
let timer: number | undefined

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tables = () => [db.expenses, db.deadlines, db.items, db.shopping, db.docs] as Table<any, number>[]

async function dump() {
  const out: Record<string, unknown[]> = {}
  for (const t of tables()) out[t.name] = await t.toArray()
  return out
}

async function restore(data: Record<string, unknown[]>) {
  await db.transaction('rw', tables(), async () => {
    for (const t of tables()) {
      await t.clear()
      await t.bulkAdd((data[t.name] ?? []) as never[])
    }
  })
}

function download(name: string, payload: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 1)], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url; a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function exportBackup(prefix = 'home-manager-backup') {
  download(`${prefix}-${new Date().toISOString().slice(0, 10)}.json`, { app: 'home-manager', exportedAt: new Date().toISOString(), data: await dump() })
}

// Controlla il file e restituisce i dati validi, oppure lancia un errore con il motivo.
export function validateBackup(raw: string): Record<string, unknown[]> {
  let obj: any
  try { obj = JSON.parse(raw) } catch { throw new Error('Il file non è un JSON valido.') }
  if (!obj || obj.app !== 'home-manager' || typeof obj.data !== 'object' || obj.data === null)
    throw new Error('Il file non è un backup di Home Manager.')
  const out: Record<string, unknown[]> = {}
  for (const t of tables()) {
    const rows = obj.data[t.name]
    if (!Array.isArray(rows)) throw new Error(`Backup incompleto: manca la sezione "${t.name}".`)
    if (rows.some((r: unknown) => typeof r !== 'object' || r === null || Array.isArray(r))) throw new Error(`Sezione "${t.name}" non valida.`)
    out[t.name] = rows
  }
  return out
}

export async function importBackup(data: Record<string, unknown[]>) {
  await exportBackup('home-manager-prima-di-importare') // copia di sicurezza dei dati attuali
  await restore(data)
}

async function reloadFromServer(message: string) {
  alert(message)
  location.reload()
}

async function push() {
  const res = await fetch('/api/data', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ baseVersion: version, data: await dump() }),
  })
  if (res.status === 409) return reloadFromServer('I dati sono stati modificati su un altro dispositivo. Ricarico la versione più recente.')
  if (res.ok) version = (await res.json()).version
}

function schedulePush() {
  if (suspended) return
  window.clearTimeout(timer)
  timer = window.setTimeout(() => push().catch(() => {}), 800)
}

export async function initSync() {
  try {
    const res = await fetch('/api/data', { cache: 'no-store' })
    const server = await res.json()
    suspended = true
    if (server.data) await restore(server.data)
    else {
      await db.delete(); await db.open()
      await seedDemo()
    }
    version = server.version
    suspended = false
    if (!server.data) await push()
    for (const t of tables()) {
      t.hook('creating', () => { schedulePush() })
      t.hook('updating', () => { schedulePush() })
      t.hook('deleting', () => { schedulePush() })
    }
    window.addEventListener('focus', async () => {
      try {
        const s = await (await fetch('/api/data', { cache: 'no-store' })).json()
        if (s.version > version) reloadFromServer('Dati aggiornati da un altro dispositivo. Ricarico.')
      } catch {}
    })
  } catch {
    suspended = true // server non raggiungibile: l'app resta usabile senza sincronizzazione
    await seedDemo()
  }
}
