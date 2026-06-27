import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'

type Screen = 'upload' | 'loading' | 'result'
type Sheet = 'analysis' | 'improve' | null
type ScenarioId = 'date' | 'business' | 'workout' | 'street'
type Variant = 'base' | 'derby' | 'scarf' | 'bag'
type AnalysisSource = 'mock' | 'ollama'
type OllamaStatus = 'idle' | 'checking' | 'analyzing' | 'ready' | 'unavailable' | 'error'

type ScoreRow = { label: string; score: number; max: number; note: string }
type MemeScore = { label: string; value: number; comment: string }

type OllamaAnalysis = {
  scoreDelta: number
  oneLine: string
  styleType: string
  summary: string
  breakdown: ScoreRow[]
  memeScores: MemeScore[]
  improvements: string[]
}

const assetUrl = (fileName: string) => `${import.meta.env.BASE_URL}assets/${fileName}`
const samplePhoto = assetUrl('sample-ootd.jpg')
const ollamaEndpoint = 'http://127.0.0.1:11434'
const ollamaModel = 'gemma3:4b'

const scenarios: Array<{ id: ScenarioId; label: string; hint: string }> = [
  { id: 'date', label: '소개팅', hint: '첫인상 집중' },
  { id: 'business', label: '비즈니스 미팅', hint: '신뢰감 집중' },
  { id: 'workout', label: '운동', hint: '활동성 집중' },
  { id: 'street', label: '친구 만남', hint: '공유 재미 집중' },
]

const breakdown = [
  { label: '실루엣 장악력', score: 2240, max: 2500, note: '롱 코트와 여유로운 팬츠가 세로선을 만들어 전신 비율이 깔끔해 보여요.' },
  { label: '컬러 타격감', score: 1810, max: 2000, note: '차분한 코트 위에 레드 이너를 넣어 시선 포인트가 분명해요.' },
  { label: '아이템 합', score: 1740, max: 2000, note: '클래식 코트와 캐주얼 슈즈의 대비가 편안한 OOTD 감성을 만들어요.' },
  { label: '상황 적합도', score: 1320, max: 1500, note: '일상과 친구 만남에는 강하지만 격식 있는 자리는 신발을 바꾸면 더 좋아요.' },
  { label: '디테일 센스', score: 780, max: 1000, note: '안경과 작은 패턴 백이 룩의 밀도를 올려 줘요.' },
  { label: '공유 유발력', score: 640, max: 1000, note: '사진 카드로 만들었을 때 한 번 더 눌러 보고 싶은 요소가 있어요.' },
]

const funnyStats = [
  { label: '친구 단톡 생존율', value: '92%', note: '놀림은 받아도 사진은 저장될 확률' },
  { label: '거울 앞 체류시간', value: '14분', note: '오늘은 한 번 더 보는 쪽' },
  { label: '무신사 탐색 위험도', value: '높음', note: '신발 하나만 바꾸자는 말이 장바구니로 갈 수 있음' },
]

const peerAverage = 7420

const improvements = [
  {
    id: 'derby' as const,
    icon: '😇',
    title: '블랙 더비 슈즈',
    target: '신발',
    gain: 190,
    shop: 'https://www.musinsa.com/search/musinsa/integration?q=%EB%B8%94%EB%9E%99%20%EB%8D%94%EB%B9%84%20%EC%8A%88%EC%A6%88',
    reason: '코트의 클래식한 선이 살아나서 소개팅이나 미팅 상황에 더 안정적으로 보여요.',
    after: '스니커즈의 편안함 대신 더비의 정돈된 인상을 얻는 선택',
  },
  {
    id: 'scarf' as const,
    icon: '😇',
    title: '톤 다운 머플러',
    target: '목 주변',
    gain: 130,
    shop: 'https://www.29cm.co.kr/search?keyword=%EB%A8%B8%ED%94%8C%EB%9F%AC',
    reason: '코트와 얼굴 사이에 부드러운 완충 지대를 만들어 전체 인상이 덜 딱딱해져요.',
    after: '사진 카드에서 상체의 빈 공간을 채워 주는 포인트',
  },
  {
    id: 'bag' as const,
    icon: '😈',
    title: '너무 큰 로고백 줄이기',
    target: '가방',
    gain: 90,
    shop: 'https://www.musinsa.com/search/musinsa/integration?q=%EC%8A%A4%ED%8A%B8%EB%9F%AD%EC%B2%98%EB%93%9C%20%EB%B0%B1',
    reason: '강한 로고가 룩의 중심을 빼앗으면 점수가 흔들려요. 형태가 또렷한 가방이 더 좋아요.',
    after: '브랜드 과시보다 실루엣 완성도를 높이는 선택',
  },
]

