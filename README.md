# FitScouter PoC

전신 사진을 올리면 OOTD 카드와 재미 중심의 패션 전투력을 보여주는 모바일 우선 PoC입니다. 웹과 Expo 네이티브 앱이 같은 흐름을 제공합니다.

## 실행

```bash
npm install
npm run dev:web
npm run dev:native
```

모바일 웹의 프로덕션 결과를 로컬에서 확인하려면 다음 명령을 사용합니다.

```bash
npm run build
npm run preview:web
```

## GitHub Pages 배포

`.github/workflows/deploy-pages.yml`이 `main` 브랜치 푸시를 감지해 웹 앱을 자동 배포합니다. Vite 자산 경로는 저장소 이름과 무관하게 Pages 하위 경로에서 동작하도록 상대 경로로 빌드됩니다.

1. GitHub에서 빈 저장소를 생성합니다. 무료 계정에서 Pages를 사용할 경우 공개 저장소가 가장 단순합니다.
2. 아래 명령으로 이 로컬 저장소를 연결하고 푸시합니다.

```bash
git remote add origin https://github.com/<사용자명>/<저장소명>.git
git push -u origin main
```

3. 저장소의 `Settings > Pages > Build and deployment`에서 Source가 `GitHub Actions`인지 확인합니다.
4. Actions의 `Deploy web to GitHub Pages` 작업이 완료되면 `https://<사용자명>.github.io/<저장소명>/`에서 접속할 수 있습니다.

Pages는 정적 웹 호스팅입니다. 현재 PoC처럼 브라우저 안에서 동작하는 데모에는 충분하지만, 실제 AI 분석·이미지 생성·사용자 데이터 저장에는 별도 API 서버가 필요합니다.

## 검증

```bash
npm run typecheck
npm run build
```

## 구현 범위

- 카메라 촬영, 앨범 업로드, 샘플 체험
- 분석 진행 화면과 OOTD 결과 카드
- SNS 공유, 점수 산정 근거, 코디 개선 제안
- 개선 아이템 선택 시 카드 설명과 예상 점수 변경

## 샘플 사진

앱의 기본 OOTD 인물 사진은 Google 이미지 검색을 통해 찾은 Unsplash 사진을 사용합니다. 촬영자는 Branislav Rodman이며 원본과 라이선스 정보는 `ATTRIBUTIONS.md`에 기록했습니다. 앱 화면에서도 원본 링크를 제공합니다.

현재 이미지 분석과 생성은 데모 데이터로 동작합니다. 실제 출시 단계에서는 이미지 저장 동의, 삭제 정책, AI 분석/생성 API와 비동기 작업 상태를 서버에 연결해야 합니다.
