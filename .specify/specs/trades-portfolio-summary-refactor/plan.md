# Implementation Plan: 포지션 현황 UI 개선

**Feature Branch**: `feature/portfolio-summary-refactor`  
**Status**: ✅ Completed  
**Created**: 2025-01-XX

---

## Constitution Check

| 항목                 | 체크    | 비고                                |
| -------------------- | ------- | ----------------------------------- |
| 기존 DB 스키마 영향  | ✅ 없음 | 스키마 변경 없음                    |
| 새 테이블 추가       | ✅ 없음 | 테이블 추가 없음                    |
| 외부 API 의존성      | ✅ 없음 | 자체 데이터만 사용                  |
| 기존 컴포넌트 재사용 | ✅      | PortfolioSummary 컴포넌트 수정      |
| 테스트 커버리지      | ✅      | 수동 테스트 완료                    |

---

## 구현 단계

### Phase 1: 현금 관리 기능 제거

**목표**: 현금 관련 로직 및 UI 완전 제거

**작업 내용**:
1. `PortfolioSummary.tsx`에서 현금 관련 코드 제거
   - [x] `CashBalanceEditor` import 제거
   - [x] `CASH_COLOR` import 제거
   - [x] `initialCashBalance` prop 제거
   - [x] `cashBalance` state 제거
   - [x] `handleCashSave` 함수 제거
   - [x] `cashWeight` 계산 제거
   - [x] 현금 UI 요소 제거

2. 상위 컴포넌트에서 현금 관련 코드 제거
   - [x] `page.tsx`에서 `getCashBalance` import 및 호출 제거
   - [x] `TradesClient.tsx`에서 `initialCashBalance` prop 제거

**검증**:
- [x] 현금 관련 UI가 모두 제거되었는지 확인
- [x] 컴파일 에러 없이 빌드되는지 확인

---

### Phase 2: 포지션 정보 표시 형식 개선

**목표**: 원금 + 손익 (퍼센트) 형식으로 표시

**작업 내용**:
1. 계산 로직 추가
   - [x] `totalCostBasis` 계산 (원금)
   - [x] `totalUnrealizedPnl` 계산 (미실현 손익)
   - [x] `totalRoi` 계산 (수익률)

2. UI 구조 변경
   - [x] 포지션 총합 표시 (큰 글씨)
   - [x] 원금 + 손익 (퍼센트) 표시 (작은 글씨)
   - [x] 종목 개수 표시

**검증**:
- [x] 포지션 총합이 올바르게 표시되는지 확인
- [x] 원금이 올바르게 계산되어 표시되는지 확인
- [x] 손익이 올바르게 계산되어 표시되는지 확인
- [x] 수익률이 올바르게 계산되어 표시되는지 확인
- [x] 손익이 0일 때 손익 표시가 숨겨지는지 확인

---

### Phase 3: 숫자 표시 형식 개선

**목표**: 넓은 공간에서는 전체 숫자 표시

**작업 내용**:
1. 포맷 함수 변경
   - [x] `formatPositionValue` → `formatPositionValueFull` (포지션 총합)
   - [x] `formatPositionValue` → `formatPositionValueFull` (원금)
   - [x] `formatPnl` → `formatPnlFull` (손익)

**검증**:
- [x] 숫자가 전체 형식으로 표시되는지 확인 (예: `$100,000.00`)
- [x] K 단위 축약이 제거되었는지 확인

---

### Phase 4: 파이 차트 색상 문제 해결

**목표**: 종목별 고유 색상 할당

**작업 내용**:
1. segments 계산 로직 수정
   - [x] 현금 제거 (이미 Phase 1에서 완료)
   - [x] 종목만 필터링하여 색상 할당

**검증**:
- [x] 파이 차트에 종목별 고유 색상이 할당되는지 확인
- [x] 종목 수와 색상 수가 일치하는지 확인

---

## 테스트 계획

### 1. 단위 테스트

**대상**: 계산 로직

```typescript
// 원금 계산 테스트
describe('totalCostBasis calculation', () => {
  it('should calculate total cost basis correctly', () => {
    // 평균 진입가 × 현재 수량 합계
  });
});

// 미실현 손익 계산 테스트
describe('totalUnrealizedPnl calculation', () => {
  it('should calculate unrealized PnL correctly', () => {
    // (현재가 - 평균 진입가) × 현재 수량 합계
  });
});

// 수익률 계산 테스트
describe('totalRoi calculation', () => {
  it('should calculate ROI correctly', () => {
    // 손익 / 원금 × 100
  });
});
```

