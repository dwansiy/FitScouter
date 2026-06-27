import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageSourcePropType,
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StatusBar as NativeStatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { StatusBar } from 'expo-status-bar'

type Screen = 'upload' | 'loading' | 'result'
type Sheet = 'analysis' | 'improve' | null
type ScenarioId = 'date' | 'business' | 'workout' | 'street'
type Variant = 'base' | 'derby' | 'scarf' | 'bag'

const sampleImage = require('./assets/sample-ootd.jpg') as ImageSourcePropType
const photoSourceUrl = 'https://unsplash.com/photos/u_pB8KRvk-U'

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
  ['친구 단톡 생존율', '92%', '놀림은 받아도 사진은 저장될 확률'],
  ['거울 앞 체류시간', '14분', '오늘은 한 번 더 보는 쪽'],
  ['무신사 탐색 위험도', '높음', '신발 하나만 보려다 장바구니로 갈 수 있음'],
]

const peerAverage = 7420

const improvements = [
  {
    id: 'derby' as const,
    icon: '😇',
    title: '블랙 더비 슈즈',
    target: '신발',
    gain: 190,
    color: '#20201f',
    shop: 'https://www.musinsa.com/search/musinsa/integration?q=%EB%B8%94%EB%9E%99%20%EB%8D%94%EB%B9%84%20%EC%8A%88%EC%A6%88',
    reason: '코트의 클래식한 선이 살아나서 소개팅이나 미팅 상황에 더 안정적으로 보여요.',
  },
  {
    id: 'scarf' as const,
    icon: '😇',
    title: '톤 다운 머플러',
    target: '목 주변',
    gain: 130,
    color: '#c9c7c2',
    shop: 'https://www.29cm.co.kr/search?keyword=%EB%A8%B8%ED%94%8C%EB%9F%AC',
    reason: '코트와 얼굴 사이에 부드러운 완충 지대를 만들어 전체 인상이 덜 딱딱해져요.',
  },
  {
    id: 'bag' as const,
    icon: '😈',
    title: '너무 큰 로고백 줄이기',
    target: '가방',
    gain: 90,
    color: '#593d34',
    shop: 'https://www.musinsa.com/search/musinsa/integration?q=%EC%8A%A4%ED%8A%B8%EB%9F%AD%EC%B2%98%EB%93%9C%20%EB%B0%B1',
    reason: '강한 로고가 룩의 중심을 빼앗으면 점수가 흔들려요. 형태가 또렷한 가방이 더 좋아요.',
  },
]

const baseItems: [string, string, string][] = [
  ['HOUNDSTOOTH COAT', '약 289,000원', '넉넉한 길이감으로 전신 비율을 길게 잡아 주는 코트'],
  ['RED INNER TOP', '약 69,000원', '무채색 룩에서 시선을 잡아 주는 컬러 포인트'],
  ['RELAXED TROUSERS', '약 129,000원', '코트의 볼륨을 자연스럽게 이어 주는 여유로운 핏'],
]

