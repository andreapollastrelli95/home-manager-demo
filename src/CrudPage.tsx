import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Table } from 'dexie'

export interface Field {
  key: string
  label: string
  type: 'text' | 'number' | 'date' | 'select' | 'checkbox'
  options?: string[]
  required?: boolean
}

type Row = Record<string, unknown> & { id?: number }

const inputCls = 'border border-slate-300 rounded px-2 py-2 text-base sm:text-sm w-full bg-white'
const btnCls = 'rounded px-4 py-2 text-sm min-h-[44px] sm:min-h-0'

export default function CrudPage({ title, table, fields, defaults }: {
  title: string
  table: Table<any, number>
  fields: Field[]
  defaults: Row
}) {
  const rows = useLiveQuery(() => table.toArray(), [table]) as Row[] | undefined
  const [form, setForm] = useState<Row>(defaults)
  const [search, setSearch] = useState('')
  const [msg, setMsg] = useState('')
  const formRef = useRef<HTMLDivElement>(null)

  const save = async () => {
    const missing = fields.filter((f) => f.required && !form[f.key]).map((f) => f.label)
    if (missing.length) return setMsg('Campo obbligatorio: ' + missing.join(', '))
    try {
      const { id, ...rest } = form
      if (id) await table.update(id, rest)
      else await table.add(rest)
      setForm(defaults)
      setMsg('')
    } catch {
      setMsg('Salvataggio non riuscito. Riprova.')
    }
  }

  const edit = (r: Row) => { setForm(r); setMsg(''); formRef.current?.scrollIntoView({ behavior: 'auto' }) }
  const remove = async (r: Row) => {
    if (!window.confirm('Eliminare questo elemento?')) return
    try { await table.delete(r.id!) } catch { setMsg('Eliminazione non riuscita. Riprova.') }
  }
  const q = search.trim().toLowerCase()
  const shown = (rows ?? []).filter((r) => !q || fields.some((f) => String(r[f.key] ?? '').toLowerCase().includes(q)))

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">{title}</h1>
      <div ref={formRef} className="bg-white rounded-lg shadow p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {fields.map((f) => (
          <label key={f.key} className="text-xs text-slate-600">
            {f.label}
            {f.type === 'select' ? (
              <select className={inputCls} value={String(form[f.key] ?? '')} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                {f.options!.map((o) => <option key={o}>{o}</option>)}
              </select>
            ) : f.type === 'checkbox' ? (
              <input type="checkbox" className="block mt-2" checked={!!form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })} />
            ) : (
              <input
                className={inputCls}
                type={f.type}
                value={String(form[f.key] ?? '')}
                onChange={(e) => setForm({ ...form, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value })}
              />
            )}
          </label>
        ))}
        <div className="flex items-end gap-2">
          <button className={`${btnCls} bg-blue-600 text-white`} onClick={save}>{form.id ? 'Aggiorna' : 'Aggiungi'}</button>
          {form.id && <button className={`${btnCls} text-slate-500`} onClick={() => { setForm(defaults); setMsg('') }}>Annulla</button>}
        </div>
        {msg && <div className="col-span-full text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{msg}</div>}
      </div>
      <input className={`${inputCls} mb-3`} type="search" placeholder="Cerca…" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="overflow-x-auto rounded-lg shadow">
      <table className="w-full bg-white text-sm">
        <thead>
          <tr className="text-left text-slate-500 border-b">
            {fields.map((f) => <th key={f.key} className="p-2">{f.label}</th>)}
            <th />
          </tr>
        </thead>
        <tbody>
          {shown.map((r) => (
            <tr key={r.id} className="border-b last:border-0">
              {fields.map((f) => <td key={f.key} className="p-2">{f.type === 'checkbox' ? (r[f.key] ? '✓' : '') : String(r[f.key] ?? '')}</td>)}
              <td className="p-2 text-right whitespace-nowrap">
                <button className="text-blue-600 px-3 py-2" onClick={() => edit(r)}>Modifica</button>
                <button className="text-red-600 px-3 py-2" onClick={() => remove(r)}>Elimina</button>
              </td>
            </tr>
          ))}
          {shown.length === 0 && <tr><td className="p-3 text-slate-400" colSpan={fields.length + 1}>{rows === undefined ? 'Caricamento…' : q ? 'Nessun risultato per questa ricerca' : 'Nessun elemento: usa il modulo sopra per aggiungerne uno'}</td></tr>}
        </tbody>
      </table>
      </div>
    </div>
  )
}
