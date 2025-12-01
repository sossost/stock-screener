# 📈 Stock Screener

개인 투자용으로 만든 주식 스크리닝 도구입니다. 기술적 분석과 펀더멘털 분석을 간단하게 확인할 수 있어요.

> 구조 참고: 모노레포 루트 아래 `apps/web`이 Next.js 웹앱 소스입니다. 공용 스크립트는 루트 `package.json`에서 `yarn dev|build|test`로 호출하면 자동으로 `apps/web` 워크스페이스를 실행합니다.

## 🎯 뭐가 있나요?

### 📈 주식 스크리너 (메인)

- **통합 스크리너**: 모든 필터를 한 페이지에서 사용 가능
- **티커 검색 필터**: 검색 인풋에 티커를 입력하여 원하는 종목만 빠르게 필터링
  - 대소문자 구분 없는 부분 일치 검색
  - 실시간 필터링 (debounce + useDeferredValue 최적화)
  - 기존 필터와 AND 조건으로 통합
- **카테고리별 필터박스**: 필터를 이평선/성장성/수익성으로 분류하여 관리
  - 각 필터박스를 클릭하면 해당 카테고리의 필터만 팝업으로 표시
  - 필터박스에 현재 적용된 필터 요약 표시
- **필터 자동 저장**: 설정한 필터가 자동으로 localStorage에 저장되어 다음 접근 시 자동 적용
  - 필터 변경 시 자동 저장 (500ms debounce)
  - URL 파라미터가 없을 때 localStorage 기본값 자동 적용
  - URL 파라미터가 있으면 URL 우선 적용
- **테이블 정렬 자동 저장**: 테이블 정렬 상태가 자동으로 localStorage에 저장되어 새로고침 후에도 유지
  - 정렬 변경 시 즉시 저장
  - 페이지 로드 시 마지막 정렬 상태 자동 복원
- **이평선 필터**:
  - **정배열 필터**: 이동평균선 정배열(MA20 > MA50 > MA100 > MA200) 조건을 선택적으로 적용
    - 비활성화 시: 모든 종목 표시 (Golden Cross 조건 무시)
  - **Golden Cross 필터**: MA50 > MA200 조건을 선택적으로 적용
  - **정배열 옵션**:
    - "전체 정배열": 현재 정배열 상태인 종목
    - "최근 전환": 최근 N일 내에 정배열로 전환한 종목 (정배열 필터 활성화 시에만 사용 가능)
  - **이평선 위 필터**: 종가가 특정 이평선 위에 있는 종목만 필터링
    - 20MA, 50MA, 100MA, 200MA 중복 선택 가능 (AND 조건)
    - 예: 20MA + 50MA 선택 시 종가 > MA20 AND 종가 > MA50인 종목만 표시
- **성장성 필터**:
  - **연속 성장 분기 수**: 연속 2-8분기 매출/수익 성장 기업 선별
  - **평균 성장률**: 선택한 N분기 동안 평균 성장률이 X% 이상인 기업 선별
  - **저평가 필터 (PEG < 1)**: 성장 대비 저평가인 종목 선별 (0 이상 1 미만, 음수 제외)
  - 두 가지 필터를 조합하여 사용 가능 (AND 조건)
- **밸류에이션 지표**: 테이블에 PER(Price-to-Earnings Ratio) 및 PEG(Price/Earnings to Growth Ratio) 컬럼 표시
  - PER: 주가를 주당순이익(EPS)으로 나눈 값으로 종목의 밸류에이션 평가
  - PEG: PER을 성장률로 나눈 값으로 성장성을 고려한 밸류에이션 평가
- **8분기 재무 차트**: 최근 8분기 매출/EPS 트렌드 시각화
- **수익성 필터**: 흑자/적자 기업 구분
- **최근 흑자 전환 필터**: EPS기준 직전 분기부터 적자에서 흑자로 전환된 기업 구분
- **RS 상대강도**: 최근 12/6/3개월 수익률을 가중합(0.3/0.3/0.4)한 점수로 테이블에 표시 및 정렬 지원
- **섹터 컬럼**: 섹터를 테이블에 노출(한글 라벨로 표시), 정렬 지원

### 📊 종목 상세 페이지

- **종목 상세 정보**: 스크리너에서 티커 클릭 시 상세 페이지로 이동
  - 기본 정보: 회사명, 섹터, 산업, 거래소
  - 기술적 지표: 현재가, RS Score, 정배열/골든크로스 상태
  - 밸류에이션: P/E, PEG, P/S, P/B, EV/EBITDA (매일 업데이트)
  - 분기 재무: 수익성, 재무 건전성, 배당 (분기별 업데이트)
  - 분기별 실적 차트: 매출/EPS 추이 (최근 8분기, 0 기준 막대그래프)
  - **주가 차트**:
    - 캔들스틱 차트 + 거래량
    - 이동평균선 (SMA 20/50/100/200) - 클라이언트 계산
    - RSI (14) - 30/70 기준선
    - MACD (12, 26, 9) - 히스토그램 + Signal Line
    - 호버 시 OHLC, 변동률, 거래량, MA 값 표시
  - 관심종목 추가/제거, 외부 링크 (Seeking Alpha)