const baseItems = [
  { name: 'HOUNDSTOOTH COAT', price: '약 289,000원', note: '넉넉한 길이감으로 전신 비율을 길게 잡아 주는 코트' },
  { name: 'RED INNER TOP', price: '약 69,000원', note: '무채색 룩에서 시선을 잡아 주는 선명한 컬러 포인트' },
  { name: 'RELAXED TROUSERS', price: '약 129,000원', note: '코트의 볼륨을 자연스럽게 이어 주는 여유로운 핏' },
]

const variantItem: Record<Variant, { name: string; price: string; note: string }> = {
  base: { name: 'RETRO SNEAKERS', price: '약 159,000원', note: '클래식 룩에 편안한 거리 감성을 더하는 스니커즈' },
  derby: { name: 'BLACK DERBY', price: '약 219,000원', note: '코트를 더 단정하게 마무리해 주는 블랙 더비 슈즈' },
  scarf: { name: 'SOFT MUFFLER', price: '약 89,000원', note: '상체의 빈 공간을 채우고 분위기를 부드럽게 만드는 머플러' },
  bag: { name: 'STRUCTURED BAG', price: '약 179,000원', note: '로고보다 형태로 완성도를 보여 주는 구조적인 가방' },
}

function getTier(score: number) {
  if (score >= 9500) return { name: '챌린저', tone: '거리 런웨이권' }
  if (score >= 9000) return { name: '다이아', tone: '공유해도 안 부끄러운 단계' }
  if (score >= 8200) return { name: '플래티넘', tone: '오늘 외출 합격권' }
  if (score >= 7200) return { name: '골드', tone: '아이템 하나만 바꾸면 상승권' }
  return { name: '실버', tone: '기본기는 있으나 공격력이 약함' }
}

function getRoast(score: number, scenario: string) {
  if (score >= 9500) return `${scenario} 기준, 오늘은 옷이 먼저 인사할 가능성이 높아요.`
  if (score >= 9000) return '꽤 잘 입었는데, 본인은 모르는 척할 것 같은 룩이에요.'
  if (score >= 8200) return '나쁘지 않아요. 다만 신발이 오늘 회의에 조금 늦게 온 느낌.'
  return '외출 금지는 아닌데, 거울 앞 추가 회의가 필요해 보여요.'
}

function getTopPercent(score: number) {
  return Math.max(3, Math.min(89, Math.round(100 - (score - 6200) / 33)))
}

function getStyleType(variant: Variant, score: number) {
  if (variant === 'derby') return 'TPO 눈치 챙긴 실전형'
  if (variant === 'scarf') return '디테일 집착형 고수'
  if (variant === 'bag') return '로고 절제형 균형러'
  if (score >= 9000) return '디테일로 이기는 고수'
  return '안전형 센스러'
}

function getMemeScores(variant: Variant, scenario: string) {
  const boost = variant === 'base' ? 0 : 6
  return [
    { label: '돈빨', value: 78, comment: '돈이 조금 더 열심히 했다' },
    { label: '센스', value: 66 + boost, comment: variant === 'base' ? '무난하지만 한 방이 부족함' : '아이템 교체로 설득력 상승' },
    { label: '눈치력', value: 62 + boost, comment: `${scenario} 기준 TPO를 조금 더 챙기면 상승` },
    { label: '첫인상 호감도', value: 74 + boost, comment: '깔끔하지만 임팩트는 한 끗 더 필요' },
  ]
}

function clamp(value: unknown, min: number, max: number, fallback: number) {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(max, Math.round(parsed)))
}

