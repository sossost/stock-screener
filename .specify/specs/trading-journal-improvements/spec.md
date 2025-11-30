# Spec: 매매일지 UI 개선

**Feature Branch**: `feature/trading-journal-improvements`  
**Status**: ✅ Completed  
**Created**: 2025-11-29  
**Merged**: 2025-11-30

---

## 개요

매매일지 기능의 UI/UX를 개선하여 데이터 가독성과 사용 편의성을 높인다.

---

## 주요 변경사항

### 1. 테이블 기반 UI

- 기존 카드 형식 → 테이블 형식으로 전환
- OPEN/CLOSED 거래 분리 표시
- 테이블 row hover 시 가격 바 차트 팝업 표시

### 2. OPEN 거래 테이블 (OpenTradesTable)

| 컬럼 | 설명 |
|------|------|
| 심볼 | 종목 코드 |
| 전략 | 매매 전략 태그 |
| 손절가 | 계획 손절가 (평단 대비 %) |
| 현재가 | 현재 주가 (평단 대비 %) |
| 목표가 | 계획 목표가 (평단 대비 %) |
| 평단가 | 평균 진입 가격 |
| 수량 | 보유 수량 |
| 포지션 | 현재가 × 수량 |
| 비중 | 포지션 / 총자산 × 100 |
| 미실현손익 | 현재 평가 손익 |
| 시작일 | 매매 시작일 |

### 3. CLOSED 거래 테이블 (ClosedTradesTable)

| 컬럼 | 설명 |
|------|------|
| 심볼 | 종목 코드 |
| 전략 | 매매 전략 태그 |
| 실현손익 | 수수료 차감 후 손익 |
| ROI | 수익률 |
| R-Multiple | 리스크 대비 수익 배수 |
| 진입→청산 | 평균 진입가 → 평균 청산가 |
| 수량 | 총 거래 수량 |
| 보유일 | 보유 기간 |
| 매매기간 | 시작일 ~ 종료일 |
| 복기태그 | 실수 유형 태그 |

### 4. 포트폴리오 요약 (PortfolioSummary)

- 현금 보유 입력 (localStorage 저장)
- 총 포지션 가치 = Σ(현재가 × 수량)
- 총 자산 = 현금 + 포지션
- 현금/포지션 비중 표시
- 미니 도넛 차트 시각화

### 5. 매매/액션 편집 기능

- **TradeEditModal**: 매매 계획, 전략, 목표가, 손절가, 복기 수정
- **ActionEditModal**: 개별 매수/매도 내역 수정
- 액션 삭제 기능

### 6. 아키텍처 개선

- 서버 컴포넌트 패턴 적용 (`lib/trades/queries.ts`)
- N+1 쿼리 → 배치 쿼리로 최적화
- 포맷 함수 통합 (`utils/format.ts`)

---

## 기술 스택

- Next.js 15 App Router (서버 컴포넌트)
- Drizzle ORM (배치 쿼리)
- Tailwind CSS + shadcn/ui
- createPortal (팝업 렌더링)

---

## 관련 파일

### 컴포넌트

- `components/trades/OpenTradesTable.tsx`
- `components/trades/ClosedTradesTable.tsx`
- `components/trades/PriceBarPopup.tsx`
- `components/trades/PortfolioSummary.tsx`
- `components/trades/TradeEditModal.tsx`
- `components/trades/ActionEditModal.tsx`
- `components/ui/popup-portal.tsx`

### 로직

- `lib/trades/queries.ts` - 서버 컴포넌트용 쿼리
- `lib/trades/calculations.ts` - 계산 로직
- `utils/format.ts` - 포맷 함수

### 삭제된 파일

- `components/trades/TradeCard.tsx` (테이블로 대체)