### 📝 매매일지 (Trading Journal)

- **수기 매매일지**: 분할 매수/매도, 피라미딩, 트레일링 스탑 등 매매 내역 기록
  - 신규 매매 생성 (진입가, 손절가, n차 목표가, 전략 태그)
  - 분할 매수/매도 기록 (날짜, 가격, 수량, 메모)
  - 자동 계산: 평단가, 보유수량, 손익금, 수익률, R-Multiple
  - 수수료율 설정 (개인화, localStorage 저장)
- **자산 관리**: 현금 + 포지션 = 자산총계 트래킹
  - 현금 보유 입력 (DB 저장)
  - 포지션 가치 = 현재가 × 수량 (시가평가)
  - 포지션별 비중 표시
  - 자산 할당 파이 차트 및 자산 흐름 그래프
- **가격 바 차트**: 손절가 ~ 목표가 시각화
  - 손절가, 평단가, 현재가, n차 목표가를 점으로 표시
  - 현재가 위치 + 평단가 대비 손익 퍼센트 표시
- **매매 복기**: 종료 시 실수 태그 + 리뷰 노트 기록
- **통계 대시보드**: 승률, 평균 R-Multiple, 실수 유형별 분석

### 💼 관심종목 (Watchlist)

- **관심종목 기능**: 관심 종목을 저장하고 관리
  - 스크리너에서 종목을 관심종목에 추가/제거
  - 세션 기반 저장 (쿠키 사용)
  - 관심종목 페이지에서 저장된 종목의 재무 데이터 확인
  - 서버 사이드 렌더링으로 빠른 로딩

## 🛠️ 뭘 썼나요?

- **Next.js 15** + **React 19** + **TypeScript**
- **Tailwind CSS** + **Shadcn/ui** (UI가 예쁘게 나오게)
- **PostgreSQL** + **Drizzle ORM** (데이터 저장)
- **FMP API** (주식 데이터 가져오기)
- **Vercel** (배포)

## 📊 데이터는 어떻게?

1. **미국 주식 심볼** 가져오기 (NASDAQ, NYSE, AMEX)
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

`apps/web/.env.local` 파일 만들고:

