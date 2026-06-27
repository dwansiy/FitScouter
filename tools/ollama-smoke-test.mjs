import { readFile } from 'node:fs/promises'
import { performance } from 'node:perf_hooks'

const endpoint = process.env.OLLAMA_ENDPOINT ?? 'http://127.0.0.1:11434'
const model = process.env.OLLAMA_MODEL ?? 'gemma3:4b'
const imagePath = new URL('../web/public/assets/sample-ootd.jpg', import.meta.url)

async function main() {
  const image = await readFile(imagePath)
  const startedAt = performance.now()
  const response = await fetch(`${endpoint}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      format: 'json',
      images: [image.toString('base64')],
      prompt: [
        '너는 한국어 패션 OOTD 분석 앱의 스타일 코치다.',
        '사진 속 사람의 신체나 외모 자체를 평가하지 말고, 옷의 조합, 색, 실루엣, TPO, 디테일만 평가해라.',
        '응답 속도가 중요하므로 짧게 답해라. JSON만 반환해라.',
        '{"scoreDelta":0,"oneLine":"한줄평","styleType":"짧은 스타일 유형","summary":"전체 코디 요약","improvements":["개선1","개선2"]}',
      ].join('\n'),
      options: { temperature: 0.2 },
    }),
  })
  const elapsedMs = Math.round(performance.now() - startedAt)
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Ollama ${response.status}: ${text}`)
  }
  const payload = await response.json()
  console.log(JSON.stringify({ endpoint, model, elapsedMs, response: payload.response }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
