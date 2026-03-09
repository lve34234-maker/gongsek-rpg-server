require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { initDB } = require('./db')

const app = express()

app.use(cors({ origin: '*', methods: ['GET','POST','DELETE','PUT'], allowedHeaders: ['Content-Type','Authorization'] }))
app.use(express.json({ limit: '5mb' }))

app.get('/', (req, res) => {
  res.json({ status: 'ok', game: '공책RPG 서버', time: new Date().toISOString() })
})

app.use('/api/auth', require('./auth'))
app.use('/api/user', require('./user'))
app.use('/api/admin', require('./admin'))

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ ok: false, msg: '서버 내부 오류' })
})

const PORT = process.env.PORT || 3000
initDB().then(() => {
  app.listen(PORT, () => console.log(`🚀 서버 실행 → http://localhost:${PORT}`))
}).catch(err => { console.error('DB 연결 실패:', err); process.exit(1) })