```env
FMP_API_KEY=your_fmp_api_key_here
DATABASE_URL=postgresql://username:password@localhost:5432/screener
DATA_API=https://financialmodelingprep.com/
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
# lint 체크
yarn lint
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

자세한 내용은 [`docs/TESTING.md`](./docs/TESTING.md) 참고

## 📝 사용법

### 주식 스크리너 사용법

1. **티커 검색 필터**
   - 필터 라인 오른쪽 끝에 검색 인풋이 표시됩니다
   - 티커의 일부를 입력하면 해당 티커가 포함된 종목만 테이블에 표시됩니다
   - 예: "NV" 입력 → NVDA, NVDL 등 "NV"가 포함된 종목만 표시
   - 검색어를 지우면 모든 종목이 다시 표시됩니다
   - 다른 필터와 함께 사용 시 AND 조건으로 동작합니다

2. **필터박스 사용법**
   - 화면 상단에 이평선/성장성/수익성 필터박스가 표시됩니다
   - 각 필터박스를 클릭하면 해당 카테고리의 필터만 팝업으로 표시됩니다
   - 필터박스에 현재 적용된 필터 요약이 표시됩니다

- **필터 자동 저장**: 필터를 적용하면 자동으로 localStorage에 저장되어 다음 접근 시 자동 적용됩니다
  - URL 파라미터가 없을 때: localStorage에 저장된 필터가 자동 적용됩니다
  - URL 파라미터가 있을 때: URL의 필터가 우선 적용됩니다 (공유 링크 등)
- **테이블 정렬 자동 저장**: 테이블 헤더를 클릭하여 정렬을 변경하면 자동으로 저장되어 새로고침 후에도 유지됩니다

3. **이평선 필터**
   - **정배열 필터**: 체크박스로 활성화/비활성화 가능
     - 활성화 시: MA20 > MA50 > MA100 > MA200 조건을 만족하는 종목만 표시
     - 비활성화 시: 모든 종목 표시 (정배열 조건 무시)
   - **Golden Cross 필터**: 체크박스로 활성화/비활성화 가능
     - 활성화 시: MA50 > MA200 조건을 만족하는 종목만 표시
   - **정배열 옵션** (정배열 필터 활성화 시):
     - "전체 정배열": 현재 정배열 상태인 종목
     - "최근 전환": 최근 N일 내에 정배열로 전환한 종목
     - 기간 입력: 1-60일 (최근 전환 선택 시)

4. **성장성 필터 (매출/수익)**
   - **연속 성장 분기 수 모드**:
     - 체크박스 활성화 후 분기 수 입력 (2-8분기)
     - 예: "매출 4분기 연속 상승" → 최근 4분기 동안 매출이 계속 증가한 기업
   - **평균 성장률 모드**:
     - 체크박스 활성화 후 성장률 % 입력 (0-1000%)
     - 예: "매출 평균 성장률 30% 이상" → 최근 N분기 동안 평균 성장률이 30% 이상인 기업
   - **저평가 필터 (PEG < 1)**:
     - 체크박스 활성화 시 PEG가 0 이상 1 미만인 종목만 표시
     - 성장 대비 저평가인 종목을 선별하는 데 유용
   - 두 모드를 조합하여 사용 가능 (예: "4분기 연속 상승" + "평균 25% 이상" + "PEG < 1")

5. **수익성 필터**
   - 전체 / 흑자 / 적자 기업 구분
   - **최근 흑자 전환**: 가장 최근 분기 EPS가 양수이고 직전 분기 EPS가 0 이하인 기업만 포함 (EPS 데이터 2분기 미만이면 제외)
   - 사용법: 수익성 필터 팝업에서 체크박스를 켠 뒤 닫기 → 다른 필터와 AND 조건으로 동작

6. **밸류에이션 지표 (PER/PEG)**
   - 테이블에 PER과 PEG 컬럼이 표시됩니다
   - PER: 주가를 주당순이익으로 나눈 값 (낮을수록 저평가)
   - PEG: PER을 성장률로 나눈 값 (1 미만이면 성장 대비 저평가)
   - 데이터가 없는 경우 "-"로 표시됩니다

7. **재무 차트**
   - 각 종목의 최근 8분기 매출/EPS 트렌드 시각화
   - 성장 패턴을 한눈에 확인 가능

### 데이터 업데이트

- 데이터는 매일 업데이트 (수동: `yarn etl:daily-prices`)
- GitHub Actions 스케줄: 23:30 UTC(= KST 08:30) 단일 스케줄로 prices → MA/RS → ratios 순차 실행
- 분기별 재무 데이터는 `yarn etl:quarterly-financials` 실행
- RS 점수는 가격 데이터 기반으로 `yarn etl:rs`(최신일) 또는 `yarn etl:rs-backfill`(최근 1년) 실행
- 일일 밸류에이션(PER/PEG 등)은 `yarn etl:daily-ratios` 실행 (FMP TTM API 사용)

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
yarn etl:rs                 # RS(12M/6M/3M 가중) 계산
yarn etl:rs-backfill        # RS 최근 1년치 백필
yarn etl:daily-ratios       # 일일 밸류에이션 (PER/PEG 등)
# 모바일(Expo) 개발
yarn dev:mobile             # Expo dev 서버
yarn workspace mobile ios   # iOS (Xcode 필요)
yarn workspace mobile android # Android 에뮬레이터/디바이스
```

## 🚀 새로운 피쳐 개발하기

새로운 피쳐를 개발할 때는 다음 워크플로우를 따르세요:

1. **브랜치 생성** → `git checkout -b feature/<name>` (새 작업은 항상 별도 브랜치에서 시작)
2. **스펙/플랜/태스크 작성** → `.specify/templates/feature-template.md`를 참고해 `.specify/specs/[feature-name]/spec.md`에 작성
3. **구현 순서** → 백엔드 → 프론트엔드 → 타입
4. **셀프 리뷰** → 작성 코드를 "PR 리뷰어 관점"으로 검토
5. **테스트** → 단위 → API → 컴포넌트 (`yarn test`, `yarn test:all`)
6. **문서화** → README/spec/plan/tasks 동시 업데이트
7. **빌드 테스트** → `yarn build` (또는 `yarn test:all`)

**추가 가이드**:

- [`docs/FEATURE_DEVELOPMENT_WORKFLOW.md`](./docs/FEATURE_DEVELOPMENT_WORKFLOW.md) - 피쳐 개발 워크플로우 및 3단계 검증 프로세스
- [`docs/CODE_REVIEW_CHECKLIST.md`](./docs/CODE_REVIEW_CHECKLIST.md) - 코드 리뷰 체크리스트 (리팩토링 체크리스트 포함)
- [`docs/TESTING.md`](./docs/TESTING.md) - 테스트 가이드
- [`docs/FRONTEND_PRACTICES.md`](./docs/FRONTEND_PRACTICES.md) - 프론트엔드 품질 원칙
- [`docs/AI_AGENT_GUIDE.md`](./docs/AI_AGENT_GUIDE.md) - **AI 에이전트 가이드: 프로젝트 분석 & 비즈니스 이해**

## 📁 폴더 구조

```text
src/
├── app/                    # Next.js 페이지들
│   ├── api/               # API 엔드포인트
│   └── screener/          # 스크리너 페이지들
├── components/            # 재사용 컴포넌트
├── db/                   # 데이터베이스
├── etl/                  # 데이터 처리 작업들
└── utils/               # 유틸리티
```
