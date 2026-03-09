const router = require('express').Router()
const { pool } = require('../db')
const { authMiddleware } = require('../middleware/auth')

// 모든 라우트에 인증 적용
router.use(authMiddleware)

// ── 내 데이터 불러오기 ──
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
    console.error(e); res.json({ ok: false, msg: '서버 오류' })
  }
})

// ── 게임 데이터 저장 ──
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
    console.error(e); res.json({ ok: false, msg: '저장 실패' })
  }
})

module.exports = router
