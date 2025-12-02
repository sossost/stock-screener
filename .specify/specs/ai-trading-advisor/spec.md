# AI Trading Strategy Advisor

**Feature Branch**: `feature/ai-trading-advisor`  
**Created**: 2025-12-01  
**Status**: ✅ Completed

---

## 1. 프로젝트 개요 (Overview)

현재 개발 중인 주식 스크리너(Screener) 서비스의 종목 상세 페이지에 'AI 트레이딩 어드바이저' 기능을 추가한다. 이 기능은 화면에 렌더링된 차트 데이터와 재무 데이터, 그리고 사용자의 보유 포지션 정보를 JSON 형태로 가공하여 Google Gemini API에 전송하고, 사전에 정의된 **[Master Trading Protocol v5.0]**에 의거한 매수/매도/홀딩 전략을 텍스트로 응답받아 사용자에게 보여준다.

---

## 2. 기술 스택 (Tech Stack)

- **Language**: TypeScript
- **Framework**: Next.js 15 (App Router)
- **AI Model**: Google Gemini API (gemini-2.5-flash)
- **Libraries**:
  - `@google/genai` (Gemini SDK)
  - `react-markdown` (마크다운 렌더링)
  - `technicalindicators` (보조지표 계산용)

---

## 3. 데이터 흐름 (Data Flow)

1. **Frontend**: 현재 보고 있는 종목의 가격(OHLCV), 이동평균선(MA20, MA50, MA200), RSI, MACD 등 기술적 지표를 계산하거나 수집한다.
2. **Frontend → Backend**: 수집된 데이터를 JSON 포맷으로 백엔드 API에 전송한다.
3. **Backend**:
   - Gemini API (gemini-1.5-pro)를 호출한다.
   - System Instruction에 'Master Trading Protocol v5.0'을 주입한다.
   - User Prompt에 프론트엔드에서 받은 JSON 데이터를 문자열로 포함한다.
4. **Backend → Frontend**: Gemini가 생성한 전략 분석 텍스트를 프론트엔드에 반환한다.
5. **Frontend**: 결과를 UI에 렌더링한다.

---

## 4. 입력 데이터 스키마 (Input JSON Schema)

Gemini에게 전달할 프롬프트의 데이터 구조는 다음과 같다.

```json
{
  "market_context": {
    "ticker": "Symbol (e.g., LITE)",
    "current_price": 315.00,
    "market_status": "OPEN" | "CLOSED" | "PRE_MARKET",
    "is_friday": boolean // 금요일 여부 (매매 원칙 적용용)
  },
  "technical_indicators": {
    "ma20": 249.93,
    "ma50": 200.55,
    "ma200": 116.48,
    "rsi_14": 71.68,
    "atr_14": 15.5, // 변동성 판단용
    "macd": {
      "histogram": 5.97,
      "signal": 23.93
    }
  },
  "user_position": {
    "has_position": boolean,
    "entry_price": 237.50, // 보유 중일 경우
    "current_pnl_percent": 32.6,
    "status": "NONE" | "HOLDING" | "RUNNER" // 신규/보유/익절후남은물량
  }
}
```

---

## 5. 핵심 로직: 시스템 프롬프트 (System Instruction)

가장 중요한 부분임. Gemini 모델 설정 시 `system_instruction` 파라미터에 아래 내용을 반드시 포함해야 함.

```text
당신은 'Master Trading Protocol v5.0'을 엄격하게 준수하는 냉철한 AI 트레이딩 리스크 관리자입니다.
제공된 JSON 데이터를 분석하여 현재 시점의 최적의 매매 전략을 제시하십시오.

[Master Trading Protocol v5.0 요약]

1. 진입 원칙 (Entry):
   - 손익비(Risk/Reward)가 1:3 이상 나오는 자리인가?
   - 눌림목(MA20, MA50 지지) 또는 확실한 돌파(Breakout)인가?
   - 금요일(is_friday=true)에는 원칙적으로 신규 매수를 금지한다. (단, 종가 고가 마감 시 소액 허용)

2. 청산 원칙 (Exit):
   - 1차 익절: +2R 도달 시 50% 매도.
   - 러너(Runner): MA50 이탈 또는 급등 시 MA20 이탈 전까지 홀딩.
   - 손절(Stop Loss): 진입가 대비 -3%~-7% (ATR 기반 유동적 설정). 절대 -10% 초과 금지.

3. 리스크 관리 (Risk Control):
   - 금요일 종가가 약세(Weak Close)이거나 손실 중이면 전량 청산(Over-Weekend 금지).
   - 수익 쿠션이 없는 상태에서 주말을 넘기지 않는다.
   - 변동성(ATR)이 너무 크면 비중 축소를 권고한다.

[출력 형식]
응답은 다음의 마크다운 형식으로 간결하게 작성할 것.

## 📊 [종목명] 진단 결과

- **현재 상태:** (예: 상승 추세 중 건전한 조정 / 과열 구간 / 추세 이탈 등)
- **판단:** **[매수 / 홀딩 / 매도 / 관망]** 중 택 1

### 💡 상세 전략

1. **진입/대응:** (현재가 기준 구체적인 행동 지침)
2. **손절가 (Stop Loss):** (기술적 지지선에 기반한 구체적 가격)
3. **목표가 (Target):** (1차 익절 및 최종 목표가)

### ⚠️ 리스크 체크

- (금요일 이슈, 변동성 과다, 이격도 과열 등 주의사항 언급)
```

