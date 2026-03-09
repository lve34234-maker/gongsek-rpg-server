require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { initDB } = require('./db')

const app = express()

// ── 미들웨어 ──
app.use(cors({
  origin: '*', // 배포 후 도메인으로 제한 권장: ['https://your-game.netlify.app']
  methods: ['GET', 'POST', 'DELETE', 'PUT'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))
app.use(express.json({ limit: '5mb' })) // 픽셀 아트 데이터 때문에 5mb

// ── 헬스체크 ──
app.get('/', (req, res) => {
  res.json({ status: 'ok', game: '공책RPG 서버', time: new Date().toISOString() })
})

// ── 라우터 ──
app.use('/api/auth', require('./routes/auth'))
app.use('/api/user', require('./routes/user'))
app.use('/api/admin', require('./routes/admin'))

// ── 에러 핸들러 ──
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ ok: false, msg: '서버 내부 오류' })
})

// ── 시작 ──
const PORT = process.env.PORT || 3000
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 공책RPG 서버 실행중 → http://localhost:${PORT}`)
  })
}).catch(err => {
  console.error('DB 연결 실패:', err)
  process.exit(1)
})
