# 📈 Stock Screener

개인 투자용으로 만든 주식 스크리닝 도구입니다. 기술적 분석과 펀더멘털 분석을 간단하게 확인할 수 있어요.

## 🎯 뭐가 있나요?

### 📈 Golden Cross 스크리너

- 이동평균선이 정배열(MA20 > MA50 > MA100 > MA200)인 종목들
- 최근에 갑자기 정배열로 바뀐 종목들도 따로 볼 수 있음
- **🆕 성장성 필터**:
  - **연속 성장 분기 수**: 연속 2-8분기 매출/수익 성장 기업 선별
  - **평균 성장률**: 선택한 N분기 동안 평균 성장률이 X% 이상인 기업 선별
  - 두 가지 필터를 조합하여 사용 가능
- **🆕 8분기 재무 차트**: 최근 8분기 매출/EPS 트렌드 시각화
- **🆕 수익성 필터**: 흑자/적자 기업 구분

### 🎯 Rule of 40 스크리너

- SaaS 기업들 중에서 성장률 + 수익성이 좋은 애들
- (성장률 + EBITDA 마진) ≥ 40% 조건

### 🔄 Turn-Around 스크리너

- 손실에서 수익으로 바뀐 기업들
- 회생하는 기업들 찾기

## 🛠️ 뭘 썼나요?

- **Next.js 15** + **React 19** + **TypeScript**
- **Tailwind CSS** + **Shadcn/ui** (UI가 예쁘게 나오게)
- **PostgreSQL** + **Drizzle ORM** (데이터 저장)
- **FMP API** (주식 데이터 가져오기)
- **Vercel** (배포)

## 📊 데이터는 어떻게?

1. **NASDAQ 심볼들** 가져오기
2. **일일 주가** 데이터 수집
3. **분기별 재무** 데이터 수집
4. **이동평균선** 계산
5. **비정상 종목들** (워런트, ETF 등) 제거

## 🚀 어떻게 실행하나요?

### 1. 클론하고 설치

```bash
git clone https://github.com/your-username/screener.git
cd screener
yarn install
```

### 2. 환경변수 설정

`.env.local` 파일 만들고:

```env
FMP_API_KEY=your_fmp_api_key_here
DATABASE_URL=postgresql://username:password@localhost:5432/screener
```

### 3. 데이터베이스 설정

```bash
yarn db:push
yarn etl:symbols
yarn etl:daily-prices
yarn etl:daily-ma
```

### 4. 실행

```bash
yarn dev
```

## 🧪 테스트

```bash
# 모든 테스트 실행
yarn test

# Watch 모드 (파일 변경 시 자동 실행)
yarn test:watch

# UI 모드 (브라우저에서 결과 확인)
yarn test:ui

# 테스트 + 빌드 모두 실행
yarn test:all
```

자세한 내용은 [TESTING.md](./TESTING.md) 참고

## 📝 사용법

### Golden Cross 스크리너 사용법

1. **기본 필터**

   - "전체 정배열" vs "최근 전환" 토글: 전체 정배열 종목 vs 최근 N일 내 전환 종목
   - 수익성 필터: 흑자/적자 기업 구분

2. **성장성 필터 (매출/수익)**

   - **연속 성장 분기 수 모드**:
     - 체크박스 활성화 후 분기 수 입력 (2-8분기)
     - 예: "매출 4분기 연속 상승" → 최근 4분기 동안 매출이 계속 증가한 기업
   - **평균 성장률 모드**:
     - 체크박스 활성화 후 성장률 % 입력 (0-1000%)
     - 예: "매출 평균 성장률 30% 이상" → 최근 N분기 동안 평균 성장률이 30% 이상인 기업
   - 두 모드를 조합하여 사용 가능 (예: "4분기 연속 상승" + "평균 25% 이상")

3. **재무 차트**
   - 각 종목의 최근 8분기 매출/EPS 트렌드 시각화
   - 성장 패턴을 한눈에 확인 가능

### 데이터 업데이트

- 데이터는 매일 업데이트 (수동으로 `yarn etl:daily-prices` 실행)
- 분기별 재무 데이터는 `yarn etl:quarterly-financials` 실행

## 🔧 유용한 명령어들

```bash
yarn dev                    # 개발 서버
yarn build                  # 빌드
yarn test                   # 테스트 실행
yarn test:all               # 테스트 + 빌드 모두 실행
yarn feature:checklist      # 피쳐 개발 체크리스트 확인
yarn etl:daily-prices       # 주가 업데이트
yarn etl:daily-ma          # 이동평균선 계산
yarn etl:cleanup-invalid-symbols  # 비정상 종목 정리
```

## 🚀 새로운 피쳐 개발하기

새로운 피쳐를 개발할 때는 다음 워크플로우를 따르세요:

1. **스펙 작성** → `.specify/specs/[feature-name]/spec.md`
2. **플랜 작성** → `.specify/specs/[feature-name]/plan.md`
3. **태스크 작성** → `.specify/specs/[feature-name]/tasks.md`
4. **구현** → 백엔드 → 프론트엔드 → 타입
5. **테스트** → 단위 테스트 → API 테스트 → 컴포넌트 테스트
6. **리팩토링** → 코드 품질 개선
7. **문서화** → README 업데이트
8. **빌드 테스트** → `yarn test:all`

자세한 내용은 [FEATURE_DEVELOPMENT_WORKFLOW.md](.specify/templates/FEATURE_DEVELOPMENT_WORKFLOW.md) 참고

## 📁 폴더 구조

```
src/
├── app/                    # Next.js 페이지들
│   ├── api/               # API 엔드포인트
│   └── screener/          # 스크리너 페이지들
├── components/            # 재사용 컴포넌트
├── db/                   # 데이터베이스
├── etl/                  # 데이터 처리 작업들
└── utils/               # 유틸리티
```
