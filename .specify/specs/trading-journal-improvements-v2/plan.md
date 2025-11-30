# Implementation Plan: 매매일지 2차 개선

**Feature Branch**: `feature/trading-journal-improvements-v2`  
**Spec**: [spec.md](./spec.md)  
**Created**: 2025-11-30

---

## Overview

매매일지 2차 개선을 5단계로 나누어 구현한다.

---

## Phase 1: 자산 흐름 그래프

### 1.1 DB 스키마

#### Step 1: 마이그레이션 생성
- `asset_snapshots` 테이블 생성
- 필드: id, user_id, date, total_assets, cash, position_value, created_at
- unique constraint: (user_id, date)

### 1.2 API 구현

#### Step 2: 스냅샷 API
- `GET /api/trades/assets` - 기간별 스냅샷 조회
- `POST /api/trades/assets` - 스냅샷 저장 (수동 또는 자동)

#### Step 3: 자동 스냅샷 로직
- 매매 생성/수정/삭제 시 해당 날짜 스냅샷 업데이트
- 현금 변경 시 스냅샷 업데이트

### 1.3 UI 구현

#### Step 4: AssetFlowChart 컴포넌트
- Recharts 라인 차트
- 기간 선택 버튼 (1W/1M/3M/1Y/ALL)
- 반응형 디자인

#### Step 5: PortfolioSummary 통합
- 차트 영역 확장
- 토글 또는 탭으로 표시

---

## Phase 2: 자산 배분 시각화

### 2.1 UI 구현

#### Step 6: AllocationPieChart 컴포넌트
- Recharts 파이 차트
- 종목별/섹터별 탭 전환
- 호버 툴팁 (종목명, 금액, 비중)

#### Step 7: 섹터 데이터 연동
- symbols 테이블 sector 필드 활용
- 섹터별 그룹핑 로직

#### Step 8: PortfolioSummary 통합
- 기존 미니 도넛 → 풀 파이 차트로 확장
- 차트 클릭 시 상세 모달

---

## Phase 3: 통계 고도화

### 3.1 API 확장

#### Step 9: 통계 API 확장
- `GET /api/trades/stats` 응답에 추가 필드
  - profitFactor
  - avgHoldingDays
  - maxWinStreak / maxLoseStreak
  - avgWinAmount / avgLossAmount
  - strategyStats: { [strategy]: { count, winRate, avgR } }

### 3.2 UI 구현

#### Step 10: 기간별 수익 차트
- 월별/주별 바 차트
- 기간 선택 드롭다운

#### Step 11: 전략별 성과 카드
- 전략 태그별 통계 카드
- 승률, 평균 R, 총 손익

#### Step 12: StatsClient 리팩토링
- 섹션별 컴포넌트 분리
- 차트 컴포넌트 재사용

---

## Phase 4: 리스크 관리 도구

### 4.1 UI 구현

#### Step 13: PositionCalculator 컴포넌트
- 입력 폼: 계좌 잔고, 리스크 %, 진입가, 손절가
- 결과: 적정 수량, 리스크 금액, 포지션 비중

#### Step 14: TradeForm 통합
- 손절가 입력 시 자동 계산
- 추천 수량 표시

#### Step 15: 리스크 노출 표시
- PortfolioSummary에 총 리스크 노출 표시
- 진행중 매매의 합산 리스크

---

## Phase 5: UX 개선

### 5.1 캘린더 뷰

#### Step 16: CalendarView 컴포넌트
- 월별 캘린더 그리드
- 날짜별 손익 색상 표시
- 날짜 클릭 시 해당 일 매매 팝업

#### Step 17: 라우트 연동
- `/trades?view=calendar` 쿼리 파라미터
- 테이블/캘린더 뷰 전환

### 5.2 검색 및 필터

#### Step 18: 검색 컴포넌트
- 종목 검색 입력
- 디바운스 적용

#### Step 19: 필터 컴포넌트
- 전략 태그 멀티셀렉트
- 기간 선택 (시작일/종료일)
- 손익 필터 (전체/익절/손절)

#### Step 20: URL 상태 동기화
- searchParams로 필터 상태 관리
- 뒤로가기/앞으로가기 지원

### 5.3 데이터 내보내기

#### Step 21: CSV 내보내기
- 클라이언트 사이드 CSV 생성
- 다운로드 버튼

---

## Dependencies

```
Phase 1 (자산 흐름)
├── Step 1: DB 스키마
├── Step 2-3: API (Step 1 후)
└── Step 4-5: UI (Step 2 후)

Phase 2 (자산 배분)
├── Step 6-7: 파이 차트
└── Step 8: 통합

Phase 3 (통계 고도화)
├── Step 9: API 확장
└── Step 10-12: UI (Step 9 후)

Phase 4 (리스크 관리)
├── Step 13: 계산기
├── Step 14: 폼 통합 (Step 13 후)
└── Step 15: 노출 표시

Phase 5 (UX 개선)
├── Step 16-17: 캘린더
├── Step 18-20: 검색/필터
└── Step 21: 내보내기
```

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| 스냅샷 데이터 정확성 | 매매/현금 변경 시 자동 업데이트 로직 |
| 차트 성능 (대량 데이터) | 기간별 데이터 제한, 집계 쿼리 사용 |
| 필터 복잡성 | URL 상태 관리로 단순화 |

---

## Estimated Effort

| Phase | Effort | 비고 |
|-------|--------|------|
| Phase 1 | 4-5시간 | DB + API + 차트 |
| Phase 2 | 2-3시간 | 차트만 |
| Phase 3 | 3-4시간 | API 확장 + 차트 |
| Phase 4 | 3-4시간 | 계산 로직 + UI |
| Phase 5 | 5-6시간 | 캘린더 + 필터 + 내보내기 |
| **Total** | **17-22시간** | |