### 2. 통합 테스트

**대상**: 컴포넌트 렌더링

```typescript
describe('PortfolioSummary', () => {
  it('should render position total correctly', () => {
    // 포지션 총합이 올바르게 표시되는지 확인
  });

  it('should render cost basis and PnL correctly', () => {
    // 원금 + 손익 (퍼센트)가 올바르게 표시되는지 확인
  });

  it('should hide PnL when it is zero', () => {
    // 손익이 0일 때 표시되지 않는지 확인
  });

  it('should render pie chart with correct colors', () => {
    // 파이 차트에 종목별 고유 색상이 할당되는지 확인
  });
});
```

### 3. 수동 테스트 체크리스트

#### 3.1 기본 기능 테스트

- [ ] 진행중인 매매가 있을 때 포지션 현황이 표시되는가?
- [ ] 진행중인 매매가 없을 때 적절한 메시지가 표시되는가?
- [ ] 포지션 총합이 올바르게 계산되어 표시되는가?

#### 3.2 원금 및 손익 표시 테스트

- [ ] 원금이 올바르게 계산되어 표시되는가?
- [ ] 손익이 양수일 때 초록색으로 표시되는가?
- [ ] 손익이 음수일 때 빨간색으로 표시되는가?
- [ ] 손익이 0일 때 손익 표시가 숨겨지는가?
- [ ] 수익률이 올바르게 계산되어 표시되는가?

#### 3.3 숫자 표시 형식 테스트

- [ ] 포지션 총합이 전체 숫자 형식으로 표시되는가? (예: `$100,000.00`)
- [ ] 원금이 전체 숫자 형식으로 표시되는가?
- [ ] 손익이 전체 숫자 형식으로 표시되는가?
- [ ] K 단위 축약이 제거되었는가?

#### 3.4 파이 차트 테스트

- [ ] 파이 차트에 종목만 표시되는가? (현금 제거 확인)
- [ ] 종목 수와 색상 수가 일치하는가?
- [ ] 각 종목에 고유 색상이 할당되는가?
- [ ] 범례에 종목만 표시되는가?

#### 3.5 엣지 케이스 테스트

- [ ] 진행중인 매매가 1개일 때 정상 작동하는가?
- [ ] 진행중인 매매가 10개 이상일 때 정상 작동하는가?
- [ ] 현재가가 없는 종목이 있을 때 정상 작동하는가?
- [ ] 보유 수량이 0인 종목이 있을 때 필터링되는가?

#### 3.6 UI/UX 테스트

- [ ] 레이아웃이 깨지지 않는가?
- [ ] 반응형 디자인이 올바르게 작동하는가?
- [ ] 색상이 명확하게 구분되는가?
- [ ] 텍스트가 읽기 쉬운가?

---

## 배포 전 체크리스트

- [x] 모든 단계 완료
- [x] 수동 테스트 완료
- [x] 컴파일 에러 없음
- [x] 린트 에러 없음
- [x] 문서화 완료
- [ ] 단위 테스트 작성 (선택사항)
- [ ] 통합 테스트 작성 (선택사항)

---

## 롤백 계획

문제 발생 시:
1. 이전 버전으로 되돌리기
2. 현금 관리 기능 재도입 (필요 시)

---

## 관련 파일

### 수정된 파일
- `apps/web/src/components/trades/PortfolioSummary.tsx`
- `apps/web/src/app/trades/page.tsx`
- `apps/web/src/app/trades/TradesClient.tsx`

### 참고 파일
- `apps/web/src/lib/trades/calculations.ts` (계산 로직)
- `apps/web/src/utils/format.ts` (포맷 함수)
- `apps/web/src/utils/colors.ts` (색상 팔레트)

---

## 예상 소요 시간

| Phase | 예상 시간 | 실제 시간 |
|-------|----------|----------|
| Phase 1 | 1시간 | - |
| Phase 2 | 1시간 | - |
| Phase 3 | 30분 | - |
| Phase 4 | 30분 | - |
| **총계** | **3시간** | - |

---

## 참고사항

- 현금 관리 기능은 필요 시 별도 섹션으로 재도입 가능
- `CashBalanceEditor` 컴포넌트는 파일은 유지하되 사용 중단
- `getCashBalance()` 함수는 다른 곳에서 사용되지 않으므로 제거 가능