function asText(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function parseOllamaJson(raw: string) {
  const trimmed = raw.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  const jsonText = fenced?.[1] ?? trimmed
  const start = jsonText.indexOf('{')
  const end = jsonText.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) throw new Error('Ollama response did not include JSON')
  return JSON.parse(jsonText.slice(start, end + 1)) as Record<string, unknown>
}

function normalizeOllamaAnalysis(raw: string, scenario: string): OllamaAnalysis {
  const data = parseOllamaJson(raw)
  const rowSource = Array.isArray(data.breakdown) ? data.breakdown : []
  const memeSource = Array.isArray(data.memeScores) ? data.memeScores : []
  const normalizedBreakdown = breakdown.map((fallback, index) => {
    const row = rowSource[index] as Record<string, unknown> | undefined
    return {
      label: asText(row?.label, fallback.label),
      score: clamp(row?.score, 0, fallback.max, fallback.score),
      max: fallback.max,
      note: asText(row?.note, fallback.note),
    }
  })
  const fallbackMeme = getMemeScores('base', scenario)
  const normalizedMeme = fallbackMeme.map((fallback, index) => {
    const row = memeSource[index] as Record<string, unknown> | undefined
    return {
      label: asText(row?.label, fallback.label),
      value: clamp(row?.value, 0, 100, fallback.value),
      comment: asText(row?.comment, fallback.comment),
    }
  })
  const improvements = Array.isArray(data.improvements)
    ? data.improvements.map((item) => String(item)).filter(Boolean).slice(0, 4)
    : []
  return {
    scoreDelta: clamp(data.scoreDelta, -450, 450, 0),
    oneLine: asText(data.oneLine, getRoast(8610, scenario)),
    styleType: asText(data.styleType, '안전형 센스러'),
    summary: asText(data.summary, `${scenario} 기준으로 옷의 조합과 TPO를 분석했어요.`),
    breakdown: normalizedBreakdown,
    memeScores: normalizedMeme,
    improvements,
  }
}

function dataUrlToBase64(dataUrl: string) {
  const comma = dataUrl.indexOf(',')
  return comma === -1 ? dataUrl : dataUrl.slice(comma + 1)
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

async function imageUrlToBase64(url: string) {
  const response = await fetch(url)
  const blob = await response.blob()
  return dataUrlToBase64(await fileToDataUrl(new File([blob], 'sample.jpg', { type: blob.type || 'image/jpeg' })))
}

function buildOllamaPrompt(scenario: string) {
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

function CameraIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M8.2 5.2 9.4 3h5.2l1.2 2.2H19A2 2 0 0 1 21 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3.2ZM12 16.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /></svg>
}

function UploadIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M11 16V7.8L8.4 10.4 7 9l5-5 5 5-1.4 1.4L13 7.8V16h-2Zm-5 4a2 2 0 0 1-2-2v-3h2v3h12v-3h2v3a2 2 0 0 1-2 2H6Z" /></svg>
}

function ShareIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M18 16a3 3 0 0 0-2.4 1.2l-6.7-3.9a3 3 0 0 0 0-1.2l6.7-3.9A3 3 0 1 0 15 6.5v.3l-6.7 3.9a3 3 0 1 0 0 4.6l6.7 3.9v.3a3 3 0 1 0 3-3.5Z" /></svg>
}

function ChartIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 20V9h3v11H5Zm5.5 0V4h3v16h-3Zm5.5 0v-7h3v7h-3Z" /></svg>
}

function SparkIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m12 2 1.4 5.6L19 9l-5.6 1.4L12 16l-1.4-5.6L5 9l5.6-1.4L12 2Zm7 12 .8 3.2L23 18l-3.2.8L19 22l-.8-3.2L15 18l3.2-.8L19 14Z" /></svg>
}

function Brand() {
  return <div className="brand"><span className="brand-mark">F</span><span>FITSCOUTER</span></div>
}

