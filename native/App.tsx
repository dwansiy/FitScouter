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
  View,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { StatusBar } from 'expo-status-bar'

type Screen = 'upload' | 'loading' | 'result'
type Sheet = 'analysis' | 'improve' | null
type Variant = 'base' | 'derby' | 'accent' | 'bag'

const sampleImage = require('./assets/sample-ootd.jpg') as ImageSourcePropType
const photoSourceUrl = 'https://unsplash.com/photos/u_pB8KRvk-U'

const breakdown = [
  { label: '실루엣', score: 2380, max: 2500, note: '롱 코트와 여유로운 팬츠가 긴 세로선을 만들어요.' },
  { label: '컬러', score: 1880, max: 2000, note: '차콜 위에 레드 포인트를 얹어 시선이 분명해요.' },
  { label: '아이템 조합', score: 1820, max: 2000, note: '클래식한 코트와 레트로 스니커즈의 대비가 좋아요.' },
  { label: '상황 적합도', score: 1430, max: 1500, note: '도시에서 입기 좋은 개성 있는 데일리 룩이에요.' },
  { label: '디테일', score: 970, max: 1000, note: '아이웨어와 작은 패턴 백이 룩의 밀도를 높여요.' },
  { label: '개성', score: 950, max: 1000, note: '유행을 자기 방식으로 섞은 점이 좋아요.' },
]

const improvements = [
  { id: 'derby' as const, title: '블랙 더비 슈즈', gain: 100, tag: 'SHOES', color: '#20201f', reason: '코트의 클래식한 선이 더 또렷해져요.' },
  { id: 'accent' as const, title: '실버 액세서리', gain: 70, tag: 'DETAIL', color: '#c9c7c2', reason: '선글라스와 연결되는 차가운 포인트를 더해요.' },
  { id: 'bag' as const, title: '구조적인 숄더백', gain: 65, tag: 'BAG', color: '#593d34', reason: '각진 형태가 코트의 볼륨과 균형을 맞춰요.' },
]

const baseItems: [string, string, string][] = [
  ['HOUNDSTOOTH COAT', '₩289,000', '움직일 때 실루엣이 살아나는 넉넉한 롱 코트'],
  ['RED INNER TOP', '₩69,000', '어두운 룩의 중심을 잡아주는 컬러 포인트'],
  ['RELAXED TROUSERS', '₩129,000', '코트의 볼륨을 자연스럽게 이어주는 여유로운 핏'],
]

