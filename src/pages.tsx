import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import CrudPage from './CrudPage'
import { db, CATEGORIE_SPESE } from './db'
import { exportBackup, importBackup, validateBackup } from './sync'

const today = () => new Date().toISOString().slice(0, 10)

export function Spese() {
  const rows = useLiveQuery(() => db.expenses.toArray()) ?? []
  const perCat = rows.reduce<Record<string, number>>((a, r) => ({ ...a, [r.categoria]: (a[r.categoria] ?? 0) + r.importo }), {})
  return (
    <div>
      <CrudPage
        title="Spese e bollette"
        table={db.expenses}
        defaults={{ descrizione: '', categoria: CATEGORIE_SPESE[0], importo: 0, data: today(), scadenza: '', pagata: false }}
        fields={[
          { key: 'descrizione', label: 'Descrizione', type: 'text', required: true },
          { key: 'categoria', label: 'Categoria', type: 'select', options: CATEGORIE_SPESE },
          { key: 'importo', label: 'Importo €', type: 'number' },
          { key: 'data', label: 'Data', type: 'date' },
          { key: 'scadenza', label: 'Scadenza', type: 'date' },
          { key: 'pagata', label: 'Pagata', type: 'checkbox' },
        ]}
      />
      <h2 className="text-lg font-semibold mt-6 mb-2">Totali per categoria</h2>
      <div className="flex flex-wrap gap-2">
        {Object.entries(perCat).map(([c, t]) => (
          <span key={c} className="bg-white shadow rounded px-3 py-1 text-sm">{c}: € {t.toFixed(2)}</span>
        ))}
      </div>
    </div>
  )
}

export const Scadenze = () => (
  <CrudPage
    title="Scadenze e manutenzioni"
    table={db.deadlines}
    defaults={{ titolo: '', tipo: 'Scadenza', data: today(), note: '', fatto: false }}
    fields={[
      { key: 'titolo', label: 'Titolo', type: 'text', required: true },
      { key: 'tipo', label: 'Tipo', type: 'select', options: ['Scadenza', 'Manutenzione'] },
      { key: 'data', label: 'Data', type: 'date', required: true },
      { key: 'note', label: 'Note', type: 'text' },
      { key: 'fatto', label: 'Fatto', type: 'checkbox' },
    ]}
  />
)

export const Inventario = () => (
  <CrudPage
    title="Inventario"
    table={db.items}
    defaults={{ nome: '', stanza: '', quantita: 1, valore: 0, note: '' }}
    fields={[
      { key: 'nome', label: 'Nome', type: 'text', required: true },
      { key: 'stanza', label: 'Stanza', type: 'text' },
      { key: 'quantita', label: 'Quantità', type: 'number' },
      { key: 'valore', label: 'Valore €', type: 'number' },
      { key: 'note', label: 'Note', type: 'text' },
    ]}
  />
)

export const ListaSpesa = () => (
  <CrudPage
    title="Lista della spesa"
    table={db.shopping}
    defaults={{ nome: '', quantita: '1', preso: false }}
    fields={[
      { key: 'nome', label: 'Articolo', type: 'text', required: true },
      { key: 'quantita', label: 'Quantità', type: 'text' },
      { key: 'preso', label: 'Preso', type: 'checkbox' },
    ]}
  />
)

export const Documenti = () => (
  <CrudPage
    title="Documenti della casa"
    table={db.docs}
    defaults={{ titolo: '', tipo: 'Contratto', link: '', scadenza: '', note: '' }}
    fields={[
      { key: 'titolo', label: 'Titolo', type: 'text', required: true },
      { key: 'tipo', label: 'Tipo', type: 'select', options: ['Contratto', 'Garanzia', 'Assicurazione', 'Fattura', 'Altro'] },
      { key: 'link', label: 'Link / percorso', type: 'text' },
      { key: 'scadenza', label: 'Scadenza', type: 'date' },
      { key: 'note', label: 'Note', type: 'text' },
    ]}
  />
)

