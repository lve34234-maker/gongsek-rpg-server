const router = require('express').Router()
const { pool } = require('./db')
const jwt = require('jsonwebtoken')

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ ok: false, msg: '토큰 없음' })
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ ok: false, msg: '토큰 만료' })
  }
}

function adminOnly(req, res, next) {
  if (!req.user?.isAdmin) return res.status(403).json({ ok: false, msg: '관리자 권한 필요' })
  next()
}

router.use(authMiddleware)
router.use(adminOnly)

router.get('/users', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT username, gold, chars, is_admin, created_at FROM users ORDER BY created_at DESC')
    res.json({ ok: true, users: rows })
  } catch (e) { res.json({ ok: false, msg: e.message }) }
})

router.post('/gold', async (req, res) => {
  const { username, amount } = req.body
  try {
    await pool.query('UPDATE users SET gold=gold+$1 WHERE username=$2', [amount, username])
    res.json({ ok: true })
  } catch (e) { res.json({ ok: false, msg: e.message }) }
})

router.post('/heal', async (req, res) => {
  const { username } = req.body
  try {
    const { rows } = await pool.query('SELECT chars FROM users WHERE username=$1', [username])
    if (!rows[0]) return res.json({ ok: false, msg: '유저 없음' })
    const chars = (rows[0].chars || []).map(c => ({ ...c, hp: -1 }))
    await pool.query('UPDATE users SET chars=$1 WHERE username=$2', [JSON.stringify(chars), username])
    res.json({ ok: true })
  } catch (e) { res.json({ ok: false, msg: e.message }) }
})

router.post('/reset', async (req, res) => {
  const { username } = req.body
  try {
    await pool.query("UPDATE users SET chars='[]', gold=100 WHERE username=$1", [username])
    res.json({ ok: true })
  } catch (e) { res.json({ ok: false, msg: e.message }) }
})

router.delete('/user/:username', async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE username=$1', [req.params.username])
    res.json({ ok: true })
  } catch (e) { res.json({ ok: false, msg: e.message }) }
})

router.post('/toggle-admin', async (req, res) => {
  const { username } = req.body
  try {
    const { rows } = await pool.query('SELECT is_admin FROM users WHERE username=$1', [username])
    if (!rows[0]) return res.json({ ok: false, msg: '유저 없음' })
    const newVal = !rows[0].is_admin
    await pool.query('UPDATE users SET is_admin=$1 WHERE username=$2', [newVal, username])
    res.json({ ok: true, isAdmin: newVal })
  } catch (e) { res.json({ ok: false, msg: e.message }) }
})

router.post('/inv-give', async (req, res) => {
  const { username, charIdx, item } = req.body
  try {
    const { rows } = await pool.query('SELECT chars FROM users WHERE username=$1', [username])
    if (!rows[0]) return res.json({ ok: false })
    const chars = rows[0].chars || []
    if (!chars[charIdx]) return res.json({ ok: false, msg: '캐릭터 없음' })
    if (!chars[charIdx].inventory) chars[charIdx].inventory = []
    chars[charIdx].inventory.push({ ...item, uid: 'adm' + Date.now() })
    await pool.query('UPDATE users SET chars=$1 WHERE username=$2', [JSON.stringify(chars), username])
    res.json({ ok: true })
  } catch (e) { res.json({ ok: false, msg: e.message }) }
})

router.post('/inv-give-all', async (req, res) => {
  const { item } = req.body
  try {
    const { rows } = await pool.query('SELECT username, chars FROM users')
    for (const u of rows) {
      const chars = u.chars || []
      for (const c of chars) {
        if (!c.inventory) c.inventory = []
        c.inventory.push({ ...item, uid: 'adm' + Date.now() + Math.random() })
      }
      await pool.query('UPDATE users SET chars=$1 WHERE username=$2', [JSON.stringify(chars), u.username])
    }
    res.json({ ok: true })
  } catch (e) { res.json({ ok: false, msg: e.message }) }
})

router.get('/items', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM custom_items ORDER BY created_at DESC')
    res.json({ ok: true, items: rows })
  } catch (e) { res.json({ ok: false, msg: e.message }) }
})

router.post('/items', async (req, res) => {
  const { name, rarity, item_type, atk, def, val, pixels, grid } = req.body
  try {
    const { rows } = await pool.query(
      'INSERT INTO custom_items (name,rarity,item_type,atk,def,val,pixels,grid,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [name, rarity, item_type, atk||0, def||0, val||100, JSON.stringify(pixels), grid||16, req.user.username]
    )
    res.json({ ok: true, item: rows[0] })
  } catch (e) { res.json({ ok: false, msg: e.message }) }
})

router.delete('/items/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM custom_items WHERE id=$1', [req.params.id])
    res.json({ ok: true })
  } catch (e) { res.json({ ok: false, msg: e.message }) }
})

module.exports = router
