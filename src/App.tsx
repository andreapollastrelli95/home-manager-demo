import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import { Assistente, Backup, Dashboard, Documenti, Inventario, ListaSpesa, Scadenze, Spese } from './pages'

const links: [string, string][] = [
  ['/', 'Dashboard'], ['/spese', 'Spese e bollette'], ['/scadenze', 'Scadenze'], ['/inventario', 'Inventario'],
  ['/lista', 'Lista della spesa'], ['/documenti', 'Documenti'], ['/assistente', 'Assistente'], ['/backup', 'Backup'],
]

export default function App() {
  return (
    <HashRouter>
      <div className="flex flex-col md:flex-row h-screen bg-slate-100 text-slate-800">
        <nav className="md:w-52 bg-slate-800 text-slate-200 p-2 md:p-3 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible shrink-0 items-center md:items-stretch">
          <div className="font-bold text-white md:mb-3 px-2 whitespace-nowrap">🏠 Home Manager</div>
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} end className={({ isActive }) => `px-3 py-2.5 md:py-1.5 rounded text-sm whitespace-nowrap ${isActive ? 'bg-slate-600 text-white' : 'hover:bg-slate-700'}`}>
              {label}
            </NavLink>
          ))}
        </nav>
        <main className="flex-1 min-w-0 overflow-auto p-3 md:p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/spese" element={<Spese />} />
            <Route path="/scadenze" element={<Scadenze />} />
            <Route path="/inventario" element={<Inventario />} />
            <Route path="/lista" element={<ListaSpesa />} />
            <Route path="/documenti" element={<Documenti />} />
            <Route path="/assistente" element={<Assistente />} />
            <Route path="/backup" element={<Backup />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}