const variantItem: Record<Variant, [string, string, string]> = {
  base: ['RETRO SNEAKERS', '₩159,000', '클래식한 룩에 거리 감성을 더하는 스니커즈'],
  derby: ['BLACK DERBY', '₩219,000', '롱 코트를 정제된 인상으로 마무리하는 선택'],
  accent: ['SILVER JEWELRY', '₩89,000', '아이웨어와 연결되는 차가운 포인트'],
  bag: ['STRUCTURED BAG', '₩179,000', '볼륨감 있는 코트에 선명한 형태를 더하는 가방'],
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('upload')
  const [sheet, setSheet] = useState<Sheet>(null)
  const [variant, setVariant] = useState<Variant>('base')
  const [sourceUri, setSourceUri] = useState<string | null>(null)
  const [progress, setProgress] = useState(12)

  const improvement = improvements.find((item) => item.id === variant)
  const score = 9430 + (improvement?.gain ?? 0)
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
    await Share.share({ title: '오늘의 OOTD', message: `오늘의 OOTD · 패션 전투력 ${score.toLocaleString()} / 10,000 #FITSCOUTER` })
  }

  if (screen === 'loading') {
    const stage = progress < 45 ? '실루엣을 찾고 있어요' : progress < 78 ? '컬러와 아이템을 읽고 있어요' : 'OOTD 카드를 정리하고 있어요'
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.loadingPage} accessibilityLiveRegion="polite">
          <Brand />
          <View style={styles.loadingCenter}>
            <View style={styles.scanFrame}>
              <Image source={resultSource} style={styles.scanImage} accessibilityLabel="분석 중인 전신 사진" />
              <View style={[styles.scanBar, { top: `${Math.min(84, progress)}%` }]} />
              <Text style={styles.scanLabel}>SCANNING LOOK</Text>
            </View>
            <Text style={styles.eyebrow}>AI OUTFIT REPORT</Text>
            <Text style={styles.loadingTitle}>오늘의 룩을{`\n`}정리하고 있어요</Text>
            <Text style={styles.loadingText}>{stage}</Text>
            <View style={styles.progressTrack} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: progress }}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
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
            <Text style={styles.eyebrow}>YOUR LOOK, ARCHIVED</Text>
            <Text style={styles.heroTitle}>오늘 입은 옷을{`\n`}<Text style={styles.softText}>더 멋지게 기록하세요.</Text></Text>
            <Text style={styles.heroDescription}>전신 사진 한 장이면 충분해요.{`\n`}OOTD 카드와 재미로 보는 점수를 만들어 드려요.</Text>
          </View>
          <View style={styles.inputPanel}>
            <View style={styles.inputHeading}><Text style={styles.stepCircle}>01</Text><View><Text style={styles.inputTitle}>전신 사진을 추가하세요</Text><Text style={styles.inputHint}>머리부터 발끝까지 나오면 더 좋아요.</Text></View></View>
            <View style={styles.inputActions}>
              <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]} onPress={openCamera} accessibilityRole="button"><Text style={styles.primaryButtonText}>사진 찍기</Text></Pressable>
              <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]} onPress={openGallery} accessibilityRole="button"><Text style={styles.secondaryButtonText}>앨범 선택</Text></Pressable>
            </View>
            <Pressable onPress={() => beginAnalysis()} style={styles.sampleButton} accessibilityRole="button"><Text style={styles.sampleText}>샘플 사진으로 먼저 체험하기  →</Text></Pressable>
          </View>
          <View style={styles.sampleLook}>
            <Image source={sampleImage} style={styles.sampleImage} accessibilityLabel="긴 체크 코트와 스니커즈를 착용한 OOTD 샘플" />
            <View style={styles.photoShade} />
            <View style={styles.sampleTopline}><Text>LOOK 01</Text><Text>PRAGUE · 2024</Text></View>
            <View style={styles.sampleCaption}>
              <Text style={styles.sampleKicker}>EDITOR'S SAMPLE</Text>
              <Text style={styles.sampleTitle}>Classic coat,{`\n`}street attitude.</Text>
              <Pressable onPress={() => Linking.openURL(photoSourceUrl)} accessibilityRole="link"><Text style={styles.photoCredit}>Photo by Branislav Rodman · Unsplash</Text></Pressable>
            </View>
          </View>
          <Text style={styles.privacy}>선택한 사진은 이 PoC에서 서버로 전송되지 않아요.</Text>
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
          <View style={styles.resultIntro}><View><Text style={styles.eyebrow}>YOUR OUTFIT REPORT</Text><Text style={styles.resultTitle}>오늘의 OOTD</Text></View><Text style={styles.resultDate}>18 JUN{`\n`}2026</Text></View>
          <View style={styles.ootdCard}>
            <View style={styles.storyPhoto}>
              <Image source={resultSource} style={styles.storyImage} accessibilityLabel="생성된 오늘의 OOTD" />
              <View style={styles.photoShade} />
              <View style={styles.storyTopline}><Text>FITSCOUTER · LOOK 01</Text><Text>9:16</Text></View>
              <View style={styles.scoreStamp}><Text style={styles.scoreStampLabel}>FASHION POWER</Text><Text style={styles.scoreStampNumber}>{score.toLocaleString()}</Text><Text style={styles.scoreStampMax}>/ 10K</Text></View>
              {improvement && <Text style={styles.appliedStyle}>+{improvement.gain} · {improvement.title} 적용</Text>}
              <View style={styles.storyTitle}><Text style={styles.storyMy}>MY</Text><Text style={styles.storyOotd}>OOTD</Text><Text style={styles.storySubtitle}>Classic layers · Street details</Text></View>
            </View>
            {!sourceUri && <Pressable onPress={() => Linking.openURL(photoSourceUrl)}><Text style={styles.resultCredit}>Photo: Branislav Rodman / Unsplash ↗</Text></Pressable>}
            <View style={styles.lookHeading}><Text style={styles.lookLabel}>THE LOOK</Text><Text style={styles.lookDescription}>긴 실루엣과 강한 컬러 포인트가 만난 도시적인 레이어드 룩.</Text></View>
            <View style={styles.itemGrid}>
              {itemNotes.map(([name, price, note], index) => (
                <View style={styles.itemCard} key={name}><Text style={styles.itemNumber}>0{index + 1}</Text><Text style={styles.itemName}>{name}</Text><Text style={styles.itemPrice}>{price}</Text><Text style={styles.itemNote}>{note}</Text></View>
              ))}
            </View>
            <View style={styles.cardScore}><Text style={styles.scoreLabel}>오늘의 패션 전투력</Text><Text style={styles.scoreNumber}>{score.toLocaleString()}<Text style={styles.scoreMax}> / 10,000</Text></Text><View style={styles.scoreTrack}><View style={[styles.scoreFill, { width: `${score / 100}%` }]} /></View><Text style={styles.scoreNote}>친구와 공유하며 즐기는 재미 점수예요.</Text></View>
          </View>
        </ScrollView>
        <View style={styles.actionDock}>
          <ActionButton label="SNS 공유" glyph="↗" onPress={shareCard} />
          <ActionButton label="점수 분석" glyph="▥" onPress={() => setSheet('analysis')} />
          <ActionButton label="스타일 제안" glyph="✦" onPress={() => setSheet('improve')} accent />
        </View>
      </View>
      <DetailModal sheet={sheet} score={score} variant={variant} onClose={() => setSheet(null)} onSelect={(next) => { setVariant(next); setSheet(null) }} onReset={() => { setVariant('base'); setSheet(null) }} />
    </SafeAreaView>
  )
}