const variantItem: Record<Variant, [string, string, string]> = {
  base: ['RETRO SNEAKERS', '약 159,000원', '클래식 룩에 편안한 거리 감성을 더하는 스니커즈'],
  derby: ['BLACK DERBY', '약 219,000원', '코트를 더 단정하게 마무리해 주는 블랙 더비 슈즈'],
  scarf: ['SOFT MUFFLER', '약 89,000원', '상체의 빈 공간을 채우고 분위기를 부드럽게 만드는 머플러'],
  bag: ['STRUCTURED BAG', '약 179,000원', '로고보다 형태로 완성도를 보여 주는 구조적인 가방'],
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
    ['돈빨', 78, '돈이 조금 더 열심히 했다'],
    ['센스', 66 + boost, variant === 'base' ? '무난하지만 한 방이 부족함' : '아이템 교체로 설득력 상승'],
    ['눈치력', 62 + boost, `${scenario} 기준 TPO를 조금 더 챙기면 상승`],
    ['첫인상 호감도', 74 + boost, '깔끔하지만 임팩트는 한 끗 더 필요'],
  ] as const
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('upload')
  const [sheet, setSheet] = useState<Sheet>(null)
  const [variant, setVariant] = useState<Variant>('base')
  const [scenarioId, setScenarioId] = useState<ScenarioId | null>('street')
  const [customScenario, setCustomScenario] = useState('')
  const [sourceUri, setSourceUri] = useState<string | null>(null)
  const [progress, setProgress] = useState(12)
  const [aiModeUnlocked, setAiModeUnlocked] = useState(false)

  const improvement = improvements.find((item) => item.id === variant)
  const score = Math.min(10000, 8610 + (improvement?.gain ?? 0))
  const tier = getTier(score)
  const scenario = customScenario.trim() || scenarios.find((item) => item.id === scenarioId)?.label || '일상'
  const roast = getRoast(score, scenario)
  const topPercent = getTopPercent(score)
  const styleType = getStyleType(variant, score)
  const memeScores = getMemeScores(variant, scenario)
  const itemNotes = useMemo(() => [...baseItems, variantItem[variant]], [variant])
  const resultSource = useMemo<ImageSourcePropType>(() => sourceUri ? { uri: sourceUri } : sampleImage, [sourceUri])

  useEffect(() => {
    if (screen !== 'loading') return
    const interval = setInterval(() => setProgress((value) => Math.min(94, value + 5)), 90)
    const timeout = setTimeout(() => {
      clearInterval(interval)
      setProgress(100)
      setScreen('result')
    }, 1500)
    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [screen])

  function beginAnalysis(uri: string | null = null) {
    setSourceUri(uri)
    setVariant('base')
    setAiModeUnlocked(false)
    setProgress(12)
    setScreen('loading')
  }

  async function openCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('카메라 권한이 필요해요', '설정에서 카메라 권한을 허용하거나 앨범에서 사진을 선택해 주세요.')
      return
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.82 })
    if (!result.canceled && result.assets[0]) beginAnalysis(result.assets[0].uri)
  }

  async function openGallery() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('사진 권한이 필요해요', '설정에서 사진 보관함 권한을 허용해 주세요.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.82 })
    if (!result.canceled && result.assets[0]) beginAnalysis(result.assets[0].uri)
  }

  async function shareCard() {
    setAiModeUnlocked(true)
    await Share.share({ title: '오늘의 OOTD', message: `${styleType} · 패션력 ${score.toLocaleString()}점 · ${tier.name} · 상위 ${topPercent}% #FITSCOUTER` })
  }

  if (screen === 'loading') {
    const stage = progress < 45 ? '전신 실루엣을 읽고 있어요' : progress < 78 ? '상황과 아이템 합을 비교하고 있어요' : 'OOTD 카드를 정리하고 있어요'
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.loadingPage}>
          <Brand />
          <View style={styles.loadingCenter}>
            <View style={styles.scanFrame}>
              <Image source={resultSource} style={styles.scanImage} accessibilityLabel="분석 중인 전신 사진" />
              <View style={[styles.scanBar, { top: `${Math.min(84, progress)}%` }]} />
              <Text style={styles.scanLabel}>SCANNING LOOK</Text>
            </View>
            <Text style={styles.eyebrow}>AI OUTFIT REPORT</Text>
            <Text style={styles.loadingTitle}>오늘의 패션력을{`\n`}측정하고 있어요</Text>
            <Text style={styles.loadingText}>{stage}</Text>
            <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
            <View style={styles.progressMeta}><Text>{progress}%</Text><Text>약 3초</Text></View>
            <ActivityIndicator color="#ff5b35" style={{ marginTop: 14 }} />
          </View>
        </View>
      </SafeAreaView>
    )
  }

  if (screen === 'upload') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={styles.uploadPage} showsVerticalScrollIndicator={false}>
          <View style={styles.topbar}><Brand /><Text style={styles.labChip}>OOTD LAB</Text></View>
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>TODAY'S FASHION POWER</Text>
            <Text style={styles.heroTitle}>전신샷 한 장으로{`\n`}<Text style={styles.softText}>오늘의 패션력을 받아보세요.</Text></Text>
            <Text style={styles.heroDescription}>상황 입력은 선택사항이에요. 입력하면 목적에 맞춰 점수와 한줄평이 조금 달라집니다.</Text>
          </View>
          <View style={styles.inputPanel}>
            <View style={styles.inputHeading}><Text style={styles.stepCircle}>01</Text><View><Text style={styles.inputTitle}>OOTD 사진을 추가하세요</Text><Text style={styles.inputHint}>머리부터 발끝까지 나오면 더 정확해요.</Text></View></View>
            <View style={styles.inputActions}>
              <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]} onPress={openCamera}><Text style={styles.primaryButtonText}>사진 찍기</Text></Pressable>
              <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]} onPress={openGallery}><Text style={styles.secondaryButtonText}>앨범 선택</Text></Pressable>
            </View>
            <Pressable onPress={() => beginAnalysis()} style={styles.sampleButton}><Text style={styles.sampleText}>샘플 사진으로 먼저 체험하기  →</Text></Pressable>
          </View>
          <View style={styles.scenarioPanel}>
            <View style={styles.inputHeading}><Text style={styles.stepCircle}>02</Text><View><Text style={styles.inputTitle}>상황을 선택해도 좋아요</Text><Text style={styles.inputHint}>선택하지 않아도 바로 분석할 수 있어요.</Text></View></View>
            <View style={styles.scenarioGrid}>
              {scenarios.map((item) => <Pressable key={item.id} onPress={() => setScenarioId(item.id)} style={[styles.scenarioButton, scenarioId === item.id && styles.scenarioSelected]}><Text style={styles.scenarioLabel}>{item.label}</Text><Text style={styles.scenarioHint}>{item.hint}</Text></Pressable>)}
            </View>
            <TextInput value={customScenario} onChangeText={setCustomScenario} placeholder="예: 연남동 데이트, 면접, 헬스장" placeholderTextColor="#9a958c" style={styles.scenarioInput} />
          </View>
          <View style={styles.sampleLook}>
            <Image source={sampleImage} style={styles.sampleImage} accessibilityLabel="긴 체크 코트와 스니커즈를 착용한 OOTD 샘플" />
            <View style={styles.photoShade} />
            <View style={styles.sampleTopline}><Text style={styles.toplineText}>LOOK 01</Text><Text style={styles.toplineText}>PHOTO SAMPLE</Text></View>
            <View style={styles.sampleCaption}>
              <Text style={styles.sampleKicker}>HYBRID CARD SAMPLE</Text>
              <Text style={styles.sampleTitle}>Photo + sticker,{`\n`}low cost first.</Text>
              <Pressable onPress={() => Linking.openURL(photoSourceUrl)}><Text style={styles.photoCredit}>Photo by Branislav Rodman · Unsplash</Text></Pressable>
            </View>
          </View>
          <View style={styles.modeNote}><Text style={styles.modeTitle}>생성 전략</Text><Text style={styles.modeText}>기본은 사진+스티커 카드입니다. 고득점, 공유 버튼 클릭, 하루 1회 무료 같은 트리거에서만 AI 생성형 카드로 확장합니다.</Text></View>
          <Text style={styles.privacy}>현재 PoC에서는 선택한 사진을 서버로 전송하지 않아요.</Text>
        </ScrollView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.resultPage}>
        <View style={styles.resultHeader}>
          <Pressable style={styles.iconButton} onPress={() => { setScreen('upload'); setSourceUri(null) }} accessibilityLabel="처음 화면으로 돌아가기"><Text style={styles.iconText}>←</Text></Pressable>
          <Brand compact />
          <Pressable style={styles.iconButton} onPress={shareCard} accessibilityLabel="결과 공유하기"><Text style={styles.shareGlyph}>↗</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.resultScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.resultIntro}><View><Text style={styles.eyebrow}>YOUR OUTFIT REPORT</Text><Text style={styles.resultTitle}>오늘의 OOTD</Text></View><Text style={styles.resultDate}>27 JUN{`\n`}2026</Text></View>
          <View style={styles.ootdCard}>
            <View style={styles.storyPhoto}>
              <Image source={resultSource} style={styles.storyImage} accessibilityLabel="생성된 오늘의 OOTD" />
              <TryOnOverlay variant={variant} />
              <View style={[styles.photoShade, styles.storyShade]} />
              <View style={styles.storyTopline}><Text style={styles.toplineText}>FITSCOUTER · {scenario}</Text><Text style={styles.toplineText}>9:16</Text></View>
              <View style={styles.tierBadge}><Text style={styles.tierName}>{tier.name}</Text><Text style={styles.tierTone}>{tier.tone}</Text></View>
              <View style={styles.scoreStamp}><Text style={styles.scoreStampLabel}>FASHION POWER</Text><Text style={styles.scoreStampNumber}>{score.toLocaleString()}</Text><Text style={styles.scoreStampMax}>/ 10K</Text></View>
              {improvement && <Text style={styles.appliedStyle}>+{improvement.gain} · {improvement.title} 적용</Text>}
              <View style={styles.stickerPack}><Text style={styles.sticker}>OOTD</Text><Text style={styles.sticker}>{scenario}</Text><Text style={styles.sticker}>#{tier.name}</Text></View>
              <View style={styles.storyTitle}><Text style={styles.storyMy}>MY</Text><Text style={styles.storyOotd}>OOTD</Text><Text style={styles.storySubtitle}>{roast}</Text></View>
            </View>
            {!sourceUri && <Pressable onPress={() => Linking.openURL(photoSourceUrl)}><Text style={styles.resultCredit}>Photo: Branislav Rodman / Unsplash ↗</Text></Pressable>}
            <View style={styles.aiTrigger}><View style={{ flex: 1 }}><Text style={styles.aiTitle}>{aiModeUnlocked || score >= 9000 ? 'AI 생성형 카드 후보' : '사진+스티커 카드'}</Text><Text style={styles.aiText}>{aiModeUnlocked ? '공유 버튼을 눌러 생성형 카드 트리거가 켜졌어요.' : '비용을 줄이기 위해 기본 결과는 기존 사진을 꾸미는 방식입니다.'}</Text></View><Text style={styles.aiState}>{aiModeUnlocked || score >= 9000 ? 'ON' : 'BASIC'}</Text></View>
            <View style={styles.viralVerdict}>
              <View style={styles.viralBox}><Text style={styles.viralValue}>상위 {topPercent}%</Text><Text style={styles.viralHint}>비슷한 유저 평균 {peerAverage.toLocaleString()}점</Text></View>
              <View style={styles.viralBox}><Text style={styles.viralValue}>{styleType}</Text><Text style={styles.viralHint}>공유용 스타일 유형</Text></View>
            </View>
            <View style={styles.memeGrid}>
              {memeScores.map(([label, value, comment]) => <View style={styles.memeCard} key={label}><View style={styles.memeTop}><Text style={styles.memeLabel}>{label}</Text><Text style={styles.memeValue}>{value}%</Text></View><View style={styles.miniMeter}><View style={[styles.miniFill, { width: `${value}%` }]} /></View><Text style={styles.memeComment}>{comment}</Text></View>)}
            </View>
            <View style={styles.lookHeading}><Text style={styles.lookLabel}>THE LOOK</Text><Text style={styles.lookDescription}>{scenario} 기준으로는 긴 실루엣과 강한 컬러 포인트가 장점입니다. 신발과 가방을 다듬으면 티어 상승 여지가 있어요.</Text></View>
            <View style={styles.itemGrid}>
              {itemNotes.map(([name, price, note], index) => (
                <View style={styles.itemCard} key={name}><Text style={styles.itemNumber}>0{index + 1}</Text><Text style={styles.itemName}>{name}</Text><Text style={styles.itemPrice}>{price}</Text><Text style={styles.itemNote}>{note}</Text></View>
              ))}
            </View>
            <View style={styles.cardScore}><Text style={styles.scoreLabel}>오늘의 패션력</Text><Text style={styles.scoreNumber}>{score.toLocaleString()}<Text style={styles.scoreMax}> / 10,000</Text></Text><View style={styles.scoreTrack}><View style={[styles.scoreFill, { width: `${score / 100}%` }]} /></View><Text style={styles.scoreNote}>{tier.name} 티어 · 친구와 공유하며 즐기는 재미 점수예요.</Text></View>
          </View>
          <View style={styles.friendNudge}>
            <Text style={styles.friendTitle}>지금 단계의 소셜은 커뮤니티가 아니라 공유 카드</Text>
            <Text style={styles.friendText}>배틀 아레나, 갤러리, 명예전당은 후순위입니다. 먼저 카톡방에 던질 수 있는 “내 패션력 vs 친구 패션력” 링크 공유부터 검증합니다.</Text>
            <View style={styles.replayActions}>
              <Pressable style={styles.replayButton} onPress={() => { setScenarioId('date'); setCustomScenario(''); setScreen('upload') }}><Text style={styles.replayText}>데이트룩 재도전</Text></Pressable>
              <Pressable style={styles.replayButton} onPress={() => { setCustomScenario('겨울 버전'); setScreen('upload') }}><Text style={styles.replayText}>겨울 버전 평가</Text></Pressable>
            </View>
          </View>
        </ScrollView>
        <View style={styles.actionDock}>
          <ActionButton label="SNS 공유" glyph="↗" onPress={shareCard} />
          <ActionButton label="상세 스탯" glyph="▥" onPress={() => setSheet('analysis')} />
          <ActionButton label="보완 아이템" glyph="✦" onPress={() => setSheet('improve')} accent />
        </View>
      </View>
      <DetailModal sheet={sheet} score={score} roast={roast} topPercent={topPercent} styleType={styleType} memeScores={memeScores} variant={variant} onClose={() => setSheet(null)} onSelect={(next) => { setVariant(next); setSheet(null) }} onReset={() => { setVariant('base'); setSheet(null) }} />
    </SafeAreaView>
  )
}

