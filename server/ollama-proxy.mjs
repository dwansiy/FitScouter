import http from 'node:http'

const host = process.env.HOST ?? '127.0.0.1'
const port = Number(process.env.PORT ?? 8787)
const ollamaUrl = (process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434').replace(/\/$/, '')
const model = process.env.OLLAMA_MODEL ?? 'gemma3:4b'
const maxBodyBytes = Number(process.env.MAX_BODY_BYTES ?? 8_000_000)
const requestTimeoutMs = Number(process.env.REQUEST_TIMEOUT_MS ?? 120_000)
const rateLimitWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 10 * 60 * 1000)
const rateLimitMax = Number(process.env.RATE_LIMIT_MAX ?? 8)
const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS ?? 'https://dwansiy.github.io,http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
)
const requestBuckets = new Map()

function buildPrompt(scenario) {
  return [
    '너는 한국어 패션 OOTD 분석 앱의 스타일 코치다.',
    '사진 속 사람의 신체나 외모 자체를 평가하지 말고, 옷의 조합, 색, 실루엣, TPO, 디테일만 평가해라.',
    '결과는 재미있는 공유용이므로 살짝 위트 있게 말하되 모욕, 혐오, 체형 비하는 금지한다.',
    `사용자가 입력한 상황은 "${scenario}"이다.`,
    '응답 속도가 중요하므로 짧게 답해라. 상세 점수표는 앱이 계산하니 만들지 마라.',
    '반드시 아래 JSON 객체만 반환해라. 마크다운 설명을 붙이지 마라.',
    '{',
    '  "scoreDelta": -200에서 250 사이 정수,',
    '  "oneLine": "살짝 긁지만 안전한 한줄평",',
    '  "styleType": "MBTI 같은 짧은 스타일 유형",',
    '  "summary": "전체 코디 요약",',
    '  "improvements": ["신발/상의/가방/액세서리 개선 제안 2~3개"]',
    '}',
  ].join('\n')
}

function sendJson(res, statusCode, body, origin) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  }
  if (origin && allowedOrigins.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
    headers.Vary = 'Origin'
  }
  res.writeHead(statusCode, headers)
  res.end(JSON.stringify(body))
}

function sendCorsPreflight(req, res) {
  const origin = req.headers.origin
  if (!origin || !allowedOrigins.has(origin)) {
    sendJson(res, 403, { error: 'Origin is not allowed' }, origin)
    return
  }
  res.writeHead(204, {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  })
  res.end()
}

function getClientKey(req) {
  return String(req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown')
    .split(',')[0]
    .trim()
}

function checkRateLimit(req) {
  const key = getClientKey(req)
  const now = Date.now()
  const current = requestBuckets.get(key)
  if (!current || current.resetAt <= now) {
    requestBuckets.set(key, { count: 1, resetAt: now + rateLimitWindowMs })
    return true
  }
  current.count += 1
  return current.count <= rateLimitMax
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > maxBodyBytes) {
        reject(new Error('Request body is too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        reject(new Error('Invalid JSON body'))
      }
    })
    req.on('error', reject)
  })
}

function normalizeBase64(value) {
  if (typeof value !== 'string') return ''
  const comma = value.indexOf(',')
  return comma === -1 ? value.trim() : value.slice(comma + 1).trim()
}

async function analyzeWithOllama({ imageBase64, scenario }) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs)
  try {
    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: buildPrompt(scenario),
        images: [imageBase64],
        stream: false,
        format: 'json',
        options: { temperature: 0.2 },
      }),
      signal: controller.signal,
    })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Ollama ${response.status}: ${text.slice(0, 200)}`)
    }
    const payload = await response.json()
    return String(payload.response ?? '')
  } finally {
    clearTimeout(timeout)
  }
}

async function handleAnalyze(req, res) {
  const origin = req.headers.origin
  if (origin && !allowedOrigins.has(origin)) {
    sendJson(res, 403, { error: 'Origin is not allowed' }, origin)
    return
  }
  if (!checkRateLimit(req)) {
    sendJson(res, 429, { error: 'Too many requests. Try again later.' }, origin)
    return
  }
  try {
    const body = await readJsonBody(req)
    const imageBase64 = normalizeBase64(body.imageBase64)
    const scenario = typeof body.scenario === 'string' ? body.scenario.slice(0, 80) : '일상'
    if (!imageBase64 || imageBase64.length > maxBodyBytes) {
      sendJson(res, 400, { error: 'Invalid image payload' }, origin)
      return
    }
    const response = await analyzeWithOllama({ imageBase64, scenario })
    sendJson(res, 200, { response }, origin)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Analysis failed'
    sendJson(res, message.includes('large') ? 413 : 502, { error: message }, origin)
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
  if (req.method === 'OPTIONS') {
    sendCorsPreflight(req, res)
    return
  }
  if (req.method === 'GET' && url.pathname === '/health') {
    sendJson(res, 200, { ok: true, model, ollamaUrl }, req.headers.origin)
    return
  }
  if (req.method === 'POST' && url.pathname === '/api/analyze') {
    await handleAnalyze(req, res)
    return
  }
  sendJson(res, 404, { error: 'Not found' }, req.headers.origin)
})

server.listen(port, host, () => {
  console.log(`FitScouter Ollama proxy listening on http://${host}:${port}`)
  console.log(`Allowed origins: ${[...allowedOrigins].join(', ')}`)
  console.log(`Ollama upstream: ${ollamaUrl} (${model})`)
})
