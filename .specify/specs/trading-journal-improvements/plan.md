# Implementation Plan: 매매일지 개선

**Feature Branch**: `feature/trading-journal-improvements`  
**Spec**: [spec.md](./spec.md)  
**Created**: 2025-11-29

## Overview

매매일지 기능 개선을 4단계로 나누어 구현한다.

---

## Phase 1: TradeCard UI 분리 (OPEN vs CLOSED)

### 1.1 데이터 준비

#### Step 1: 타입 확장
- `src/lib/trades/types.ts`에 CLOSED 거래용 필드 추가
  - `avgExitPrice`: 평균 청산가
  - `holdingDays`: 보유 기간 (일)
  - `totalCommission`: 총 수수료

#### Step 2: 계산 로직 추가
- `src/lib/trades/calculations.ts`에 함수 추가
  - `calculateAvgExitPrice()`: 매도 내역 기반 평균 청산가 계산
  - `calculateHoldingDays()`: 시작일~종료일 차이 계산

#### Step 3: API 응답 확장
- `GET /api/trades` 응답에 CLOSED 거래용 계산값 포함

### 1.2 UI 구현

#### Step 4: TradeCard 분리
- `TradeCard.tsx` 리팩토링
  - `OpenTradeCardContent` 컴포넌트 추출
  - `ClosedTradeCardContent` 컴포넌트 생성
  - status에 따라 조건부 렌더링

#### Step 5: CLOSED 카드 UI 구현
- 가격 바 차트 제거
- 핵심 정보 영역: 실현 손익 / 수익률 / R-Multiple
- 보조 정보: 평단가 → 청산가, 보유기간, 수수료
- 실수 태그 상단 표시

#### Step 6: OPEN 카드 UI 개선 (선택)
- 목표가 달성 표시 (현재가 > 목표가일 때)
- 손절 근접 경고 (현재가가 손절가의 5% 이내)

---

## Phase 2: 매매 수정 기능 UI

### 2.1 컴포넌트 생성

#### Step 7: TradeEditModal 컴포넌트 생성
- `src/components/trades/TradeEditModal.tsx`
- TradeForm과 유사한 구조, 기존 데이터 pre-fill
- 저장 시 `PATCH /api/trades/[id]` 호출

#### Step 8: TradeDetailClient에 편집 버튼 추가
- 헤더 영역에 "편집" 버튼 추가
- 버튼 클릭 시 TradeEditModal 열기
- 저장 후 데이터 refetch

---

## Phase 3: 액션 수정/삭제 기능

### 3.1 API 확인 및 구현

#### Step 9: API 라우트 확인
- `/api/trades/[id]/actions/[actionId]` 라우트 존재 여부 확인
- 없으면 DELETE, PATCH 엔드포인트 구현

### 3.2 UI 구현

#### Step 10: ActionTimeline에 삭제 버튼 추가
- 각 액션 항목에 삭제 아이콘 추가
- 클릭 시 확인 다이얼로그 → DELETE API 호출
- 삭제 후 데이터 refetch

#### Step 11: ActionEditModal 컴포넌트 생성
- `src/components/trades/ActionEditModal.tsx`
- 가격, 수량, 날짜, 메모 수정 가능
- 저장 시 PATCH API 호출

#### Step 12: ActionTimeline에 수정 버튼 추가
- 각 액션 항목에 수정 아이콘 추가
- 클릭 시 ActionEditModal 열기

---

## Phase 4: 버그 수정 + 코드 품질 개선

### 4.1 버그 수정

#### Step 13: 수수료율 버그 수정
- `src/app/api/trades/[id]/route.ts` 수정
- `calculateTradeMetrics` 호출 시 commissionRate 전달

### 4.2 코드 품질

#### Step 14: 미실현 손익 로직 추출
- `calculateUnrealizedPnl()` 함수 생성
- TradeCard, TradeDetailClient에서 함수 사용

#### Step 15: 타입 중복 제거
- StatsClient에서 TradeStats import 사용

#### Step 16: 테스트 코드 작성
- `src/lib/__tests__/trade-calculations.test.ts` 생성
- `calculateTradeMetrics` 테스트 케이스
- `calculateUnrealizedPnl` 테스트 케이스
- `calculateTradeStats` 테스트 케이스

---

## Dependencies

```
Phase 1 (UI 분리)
├── Step 1-3: 데이터/타입 준비
└── Step 4-6: UI 구현 (Step 1-3 완료 후)

Phase 2 (매매 수정)
├── Step 7: 모달 컴포넌트
└── Step 8: 연동 (Step 7 완료 후)

Phase 3 (액션 수정/삭제)
├── Step 9: API 확인/구현
├── Step 10: 삭제 기능 (Step 9 완료 후)
└── Step 11-12: 수정 기능 (Step 9 완료 후)

Phase 4 (버그/품질)
├── Step 13: 버그 수정 (독립적)
├── Step 14-15: 리팩토링 (독립적)
└── Step 16: 테스트 (Step 14 완료 후)
```

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| UI 변경으로 기존 기능 영향 | OPEN 카드는 기존 구조 유지, CLOSED만 새로 구현 |
| 계산 로직 변경 시 오류 | 테스트 코드 먼저 작성 (TDD) |
| API 엔드포인트 누락 | Phase 3 시작 전 API 존재 여부 확인 |

---

## Estimated Effort

| Phase | Effort | 비고 |
|-------|--------|------|
| Phase 1 | 3-4시간 | UI 작업 위주 |
| Phase 2 | 2-3시간 | TradeForm 재활용 가능 |
| Phase 3 | 3-4시간 | API 구현 포함 시 |
| Phase 4 | 2-3시간 | 테스트 작성 포함 |
| **Total** | **10-14시간** | |

---

## Checklist Before Starting

- [ ] 현재 TradeCard UI 스크린샷 저장 (비교용)
- [ ] `yarn test` 통과 확인
- [ ] `yarn lint` 통과 확인
- [ ] 브랜치 생성: `git checkout -b feature/trading-journal-improvements`

