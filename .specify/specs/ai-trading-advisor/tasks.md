# Tasks: AI Trading Strategy Advisor

**Feature Branch**: `feature/ai-trading-advisor`  
**Spec**: [spec.md](./spec.md)  
**Plan**: [plan.md](./plan.md)  
**Created**: 2025-12-01

---

## Phase 1: API 설정 및 기본 구조 ✅

### 패키지 및 환경 변수

- [x] **Task 1.1**: `@google/genai` 패키지 설치 (gemini-2.5-flash 사용)
- [x] **Task 1.2**: `apps/web/.env.example`에 `GEMINI_API_KEY` 추가
- [x] **Task 1.3**: 환경 변수 검증 로직 구현

### API Route

- [x] **Task 1.4**: `/api/ai-advisor/route.ts` 생성
- [x] **Task 1.5**: POST 메서드 핸들러 기본 구조
- [x] **Task 1.6**: 기본 에러 핸들링 구현

---

## Phase 2: 데이터 수집 및 포맷팅 ✅

### 기술적 지표 계산

- [x] **Task 2.1**: `lib/technical-indicators.ts`에 `calculateATR` 함수 추가
- [ ] **Task 2.2**: ATR 계산 단위 테스트 작성 (선택적)

### 데이터 수집 유틸리티

- [x] **Task 2.3**: `lib/ai-advisor/data-collector.ts` 생성
- [x] **Task 2.4**: 종목 상세 데이터 수집 함수 구현
  - 가격 데이터 수집
  - 기술적 지표 계산 (RSI, MACD, ATR)
  - 이동평균선 조회
  - 금요일 여부 판단
- [ ] **Task 2.5**: 포지션 정보 수집 함수 구현 (향후 구현 예정)
  - 사용자 보유 포지션 조회
  - 손익 계산
  - RUNNER 상태 판단

### 타입 정의 및 프롬프트 빌더

- [x] **Task 2.6**: `types/ai-advisor.ts` 생성
  - `AIAdvisorRequest` 타입 정의
  - `AIAdvisorResponse` 타입 정의
  - JSON 스키마 타입 정의
- [x] **Task 2.7**: `lib/ai-advisor/prompt-builder.ts` 생성
  - JSON 데이터를 프롬프트 문자열로 변환
  - System Instruction 포함 (Master Trading Protocol v5.0)
  - User Prompt 생성

---

## Phase 3: Gemini API 연동 ✅

### API 클라이언트

- [x] **Task 3.1**: `lib/ai-advisor/gemini-client.ts` 생성
- [x] **Task 3.2**: gemini-2.5-flash 모델 초기화
- [x] **Task 3.3**: System Instruction 설정 (Master Trading Protocol v5.0)
- [x] **Task 3.4**: API 호출 로직 구현
  - 프롬프트 전송
  - 응답 처리
  - 타임아웃 설정
- [ ] **Task 3.5**: 재시도 로직 구현 (선택적, 현재 미구현)

### 에러 핸들링 및 응답 파싱

- [x] **Task 3.6**: 에러 핸들링 구현
  - API 호출 실패 처리
  - Rate Limit 처리
  - 네트워크 오류 처리
- [x] **Task 3.7**: 응답 파싱 로직
  - 마크다운 형식 파싱 (`lib/ai-advisor/parse-analysis.ts`)
  - 구조화된 응답 반환 (신호, 전략, 리스크 체크)

### API Route 완성

- [x] **Task 3.8**: API Route에 Gemini 클라이언트 통합
- [x] **Task 3.9**: Request Body 검증 (zod 스키마)
- [x] **Task 3.10**: Response 형식 통일

---

## Phase 4: 프론트엔드 UI ✅

### 컴포넌트 구현

- [x] **Task 4.1**: `components/stock-detail/AIAdvisor.tsx` 생성
- [x] **Task 4.2**: 로딩 상태 UI 구현
  - 스켈레톤 UI (실제 레이아웃과 동일한 구조)
  - 분석 중 표시
- [x] **Task 4.3**: 에러 상태 UI 구현
  - 사용자 친화적 에러 메시지
  - 재시도 가능 (버튼 클릭)
- [x] **Task 4.4**: 마크다운 렌더링
  - `react-markdown` 설치 및 사용
  - 구조화된 UI로 표시 (신호등, 전략 카드, 경고/근거)

### 데이터 수집 훅

- [x] **Task 4.5**: `hooks/useAIAdvisor.ts` 생성
- [x] **Task 4.6**: 종목 상세 페이지 데이터 수집 로직
  - 서버에서 자동 수집 (API Route에서 처리)
  - 가격 데이터, 기술적 지표 자동 계산
- [x] **Task 4.7**: API 호출 로직
  - fetch 사용
  - 로딩/에러 상태 관리
  - 수동 호출 방식 (버튼 클릭 시)

### UI 통합

- [x] **Task 4.8**: `StockDetailClient.tsx`에 AI Advisor 통합
- [x] **Task 4.9**: 플로팅 버튼 + 드래그 가능한 모달 형태
  - 오른쪽 하단 플로팅 버튼 ("AI 분석")
  - 드래그 가능한 모달로 결과 표시
  - 차트와 함께 확인 가능
- [x] **Task 4.10**: 반응형 디자인 적용
  - 모달 너비: 700px (max-w-[95vw])
  - 컴팩트한 레이아웃

---

## Phase 5: 통합 및 최적화 ✅

### 캐싱 기능

- [x] **Task 5.1**: 하루 캐싱 기능 구현
  - `utils/ai-advisor-cache.ts` 생성
  - localStorage 기반 캐싱
  - 날짜 기반 캐시 무효화
  - 자동 오래된 캐시 정리

### UI/UX 개선

- [x] **Task 5.2**: 플로팅 버튼 구현
  - 오른쪽 하단 고정
  - 로딩 상태 표시
  - 라벨 추가 ("AI 분석")
- [x] **Task 5.3**: 드래그 가능한 모달
  - 헤더 드래그로 위치 이동
  - 화면 경계 제한
  - 모달 열림 시 버튼 숨김
- [x] **Task 5.4**: UI 스타일 통일
  - 다른 섹션과 스타일 통일
  - 컴팩트한 레이아웃
  - 스크롤 최소화

### 포지션 정보 연동 (향후 구현)

- [ ] **Task 5.5**: 포지션 정보 조회 API 연동
  - `lib/trades/queries.ts` 활용
  - 현재가 대비 손익 계산
- [ ] **Task 5.6**: RUNNER 상태 판단 로직
  - 1차 익절 후 남은 물량 여부 확인
  - `calculateTradeMetrics` 활용

### 테스트 (선택적)

- [ ] **Task 5.7**: 단위 테스트 작성
  - 프롬프트 빌더 테스트
  - 데이터 수집 로직 테스트
  - 캐싱 로직 테스트
- [ ] **Task 5.8**: 통합 테스트 작성
  - 전체 플로우 테스트
  - 에러 케이스 테스트

---

## 완료 조건

- [x] 핵심 Phase 완료 (1-4, 5.1-5.4)
- [ ] 단위 테스트 커버리지 80% 이상 (선택적)
- [ ] 통합 테스트 통과 (선택적)
- [x] 코드 리뷰 체크리스트 통과
- [x] `yarn lint && yarn test && yarn build` 통과

