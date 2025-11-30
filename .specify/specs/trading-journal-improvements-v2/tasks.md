# Tasks: 매매일지 2차 개선

**Feature Branch**: `feature/trading-journal-improvements-v2`  
**Spec**: [spec.md](./spec.md)  
**Plan**: [plan.md](./plan.md)  
**Created**: 2025-11-30

---

## Phase 1: 자산 흐름 그래프

### DB/API

- [x] **Task 1.1**: asset_snapshots 테이블 마이그레이션
- [x] **Task 1.2**: GET /api/trades/assets 구현 (기간별 조회)
- [x] **Task 1.3**: 스냅샷 자동 업데이트 로직 (매매/현금 변경 시)

### UI

- [x] **Task 1.4**: AssetFlowChart 컴포넌트 구현 (SVG 직접 구현)
- [x] **Task 1.5**: 기간 선택 버튼 (1M/3M/ALL)
- [x] **Task 1.6**: PortfolioSummary에 차트 통합

---

## Phase 2: 자산 배분 시각화

### UI

- [x] **Task 2.1**: 종목별 파이 차트 (PortfolioSummary 내 도넛 차트 확장)
- [ ] **Task 2.2**: 섹터별 그룹핑 로직 추가
- [x] **Task 2.3**: 종목별 비중 리스트 + 호버 인터랙션
- [x] **Task 2.4**: PortfolioSummary 차트 영역 확장

---

## Phase 3: 통계 고도화

### API

- [x] **Task 3.1**: 통계 API에 추가 필드 구현
  - profitFactor
  - avgHoldingDays
  - maxWinStreak / maxLoseStreak
  - avgWinAmount / avgLossAmount

- [x] **Task 3.2**: 전략별 통계 계산 로직

### UI

- [ ] **Task 3.3**: 월별/주별 수익 바 차트
- [x] **Task 3.4**: 전략별 성과 카드
- [x] **Task 3.5**: StatsClient 리팩토링 (섹션 분리)

---

## Phase 4: 리스크 관리 도구

### UI

- [x] **Task 4.1**: PositionCalculator 컴포넌트
  - 입력: 계좌 잔고, 리스크 %, 진입가, 손절가
  - 출력: 적정 수량, 리스크 금액

- [ ] **Task 4.2**: TradeForm에 계산기 통합 (추후)
- [ ] **Task 4.3**: PortfolioSummary에 총 리스크 노출 표시 (추후)

---

## Phase 5: UX 개선

### 캘린더 뷰 (추후)

- [ ] **Task 5.1**: CalendarView 컴포넌트
- [ ] **Task 5.2**: 날짜별 손익 색상 표시
- [ ] **Task 5.3**: 날짜 클릭 시 매매 목록 팝업
- [ ] **Task 5.4**: 테이블/캘린더 뷰 전환 UI

### 검색 및 필터 (추후)

- [ ] **Task 5.5**: 종목 검색 컴포넌트 (디바운스)
- [ ] **Task 5.6**: 전략 태그 필터 (멀티셀렉트)
- [ ] **Task 5.7**: 기간 필터 (시작일/종료일)
- [ ] **Task 5.8**: 손익 필터 (전체/익절/손절)
- [ ] **Task 5.9**: URL searchParams 상태 동기화

### 데이터 내보내기

- [x] **Task 5.10**: CSV 내보내기 기능

---

## 완료 체크리스트

- [x] Phase 1 완료 (자산 흐름 그래프)
- [x] Phase 2 완료 (종목별 파이 차트)
- [x] Phase 3 완료 (통계 고도화)
- [x] Phase 4 완료 (PositionCalculator)
- [ ] Phase 5 진행중 (CSV 완료, 캘린더/필터 추후)
- [ ] `yarn lint` 통과
- [ ] `yarn test` 통과
- [ ] `yarn build` 통과
- [ ] spec.md 업데이트
- [ ] 사용자 승인 후 커밋

