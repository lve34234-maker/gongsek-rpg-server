const router = require('express').Router()
const { pool } = require('../db')
const { authMiddleware, adminOnly } = require('../middleware/auth')

router.use(authMiddleware)
router.use(adminOnly)

// ── 전체 유저 목록 ──
router.get('/users', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT username, gold, chars, is_admin, created_at, updated_at FROM users ORDER BY created_at DESC'
    )
    res.json({ ok: true, users: rows })
  } catch (e) {
    console.error(e); res.json({ ok: false, msg: '서버 오류' })
  }
})

// ── 골드 지급 ──
router.post('/gold', async (req, res) => {
  const { username, amount } = req.body
  try {
    await pool.query('UPDATE users SET gold=gold+$1 WHERE username=$2', [amount, username])
    res.json({ ok: true })
  } catch (e) { res.json({ ok: false, msg: e.message }) }
})

// ── HP 전체 회복 ──
router.post('/heal', async (req, res) => {
  const { username } = req.body
  try {
    const { rows } = await pool.query('SELECT chars FROM users WHERE username=$1', [username])
    if (!rows[0]) return res.json({ ok: false, msg: '유저 없음' })
    // chars는 게임 클라이언트가 maxHp 계산하므로 hp=-1 로 표시 → 클라이언트에서 maxHp로 처리
    const chars = (rows[0].chars || []).map(c => ({ ...c, hp: -1 }))
    await pool.query('UPDATE users SET chars=$1 WHERE username=$2', [JSON.stringify(chars), username])
    res.json({ ok: true })
  } catch (e) { res.json({ ok: false, msg: e.message }) }
})

// ── 캐릭터 초기화 ──
router.post('/reset', async (req, res) => {
  const { username } = req.body
  try {
    await pool.query("UPDATE users SET chars='[]', gold=100 WHERE username=$1", [username])
    res.json({ ok: true })
  } catch (e) { res.json({ ok: false, msg: e.message }) }
})

// ── 유저 삭제 ──
router.delete('/user/:username', async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE username=$1', [req.params.username])
    res.json({ ok: true })
  } catch (e) { res.json({ ok: false, msg: e.message }) }
})

// ── 관리자 권한 토글 ──
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

// ── 인벤토리 아이템 삭제 ──
router.post('/inv-del', async (req, res) => {
  const { username, charIdx, uid } = req.body
  try {
    const { rows } = await pool.query('SELECT chars FROM users WHERE username=$1', [username])
    if (!rows[0]) return res.json({ ok: false })
    const chars = rows[0].chars || []
    if (!chars[charIdx]) return res.json({ ok: false, msg: '캐릭터 없음' })
    chars[charIdx].inventory = (chars[charIdx].inventory || []).filter(i => i.uid !== uid)
    if (chars[charIdx].equip?.weapon === uid) chars[charIdx].equip.weapon = null
    if (chars[charIdx].equip?.armor === uid) chars[charIdx].equip.armor = null
    await pool.query('UPDATE users SET chars=$1 WHERE username=$2', [JSON.stringify(chars), username])
    res.json({ ok: true })
  } catch (e) { res.json({ ok: false, msg: e.message }) }
})

// ── 아이템 지급 (특정 유저) ──
router.post('/inv-give', async (req, res) => {
  const { username, charIdx, item } = req.body
  try {
    const { rows } = await pool.query('SELECT chars FROM users WHERE username=$1', [username])
    if (!rows[0]) return res.json({ ok: false })
    const chars = rows[0].chars || []
    if (!chars[charIdx]) return res.json({ ok: false, msg: '캐릭터 없음' })
    if (!chars[charIdx].inventory) chars[charIdx].inventory = []
    chars[charIdx].inventory.push({ ...item, uid: 'adm' + Date.now() + '_' + Math.random().toString(36).slice(2) })
    await pool.query('UPDATE users SET chars=$1 WHERE username=$2', [JSON.stringify(chars), username])
    res.json({ ok: true })
  } catch (e) { res.json({ ok: false, msg: e.message }) }
})

// ── 아이템 전체 지급 ──
router.post('/inv-give-all', async (req, res) => {
  const { item } = req.body
  try {
    const { rows } = await pool.query('SELECT username, chars FROM users')
    let count = 0
    for (const u of rows) {
      const chars = u.chars || []
      let changed = false
      for (const c of chars) {
        if (!c.inventory) c.inventory = []
        c.inventory.push({ ...item, uid: 'adm' + Date.now() + count + '_' + Math.random().toString(36).slice(2) })
        count++; changed = true
      }
      if (changed) await pool.query('UPDATE users SET chars=$1 WHERE username=$2', [JSON.stringify(chars), u.username])
    }
    res.json({ ok: true, count })
  } catch (e) { res.json({ ok: false, msg: e.message }) }
})

// ── 커스텀 아이템 목록 ──
router.get('/items', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM custom_items ORDER BY created_at DESC')
    res.json({ ok: true, items: rows })
  } catch (e) { res.json({ ok: false, msg: e.message }) }
})

// ── 커스텀 아이템 등록 ──
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

// ── 커스텀 아이템 삭제 ──
router.delete('/items/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM custom_items WHERE id=$1', [req.params.id])
    res.json({ ok: true })
  } catch (e) { res.json({ ok: false, msg: e.message }) }
})

module.exports = router