export function Dashboard() {
  const expenses = useLiveQuery(() => db.expenses.toArray()) ?? []
  const deadlines = useLiveQuery(() => db.deadlines.toArray()) ?? []
  const limit = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  const upcoming = [
    ...deadlines.filter((d) => !d.fatto).map((d) => ({ label: d.titolo, data: d.data, tipo: d.tipo })),
    ...expenses.filter((e) => !e.pagata && e.scadenza).map((e) => ({ label: `${e.descrizione} (€ ${e.importo})`, data: e.scadenza!, tipo: 'Bolletta' })),
  ].filter((u) => u.data <= limit).sort((a, b) => a.data.localeCompare(b.data))
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Dashboard</h1>
      <h2 className="font-semibold mb-2">Scadenze nei prossimi 30 giorni</h2>
      <ul className="bg-white rounded-lg shadow divide-y">
        {upcoming.map((u, i) => (
          <li key={i} className="p-3 flex justify-between text-sm">
            <span>{u.label} <span className="text-slate-400">· {u.tipo}</span></span>
            <span className={u.data < today() ? 'text-red-600 font-medium' : ''}>{u.data}</span>
          </li>
        ))}
        {upcoming.length === 0 && <li className="p-3 text-slate-400 text-sm">Nessuna scadenza imminente</li>}
      </ul>
    </div>
  )
}

export function Backup() {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const onFile = async (file?: File) => {
    if (!file) return
    try {
      const data = validateBackup(await file.text())
      const n = Object.values(data).reduce((a, r) => a + r.length, 0)
      if (!window.confirm(`Il file contiene ${n} elementi. Sostituire TUTTI i dati attuali? (prima verrà scaricata una copia di sicurezza)`)) return
      await importBackup(data)
      setMsg({ ok: true, text: 'Importazione completata.' })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Importazione non riuscita.' })
    }
  }
  const btn = 'rounded px-4 py-2 text-sm min-h-[44px] sm:min-h-0 bg-blue-600 text-white inline-block cursor-pointer'
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Backup dati</h1>
      <p className="text-sm text-slate-500 mb-3">Scarica una copia di tutti i dati, oppure ripristinala da un file esportato in precedenza.</p>
      <div className="flex flex-wrap gap-3">
        <button className={btn} onClick={() => exportBackup().catch(() => setMsg({ ok: false, text: 'Esportazione non riuscita.' }))}>Esporta JSON</button>
        <label className={btn}>Importa JSON<input type="file" accept="application/json,.json" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = '' }} /></label>
      </div>
      {msg && <div className={`mt-4 rounded p-3 text-sm border ${msg.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>{msg.text}</div>}
    </div>
  )
}

export function Assistente() {
  const [q, setQ] = useState('')
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const ask = async () => {
    if (!q.trim() || loading) return
    setLoading(true); setError(''); setAnswer('')
    try {
      const context = {
        oggi: today(),
        spese: await db.expenses.toArray(),
        scadenze: await db.deadlines.toArray(),
        inventario: await db.items.toArray(),
        listaSpesa: await db.shopping.toArray(),
        documenti: await db.docs.toArray(),
      }
      const r: { ok: boolean; text?: string; error?: string } = await (
        await fetch('/api/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: q, context }) })
      ).json()
      if (r.ok) setAnswer(r.text ?? ''); else setError(r.error ?? 'Errore sconosciuto')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore sconosciuto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Assistente Gemini</h1>
      <p className="text-sm text-slate-500 mb-2">Le tue domande vengono inviate a Gemini insieme ai dati dell'app, solo quando premi "Chiedi".</p>
      <textarea className="border border-slate-300 rounded w-full p-2 text-base sm:text-sm" rows={3} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Es. Quali bollette devo pagare questo mese?" />
      <button className="bg-blue-600 text-white rounded px-4 py-2 min-h-[44px] sm:min-h-0 text-sm mt-2 disabled:opacity-50" disabled={loading} onClick={ask}>{loading ? 'Attendi…' : 'Chiedi'}</button>
      {error && <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">{error}</div>}
      {answer && <div className="mt-4 bg-white shadow rounded p-4 text-sm whitespace-pre-wrap">{answer}</div>}
    </div>
  )
}
