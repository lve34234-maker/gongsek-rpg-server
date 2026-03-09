const router = require('express').Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { pool } = require('./db')

const ADMIN_USER = 'admin'
const ADMIN_PASS = 'dlgustjr!@34'

router.post('/register', async (req, res) => {
  const { username, pw } = req.body
  if (!username || !pw) return res.json({ ok: false, msg: '아이디/비밀번호 필요' })
  if (username === ADMIN_USER) return res.json({ ok: false, msg: '사용할 수 없는 아이디' })
  if (username.length < 2 || username.length > 20)
    return res.json({ ok: false, msg: '아이디는 2~20자' })
  try {
    const hashed = await bcrypt.hash(pw, 10)
    await pool.query('INSERT INTO users (username, pw) VALUES ($1, $2)', [username.toLowerCase(), hashed])
    const token = jwt.sign({ username: username.toLowerCase(), isAdmin: false }, process.env.JWT_SECRET, { expiresIn: '30d' })
    res.json({ ok: true, token, data: { username: username.toLowerCase(), gold: 100, chars: [], isAdmin: false } })
  } catch (e) {
    if (e.code === '23505') return res.json({ ok: false, msg: '이미 존재하는 아이디' })
    res.json({ ok: false, msg: '서버 오류' })
  }
})

router.post('/login', async (req, res) => {
  const { username, pw } = req.body
  if (!username || !pw) return res.json({ ok: false, msg: '아이디/비밀번호 필요' })
  if (username === ADMIN_USER && pw === ADMIN_PASS) {
    const token = jwt.sign({ username: ADMIN_USER, isAdmin: true }, process.env.JWT_SECRET, { expiresIn: '7d' })
    return res.json({ ok: true, token, data: { username: ADMIN_USER, isAdmin: true } })
  }
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE username=$1', [username.toLowerCase()])
    const user = rows[0]
    if (!user) return res.json({ ok: false, msg: '존재하지 않는 아이디' })
    const match = await bcrypt.compare(pw, user.pw)
    if (!match) return res.json({ ok: false, msg: '비밀번호가 틀렸습니다' })
    const isAdmin = user.is_admin || false
    const token = jwt.sign({ username: user.username, isAdmin }, process.env.JWT_SECRET, { expiresIn: '30d' })
    res.json({ ok: true, token, data: { username: user.username, gold: user.gold, chars: user.chars || [], isAdmin } })
  } catch (e) {
    res.json({ ok: false, msg: '서버 오류' })
  }
})

module.exports = router
