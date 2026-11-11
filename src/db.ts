import Dexie, { type Table } from 'dexie'

export interface Expense { id?: number; descrizione: string; categoria: string; importo: number; data: string; scadenza?: string; pagata: boolean }
export interface Deadline { id?: number; titolo: string; tipo: string; data: string; note: string; fatto: boolean }
export interface Item { id?: number; nome: string; stanza: string; quantita: number; valore: number; note: string }
export interface Shopping { id?: number; nome: string; quantita: string; preso: boolean }
export interface Doc { id?: number; titolo: string; tipo: string; link: string; scadenza?: string; note: string }

class HomeDB extends Dexie {
  expenses!: Table<Expense, number>
  deadlines!: Table<Deadline, number>
  items!: Table<Item, number>
  shopping!: Table<Shopping, number>
  docs!: Table<Doc, number>
  constructor() {
    super('home-manager')
    this.version(1).stores({
      expenses: '++id, categoria, data, scadenza',
      deadlines: '++id, data, tipo',
      items: '++id, stanza',
      shopping: '++id, preso',
      docs: '++id, tipo',
    })
  }
}

export const db = new HomeDB()

export const CATEGORIE_SPESE = ['Luce', 'Gas', 'Acqua', 'Internet', 'Condominio', 'Tasse', 'Manutenzione', 'Altro']

const day = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10)

export async function seedDemo() {
  if ((await db.expenses.count()) + (await db.deadlines.count()) > 0) return
  await db.expenses.bulkAdd([
    { descrizione: 'Bolletta luce', categoria: 'Luce', importo: 82.5, data: day(-10), scadenza: day(5), pagata: false },
    { descrizione: 'Bolletta gas', categoria: 'Gas', importo: 64.2, data: day(-20), scadenza: day(12), pagata: false },
    { descrizione: 'Internet fibra', categoria: 'Internet', importo: 29.9, data: day(-5), pagata: true },
  ])
  await db.deadlines.bulkAdd([
    { titolo: 'Revisione caldaia', tipo: 'Manutenzione', data: day(20), note: 'Chiamare il tecnico', fatto: false },
    { titolo: 'Pagamento IMU', tipo: 'Scadenza', data: day(8), note: '', fatto: false },
  ])
  await db.items.bulkAdd([
    { nome: 'Lavatrice', stanza: 'Bagno', quantita: 1, valore: 450, note: 'Garanzia fino al 2027' },
    { nome: 'Trapano', stanza: 'Garage', quantita: 1, valore: 80, note: '' },
  ])
  await db.shopping.bulkAdd([
    { nome: 'Latte', quantita: '2', preso: false },
    { nome: 'Detersivo piatti', quantita: '1', preso: false },
  ])
  await db.docs.bulkAdd([
    { titolo: 'Contratto di affitto', tipo: 'Contratto', link: 'C:\\Documenti\\affitto.pdf', scadenza: day(200), note: '' },
  ])
}
