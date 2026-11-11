// Server locale di Home Manager: serve la build web, /api/gemini e /api/data. Ascolta solo su 127.0.0.1.
const http = require('http')
const fs = require('fs')
const path = require('path')
const os = require('os')

const PORT = 3102
const DIST = path.join(__dirname, '..', 'dist')
const BASE = path.join(os.homedir(), '.app-personali')
const ENV_PATH = path.join(BASE, 'gemini.env')
const DATA_PATH = path.join(BASE, 'data', 'home-manager.json')
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' }

function readGeminiEnv() {
  let raw
  try { raw = fs.readFileSync(ENV_PATH, 'utf8') } catch { throw new Error('File di configurazione Gemini non trovato: ' + ENV_PATH) }
  const env = {}
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/)
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY mancante in ' + ENV_PATH)
  if (!env.GEMINI_MODEL) throw new Error('GEMINI_MODEL mancante in ' + ENV_PATH)
  return env
}

async function askGemini(question, context) {
  try {
    const { GEMINI_API_KEY, GEMINI_MODEL } = readGeminiEnv()
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`
    const prompt =
      "Sei l'assistente di Home Manager, un gestionale domestico. Rispondi in italiano, in modo breve e pratico, usando solo i dati dell'app qui sotto.\n\nDATI (JSON):\n" +
      JSON.stringify(context) + '\n\nDOMANDA: ' + question
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    })
    if (!res.ok) {
      let detail = ''
      try { detail = (await res.json())?.error?.message || '' } catch {}
      return { ok: false, error: `Errore Gemini (HTTP ${res.status}). ${detail}`.replaceAll(GEMINI_API_KEY, '***') }
    }
    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || ''
    return text ? { ok: true, text } : { ok: false, error: 'Gemini non ha restituito alcuna risposta.' }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Errore sconosciuto' }
  }
}

function readStore() {
  try { return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')) } catch { return { version: 0, data: null } }
}

function writeStore(store) {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true })
  const tmp = DATA_PATH + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(store))
  fs.renameSync(tmp, DATA_PATH)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (c) => {
      size += c.length
      if (size > 20e6) { reject(new Error('Richiesta troppo grande')); req.destroy() } else chunks.push(c)
    })
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')) } catch (e) { reject(e) } })
    req.on('error', reject)
  })
}

function send(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(obj))
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost')
    if (url.pathname === '/api/gemini' && req.method === 'POST') {
      const { question, context } = await readBody(req)
      return send(res, 200, await askGemini(String(question || ''), context))
    }
    if (url.pathname === '/api/data') {
      if (req.method === 'GET') return send(res, 200, readStore())
      if (req.method === 'PUT') {
        const { baseVersion, data } = await readBody(req)
        const cur = readStore()
        if (baseVersion !== cur.version) return send(res, 409, { version: cur.version })
        const next = { version: cur.version + 1, data }
        writeStore(next)
        return send(res, 200, { version: next.version })
      }
      return send(res, 405, { error: 'Metodo non consentito' })
    }
    if (req.method !== 'GET') return send(res, 405, { error: 'Metodo non consentito' })
    let rel = decodeURIComponent(url.pathname)
    if (rel === '/') rel = '/index.html'
    const file = path.normalize(path.join(DIST, rel))
    if (!file.startsWith(DIST)) return send(res, 403, { error: 'Vietato' })
    fs.readFile(file, (err, buf) => {
      if (err) return send(res, 404, { error: 'Non trovato' })
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' })
      res.end(buf)
    })
  } catch (err) {
    send(res, 500, { error: err instanceof Error ? err.message : 'Errore' })
  }
})

server.on('error', () => process.exit(1))
server.listen(PORT, '127.0.0.1')
