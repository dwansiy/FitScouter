import { ChangeEvent, useEffect, useRef, useState } from 'react'

type Screen = 'upload' | 'loading' | 'result'
type Sheet = 'analysis' | 'improve' | null
type Variant = 'base' | 'derby' | 'accent' | 'bag'

const assetUrl = (fileName: string) => `${import.meta.env.BASE_URL}assets/${fileName}`
const samplePhoto = assetUrl('sample-ootd.jpg')

const breakdown = [
  { label: '실루엣', score: 2380, max: 2500, note: '롱 코트와 여유로운 팬츠가 긴 세로선을 만들어요.' },
  { label: '컬러', score: 1880, max: 2000, note: '차콜 위에 레드 포인트를 얹어 시선이 분명해요.' },
  { label: '아이템 조합', score: 1820, max: 2000, note: '클래식한 코트와 레트로 스니커즈의 대비가 좋아요.' },
  { label: '상황 적합도', score: 1430, max: 1500, note: '도시에서 입기 좋은 개성 있는 데일리 룩이에요.' },
  { label: '디테일', score: 970, max: 1000, note: '아이웨어와 작은 패턴 백이 룩의 밀도를 높여요.' },
  { label: '개성', score: 950, max: 1000, note: '유행을 그대로 따르기보다 자기 방식으로 섞었어요.' },
]

const improvements = [
  { id: 'derby' as const, title: '블랙 더비 슈즈', gain: 100, tag: 'SHOES', reason: '스니커즈를 더비 슈즈로 바꾸면 코트의 클래식한 선이 더 또렷해져요.' },
  { id: 'accent' as const, title: '실버 액세서리', gain: 70, tag: 'DETAIL', reason: '차가운 실버 톤이 선글라스와 연결돼 상체의 디테일을 정리해요.' },
  { id: 'bag' as const, title: '구조적인 숄더백', gain: 65, tag: 'BAG', reason: '작은 패턴 백 대신 각진 가방을 들면 코트의 볼륨과 균형이 맞아요.' },
]

const baseItems = [
  { name: 'HOUNDSTOOTH COAT', price: '₩289,000', note: '움직일 때 실루엣이 살아나는 넉넉한 롱 코트' },
  { name: 'RED INNER TOP', price: '₩69,000', note: '어두운 룩의 중심을 잡아주는 선명한 컬러 포인트' },
  { name: 'RELAXED TROUSERS', price: '₩129,000', note: '코트의 볼륨을 자연스럽게 이어주는 여유로운 핏' },
]