function Brand({ compact = false }: { compact?: boolean }) {
  return <View style={styles.brand}><View style={styles.brandMark}><Text style={styles.brandMarkText}>F</Text></View><Text style={[styles.brandText, compact && styles.brandCompact]}>FITSCOUTER</Text></View>
}

function ActionButton({ label, glyph, onPress, accent = false }: { label: string; glyph: string; onPress: () => void; accent?: boolean }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.actionButton, accent && styles.actionAccent, pressed && styles.pressed]} accessibilityRole="button"><Text style={styles.actionGlyph}>{glyph}</Text><Text style={styles.actionLabel}>{label}</Text></Pressable>
}

function TryOnOverlay({ variant }: { variant: Variant }) {
  if (variant === 'base') return null
  if (variant === 'derby') {
    return <View pointerEvents="none" style={styles.tryonOverlay}><View style={[styles.tryonShoe, styles.tryonShoeLeft]} /><View style={[styles.tryonShoe, styles.tryonShoeRight]} /><Text style={styles.tryonLabel}>BLACK DERBY TRY-ON</Text></View>
  }
  if (variant === 'scarf') {
    return <View pointerEvents="none" style={styles.tryonOverlay}><View style={styles.tryonScarfMain} /><View style={[styles.tryonScarfTail, styles.tryonScarfTailLeft]} /><View style={[styles.tryonScarfTail, styles.tryonScarfTailRight]} /><Text style={styles.tryonLabel}>MUFFLER TRY-ON</Text></View>
  }
  return <View pointerEvents="none" style={styles.tryonOverlay}><View style={styles.tryonBagStrap} /><View style={styles.tryonBagBody} /><Text style={styles.tryonLabel}>STRUCTURED BAG TRY-ON</Text></View>
}

