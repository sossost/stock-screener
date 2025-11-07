# 📈 Stock Screener

개인 투자용으로 만든 주식 스크리닝 도구입니다. 기술적 분석과 펀더멘털 분석을 간단하게 확인할 수 있어요.

## 🎯 뭐가 있나요?

### 📈 주식 스크리너 (메인)

- **통합 스크리너**: 모든 필터를 한 페이지에서 사용 가능
- **Golden Cross 필터**: 이동평균선 정배열(MA20 > MA50 > MA100 > MA200) 조건을 선택적으로 적용
  - 기본값: 활성화 (정배열 종목만 표시)
  - 비활성화 시: 모든 종목 표시 (Golden Cross 조건 무시)
- **정배열 옵션**: 
  - "전체 정배열": 현재 정배열 상태인 종목
  - "최근 전환": 최근 N일 내에 정배열로 전환한 종목 (Golden Cross 필터 활성화 시에만 사용 가능)
- **성장성 필터**:
  - **연속 성장 분기 수**: 연속 2-8분기 매출/수익 성장 기업 선별
  - **평균 성장률**: 선택한 N분기 동안 평균 성장률이 X% 이상인 기업 선별
  - 두 가지 필터를 조합하여 사용 가능 (AND 조건)
- **8분기 재무 차트**: 최근 8분기 매출/EPS 트렌드 시각화
- **수익성 필터**: 흑자/적자 기업 구분

### 🎯 Rule of 40 스크리너

- SaaS 기업들 중에서 성장률 + 수익성이 좋은 애들
- (성장률 + EBITDA 마진) ≥ 40% 조건
- **참고**: 현재 UI는 제거되었으나 API 엔드포인트는 보존되어 있음 (`/api/screener/rule-of-40`)

### 🔄 Turn-Around 스크리너

- 손실에서 수익으로 바뀐 기업들
- 회생하는 기업들 찾기
- **참고**: 현재 UI는 제거되었으나 API 엔드포인트는 보존되어 있음 (`/api/screener/turned-profitable`)

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

### 주식 스크리너 사용법

1. **Golden Cross 필터**

   - 체크박스로 활성화/비활성화 가능
   - 활성화 시: 정배열 조건을 만족하는 종목만 표시
   - 비활성화 시: 모든 종목 표시 (Golden Cross 조건 무시)
   - 활성화된 경우에만 "전체 정배열" / "최근 전환" 옵션 사용 가능

2. **정배열 옵션** (Golden Cross 필터 활성화 시)

   - "전체 정배열": 현재 정배열 상태인 종목
   - "최근 전환": 최근 N일 내에 정배열로 전환한 종목
   - 기간 입력: 1-60일 (최근 전환 선택 시)

3. **성장성 필터 (매출/수익)**

   - **연속 성장 분기 수 모드**:
     - 체크박스 활성화 후 분기 수 입력 (2-8분기)
     - 예: "매출 4분기 연속 상승" → 최근 4분기 동안 매출이 계속 증가한 기업
   - **평균 성장률 모드**:
     - 체크박스 활성화 후 성장률 % 입력 (0-1000%)
     - 예: "매출 평균 성장률 30% 이상" → 최근 N분기 동안 평균 성장률이 30% 이상인 기업
   - 두 모드를 조합하여 사용 가능 (예: "4분기 연속 상승" + "평균 25% 이상")

4. **수익성 필터**
   - 전체 / 흑자 / 적자 기업 구분

5. **재무 차트**
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
