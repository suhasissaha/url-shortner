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

router.post('/shorten', async (req, res) => {
  const { url } = req.body
  if (!url) return res.status(400).json({ error: 'url is required' })
  try { new URL(url) } catch {
    return res.status(400).json({ error: 'invalid url' })
  }
  try {
    const code = makeCode()
    await store.save(code, {
      url, clicks: 0, createdAt: new Date().toISOString()
    })
    res.status(201).json({ code, shortUrl: `http://localhost:3000/${code}`, originalUrl: url })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'could not save url' })
  }
})

router.get('/:code/stats', async (req, res) => {
  try {
    const entry = await store.get(req.params.code)
    if (!entry) return res.status(404).json({ error: 'not found' })
    res.json({ code: req.params.code, originalUrl: entry.url,
                clicks: entry.clicks, createdAt: entry.createdAt })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'could not fetch stats' })
  }
})

router.get('/:code', async (req, res) => {
  try {
    const entry = await store.get(req.params.code)
    if (!entry) return res.status(404).json({ error: 'not found' })
    await store.increment(req.params.code)
    res.redirect(302, entry.url)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'could not redirect' })
  }
})

module.exports = router