function DetailModal({ sheet, score, roast, topPercent, styleType, memeScores, variant, onClose, onSelect, onReset }: { sheet: Sheet; score: number; roast: string; topPercent: number; styleType: string; memeScores: ReadonlyArray<readonly [string, number, string]>; variant: Variant; onClose: () => void; onSelect: (variant: Exclude<Variant, 'base'>) => void; onReset: () => void }) {
  return (
    <Modal visible={sheet !== null} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={() => undefined}>
          <View style={styles.modalHandle} />
          <View style={styles.modalTitleRow}><View><Text style={styles.eyebrow}>{sheet === 'analysis' ? 'SCORE BREAKDOWN' : 'ITEM FEEDBACK'}</Text><Text style={styles.modalTitle}>{sheet === 'analysis' ? '왜 이 점수인가요?' : '어디를 바꾸면 오를까요?'}</Text></View><Pressable style={styles.closeButton} onPress={onClose}><Text style={styles.closeText}>×</Text></Pressable></View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
            {sheet === 'analysis' ? <>
              <View style={styles.totalScore}><Text style={styles.totalLabel}>현재 패션력</Text><Text style={styles.totalNumber}>{score.toLocaleString()}</Text><Text style={styles.totalMax}>/ 10,000</Text></View>
              <Text style={styles.roastLine}>{roast}</Text>
              <View style={styles.rankSnapshot}>
                <View style={styles.rankBox}><Text style={styles.rankValue}>상위 {topPercent}%</Text><Text style={styles.rankLabel}>상대 위치</Text></View>
                <View style={styles.rankBox}><Text style={styles.rankValue}>{peerAverage.toLocaleString()}</Text><Text style={styles.rankLabel}>비슷한 유저 평균</Text></View>
                <View style={[styles.rankBox, styles.rankWide]}><Text style={styles.rankValue}>{styleType}</Text><Text style={styles.rankLabel}>스타일 유형</Text></View>
              </View>
              <View style={styles.memeBars}>{memeScores.map(([label, value, comment]) => <View style={[styles.memeCard, styles.memeBarCard]} key={label}><View style={styles.memeTop}><Text style={styles.memeLabel}>{label}</Text><Text style={styles.memeValue}>{value}%</Text></View><View style={styles.miniMeter}><View style={[styles.miniFill, { width: `${value}%` }]} /></View><Text style={styles.memeComment}>{comment}</Text></View>)}</View>
              {breakdown.map((row) => <View style={styles.analysisRow} key={row.label}><View style={styles.analysisHeading}><Text style={styles.analysisLabel}>{row.label}</Text><Text style={styles.analysisValue}>{row.score.toLocaleString()} / {row.max.toLocaleString()}</Text></View><View style={styles.smallTrack}><View style={[styles.smallFill, { width: `${row.score / row.max * 100}%` }]} /></View><Text style={styles.analysisNote}>{row.note}</Text></View>)}
              <View style={styles.funStats}>{funnyStats.map(([label, value, note]) => <View style={styles.funStat} key={label}><Text style={styles.funValue}>{value}</Text><Text style={styles.funLabel}>{label}</Text><Text style={styles.funText}>{note}</Text></View>)}</View>
              <Text style={styles.funNote}>이 점수는 공유용 엔터테인먼트이며 외모나 체형의 가치를 판단하지 않습니다.</Text>
            </> : <>
              <Text style={styles.modalDescription}>천사는 패션력 상승 아이템, 악마는 현재 룩에서 힘을 빼는 요소입니다.</Text>
              {improvements.map((item) => <View key={item.id} style={[styles.improvementCard, variant === item.id && styles.improvementSelected]}><Pressable onPress={() => onSelect(item.id)} style={({ pressed }) => [styles.improvementButton, pressed && styles.pressed]}><View style={[styles.suggestionVisual, { backgroundColor: item.color }]}><Text style={styles.suggestionTag}>{item.icon} {item.target}</Text><Text style={styles.suggestionGain}>+{item.gain}</Text></View><View style={styles.improvementCopy}><View style={styles.improvementTitleRow}><Text style={styles.improvementTitle}>{item.title}</Text><Text style={styles.improvementGain}>+{item.gain}점</Text></View><Text style={styles.improvementReason}>{item.reason}</Text></View><Text style={styles.chevron}>→</Text></Pressable><Pressable onPress={() => Linking.openURL(item.shop)} style={styles.shopRow}><Text style={styles.shopText}>대표 상품 검색 링크</Text><Text style={styles.shopLink}>열기</Text></Pressable></View>)}
              {variant !== 'base' && <Pressable style={styles.resetButton} onPress={onReset}><Text style={styles.resetText}>원래 코디로 되돌리기</Text></Pressable>}
            </>}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? NativeStatusBar.currentHeight : 0, backgroundColor: '#f5f2ec' },
  uploadPage: { flexGrow: 1, paddingBottom: 26, backgroundColor: '#f5f2ec' },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 17, paddingBottom: 8 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandMark: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#dfff57', borderWidth: 1, borderColor: '#161616', borderRadius: 12 },
  brandMarkText: { color: '#161616', fontSize: 12, fontWeight: '900' },
  brandText: { color: '#161616', fontSize: 13, fontWeight: '900', letterSpacing: 1.1 },
  brandCompact: { fontSize: 11 },
  labChip: { paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: '#161616', borderRadius: 20, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  hero: { paddingHorizontal: 22, paddingTop: 34, paddingBottom: 25 },
  eyebrow: { marginBottom: 9, color: '#ff5b35', fontSize: 10, lineHeight: 14, fontWeight: '900', letterSpacing: 1.6 },
  heroTitle: { color: '#161616', fontSize: 33, lineHeight: 43, fontWeight: '900', letterSpacing: -1.4 },
  softText: { color: '#4c4a45' },
  heroDescription: { marginTop: 14, color: '#6f6d68', fontSize: 13, lineHeight: 23 },
  inputPanel: { marginHorizontal: 14, marginBottom: 10, padding: 17, backgroundColor: '#fff', borderRadius: 10 },
  scenarioPanel: { marginHorizontal: 14, marginBottom: 10, padding: 17, backgroundColor: '#fff', borderRadius: 10 },
  inputHeading: { flexDirection: 'row', gap: 13, alignItems: 'flex-start', marginBottom: 16 },
  stepCircle: { width: 30, height: 30, paddingTop: 8, color: '#fff', backgroundColor: '#161616', borderRadius: 15, textAlign: 'center', fontSize: 10, fontWeight: '800' },
  inputTitle: { marginTop: 1, color: '#161616', fontSize: 14, fontWeight: '800' },
  inputHint: { marginTop: 4, color: '#6f6d68', fontSize: 11 },
  inputActions: { flexDirection: 'row', gap: 6 },
  primaryButton: { flex: 1.4, minHeight: 54, alignItems: 'center', justifyContent: 'center', backgroundColor: '#161616', borderRadius: 5 },
  primaryButtonText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  secondaryButton: { flex: 1, minHeight: 54, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#161616', borderRadius: 5 },
  secondaryButtonText: { color: '#161616', fontSize: 13, fontWeight: '800' },
  sampleButton: { paddingTop: 14 },
  sampleText: { color: '#56534e', fontSize: 11, fontWeight: '700' },
  scenarioGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  scenarioButton: { width: '48.8%', minHeight: 58, padding: 10, backgroundColor: '#f6f3ee', borderWidth: 1, borderColor: '#e5e1d9', borderRadius: 8 },
  scenarioSelected: { backgroundColor: '#f3ffd1', borderColor: '#161616' },
  scenarioLabel: { color: '#161616', fontSize: 12, fontWeight: '900' },
  scenarioHint: { marginTop: 4, color: '#77736c', fontSize: 9 },
  scenarioInput: { height: 44, marginTop: 12, paddingHorizontal: 12, color: '#161616', backgroundColor: '#f9f7f2', borderWidth: 1, borderColor: '#e0ddd6', borderRadius: 7 },
  sampleLook: { height: 448, marginHorizontal: 14, marginTop: 12, overflow: 'hidden', backgroundColor: '#111817', borderRadius: 10 },
  sampleImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  photoShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,.16)' },
  storyShade: { zIndex: 2 },
  sampleTopline: { position: 'absolute', top: 16, left: 16, right: 16, paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,.5)' },
  toplineText: { color: '#fff', fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  sampleCaption: { position: 'absolute', left: 17, right: 17, bottom: 17 },
  sampleKicker: { marginBottom: 7, color: '#dfff57', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  sampleTitle: { color: '#fff', fontSize: 31, lineHeight: 33, fontWeight: '900', letterSpacing: -1.2 },
  photoCredit: { marginTop: 12, color: 'rgba(255,255,255,.7)', fontSize: 8 },
  modeNote: { marginHorizontal: 14, marginTop: 10, padding: 15, backgroundColor: '#171717', borderRadius: 10 },
  modeTitle: { color: '#fff', fontSize: 12, fontWeight: '900' },
  modeText: { marginTop: 7, color: '#bbb7af', fontSize: 10, lineHeight: 16 },
  privacy: { marginTop: 14, color: '#8c8982', textAlign: 'center', fontSize: 9 },
  pressed: { opacity: .72 },
  loadingPage: { flex: 1, padding: 23, backgroundColor: '#f5f2ec' },
  loadingCenter: { flex: 1, justifyContent: 'center' },
  scanFrame: { position: 'relative', width: 285, height: 390, alignSelf: 'center', marginBottom: 34, overflow: 'hidden', backgroundColor: '#111817', borderRadius: 7, shadowColor: '#dfff57', shadowOffset: { width: 12, height: 12 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4 },
  scanImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  scanBar: { position: 'absolute', left: '5%', right: '5%', height: 2, backgroundColor: '#dfff57' },
  scanLabel: { position: 'absolute', right: 10, bottom: 10, paddingHorizontal: 8, paddingVertical: 6, color: '#161616', backgroundColor: '#dfff57', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  loadingTitle: { color: '#161616', fontSize: 30, lineHeight: 39, fontWeight: '900', letterSpacing: -1.1 },
  loadingText: { height: 23, marginTop: 14, marginBottom: 12, color: '#6f6d68', fontSize: 12 },
  progressTrack: { height: 5, overflow: 'hidden', backgroundColor: '#d9d5cc' },
  progressFill: { height: '100%', backgroundColor: '#ff5b35' },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  resultPage: { flex: 1, backgroundColor: '#ece9e3' },
  resultHeader: { height: 59, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f5f2ec', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#d8d4cc' },
  iconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  iconText: { color: '#161616', fontSize: 25 },
  shareGlyph: { color: '#161616', fontSize: 24, fontWeight: '800' },
  resultScroll: { paddingHorizontal: 11, paddingBottom: 100 },
  resultIntro: { paddingHorizontal: 7, paddingTop: 24, paddingBottom: 15, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  resultTitle: { color: '#161616', fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  resultDate: { color: '#77736d', textAlign: 'right', fontSize: 9, lineHeight: 13, fontWeight: '800', letterSpacing: 1 },
  ootdCard: { padding: 7, backgroundColor: '#fff', borderRadius: 10, shadowColor: '#25221d', shadowOffset: { width: 0, height: 15 }, shadowOpacity: .1, shadowRadius: 22, elevation: 5 },
  storyPhoto: { position: 'relative', height: 560, overflow: 'hidden', backgroundColor: '#111817', borderRadius: 6 },
  storyImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  tryonOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 1 },
  tryonLabel: { position: 'absolute', left: 16, bottom: 94, paddingHorizontal: 8, paddingVertical: 6, color: '#161616', backgroundColor: 'rgba(223,255,87,.95)', borderWidth: 1, borderColor: 'rgba(0,0,0,.18)', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  tryonShoe: { position: 'absolute', bottom: 35, width: 74, height: 24, backgroundColor: '#050505', borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 7 }, shadowOpacity: .35, shadowRadius: 10, opacity: .93 },
  tryonShoeLeft: { left: '39%', transform: [{ rotate: '-6deg' }] },
  tryonShoeRight: { left: '54%', transform: [{ rotate: '8deg' }] },
  tryonScarfMain: { position: 'absolute', left: '33%', top: '23%', width: '35%', height: 36, backgroundColor: '#d8c7a9', borderRadius: 999, opacity: .86 },
  tryonScarfTail: { position: 'absolute', top: '26%', width: 34, height: 116, backgroundColor: '#c6ad86', borderRadius: 16, opacity: .84 },
  tryonScarfTailLeft: { left: '39%', transform: [{ rotate: '12deg' }] },
  tryonScarfTailRight: { left: '53%', transform: [{ rotate: '-9deg' }] },
  tryonBagStrap: { position: 'absolute', right: '24%', top: '37%', width: 93, height: 175, borderWidth: 6, borderColor: 'rgba(50,33,26,.9)', borderBottomWidth: 0, borderTopLeftRadius: 80, borderTopRightRadius: 80, transform: [{ rotate: '-10deg' }], opacity: .82 },
  tryonBagBody: { position: 'absolute', right: '17%', top: '57%', width: 86, height: 92, backgroundColor: '#3c2a24', borderWidth: 2, borderColor: 'rgba(255,255,255,.2)', borderRadius: 16, opacity: .9 },
  storyTopline: { position: 'absolute', zIndex: 3, top: 16, left: 16, right: 16, paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,.5)' },
  tierBadge: { position: 'absolute', zIndex: 3, top: 49, left: 16, maxWidth: 150, padding: 9, backgroundColor: 'rgba(255,255,255,.88)' },
  tierName: { color: '#161616', fontSize: 18, fontWeight: '900' },
  tierTone: { marginTop: 2, color: '#55514b', fontSize: 8 },
  scoreStamp: { position: 'absolute', zIndex: 3, top: 48, right: 15, padding: 10, backgroundColor: '#dfff57', transform: [{ rotate: '2deg' }] },
  scoreStampLabel: { color: '#161616', fontSize: 7, fontWeight: '900', letterSpacing: .5 },
  scoreStampNumber: { color: '#161616', fontSize: 23, lineHeight: 25, fontWeight: '900' },
  scoreStampMax: { color: '#161616', fontSize: 7, fontWeight: '800' },
  appliedStyle: { position: 'absolute', zIndex: 3, top: 120, right: 15, paddingHorizontal: 10, paddingVertical: 8, color: '#fff', backgroundColor: '#ff5b35', fontSize: 9, fontWeight: '800' },
  stickerPack: { position: 'absolute', zIndex: 3, left: 15, top: 112, flexDirection: 'row', flexWrap: 'wrap', gap: 6, width: 190 },
  sticker: { paddingHorizontal: 9, paddingVertical: 6, color: '#161616', backgroundColor: '#dfff57', borderRadius: 99, fontSize: 9, fontWeight: '900' },
  storyTitle: { position: 'absolute', zIndex: 3, left: 18, right: 18, bottom: 19 },
  storyMy: { color: '#dfff57', fontSize: 12, fontWeight: '900', letterSpacing: 3 },
  storyOotd: { marginLeft: -3, color: '#fff', fontSize: 61, lineHeight: 61, fontWeight: '900', letterSpacing: -4 },
  storySubtitle: { marginTop: 7, color: 'rgba(255,255,255,.78)', fontSize: 11, lineHeight: 17 },
  resultCredit: { paddingVertical: 8, color: '#858078', textAlign: 'right', fontSize: 8 },
  aiTrigger: { marginHorizontal: 7, marginTop: 12, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f7f4ef', borderWidth: 1, borderColor: '#e4e0d8', borderRadius: 8 },
  aiTitle: { color: '#161616', fontSize: 12, fontWeight: '900' },
  aiText: { marginTop: 4, color: '#6a665f', fontSize: 9, lineHeight: 14 },
  aiState: { paddingHorizontal: 8, paddingVertical: 6, color: '#161616', backgroundColor: '#dfff57', borderWidth: 1, borderColor: '#161616', borderRadius: 20, fontSize: 9, fontWeight: '900' },
  viralVerdict: { marginHorizontal: 7, marginTop: 10, flexDirection: 'row', gap: 1, overflow: 'hidden', backgroundColor: '#ddd9d1', borderWidth: 1, borderColor: '#ddd9d1', borderRadius: 8 },
  viralBox: { flex: 1, minHeight: 76, padding: 12, backgroundColor: '#fff' },
  viralValue: { color: '#161616', fontSize: 18, fontWeight: '900', letterSpacing: -.8 },
  viralHint: { marginTop: 6, color: '#6d6962', fontSize: 9, lineHeight: 13 },
  memeGrid: { marginHorizontal: 7, marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  memeCard: { width: '48.9%', padding: 12, backgroundColor: '#f7f4ef', borderWidth: 1, borderColor: '#e4e0d8', borderRadius: 8 },
  memeTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  memeLabel: { color: '#161616', fontSize: 11, fontWeight: '900' },
  memeValue: { color: '#ff5b35', fontSize: 11, fontWeight: '900' },
  miniMeter: { height: 4, marginTop: 8, overflow: 'hidden', backgroundColor: '#dfdbd3', borderRadius: 20 },
  miniFill: { height: '100%', backgroundColor: '#161616' },
  memeComment: { marginTop: 7, color: '#6f6b64', fontSize: 9, lineHeight: 13 },
  lookHeading: { marginHorizontal: 7, marginTop: 15, paddingVertical: 14, flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#161616', borderBottomWidth: 1, borderBottomColor: '#ddd9d1' },
  lookLabel: { width: 84, color: '#161616', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  lookDescription: { flex: 1, color: '#59564f', fontSize: 11, lineHeight: 18 },
  itemGrid: { marginHorizontal: 7, flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderLeftWidth: 1, borderColor: '#ddd9d1' },
  itemCard: { width: '50%', minHeight: 142, padding: 12, borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#ddd9d1' },
  itemNumber: { marginBottom: 18, color: '#ff5b35', fontSize: 9, fontWeight: '900' },
  itemName: { color: '#161616', fontSize: 10, fontWeight: '900', letterSpacing: .2 },
  itemPrice: { marginTop: 3, color: '#77736c', fontSize: 9, fontWeight: '700' },
  itemNote: { marginTop: 8, color: '#6d6962', fontSize: 9, lineHeight: 14 },
  cardScore: { marginHorizontal: 7, marginTop: 18, marginBottom: 5, padding: 15, backgroundColor: '#161616', borderRadius: 8 },
  scoreLabel: { color: '#aaa69f', fontSize: 10 },
  scoreNumber: { marginTop: 4, color: '#fff', fontSize: 29, fontWeight: '900' },
  scoreMax: { color: '#85827c', fontSize: 8 },
  scoreTrack: { height: 3, marginTop: 12, overflow: 'hidden', backgroundColor: '#42413e' },
  scoreFill: { height: '100%', backgroundColor: '#dfff57' },
  scoreNote: { marginTop: 9, color: '#8f8c86', fontSize: 8 },
  friendNudge: { marginTop: 14, marginBottom: 24, padding: 14, backgroundColor: '#fff', borderWidth: 1, borderStyle: 'dashed', borderColor: '#c8c3b9', borderRadius: 10 },
  friendTitle: { color: '#161616', fontSize: 12, fontWeight: '900' },
  friendText: { marginTop: 6, color: '#6d6962', fontSize: 10, lineHeight: 16 },
  replayActions: { marginTop: 11, flexDirection: 'row', gap: 7 },
  replayButton: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f6f3ee', borderWidth: 1, borderColor: '#d7d2c7', borderRadius: 7 },
  replayText: { color: '#161616', fontSize: 10, fontWeight: '900' },
  actionDock: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 5, padding: 9, backgroundColor: '#fff', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#d8d4cc' },
  actionButton: { flex: 1, minHeight: 61, alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 5 },
  actionAccent: { flex: 1.15, backgroundColor: '#dfff57', borderWidth: 1, borderColor: '#161616' },
  actionGlyph: { color: '#161616', fontSize: 20, fontWeight: '900' },
  actionLabel: { color: '#57544f', fontSize: 10, fontWeight: '800' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(16,15,13,.56)' },
  modalSheet: { maxHeight: '88%', paddingTop: 9, paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 26 : 20, backgroundColor: '#f9f7f2', borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  modalHandle: { width: 39, height: 4, marginBottom: 19, alignSelf: 'center', backgroundColor: '#c9c5bd', borderRadius: 10 },
  modalTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  modalTitle: { color: '#161616', fontSize: 24, fontWeight: '900', letterSpacing: -.8 },
  closeButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ebe8e1', borderRadius: 20 },
  closeText: { color: '#5d5953', fontSize: 27 },
  modalContent: { paddingBottom: 10 },
  totalScore: { flexDirection: 'row', alignItems: 'baseline', gap: 5, marginTop: 22, marginBottom: 12, padding: 17, backgroundColor: '#161616', borderRadius: 8 },
  totalLabel: { flex: 1, color: '#aaa69e', fontSize: 10, fontWeight: '700' },
  totalNumber: { color: '#fff', fontSize: 28, fontWeight: '900' },
  totalMax: { color: '#89857e', fontSize: 9, fontWeight: '700' },
  roastLine: { marginBottom: 10, padding: 12, color: '#3e3a34', backgroundColor: '#fff', borderLeftWidth: 4, borderLeftColor: '#ff5b35', fontSize: 11, lineHeight: 17 },
  rankSnapshot: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 10 },
  rankBox: { width: '48.8%', minHeight: 70, padding: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e4e0d8', borderRadius: 8 },
  rankWide: { width: '100%', minHeight: 58 },
  rankValue: { color: '#161616', fontSize: 16, fontWeight: '900' },
  rankLabel: { marginTop: 5, color: '#77736c', fontSize: 9, fontWeight: '800' },
  memeBars: { gap: 7, marginBottom: 9 },
  memeBarCard: { width: '100%' },
  analysisRow: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#dfdcd5' },
  analysisHeading: { flexDirection: 'row', justifyContent: 'space-between' },
  analysisLabel: { color: '#161616', fontSize: 12, fontWeight: '800' },
  analysisValue: { color: '#5e5a53', fontSize: 10, fontWeight: '800' },
  smallTrack: { height: 4, marginTop: 8, overflow: 'hidden', backgroundColor: '#dfdbd3' },
  smallFill: { height: '100%', backgroundColor: '#ff5b35' },
  analysisNote: { marginTop: 7, color: '#77736c', fontSize: 10, lineHeight: 16 },
  funStats: { flexDirection: 'row', gap: 6, marginTop: 14 },
  funStat: { flex: 1, minHeight: 92, padding: 9, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e4e0d8', borderRadius: 8 },
  funValue: { color: '#ff5b35', fontSize: 18, fontWeight: '900' },
  funLabel: { marginTop: 5, color: '#161616', fontSize: 10, fontWeight: '900' },
  funText: { marginTop: 6, color: '#77736c', fontSize: 8, lineHeight: 12 },
  funNote: { marginTop: 18, color: '#969189', textAlign: 'center', fontSize: 9 },
  modalDescription: { marginTop: 14, marginBottom: 16, color: '#77736c', fontSize: 11, lineHeight: 17 },
  improvementCard: { marginBottom: 10, overflow: 'hidden', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0ddd6', borderRadius: 8 },
  improvementSelected: { backgroundColor: '#f3ffd1', borderColor: '#161616' },
  improvementButton: { minHeight: 98, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  suggestionVisual: { width: 68, height: 76, padding: 9, justifyContent: 'space-between' },
  suggestionTag: { color: '#fff', fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  suggestionGain: { color: '#fff', fontSize: 20, fontWeight: '900' },
  improvementCopy: { flex: 1 },
  improvementTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  improvementTitle: { color: '#161616', fontSize: 12, fontWeight: '900' },
  improvementGain: { color: '#ff5b35', fontSize: 10, fontWeight: '900' },
  improvementReason: { marginTop: 6, color: '#706c65', fontSize: 9, lineHeight: 15 },
  chevron: { color: '#77736c', fontSize: 17 },
  shopRow: { padding: 10, borderTopWidth: 1, borderTopColor: '#ebe7df', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shopText: { color: '#6f6b64', fontSize: 9 },
  shopLink: { paddingHorizontal: 9, paddingVertical: 6, overflow: 'hidden', color: '#fff', backgroundColor: '#161616', borderRadius: 99, fontSize: 9, fontWeight: '900' },
  resetButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 4, borderWidth: 1, borderColor: '#cbc7bf', borderRadius: 5 },
  resetText: { color: '#4e4a45', fontSize: 12, fontWeight: '800' },
})
