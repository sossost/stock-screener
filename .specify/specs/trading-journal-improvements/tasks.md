# Tasks: 매매일지 개선

**Feature Branch**: `feature/trading-journal-improvements`  
**Spec**: [spec.md](./spec.md)  
**Plan**: [plan.md](./plan.md)  
**Created**: 2025-11-29  
**Updated**: 2025-11-29

---

## Phase 1: 테이블 기반 UI (OPEN vs CLOSED)

### 데이터 준비

- [x] **Task 1.1**: 타입 확장

  - `TradeCalculated`에 `avgExitPrice`, `holdingDays`, `totalCommission`, `unrealizedPnl`, `unrealizedRoi` 추가

- [x] **Task 1.2**: 계산 로직 추가

  - `calculateHoldingDays`, `calculateUnrealizedPnl` 함수 구현

- [x] **Task 1.3**: API 응답 확장
  - CLOSED 거래에 `avgExitPrice`, `holdingDays` 포함

### UI 구현

- [x] **Task 1.4**: OpenTradesTable 구현

  - 테이블 형식, 컬럼: 심볼, 전략, 손절가, 현재가, 목표가, 평단가, 수량, 포지션, 비중, 미실현손익, 시작일
  - 마우스 hover 시 PriceBarPopup 표시

- [x] **Task 1.5**: ClosedTradesTable 구현
  - 컬럼: 심볼, 전략, 실현손익, ROI, R-Multiple, 진입→청산, 수량, 보유일, 매매기간, 복기태그

---

## Phase 2: 매매 수정 기능 UI

- [x] **Task 2.1**: TradeEditModal 구현
- [x] **Task 2.2**: TradeDetailClient에 편집 버튼 추가
- [x] **Task 2.3**: CLOSED 매매 복기 수정 지원
- [x] **Task 2.4**: X 닫기 버튼 추가

---

## Phase 3: 액션 수정/삭제 기능

- [x] **Task 3.1**: 액션 API (PATCH, DELETE) 구현
- [x] **Task 3.2**: ActionTimeline에 수정/삭제 버튼 추가
- [x] **Task 3.3**: ActionEditModal 구현
- [x] **Task 3.4**: X 닫기 버튼 추가

---

## Phase 4: 버그 수정 + 코드 품질

- [x] **Task 4.1**: 수수료율 버그 수정
- [x] **Task 4.2**: 미실현 손익 로직 추출
- [x] **Task 4.3**: 타입 중복 제거 (StatsClient)
- [x] **Task 4.4**: 테스트 코드 작성

---

## Phase 5: 자산 관리 기능

- [x] **Task 5.1**: PortfolioSummary 컴포넌트 구현

  - 현금 보유 입력 (localStorage)
  - 포지션 가치 = 현재가 × 수량
  - 자산 총계 표시

- [x] **Task 5.2**: 비중 컬럼 추가

  - OpenTradesTable에 비중 컬럼 추가
  - 비중 = (포지션가치 / 자산총계) × 100

- [x] **Task 5.3**: 포지션 계산 수정
  - 평단가 × 수량 → 현재가 × 수량

---

## 완료 체크리스트

- [x] Phase 1-5 작업 완료
- [ ] `yarn lint` 통과
- [ ] `yarn test` 통과
- [ ] `yarn build` 통과
- [x] README.md 업데이트
- [x] spec.md 업데이트
- [ ] 사용자 승인 후 커밋
