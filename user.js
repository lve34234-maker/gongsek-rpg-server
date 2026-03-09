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

router.use(authMiddleware)

router.get('/me', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT username, gold, chars, is_admin FROM users WHERE username=$1',
      [req.user.username]
    )
    if (!rows[0]) return res.json({ ok: false, msg: '유저 없음' })
    const u = rows[0]
    res.json({ ok: true, data: { username: u.username, gold: u.gold, chars: u.chars || [], isAdmin: u.is_admin } })
  } catch (e) {
    res.json({ ok: false, msg: '서버 오류' })
  }
})

router.post('/save', async (req, res) => {
  const { gold, chars } = req.body
  if (gold == null || !Array.isArray(chars)) return res.json({ ok: false, msg: '잘못된 데이터' })
  try {
    await pool.query(
      'UPDATE users SET gold=$1, chars=$2, updated_at=NOW() WHERE username=$3',
      [gold, JSON.stringify(chars), req.user.username]
    )
    res.json({ ok: true })
  } catch (e) {
    res.json({ ok: false, msg: '저장 실패' })
  }
})

module.exports = router
