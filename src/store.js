const db = new Map()

function save(code, data) {
  db.set(code, data)
}

function get(code) {
  return db.get(code) || null
}

function increment(code) {
  const entry = db.get(code)
  if (entry) {
    entry.clicks++
    db.set(code, entry)
  }
}

module.exports = { save, get, increment}