function TryOnOverlay({ variant }: { variant: Variant }) {
  if (variant === 'base') return null
  return (
    <div className={`tryon-overlay tryon-${variant}`} aria-hidden="true">
      {variant === 'derby' && (
        <>
          <span className="shoe left" />
          <span className="shoe right" />
          <b>BLACK DERBY TRY-ON</b>
        </>
      )}
      {variant === 'scarf' && (
        <>
          <span className="scarf-main" />
          <span className="scarf-tail left" />
          <span className="scarf-tail right" />
          <b>MUFFLER TRY-ON</b>
        </>
      )}
      {variant === 'bag' && (
        <>
          <span className="bag-strap" />
          <span className="bag-body" />
          <b>STRUCTURED BAG TRY-ON</b>
        </>
      )}
    </div>
  )
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('upload')
  const [sheet, setSheet] = useState<Sheet>(null)
  const [variant, setVariant] = useState<Variant>('base')
  const [scenarioId, setScenarioId] = useState<ScenarioId | null>('street')
  const [customScenario, setCustomScenario] = useState('')
  const [sourceImage, setSourceImage] = useState<string | null>(null)
  const [sourceBase64, setSourceBase64] = useState<string | null>(null)
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus>('idle')
  const [analysisSource, setAnalysisSource] = useState<AnalysisSource>('mock')
  const [ollamaAnalysis, setOllamaAnalysis] = useState<OllamaAnalysis | null>(null)
  const [ollamaError, setOllamaError] = useState('')
  const [toast, setToast] = useState('')
  const [progress, setProgress] = useState(12)
  const [aiModeUnlocked, setAiModeUnlocked] = useState(false)
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  const selectedImprovement = improvements.find((item) => item.id === variant)
  const score = Math.min(10000, Math.max(0, 8610 + (selectedImprovement?.gain ?? 0) + (ollamaAnalysis?.scoreDelta ?? 0)))
  const tier = getTier(score)
  const selectedScenario = scenarios.find((scenario) => scenario.id === scenarioId)
  const scenarioLabel = customScenario.trim() || selectedScenario?.label || '일상'
  const roast = ollamaAnalysis?.oneLine ?? getRoast(score, scenarioLabel)
  const topPercent = getTopPercent(score)
  const styleType = variant === 'base' ? (ollamaAnalysis?.styleType ?? getStyleType(variant, score)) : getStyleType(variant, score)
  const memeScores = variant === 'base' ? (ollamaAnalysis?.memeScores ?? getMemeScores(variant, scenarioLabel)) : getMemeScores(variant, scenarioLabel)
  const scoreRows = ollamaAnalysis?.breakdown ?? breakdown
  const visibleImage = sourceImage ?? samplePhoto
  const visibleItems = useMemo(() => [...baseItems, variantItem[variant]], [variant])

  useEffect(() => {
    if (screen !== 'loading') return
    let cancelled = false
    const startedAt = Date.now()
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startedAt
      setProgress(Math.min(94, 12 + Math.round(elapsed / 95)))
    }, 120)

    async function run() {
      const minimumDelay = new Promise((resolve) => window.setTimeout(resolve, 1450))
      const analysis = runOllamaAnalysis()
      await Promise.allSettled([minimumDelay, analysis])
      if (cancelled) return
      window.clearInterval(timer)
      setProgress(100)
      setScreen('result')
    }

    void run()
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [screen])

  useEffect(() => {
    if (!sheet) return
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && setSheet(null)
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [sheet])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  async function runOllamaAnalysis() {
    setOllamaStatus('checking')
    setOllamaError('')
    try {
      const imageBase64 = sourceBase64 ?? await imageUrlToBase64(samplePhoto)
      setOllamaStatus('analyzing')
      const controller = new AbortController()
      const timeout = window.setTimeout(() => controller.abort(), 120000)
      const response = await fetch(`${ollamaEndpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: ollamaModel,
          prompt: buildOllamaPrompt(scenarioLabel),
          images: [imageBase64],
          stream: false,
          format: 'json',
          options: { temperature: 0.2 },
        }),
        signal: controller.signal,
      })
      window.clearTimeout(timeout)
      if (!response.ok) throw new Error(`Ollama responded ${response.status}`)
      const payload = await response.json() as { response?: string }
      const normalized = normalizeOllamaAnalysis(payload.response ?? '', scenarioLabel)
      setOllamaAnalysis(normalized)
      setAnalysisSource('ollama')
      setOllamaStatus('ready')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ollama analysis failed'
      setOllamaStatus(message.includes('Failed to fetch') ? 'unavailable' : 'error')
      setOllamaError(message)
      setOllamaAnalysis(null)
      setAnalysisSource('mock')
    }
  }

  function beginAnalysis(image?: string, imageBase64?: string) {
    setSourceImage(image ?? null)
    setSourceBase64(imageBase64 ?? null)
    setVariant('base')
    setOllamaAnalysis(null)
    setAnalysisSource('mock')
    setOllamaStatus('idle')
    setOllamaError('')
    setAiModeUnlocked(false)
    setProgress(12)
    setScreen('loading')
  }

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const dataUrl = await fileToDataUrl(file)
    beginAnalysis(dataUrl, dataUrlToBase64(dataUrl))
    event.target.value = ''
  }

  async function shareCard() {
    setAiModeUnlocked(true)
    try {
      const response = await fetch(visibleImage)
      const blob = await response.blob()
      const file = new File([blob], 'fitscouter-ootd.jpg', { type: blob.type || 'image/jpeg' })
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: '오늘의 OOTD', text: `${styleType} · 패션력 ${score.toLocaleString()}점 · ${tier.name} · 상위 ${topPercent}%`, files: [file] })
        return
      }
      if (navigator.share) {
        await navigator.share({ title: '오늘의 OOTD', text: `${styleType} · 패션력 ${score.toLocaleString()}점 · ${tier.name} · 상위 ${topPercent}%`, url: window.location.href })
        return
      }
      const link = document.createElement('a')
      link.href = visibleImage
      link.download = 'fitscouter-ootd.jpg'
      link.click()
      setToast('공유 API가 없어 이미지를 저장했어요')
    } catch (error) {
      if ((error as DOMException).name !== 'AbortError') setToast('공유하지 못했어요. 다시 시도해 주세요.')
    }
  }

  function applyImprovement(next: Exclude<Variant, 'base'>) {
    setVariant(next)
    setSheet(null)
    setToast('추천 아이템을 카드에 반영했어요')
  }

  if (screen === 'loading') {
    const stage = ollamaStatus === 'checking'
      ? '로컬 Ollama 연결을 확인하고 있어요'
      : ollamaStatus === 'analyzing'
        ? `${ollamaModel} 모델이 사진을 읽고 있어요`
        : ollamaStatus === 'unavailable'
          ? 'Ollama가 없어 기본 분석으로 전환하고 있어요'
          : progress < 45 ? '전신 실루엣을 읽고 있어요' : progress < 78 ? '상황과 아이템 합을 비교하고 있어요' : 'OOTD 카드를 정리하고 있어요'
    return (
      <main className="phone-shell loading-screen">
        <header className="minimal-header"><Brand /></header>
        <section className="loading-content" aria-live="polite">
          <div className="scan-frame">
            <img src={visibleImage} alt="분석 중인 전신 사진" />
            <span className="scan-line" />
            <span className="scan-label">SCANNING LOOK</span>
          </div>
          <p className="eyebrow">AI OUTFIT REPORT</p>
          <h1>오늘의 패션력을<br />측정하고 있어요</h1>
          <p className="loading-stage">{stage}</p>
          <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className="progress-meta"><span>{progress}%</span><span>약 3초</span></div>
        </section>
      </main>
    )
  }

  if (screen === 'upload') {
    return (
      <main className="phone-shell upload-screen">
        <header className="topbar">
          <Brand />
          <span className="lab-chip">OOTD LAB</span>
        </header>

        <section className="hero-copy">
          <p className="eyebrow">TODAY'S FASHION POWER</p>
          <h1>전신샷 한 장으로<br /><span>오늘의 패션력을 받아보세요.</span></h1>
          <p>상황 입력은 선택사항이에요. 입력하면 소개팅, 미팅, 운동처럼 목적에 맞춰 점수와 한줄평이 조금 달라집니다.</p>
        </section>

        <section className="input-panel" aria-label="사진과 상황 입력">
          <div className="input-heading"><span>01</span><div><strong>OOTD 사진을 추가하세요</strong><p>머리부터 발끝까지 나오면 더 정확해요.</p></div></div>
          <button className="primary-button" onClick={() => cameraRef.current?.click()}><CameraIcon /><span>사진 찍기</span></button>
          <button className="secondary-button" onClick={() => galleryRef.current?.click()}><UploadIcon /><span>앨범 선택</span></button>
          <button className="sample-button" onClick={() => beginAnalysis()}>샘플 사진으로 먼저 체험하기 <span>→</span></button>
          <input ref={cameraRef} className="sr-only" type="file" accept="image/*" capture="environment" onChange={onFile} aria-label="카메라로 전신 사진 촬영" />
          <input ref={galleryRef} className="sr-only" type="file" accept="image/*" onChange={onFile} aria-label="앨범에서 전신 사진 선택" />
        </section>

        <section className="scenario-panel" aria-label="상황 선택">
          <div className="section-title"><span>02</span><div><strong>상황을 선택해도 좋아요</strong><p>선택하지 않아도 바로 분석할 수 있어요.</p></div></div>
          <div className="scenario-grid">
            {scenarios.map((scenario) => (
              <button key={scenario.id} className={scenarioId === scenario.id ? 'selected' : ''} onClick={() => setScenarioId(scenario.id)}>
                <strong>{scenario.label}</strong>
                <span>{scenario.hint}</span>
              </button>
            ))}
          </div>
          <label className="scenario-input">
            <span>직접 입력</span>
            <input value={customScenario} onChange={(event) => setCustomScenario(event.target.value)} placeholder="예: 연남동 데이트, 면접, 헬스장" />
          </label>
        </section>

        <figure className="sample-look">
          <img src={samplePhoto} alt="긴 체크 코트와 스니커즈를 착용한 OOTD 샘플" />
          <div className="sample-shade" />
          <div className="sample-topline"><span>LOOK 01</span><span>PHOTO SAMPLE</span></div>
          <figcaption>
            <span className="sample-kicker">HYBRID CARD SAMPLE</span>
            <strong>Photo + sticker,<br />low cost first.</strong>
            <a href="https://unsplash.com/photos/u_pB8KRvk-U" target="_blank" rel="noreferrer">Photo by Branislav Rodman · Unsplash</a>
          </figcaption>
        </figure>

        <section className="mode-note">
          <strong>생성 전략</strong>
          <p>기본은 기존 사진에 스티커와 점수를 얹는 저비용 카드입니다. 고득점, 공유 버튼 클릭, 하루 1회 무료 같은 트리거에서만 AI 생성형 카드로 확장합니다.</p>
        </section>

        <p className="privacy-note"><span>●</span> 현재 PoC에서는 선택한 사진을 서버로 전송하지 않습니다.</p>
      </main>
    )
  }

  return (
    <main className="phone-shell result-screen">
      <header className="result-header">
        <button className="icon-button back" onClick={() => { setScreen('upload'); setSourceImage(null) }} aria-label="처음 화면으로 돌아가기">←</button>
        <Brand />
        <button className="icon-button" onClick={shareCard} aria-label="결과 공유하기"><ShareIcon /></button>
      </header>

      <section className="result-intro">
        <div><p className="eyebrow">YOUR OUTFIT REPORT</p><h1>오늘의 OOTD</h1></div>
        <span className="result-date">27 JUN<br />2026</span>
      </section>

      <section className="story-card" aria-label="생성된 OOTD 카드">
        <div className={`story-photo variant-${variant}`}>
          <img src={visibleImage} alt={selectedImprovement ? `${selectedImprovement.title} 제안이 반영된 OOTD 미리보기` : '오늘의 OOTD 전신 이미지'} />
          <TryOnOverlay variant={variant} />
          <div className="story-gradient" />
          <div className="story-meta"><span>FITSCOUTER · {scenarioLabel}</span><span>9:16</span></div>
          <div className="tier-badge"><span>{tier.name}</span><small>{tier.tone}</small></div>
          <div className="score-stamp"><small>FASHION<br />POWER</small><strong>{score.toLocaleString()}</strong><span>/ 10K</span></div>
          {selectedImprovement && <div className="applied-style"><span>+{selectedImprovement.gain}</span>{selectedImprovement.title} 적용</div>}
          <div className="sticker-pack" aria-hidden="true"><span>OOTD</span><span>{scenarioLabel}</span><span>#{tier.name}</span></div>
          <div className="story-title"><span>MY</span><strong>OOTD</strong><p>{roast}</p></div>
        </div>
        {!sourceImage && <a className="photo-credit" href="https://unsplash.com/photos/u_pB8KRvk-U" target="_blank" rel="noreferrer">Photo: Branislav Rodman / Unsplash ↗</a>}

        <div className={`ollama-card ${analysisSource === 'ollama' ? 'ready' : ''}`}>
          <div>
            <strong>{analysisSource === 'ollama' ? '로컬 Ollama 분석 적용됨' : '기본 분석 적용 중'}</strong>
            <p>{analysisSource === 'ollama' ? `${ollamaModel}가 업로드 사진을 읽고 한줄평과 개선 포인트를 보정했어요.` : `Ollama가 실행 중이면 ${ollamaEndpoint}의 ${ollamaModel}로 사진 분석을 시도합니다.`}</p>
            {ollamaError && <small>{ollamaError}</small>}
          </div>
          <span>{analysisSource === 'ollama' ? 'LOCAL AI' : 'MOCK'}</span>
        </div>

        <div className="ai-trigger-card">
          <div><strong>{aiModeUnlocked || score >= 9000 ? 'AI 생성형 카드 후보' : '사진+스티커 카드'}</strong><p>{aiModeUnlocked ? '공유 버튼을 눌러 생성형 카드 트리거가 켜졌어요.' : '비용을 줄이기 위해 기본 결과는 기존 사진을 꾸미는 방식입니다.'}</p></div>
          <span>{aiModeUnlocked || score >= 9000 ? 'ON' : 'BASIC'}</span>
        </div>

        <div className="viral-verdict">
          <div>
            <span>상위 {topPercent}%</span>
            <p>비슷한 유저 평균 {peerAverage.toLocaleString()}점</p>
          </div>
          <div>
            <span>{styleType}</span>
            <p>공유용 스타일 유형</p>
          </div>
        </div>

        <div className="meme-score-grid" aria-label="밈 점수">
          {memeScores.map((item) => (
            <article key={item.label}>
              <div><strong>{item.label}</strong><span>{item.value}%</span></div>
              <div className="mini-meter"><span style={{ width: `${item.value}%` }} /></div>
              <p>{item.comment}</p>
            </article>
          ))}
        </div>

        <div className="look-heading">
          <span>THE LOOK</span>
          <p>{ollamaAnalysis?.summary ?? `${scenarioLabel} 기준으로는 긴 실루엣과 강한 컬러 포인트가 장점입니다. 신발과 가방을 다듬으면 티어 상승 여지가 있어요.`}</p>
        </div>

        <div className="item-grid">
          {visibleItems.map((item, index) => (
            <article className="item-card" key={item.name}>
              <span className="item-number">0{index + 1}</span>
              <div><strong>{item.name}</strong><em>{item.price}</em><p>{item.note}</p></div>
            </article>
          ))}
        </div>

        <div className="score-summary">
          <div><span>오늘의 패션력</span><strong>{score.toLocaleString()}<small> / 10,000</small></strong></div>
          <div className="score-meter"><span style={{ width: `${score / 100}%` }} /></div>
          <p>{tier.name} 티어 · 정확한 평가보다 친구와 공유하며 웃고 떠드는 점수입니다.</p>
        </div>
      </section>

      <section className="friend-nudge">
        <strong>지금 단계의 소셜은 커뮤니티가 아니라 공유 카드</strong>
        <p>배틀 아레나, 갤러리, 명예전당은 후순위입니다. 먼저 카톡방에 던질 수 있는 “내 패션력 vs 친구 패션력” 링크 공유부터 검증합니다.</p>
        <div className="replay-actions">
          <button onClick={() => { setScenarioId('date'); setCustomScenario(''); setScreen('upload') }}>데이트룩으로 재도전</button>
          <button onClick={() => { setCustomScenario('겨울 버전'); setScreen('upload') }}>겨울 버전 다시 평가</button>
        </div>
      </section>

      <section className="action-dock" aria-label="결과 기능">
        <button onClick={shareCard}><ShareIcon /><span>SNS 공유</span></button>
        <button onClick={() => setSheet('analysis')}><ChartIcon /><span>상세 스탯</span></button>
        <button className="accent-action" onClick={() => setSheet('improve')}><SparkIcon /><span>보완 아이템</span></button>
      </section>

      {sheet && (
        <div className="sheet-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setSheet(null)}>
          <section className="bottom-sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
            <div className="sheet-handle" />
            <div className="sheet-title-row">
              <div><p className="eyebrow">{sheet === 'analysis' ? 'SCORE BREAKDOWN' : 'ITEM FEEDBACK'}</p><h2 id="sheet-title">{sheet === 'analysis' ? '왜 이 점수인가요?' : '어디를 바꾸면 오를까요?'}</h2></div>
              <button className="close-button" onClick={() => setSheet(null)} aria-label="창 닫기">×</button>
            </div>
            {sheet === 'analysis' ? (
              <div className="analysis-list">
                <div className="total-score"><span>현재 패션력</span><strong>{score.toLocaleString()}</strong><i>/ 10,000</i></div>
                <p className="roast-line">{roast}</p>
                <div className="rank-snapshot">
                  <div><strong>상위 {topPercent}%</strong><span>상대 위치</span></div>
                  <div><strong>{peerAverage.toLocaleString()}</strong><span>비슷한 유저 평균</span></div>
                  <div><strong>{styleType}</strong><span>스타일 유형</span></div>
                </div>
                <div className="meme-bars">
                  {memeScores.map((item) => (
                    <article key={item.label}>
                      <div><strong>{item.label}</strong><span>{item.value}%</span></div>
                      <div className="mini-meter"><span style={{ width: `${item.value}%` }} /></div>
                      <p>{item.comment}</p>
                    </article>
                  ))}
                </div>
                {scoreRows.map((row) => (
                  <article key={row.label}>
                    <div><strong>{row.label}</strong><span>{row.score.toLocaleString()} / {row.max.toLocaleString()}</span></div>
                    <div className="score-track"><span style={{ width: `${(row.score / row.max) * 100}%` }} /></div>
                    <p>{row.note}</p>
                  </article>
                ))}
                <div className="fun-stats">
                  {funnyStats.map((stat) => <div key={stat.label}><strong>{stat.value}</strong><span>{stat.label}</span><p>{stat.note}</p></div>)}
                </div>
                <p className="fun-note">이 점수는 공유용 엔터테인먼트이며 외모나 체형의 가치를 판단하지 않습니다.</p>
              </div>
            ) : (
              <div className="improvement-list">
                <p className="sheet-description">천사는 패션력 상승 아이템, 악마는 현재 룩에서 힘을 빼는 요소입니다. 상품 링크는 PoC용 검색 링크입니다.</p>
                {ollamaAnalysis?.improvements.length ? (
                  <div className="ollama-suggestions">
                    <strong>로컬 AI가 사진에서 본 개선점</strong>
                    {ollamaAnalysis.improvements.map((item) => <p key={item}>{item}</p>)}
                  </div>
                ) : null}
                {improvements.map((item) => (
                  <article className={variant === item.id ? 'improvement-card selected' : 'improvement-card'} key={item.id}>
                    <button onClick={() => applyImprovement(item.id)}>
                      <span className={`suggestion-visual suggestion-${item.id}`}><small>{item.icon} {item.target}</small><b>+{item.gain}</b></span>
                      <span className="suggestion-copy"><b>{item.title}</b><em>+{item.gain}점</em><small>{item.reason}</small></span>
                      <i aria-hidden="true">→</i>
                    </button>
                    <div className="shop-row"><span>{item.after}</span><a href={item.shop} target="_blank" rel="noreferrer">대표 상품 보기</a></div>
                  </article>
                ))}
                {variant !== 'base' && <button className="reset-look" onClick={() => { setVariant('base'); setSheet(null); setToast('원래 코디로 돌아왔어요') }}>원래 코디로 되돌리기</button>}
              </div>
            )}
          </section>
        </div>
      )}
      <div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite">{toast}</div>
    </main>
  )
}
