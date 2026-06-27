# FitScouter PoC

전신 OOTD 사진을 올리면 선택한 상황에 맞춰 `오늘의 패션력`, 티어, 한줄평, 보완 아이템을 카드 형태로 보여 주는 모바일 우선 PoC입니다. 정확한 외모 평가가 아니라 친구끼리 공유하고 웃을 수 있는 엔터테인먼트형 스타일 피드백을 목표로 합니다.

## 핵심 흐름

1. OOTD 전신 사진 업로드 또는 촬영
2. 선택 입력: 소개팅, 비즈니스 미팅, 운동, 친구 만남, 직접 입력
3. 결과 생성: 사진+스티커 기반 OOTD 카드, 패션력 점수, 티어, 상위 n%, 스타일 유형, 살짝 긁는 한줄평
4. 밈 스탯 확인: 돈빨, 센스, 눈치력, 첫인상 호감도
5. 상세 스탯 확인: 실루엣, 컬러, 아이템 합, 상황 적합도, 디테일, 공유 유발력
6. 보완 아이템 확인: 천사 아이템은 점수 상승 제안, 악마 아이템은 현재 룩에서 힘을 빼는 요소
7. 대표 상품 검색 링크 연결: 무신사, 29CM 등으로 이동
8. SNS 공유: 공유 버튼 클릭 시 AI 생성형 카드 트리거 후보로 표시
9. 재도전: 다른 상황이나 시즌으로 다시 평가

## 생성 전략

기본 결과물은 비용이 거의 없는 `기존 사진 + 스티커 + 점수 오버레이` 방식입니다. AI 생성형 이미지는 아래 조건에서만 발동하는 하이브리드 전략을 전제로 합니다.

- 고득점 또는 S급 이상
- SNS 공유 버튼 클릭
- 기기 기준 하루 1회 무료 생성

관련 모델/비용/배포처 검토는 [docs/product-review.md](docs/product-review.md)에 정리했습니다.

현재 제품 판단은 커뮤니티 전체를 먼저 만드는 것이 아니라, 친구에게 바로 던질 수 있는 공유 카드와 링크 기반 비교를 먼저 검증하는 방향입니다.

## 실행

```bash
npm install
npm run dev:web
npm run dev:native
```

## 로컬 Ollama 멀티모달 분석

웹 PoC는 로컬 Ollama가 실행 중이면 업로드한 사진을 `gemma3:4b` 모델에 보내 한줄평, 스타일 요약, 개선 포인트를 보정합니다. 상세 점수표와 밈 스탯은 응답 속도를 위해 앱의 기본 계산 로직으로 채우며, Ollama가 없거나 모델이 없으면 기본 mock 분석으로 자동 전환됩니다.

```bash
winget install Ollama.Ollama
ollama pull gemma3:4b
ollama serve
npm run ollama:check
npm run dev:web
```

브라우저 앱은 기본적으로 `http://127.0.0.1:11434`에 요청합니다. GitHub Pages에서 로컬 Ollama를 호출하려면 브라우저/CORS 설정에 따라 `OLLAMA_ORIGINS` 설정이 필요할 수 있습니다.

GitHub Pages 배포 URL에서 이 PC의 Ollama를 사용하려면 Ollama를 인터넷에 직접 열지 말고 로컬 프록시를 사용합니다.

```bash
ollama serve
npm run proxy:ollama
```

프록시는 기본적으로 `http://127.0.0.1:8787/api/analyze`에서 실행되고, GitHub Pages 페이지가 같은 PC 브라우저에서 열렸을 때 이 프록시를 통해 Ollama에 요청합니다. 외부 휴대폰이나 다른 PC에서도 쓰려면 Cloudflare Tunnel 같은 HTTPS 터널을 프록시에 연결한 뒤 GitHub Actions 변수 `VITE_AI_PROXY_URL`에 `https://<터널주소>/api/analyze`를 넣어 다시 배포합니다.

로컬 보안 체크:

- 기본 `npm run dev:web`와 `npm run preview:web`는 localhost에만 바인딩됩니다.
- 같은 Wi-Fi의 휴대폰/다른 PC에서 테스트해야 할 때만 web workspace의 `dev:lan` 또는 `preview:lan`을 사용합니다.
- Ollama는 기본값처럼 `127.0.0.1:11434`에만 열어두고, `OLLAMA_HOST=0.0.0.0`처럼 외부 네트워크에 노출하지 않습니다.
- `OLLAMA_ORIGINS=*`는 피하고, 필요할 때만 `http://localhost:5173` 또는 실제 GitHub Pages origin처럼 신뢰하는 origin으로 제한합니다.
- 업로드한 사진은 현재 파일로 저장하지 않고 브라우저에서 로컬 프록시를 거쳐 Ollama로만 전송됩니다. 외부 API로 전환할 때는 별도 개인정보 처리/저장 정책이 필요합니다.
- 프록시는 허용 origin, 요청 크기 제한, 간단한 IP rate limit을 적용합니다. 공개 서비스로 운영하려면 인증, 로깅 정책, abuse 방지 정책을 추가해야 합니다.

중요한 한계:

- Ollama의 일반 비전 모델은 사진을 분석하고 텍스트를 반환하는 용도입니다.
- 개선 아이템 클릭 시 보이는 변화는 현재 앱의 가상 시착 오버레이입니다.
- 실제 픽셀 단위 의상 변경 이미지를 만들려면 FLUX/Qwen Image Edit/Stable Diffusion 계열 이미지 편집 파이프라인이나 외부 이미지 생성 API가 별도로 필요합니다.

프로덕션 웹 빌드:

```bash
npm run typecheck
npm run build
```

Expo 네이티브 확인:

```bash
npm run dev:native
```

## GitHub Pages 배포

`.github/workflows/deploy-pages.yml`이 `main` 브랜치 push 시 `web/dist`를 GitHub Pages로 배포합니다.

1. GitHub에서 빈 저장소를 생성합니다.
2. 로컬 저장소에 remote를 연결합니다.

```bash
git remote add origin https://github.com/<GitHub아이디>/fitscouter.git
git push -u origin main
```

3. GitHub 저장소 `Settings > Pages > Build and deployment`에서 Source가 `GitHub Actions`인지 확인합니다.
4. Actions의 `Deploy web to GitHub Pages`가 완료되면 `https://<GitHub아이디>.github.io/fitscouter/`에서 확인합니다.

## 현재 구현 범위

- 웹 모바일 화면: 촬영/업로드, 상황 선택, 분석 로딩, OOTD 카드, 점수/티어, 상세 스탯, 보완 아이템, 상품 검색 링크, 공유 버튼
- Expo 네이티브 화면: 동일한 PoC 흐름
- 샘플 사진: Unsplash 사진을 사용하며 출처는 [ATTRIBUTIONS.md](ATTRIBUTIONS.md)에 기록
- 실제 AI 분석/이미지 생성/로그인/서버 저장은 아직 mock 데이터 기반입니다.

## 주의

서비스 문구는 외모·체형 평가가 아니라 스타일 조합 개선 중심이어야 합니다. 자극적인 한줄평은 재미 요소로만 제한하고, 비하·혐오·신체 평가로 흐르지 않도록 강도 조절과 신고/숨김 정책이 필요합니다.