const variantItem: Record<Variant, { name: string; price: string; note: string }> = {
  base: { name: 'RETRO SNEAKERS', price: '₩159,000', note: '클래식한 룩에 편안한 거리 감성을 더하는 스니커즈' },
  derby: { name: 'BLACK DERBY', price: '₩219,000', note: '롱 코트를 더 정제된 인상으로 마무리하는 선택' },
  accent: { name: 'SILVER JEWELRY', price: '₩89,000', note: '아이웨어와 자연스럽게 연결되는 차가운 포인트' },
  bag: { name: 'STRUCTURED BAG', price: '₩179,000', note: '볼륨감 있는 코트에 선명한 형태를 더하는 가방' },
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

function Brand({ light = false }: { light?: boolean }) {
  return <div className={`brand ${light ? 'light' : ''}`}><span className="brand-mark">F</span><span>FITSCOUTER</span></div>
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('upload')
  const [sheet, setSheet] = useState<Sheet>(null)
  const [variant, setVariant] = useState<Variant>('base')
  const [sourceImage, setSourceImage] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [progress, setProgress] = useState(12)
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  const selectedImprovement = improvements.find((item) => item.id === variant)
  const score = 9430 + (selectedImprovement?.gain ?? 0)
  const visibleImage = sourceImage ?? samplePhoto
  const visibleItems = [...baseItems, variantItem[variant]]

  useEffect(() => {
    if (screen !== 'loading') return
    const startedAt = Date.now()
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startedAt
      setProgress(Math.min(96, 12 + Math.round(elapsed / 14)))
    }, 80)
    const done = window.setTimeout(() => {
      window.clearInterval(timer)
      setProgress(100)
      setScreen('result')
    }, 1450)
    return () => {
      window.clearInterval(timer)
      window.clearTimeout(done)
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
    const timer = window.setTimeout(() => setToast(''), 2400)
    return () => window.clearTimeout(timer)
  }, [toast])

  function beginAnalysis(image?: string) {
    setSourceImage(image ?? null)
    setVariant('base')
    setProgress(12)
    setScreen('loading')
  }

  function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    beginAnalysis(URL.createObjectURL(file))
    event.target.value = ''
  }

  async function shareCard() {
    try {
      const response = await fetch(visibleImage)
      const blob = await response.blob()
      const file = new File([blob], 'fitscouter-ootd.jpg', { type: blob.type || 'image/jpeg' })
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: '오늘의 OOTD', text: `나의 패션 전투력 ${score.toLocaleString()}점`, files: [file] })
        return
      }
      if (navigator.share) {
        await navigator.share({ title: '오늘의 OOTD', text: `나의 패션 전투력 ${score.toLocaleString()}점`, url: window.location.href })
        return
      }
      const link = document.createElement('a')
      link.href = visibleImage
      link.download = 'fitscouter-ootd.jpg'
      link.click()
      setToast('이미지를 저장했어요')
    } catch (error) {
      if ((error as DOMException).name !== 'AbortError') setToast('공유하지 못했어요. 다시 시도해 주세요.')
    }
  }

  function applyImprovement(next: Exclude<Variant, 'base'>) {
    setVariant(next)
    setSheet(null)
    setToast('추천 스타일을 카드에 적용했어요')
  }

  if (screen === 'loading') {
    const stage = progress < 45 ? '실루엣을 찾고 있어요' : progress < 78 ? '컬러와 아이템을 읽고 있어요' : 'OOTD 카드를 정리하고 있어요'
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
          <h1>오늘의 룩을<br />정리하고 있어요</h1>
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
          <p className="eyebrow">YOUR LOOK, ARCHIVED</p>
          <h1>오늘 입은 옷을<br /><span>더 멋지게 기록하세요.</span></h1>
          <p>전신 사진 한 장이면 충분해요.<br />OOTD 카드와 재미로 보는 점수를 만들어 드려요.</p>
        </section>

        <section className="input-panel" aria-label="사진 입력">
          <div className="input-heading"><span>01</span><div><strong>전신 사진을 추가하세요</strong><p>머리부터 발끝까지 나오면 더 좋아요.</p></div></div>
          <button className="primary-button" onClick={() => cameraRef.current?.click()}><CameraIcon /><span>사진 찍기</span></button>
          <button className="secondary-button" onClick={() => galleryRef.current?.click()}><UploadIcon /><span>앨범 선택</span></button>
          <button className="sample-button" onClick={() => beginAnalysis()}>샘플 사진으로 먼저 체험하기 <span>→</span></button>
          <input ref={cameraRef} className="sr-only" type="file" accept="image/*" capture="environment" onChange={onFile} aria-label="카메라로 전신 사진 촬영" />
          <input ref={galleryRef} className="sr-only" type="file" accept="image/*" onChange={onFile} aria-label="앨범에서 전신 사진 선택" />
        </section>

        <figure className="sample-look">
          <img src={samplePhoto} alt="긴 체크 코트와 스니커즈를 착용한 OOTD 샘플" />
          <div className="sample-shade" />
          <div className="sample-topline"><span>LOOK 01</span><span>PRAGUE · 2024</span></div>
          <figcaption>
            <span className="sample-kicker">EDITOR'S SAMPLE</span>
            <strong>Classic coat,<br />street attitude.</strong>
            <a href="https://unsplash.com/photos/u_pB8KRvk-U" target="_blank" rel="noreferrer">Photo by Branislav Rodman · Unsplash</a>
          </figcaption>
        </figure>

        <p className="privacy-note"><span>●</span> 사진은 이 PoC에서 서버로 전송되지 않아요.</p>
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
        <span className="result-date">18 JUN<br />2026</span>
      </section>

      <section className="story-card" aria-label="생성된 OOTD 카드">
        <div className={`story-photo variant-${variant}`}>
          <img src={visibleImage} alt={selectedImprovement ? `${selectedImprovement.title} 추천이 적용된 OOTD 미리보기` : '오늘의 OOTD 전신 이미지'} />
          <div className="story-gradient" />
          <div className="story-meta"><span>FITSCOUTER · LOOK 01</span><span>9:16</span></div>
          <div className="score-stamp"><small>FASHION<br />POWER</small><strong>{score.toLocaleString()}</strong><span>/ 10K</span></div>
          {selectedImprovement && <div className="applied-style"><span>+{selectedImprovement.gain}</span>{selectedImprovement.title} 적용</div>}
          <div className="story-title"><span>MY</span><strong>OOTD</strong><p>Classic layers · Street details</p></div>
        </div>
        {!sourceImage && <a className="photo-credit" href="https://unsplash.com/photos/u_pB8KRvk-U" target="_blank" rel="noreferrer">Photo: Branislav Rodman / Unsplash ↗</a>}

        <div className="look-heading">
          <span>THE LOOK</span>
          <p>긴 실루엣과 강한 컬러 포인트가 만난 도시적인 레이어드 룩.</p>
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
          <div><span>오늘의 패션 전투력</span><strong>{score.toLocaleString()}<small> / 10,000</small></strong></div>
          <div className="score-meter"><span style={{ width: `${score / 100}%` }} /></div>
          <p>정확한 평가보다 친구와 공유하며 즐기는 재미 점수예요.</p>
        </div>
      </section>

      <section className="action-dock" aria-label="결과 기능">
        <button onClick={shareCard}><ShareIcon /><span>SNS 공유</span></button>
        <button onClick={() => setSheet('analysis')}><ChartIcon /><span>점수 분석</span></button>
        <button className="accent-action" onClick={() => setSheet('improve')}><SparkIcon /><span>스타일 제안</span></button>
      </section>

      {sheet && (
        <div className="sheet-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setSheet(null)}>
          <section className="bottom-sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
            <div className="sheet-handle" />
            <div className="sheet-title-row">
              <div><p className="eyebrow">{sheet === 'analysis' ? 'SCORE BREAKDOWN' : 'ONE SMALL CHANGE'}</p><h2 id="sheet-title">{sheet === 'analysis' ? '왜 이 점수인가요?' : '다음 룩은 이렇게'}</h2></div>
              <button className="close-button" onClick={() => setSheet(null)} aria-label="창 닫기">×</button>
            </div>
            {sheet === 'analysis' ? (
              <div className="analysis-list">
                <div className="total-score"><span>현재 전투력</span><strong>{score.toLocaleString()}</strong><i>/ 10,000</i></div>
                {breakdown.map((row) => (
                  <article key={row.label}>
                    <div><strong>{row.label}</strong><span>{row.score.toLocaleString()} / {row.max.toLocaleString()}</span></div>
                    <div className="score-track"><span style={{ width: `${(row.score / row.max) * 100}%` }} /></div>
                    <p>{row.note}</p>
                  </article>
                ))}
                <p className="fun-note">이 점수는 재미를 위한 AI 의견이며 객관적인 가치 판단이 아니에요.</p>
              </div>
            ) : (
              <div className="improvement-list">
                <p className="sheet-description">하나를 선택하면 카드 설명과 예상 점수에 바로 반영돼요.</p>
                {improvements.map((item) => (
                  <button key={item.id} className={variant === item.id ? 'selected' : ''} onClick={() => applyImprovement(item.id)}>
                    <span className={`suggestion-visual suggestion-${item.id}`}><small>{item.tag}</small><b>+{item.gain}</b></span>
                    <span className="suggestion-copy"><b>{item.title}</b><em>+{item.gain}점</em><small>{item.reason}</small></span>
                    <i aria-hidden="true">→</i>
                  </button>
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