function Brand({ compact = false }: { compact?: boolean }) {
  return <View style={styles.brand}><View style={styles.brandMark}><Text style={styles.brandMarkText}>F</Text></View><Text style={[styles.brandText, compact && styles.brandCompact]}>FITSCOUTER</Text></View>
}

function ActionButton({ label, glyph, onPress, accent = false }: { label: string; glyph: string; onPress: () => void; accent?: boolean }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.actionButton, accent && styles.actionAccent, pressed && styles.pressed]} accessibilityRole="button"><Text style={styles.actionGlyph}>{glyph}</Text><Text style={styles.actionLabel}>{label}</Text></Pressable>
}

function DetailModal({ sheet, score, variant, onClose, onSelect, onReset }: { sheet: Sheet; score: number; variant: Variant; onClose: () => void; onSelect: (variant: Exclude<Variant, 'base'>) => void; onReset: () => void }) {
  return (
    <Modal visible={sheet !== null} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.modalBackdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="창 닫기">
        <Pressable style={styles.modalSheet} onPress={() => undefined}>
          <View style={styles.modalHandle} />
          <View style={styles.modalTitleRow}><View><Text style={styles.eyebrow}>{sheet === 'analysis' ? 'SCORE BREAKDOWN' : 'ONE SMALL CHANGE'}</Text><Text style={styles.modalTitle}>{sheet === 'analysis' ? '왜 이 점수인가요?' : '다음 룩은 이렇게'}</Text></View><Pressable style={styles.closeButton} onPress={onClose} accessibilityLabel="창 닫기"><Text style={styles.closeText}>×</Text></Pressable></View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
            {sheet === 'analysis' ? <>
              <View style={styles.totalScore}><Text style={styles.totalLabel}>현재 전투력</Text><Text style={styles.totalNumber}>{score.toLocaleString()}</Text><Text style={styles.totalMax}>/ 10,000</Text></View>
              {breakdown.map((row) => <View style={styles.analysisRow} key={row.label}><View style={styles.analysisHeading}><Text style={styles.analysisLabel}>{row.label}</Text><Text style={styles.analysisValue}>{row.score.toLocaleString()} / {row.max.toLocaleString()}</Text></View><View style={styles.smallTrack}><View style={[styles.smallFill, { width: `${row.score / row.max * 100}%` }]} /></View><Text style={styles.analysisNote}>{row.note}</Text></View>)}
              <Text style={styles.funNote}>재미를 위한 AI 의견이며 객관적인 가치 판단이 아니에요.</Text>
            </> : <>
              <Text style={styles.modalDescription}>선택하면 카드 설명과 예상 점수에 바로 반영돼요.</Text>
              {improvements.map((item) => <Pressable key={item.id} onPress={() => onSelect(item.id)} style={({ pressed }) => [styles.improvementButton, variant === item.id && styles.improvementSelected, pressed && styles.pressed]}><View style={[styles.suggestionVisual, { backgroundColor: item.color }]}><Text style={styles.suggestionTag}>{item.tag}</Text><Text style={styles.suggestionGain}>+{item.gain}</Text></View><View style={styles.improvementCopy}><View style={styles.improvementTitleRow}><Text style={styles.improvementTitle}>{item.title}</Text><Text style={styles.improvementGain}>+{item.gain}점</Text></View><Text style={styles.improvementReason}>{item.reason}</Text></View><Text style={styles.chevron}>→</Text></Pressable>)}
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
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 }, brandMark: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#dfff57', borderWidth: 1, borderColor: '#161616', borderRadius: 12 }, brandMarkText: { color: '#161616', fontSize: 12, fontWeight: '900' }, brandText: { color: '#161616', fontSize: 13, fontWeight: '900', letterSpacing: 1.1 }, brandCompact: { fontSize: 11 },
  labChip: { paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: '#161616', borderRadius: 20, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  hero: { paddingHorizontal: 22, paddingTop: 34, paddingBottom: 25 }, eyebrow: { marginBottom: 9, color: '#ff5b35', fontSize: 10, lineHeight: 14, fontWeight: '900', letterSpacing: 1.6 }, heroTitle: { color: '#161616', fontSize: 34, lineHeight: 44, fontWeight: '900', letterSpacing: -1.4 }, softText: { color: '#4c4a45' }, heroDescription: { marginTop: 14, color: '#6f6d68', fontSize: 13, lineHeight: 23 },
  sampleLook: { height: 448, marginHorizontal: 14, marginTop: 12, overflow: 'hidden', backgroundColor: '#111817', borderRadius: 7 }, sampleImage: { width: '100%', height: '100%', resizeMode: 'cover' }, photoShade: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,.12)' }, sampleTopline: { position: 'absolute', top: 16, left: 16, right: 16, paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,.5)' }, sampleCaption: { position: 'absolute', left: 17, right: 17, bottom: 17 }, sampleKicker: { marginBottom: 7, color: '#dfff57', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 }, sampleTitle: { color: '#fff', fontSize: 31, lineHeight: 33, fontWeight: '900', letterSpacing: -1.2 }, photoCredit: { marginTop: 12, color: 'rgba(255,255,255,.7)', fontSize: 8 },
  inputPanel: { marginHorizontal: 14, padding: 17, backgroundColor: '#fff', borderRadius: 7 }, inputHeading: { flexDirection: 'row', gap: 13, alignItems: 'flex-start', marginBottom: 18 }, stepCircle: { width: 30, height: 30, paddingTop: 8, color: '#fff', backgroundColor: '#161616', borderRadius: 15, textAlign: 'center', fontSize: 10, fontWeight: '800' }, inputTitle: { marginTop: 1, color: '#161616', fontSize: 14, fontWeight: '800' }, inputHint: { marginTop: 4, color: '#6f6d68', fontSize: 11 }, inputActions: { flexDirection: 'row', gap: 6 }, primaryButton: { flex: 1.4, minHeight: 54, alignItems: 'center', justifyContent: 'center', backgroundColor: '#161616', borderRadius: 3 }, primaryButtonText: { color: '#fff', fontSize: 14, fontWeight: '800' }, secondaryButton: { flex: 1, minHeight: 54, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#161616', borderRadius: 3 }, secondaryButtonText: { color: '#161616', fontSize: 13, fontWeight: '800' }, sampleButton: { paddingTop: 14 }, sampleText: { color: '#56534e', fontSize: 11, fontWeight: '700' }, privacy: { marginTop: 14, color: '#8c8982', textAlign: 'center', fontSize: 9 }, pressed: { opacity: .72, transform: [{ scale: .99 }] },
  loadingPage: { flex: 1, padding: 23, backgroundColor: '#f5f2ec' }, loadingCenter: { flex: 1, justifyContent: 'center' }, scanFrame: { position: 'relative', width: 285, height: 390, alignSelf: 'center', marginBottom: 34, overflow: 'hidden', backgroundColor: '#111817', borderRadius: 5, shadowColor: '#dfff57', shadowOffset: { width: 12, height: 12 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4 }, scanImage: { width: '100%', height: '100%', resizeMode: 'cover' }, scanBar: { position: 'absolute', left: '5%', right: '5%', height: 2, backgroundColor: '#dfff57' }, scanLabel: { position: 'absolute', right: 10, bottom: 10, paddingHorizontal: 8, paddingVertical: 6, color: '#161616', backgroundColor: '#dfff57', fontSize: 8, fontWeight: '900', letterSpacing: 1 }, loadingTitle: { color: '#161616', fontSize: 30, lineHeight: 39, fontWeight: '900', letterSpacing: -1.1 }, loadingText: { height: 23, marginTop: 14, marginBottom: 12, color: '#6f6d68', fontSize: 12 }, progressTrack: { height: 5, overflow: 'hidden', backgroundColor: '#d9d5cc' }, progressFill: { height: '100%', backgroundColor: '#ff5b35' }, progressMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  resultPage: { flex: 1, backgroundColor: '#ece9e3' }, resultHeader: { height: 59, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f5f2ec', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#d8d4cc' }, iconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }, iconText: { color: '#161616', fontSize: 25 }, shareGlyph: { color: '#161616', fontSize: 24, fontWeight: '800' }, resultScroll: { paddingHorizontal: 11, paddingBottom: 100 }, resultIntro: { paddingHorizontal: 7, paddingTop: 24, paddingBottom: 15, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }, resultTitle: { color: '#161616', fontSize: 28, fontWeight: '900', letterSpacing: -1 }, resultDate: { color: '#77736d', textAlign: 'right', fontSize: 9, lineHeight: 13, fontWeight: '800', letterSpacing: 1 },
  ootdCard: { padding: 7, backgroundColor: '#fff', borderRadius: 8, shadowColor: '#25221d', shadowOffset: { width: 0, height: 15 }, shadowOpacity: .1, shadowRadius: 22, elevation: 5 }, storyPhoto: { position: 'relative', height: 560, overflow: 'hidden', backgroundColor: '#111817', borderRadius: 4 }, storyImage: { width: '100%', height: '100%', resizeMode: 'cover' }, storyTopline: { position: 'absolute', top: 16, left: 16, right: 16, paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,.5)' }, scoreStamp: { position: 'absolute', top: 48, right: 15, padding: 10, backgroundColor: '#dfff57' }, scoreStampLabel: { color: '#161616', fontSize: 7, fontWeight: '900', letterSpacing: .5 }, scoreStampNumber: { color: '#161616', fontSize: 23, lineHeight: 25, fontWeight: '900' }, scoreStampMax: { color: '#161616', fontSize: 7, fontWeight: '800' }, appliedStyle: { position: 'absolute', top: 120, right: 15, paddingHorizontal: 10, paddingVertical: 8, color: '#fff', backgroundColor: '#ff5b35', fontSize: 9, fontWeight: '800' }, storyTitle: { position: 'absolute', left: 18, right: 18, bottom: 19 }, storyMy: { color: '#dfff57', fontSize: 12, fontWeight: '900', letterSpacing: 3 }, storyOotd: { marginLeft: -3, color: '#fff', fontSize: 61, lineHeight: 61, fontWeight: '900', letterSpacing: -4 }, storySubtitle: { marginTop: 7, color: 'rgba(255,255,255,.75)', fontSize: 11 }, resultCredit: { paddingVertical: 8, color: '#858078', textAlign: 'right', fontSize: 8 }, lookHeading: { marginHorizontal: 7, marginTop: 15, paddingVertical: 14, flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#161616', borderBottomWidth: 1, borderBottomColor: '#ddd9d1' }, lookLabel: { width: 84, color: '#161616', fontSize: 10, fontWeight: '900', letterSpacing: 1 }, lookDescription: { flex: 1, color: '#59564f', fontSize: 11, lineHeight: 18 }, itemGrid: { marginHorizontal: 7, flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderLeftWidth: 1, borderColor: '#ddd9d1' }, itemCard: { width: '50%', minHeight: 142, padding: 12, borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#ddd9d1' }, itemNumber: { marginBottom: 18, color: '#ff5b35', fontSize: 9, fontWeight: '900' }, itemName: { color: '#161616', fontSize: 10, fontWeight: '900', letterSpacing: .2 }, itemPrice: { marginTop: 3, color: '#77736c', fontSize: 9, fontWeight: '700' }, itemNote: { marginTop: 8, color: '#6d6962', fontSize: 9, lineHeight: 14 }, cardScore: { marginHorizontal: 7, marginTop: 18, marginBottom: 5, padding: 15, backgroundColor: '#161616' }, scoreLabel: { color: '#aaa69f', fontSize: 10 }, scoreNumber: { marginTop: 4, color: '#fff', fontSize: 29, fontWeight: '900' }, scoreMax: { color: '#85827c', fontSize: 8 }, scoreTrack: { height: 3, marginTop: 12, overflow: 'hidden', backgroundColor: '#42413e' }, scoreFill: { height: '100%', backgroundColor: '#dfff57' }, scoreNote: { marginTop: 9, color: '#8f8c86', fontSize: 8 },
  actionDock: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 5, padding: 9, backgroundColor: '#fff', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#d8d4cc' }, actionButton: { flex: 1, minHeight: 61, alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 3 }, actionAccent: { flex: 1.15, backgroundColor: '#dfff57', borderWidth: 1, borderColor: '#161616' }, actionGlyph: { color: '#161616', fontSize: 20, fontWeight: '900' }, actionLabel: { color: '#57544f', fontSize: 10, fontWeight: '800' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(16,15,13,.56)' }, modalSheet: { maxHeight: '88%', paddingTop: 9, paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 26 : 20, backgroundColor: '#f9f7f2', borderTopLeftRadius: 18, borderTopRightRadius: 18 }, modalHandle: { width: 39, height: 4, marginBottom: 19, alignSelf: 'center', backgroundColor: '#c9c5bd', borderRadius: 10 }, modalTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }, modalTitle: { color: '#161616', fontSize: 24, fontWeight: '900', letterSpacing: -.8 }, closeButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ebe8e1', borderRadius: 20 }, closeText: { color: '#5d5953', fontSize: 27 }, modalContent: { paddingBottom: 10 }, totalScore: { flexDirection: 'row', alignItems: 'baseline', gap: 5, marginTop: 22, marginBottom: 16, padding: 17, backgroundColor: '#161616' }, totalLabel: { flex: 1, color: '#aaa69e', fontSize: 10, fontWeight: '700' }, totalNumber: { color: '#fff', fontSize: 28, fontWeight: '900' }, totalMax: { color: '#89857e', fontSize: 9, fontWeight: '700' }, analysisRow: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#dfdcd5' }, analysisHeading: { flexDirection: 'row', justifyContent: 'space-between' }, analysisLabel: { color: '#161616', fontSize: 12, fontWeight: '800' }, analysisValue: { color: '#5e5a53', fontSize: 10, fontWeight: '800' }, smallTrack: { height: 4, marginTop: 8, overflow: 'hidden', backgroundColor: '#dfdbd3' }, smallFill: { height: '100%', backgroundColor: '#ff5b35' }, analysisNote: { marginTop: 7, color: '#77736c', fontSize: 10, lineHeight: 16 }, funNote: { marginTop: 18, color: '#969189', textAlign: 'center', fontSize: 9 }, modalDescription: { marginTop: 14, marginBottom: 16, color: '#77736c', fontSize: 11 }, improvementButton: { minHeight: 98, marginBottom: 9, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0ddd6', borderRadius: 4 }, improvementSelected: { backgroundColor: '#f3ffd1', borderColor: '#161616' }, suggestionVisual: { width: 68, height: 76, padding: 9, justifyContent: 'space-between' }, suggestionTag: { color: '#fff', fontSize: 7, fontWeight: '900', letterSpacing: 1 }, suggestionGain: { color: '#fff', fontSize: 20, fontWeight: '900' }, improvementCopy: { flex: 1 }, improvementTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 }, improvementTitle: { color: '#161616', fontSize: 12, fontWeight: '900' }, improvementGain: { color: '#ff5b35', fontSize: 10, fontWeight: '900' }, improvementReason: { marginTop: 6, color: '#706c65', fontSize: 9, lineHeight: 15 }, chevron: { color: '#77736c', fontSize: 17 }, resetButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 4, borderWidth: 1, borderColor: '#cbc7bf', borderRadius: 3 }, resetText: { color: '#4e4a45', fontSize: 12, fontWeight: '800' },
})
