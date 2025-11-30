# Spec: 매매일지 2차 개선

**Feature Branch**: `feature/trading-journal-improvements-v2`  
**Status**: 📋 Planning  
**Created**: 2025-11-30

---

## 개요

매매일지 1차 개선 완료 후, 자산 관리 및 분석 기능을 고도화한다.

---

## Phase 1: 자산 흐름 그래프

### 목표
시간에 따른 총 자산 변화를 시각화하여 투자 성과를 추적한다.

### 요구사항

1. **자산 스냅샷 저장**
   - 매일 자산 총계 (현금 + 포지션 가치) 기록
   - DB 테이블: `asset_snapshots` (date, total_assets, cash, position_value)
   
2. **라인 차트 구현**
   - 기간 선택: 1주/1개월/3개월/1년/전체
   - X축: 날짜, Y축: 자산 총계

### UI 위치
- `PortfolioSummary` 하단 또는 별도 탭

---

## Phase 2: 자산 배분 시각화

### 목표
종목별/섹터별 비중을 파이 차트로 시각화한다.

### 요구사항

1. **종목별 비중 파이 차트**
   - 현재 보유 종목별 포지션 비중
   - 호버 시 종목명, 금액, 비중 툴팁
   
2. **섹터별 비중 파이 차트**
   - symbols 테이블의 sector 활용
   - 섹터별 그룹핑

3. **현금 vs 포지션 비율**
   - 현재 미니 도넛 차트 고도화

### UI 위치
- `PortfolioSummary` 우측 차트 영역 확장

---

## Phase 3: 통계 고도화

### 목표
매매 성과 분석을 위한 상세 통계를 제공한다.

### 요구사항

1. **기간별 수익 차트**
   - 월별/주별 실현 손익 바 차트
   - 누적 수익 라인 차트
   
2. **추가 통계 지표**
   - Profit Factor (총 이익 / 총 손실)
   - 평균 보유 기간
   - 연속 승/패 기록 (최대 연승/연패)
   - 평균 승/패 금액
   
3. **전략별 성과 분석**
   - 전략 태그별 승률, 평균 R
   - 가장 효과적인 전략 하이라이트

### UI 위치
- `/trades/stats` 페이지 확장

---

## Phase 4: 리스크 관리 도구

### 목표
포지션 사이징과 리스크 관리를 지원한다.

### 요구사항

1. **포지션 사이즈 계산기**
   - 입력: 계좌 잔고, 리스크 %, 진입가, 손절가
   - 출력: 적정 수량, 리스크 금액
   
2. **1R 리스크 관리**
   - 1R = 최초 손절 시 손실 금액
   - 모든 매매의 R-Multiple 추적
   - 총 리스크 노출 (진행중 매매 합산)

3. **목표 비중 알림**
   - 종목별 최대 비중 설정
   - 초과 시 경고 표시

### UI 위치
- 새 매매 폼에 계산기 통합
- `PortfolioSummary`에 리스크 노출 표시

---

## Phase 5: UX 개선

### 요구사항

1. **캘린더 뷰**
   - 일별 매매 기록 캘린더
   - 해당 일 손익 색상 표시 (녹색/적색)
   - 날짜 클릭 시 해당 일 매매 목록

2. **검색 및 필터**
   - 종목 검색
   - 전략 태그 필터
   - 기간 필터
   - 손익 필터 (익절/손절)

3. **데이터 내보내기**
   - CSV 내보내기

---

## 기술 스택

- **차트**: Recharts (이미 프로젝트에 있음)
- **캘린더**: 자체 구현 또는 react-calendar

---

## 우선순위

| Phase | 중요도 | 난이도 | 예상 시간 |
|-------|--------|--------|-----------|
| Phase 1 | 🔴 높음 | 중간 | 4-5시간 |
| Phase 2 | 🟠 중간 | 낮음 | 2-3시간 |
| Phase 3 | 🟠 중간 | 중간 | 3-4시간 |
| Phase 4 | 🟡 낮음 | 중간 | 3-4시간 |
| Phase 5 | 🟠 중간 | 높음 | 5-6시간 |

---

## 관련 파일 (예정)

### 새 컴포넌트
- `components/trades/AssetFlowChart.tsx`
- `components/trades/AllocationPieChart.tsx`
- `components/trades/PositionCalculator.tsx`
- `components/trades/CalendarView.tsx`

### 새 API
- `api/trades/assets/route.ts` - 자산 스냅샷 CRUD

### DB 스키마 (예정)
```sql
-- 자산 스냅샷
CREATE TABLE asset_snapshots (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT '0',
  date DATE NOT NULL,
  total_assets NUMERIC NOT NULL,
  cash NUMERIC NOT NULL,
  position_value NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);
```
