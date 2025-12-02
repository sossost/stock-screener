# Implementation Plan: AI Trading Strategy Advisor

**Feature Branch**: `feature/ai-trading-advisor`  
**Spec**: [spec.md](./spec.md)  
**Created**: 2025-12-01

---

## Overview

AI Trading Strategy Advisor 기능을 5단계로 나누어 구현한다.

---

## Phase 1: API 설정 및 기본 구조

### 1.1 패키지 설치 및 환경 변수

#### Step 1: Gemini SDK 설치 ✅
- `@google/genai` 패키지 설치 (gemini-2.5-flash 사용)
- `apps/web/package.json`에 추가

#### Step 2: 환경 변수 설정
- `apps/web/.env.example`에 `GEMINI_API_KEY` 추가
- 환경 변수 검증 로직 추가

### 1.2 API Route 생성

#### Step 3: API Route 기본 구조
- `/api/ai-advisor/route.ts` 생성
- POST 메서드 핸들러 구현
- 기본 에러 핸들링

---

## Phase 2: 데이터 수집 및 포맷팅

### 2.1 기술적 지표 계산

#### Step 4: ATR 계산 함수 추가
- `lib/technical-indicators.ts`에 `calculateATR` 함수 추가
- 14일 ATR 계산 로직

#### Step 5: 데이터 수집 유틸리티
- `lib/ai-advisor/data-collector.ts` 생성
- 종목 상세 페이지에서 필요한 데이터 수집 함수
- 기술적 지표 계산 및 포맷팅

### 2.2 타입 정의 및 프롬프트 빌더

#### Step 6: 타입 정의
- `types/ai-advisor.ts` 생성
- Request/Response 타입 정의
- JSON 스키마 타입 정의

#### Step 7: 프롬프트 빌더
- `lib/ai-advisor/prompt-builder.ts` 생성
- JSON 데이터를 프롬프트 문자열로 변환
- System Instruction 포함

---

## Phase 3: Gemini API 연동

### 3.1 API 클라이언트 구현

#### Step 8: Gemini 클라이언트 초기화 ✅
- `lib/ai-advisor/gemini-client.ts` 생성
- gemini-2.5-flash 모델 초기화
- System Instruction 설정 (Master Trading Protocol v5.0)

#### Step 9: API 호출 로직
- 프롬프트 전송 및 응답 처리
- 타임아웃 설정 (10초)
- 재시도 로직 (최대 2회)

### 3.2 에러 핸들링 및 응답 파싱

#### Step 10: 에러 핸들링
- API 호출 실패 시 적절한 에러 메시지
- Rate Limit 처리
- 네트워크 오류 처리

#### Step 11: 응답 파싱
- 마크다운 형식 응답 검증
- 구조화된 응답 반환

---

## Phase 4: 프론트엔드 UI

### 4.1 컴포넌트 구현

#### Step 12: AIAdvisor 컴포넌트 ✅
- `components/stock-detail/AIAdvisor.tsx` 생성
- 로딩 상태 관리 (스켈레톤 UI)
- 에러 상태 처리
- 구조화된 UI (신호등, 전략 카드, 경고/근거)
- 마크다운 렌더링 (react-markdown)

#### Step 13: 데이터 수집 훅 ✅
- `hooks/useAIAdvisor.ts` 생성
- 수동 호출 방식 (버튼 클릭 시)
- 캐싱 기능 통합
- 로딩/에러 상태 관리

### 4.2 UI 통합 ✅

#### Step 14: 종목 상세 페이지 통합
- `StockDetailClient.tsx`에 AI Advisor 통합
- 플로팅 버튼 + 드래그 가능한 모달 형태
- 오른쪽 하단 플로팅 버튼
- 모달은 차트와 함께 확인 가능

---

## Phase 5: 포지션 정보 연동 및 테스트

### 5.1 포지션 정보 조회

#### Step 15: 포지션 정보 조회 API
- 사용자 보유 포지션 정보 조회 로직
- `lib/trades/queries.ts` 활용
- 현재가 대비 손익 계산

#### Step 16: 포지션 정보 통합
- AI Advisor 데이터 수집 시 포지션 정보 포함
- RUNNER 상태 판단 로직

### 5.2 테스트

#### Step 17: 단위 테스트
- 프롬프트 빌더 테스트
- 데이터 수집 로직 테스트
- ATR 계산 테스트

#### Step 18: 통합 테스트
- 전체 플로우 테스트
- 에러 케이스 테스트

---

## 기술적 고려사항

### 데이터 수집
- 종목 상세 페이지의 `TechnicalChart`에서 이미 계산된 기술적 지표 활용
- 최신 가격 데이터는 `StockDetail`에서 가져오기
- 이동평균선은 `daily_ma` 테이블에서 조회

### 포지션 정보
- `trades` 테이블에서 해당 종목의 OPEN 상태 매매 조회
- `calculateTradeMetrics`로 현재 손익 계산
- RUNNER 상태: 1차 익절 후 남은 물량 여부 판단

### 성능
- API 응답 시간 최적화 (5초 이내 목표)
- 서버에서 데이터 수집 후 한 번에 전송
- **캐싱 전략 구현 완료**: 하루 동안 분석 결과 캐싱 (localStorage)
  - 종가가 변하지 않으므로 같은 날에는 캐시 사용
  - 자동으로 오래된 캐시 정리

---

## 비즈니스 로직

### Master Trading Protocol v5.0 핵심 원칙

1. **진입 원칙**:
   - 손익비 1:3 이상
   - 눌림목 또는 확실한 돌파
   - 금요일 신규 매수 금지 (예외: 종가 고가 마감 시 소액 허용)

2. **청산 원칙**:
   - 1차 익절: +2R 도달 시 50% 매도
   - 러너: MA50 이탈 또는 급등 시 MA20 이탈 전까지 홀딩
   - 손절: 진입가 대비 -3%~-7% (ATR 기반), 절대 -10% 초과 금지

3. **리스크 관리**:
   - 금요일 약세 종가 또는 손실 중이면 전량 청산
   - 수익 쿠션 없이 주말 넘기지 않음
   - 변동성(ATR) 과다 시 비중 축소 권고