---

## 6. 구현 요구사항 (Implementation Tasks)

### Phase 1: API 설정 및 기본 구조 ✅

- [x] **API Client 설정**: `@google/genai` 패키지 설치 및 gemini-2.5-flash 모델 초기화
- [x] **환경 변수 설정**: `GEMINI_API_KEY` 환경 변수 추가 및 검증
- [x] **API Route 생성**: `/api/ai-advisor/route.ts` 생성

### Phase 2: 데이터 수집 및 포맷팅 ✅

- [x] **기술적 지표 계산**: RSI, MACD, ATR 계산 로직 (기존 `technical-indicators` 라이브러리 활용)
- [x] **데이터 수집 유틸**: 종목 상세 페이지에서 필요한 데이터 수집 함수 (`lib/ai-advisor/data-collector.ts`)
- [x] **JSON 스키마 타입 정의**: TypeScript 타입 정의 (`types/ai-advisor.ts`)
- [x] **Prompt Builder**: JSON 데이터를 프롬프트 문자열로 변환하는 유틸리티 함수 (`lib/ai-advisor/prompt-builder.ts`)

### Phase 3: Gemini API 연동 ✅

- [x] **System Instruction 설정**: Master Trading Protocol v5.0을 시스템 프롬프트로 주입
- [x] **API 호출 로직**: Gemini API 호출 및 응답 처리 (`lib/ai-advisor/gemini-client.ts`)
- [x] **에러 핸들링**: API 호출 실패 시 적절한 에러 메시지 반환
- [x] **응답 파싱**: 마크다운 형식 응답을 파싱하여 구조화 (`lib/ai-advisor/parse-analysis.ts`)

### Phase 4: 프론트엔드 UI ✅

- [x] **컴포넌트 생성**: 
  - `components/stock-detail/AIAdvisor.tsx` - 분석 결과 표시 컴포넌트
  - `components/stock-detail/AIAdvisorModal.tsx` - 드래그 가능한 모달 컴포넌트
- [x] **플로팅 버튼**: 오른쪽 하단에 "AI 분석" 플로팅 버튼
- [x] **로딩 상태**: 분석 중 스켈레톤 UI 표시
- [x] **결과 렌더링**: 구조화된 UI로 표시 (신호등, 전략 카드, 경고/근거)
- [x] **에러 상태**: 분석 실패 시 사용자 친화적 에러 메시지
- [x] **드래그 가능한 모달**: 모달을 드래그하여 위치 이동 가능

### Phase 5: 통합 및 최적화 ✅

- [x] **종목 상세 페이지 통합**: `StockDetailClient.tsx`에 AI Advisor 통합
- [x] **캐싱 기능**: 하루 동안 분석 결과 캐싱 (`utils/ai-advisor-cache.ts`)
- [x] **수동 호출**: 버튼 클릭 시에만 분석 실행
- [x] **UI/UX 개선**: 컴팩트한 레이아웃, 스타일 통일, 사용자 경험 최적화

---

## 7. API 엔드포인트 스펙

### POST `/api/ai-advisor`

**Request Body**:
```typescript
{
  symbol: string; // 종목 심볼
  currentPrice: number; // 현재가
}
```

**Response**:
```typescript
{
  success: boolean;
  analysis?: string; // 마크다운 형식의 분석 결과
  error?: string;
}
```

**구현 세부사항**:
- 서버에서 자동으로 기술적 지표 수집 (가격 데이터, MA, RSI, MACD, ATR)
- Master Trading Protocol v5.0 기반 프롬프트 생성
- Gemini API (gemini-2.5-flash) 호출
- 마크다운 형식 응답 반환

---

## 8. 보안 및 환경 변수

- **API Key 관리**: `GEMINI_API_KEY`는 반드시 환경 변수에서 로드
- **환경 변수 파일**: `apps/web/.env.example`에 `GEMINI_API_KEY` 추가
- **API Key 검증**: API 호출 전 환경 변수 존재 여부 확인

---

## 9. 비즈니스 규칙

### Master Trading Protocol v5.0 핵심 원칙

1. **진입 조건**:
   - 손익비 1:3 이상
   - 눌림목 또는 확실한 돌파
   - 금요일 신규 매수 금지 (예외: 종가 고가 마감 시 소액 허용)

