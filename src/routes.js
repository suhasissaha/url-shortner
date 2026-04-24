const crypto = require('crypto')
const store  = require('./store')

function makeCode() {
  // 6 random bytes → 8 base64url chars, e.g. "aB3xKp2q"
  return crypto
    .randomBytes(6)
    .toString('base64url')
}

const express = require('express')
const router  = express.Router()

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

router.post('/shorten', (req, res) => {
  const { url } = req.body

  if (!url) {
    return res.status(400).json({ error: 'url is required' })
  }

  try {
    new URL(url)   // throws if url is malformed
  } catch {
    return res.status(400).json({ error: 'invalid url' })
  }

  const code = makeCode()
  store.save(code, { url, clicks: 0, createdAt: new Date().toISOString() })

  res.status(201).json({
    code,
    shortUrl: `http://localhost:3000/${code}`,
    originalUrl: url
  })
})

router.get('/:code/stats', (req, res) => {
  const entry = store.get(req.params.code)

  if (!entry) {
    return res.status(404).json({ error: 'not found' })
  }

  res.json({
    code: req.params.code,
    originalUrl: entry.url,
    clicks: entry.clicks,
    createdAt: entry.createdAt
  })
})

router.get('/:code', (req, res) => {
  const entry = store.get(req.params.code)

  if (!entry) {
    return res.status(404).json({ error: 'not found' })
  }

  store.increment(req.params.code)
  res.redirect(302, entry.url)
})

module.exports = router