2. **청산 조건**:
   - 1차 익절: +2R 도달 시 50% 매도
   - 러너: MA50 이탈 또는 급등 시 MA20 이탈 전까지 홀딩
   - 손절: 진입가 대비 -3%~-7% (ATR 기반), 절대 -10% 초과 금지

3. **리스크 관리**:
   - 금요일 약세 종가 또는 손실 중이면 전량 청산
   - 수익 쿠션 없이 주말 넘기지 않음
   - 변동성(ATR) 과다 시 비중 축소 권고

---

## 10. Non-Functional Requirements

### 성능
- API 응답 시간: 5초 이내
- 타임아웃: 10초

### 에러 핸들링
- API 호출 실패 시: "현재 분석을 이용할 수 없습니다" 메시지 표시
- 네트워크 오류: 재시도 로직 (최대 2회)
- Rate Limit: 적절한 에러 메시지 및 재시도 안내

### 사용성
- 로딩 중 명확한 인디케이터 표시 (스켈레톤 UI)
- 분석 결과는 구조화된 UI로 표시 (신호등, 전략 카드, 경고/근거)
- 에러 발생 시 사용자 친화적 메시지
- 플로팅 버튼으로 간편한 접근
- 드래그 가능한 모달로 차트와 함께 확인 가능

### 캐싱
- 하루 동안 분석 결과 캐싱 (localStorage)
- 종가가 변하지 않으므로 같은 날에는 캐시 사용
- 자동으로 오래된 캐시 정리

---

## 11. 구현 파일 목록

### 백엔드
- `apps/web/src/app/api/ai-advisor/route.ts` - API 엔드포인트
- `apps/web/src/lib/ai-advisor/gemini-client.ts` - Gemini API 클라이언트
- `apps/web/src/lib/ai-advisor/prompt-builder.ts` - 프롬프트 빌더
- `apps/web/src/lib/ai-advisor/data-collector.ts` - 데이터 수집 유틸
- `apps/web/src/lib/ai-advisor/parse-analysis.ts` - 응답 파싱 유틸

### 프론트엔드
- `apps/web/src/components/stock-detail/AIAdvisor.tsx` - 분석 결과 표시 컴포넌트
- `apps/web/src/components/stock-detail/AIAdvisorModal.tsx` - 드래그 가능한 모달
- `apps/web/src/hooks/useAIAdvisor.ts` - AI Advisor 훅
- `apps/web/src/utils/ai-advisor-cache.ts` - 캐싱 유틸리티

### 타입
- `apps/web/src/types/ai-advisor.ts` - 타입 정의

## 12. 코드 리뷰 결과

### ✅ 잘 구현된 부분

1. **타입 안전성**: `any` 타입 사용 없음, 명시적인 인터페이스 정의, Zod 스키마로 런타임 검증
2. **에러 핸들링**: try-catch 블록으로 에러 처리, 사용자 친화적 에러 메시지, API 에러 타입별 처리
3. **컴포넌트 설계**: 공용 컴포넌트 사용, 단일 책임 원칙 준수, 컴포넌트 크기 적절
4. **React 훅 최적화**: useEffect cleanup 함수 구현, 의존성 배열 정확히 지정, SSR 고려
5. **보안**: API Key 환경 변수 사용, 입력 값 검증

### ⚠️ 개선 완료 사항

1. **디버깅 코드**: `console.log`를 개발 환경에서만 출력하도록 수정
2. **모델 이름 주석**: 실제 사용 모델과 일치하도록 수정
3. **매직 넘버**: 상수로 추출 (`PRICE_DATA_LOOKBACK_DAYS`, `MIN_PRICE_DATA_DAYS`, `MODAL_WIDTH` 등)
4. **SSR 안전성**: `window` 객체 접근 시 `typeof window` 체크 추가

### 📋 추가 개선 제안 (선택적)

1. **에러 로깅**: `console.error` 대신 프로젝트의 `logError` 유틸리티 사용 고려
2. **타임존 처리**: 미국 시장 시간 기준으로 `isFriday()`, `getMarketStatus()` 수정 고려
3. **테스트 코드**: 주요 로직에 대한 단위 테스트 작성 권장

### 종합 평가

**전체 평가**: ⭐⭐⭐⭐ (4/5)

전반적으로 잘 구현되었으며, 타입 안전성, 에러 핸들링, 컴포넌트 설계가 우수합니다. 프로덕션 배포 전 위 개선 사항을 반영했습니다.

## 13. 관련 문서

- [프론트엔드 품질 원칙](../../docs/FRONTEND_PRACTICES.md)
- [코드 리뷰 체크리스트](../../docs/CODE_REVIEW_CHECKLIST.md)
- [피쳐 개발 워크플로우](../../docs/FEATURE_DEVELOPMENT_WORKFLOW.md)

