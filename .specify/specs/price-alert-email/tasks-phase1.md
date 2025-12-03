# 가격 알림 시스템 Phase 1 - 작업 목록

**Branch**: `price-alert-email-phase1` | **Date**: 2025-12-03  
**Phase**: Phase 1 - 알림 감지 로직만 구현

## User Story 1.0: 데이터 모델 및 유틸리티 함수

- [x] **T1.0.1**: 알림 타입 상수 정의
  - 파일: `apps/web/src/lib/alerts/constants.ts`
  - 알림 타입: `MA20_BREAKOUT_ORDERED`

- [x] **T1.0.2**: 알림 데이터 타입 정의
  - 파일: `apps/web/src/lib/alerts/types.ts`
  - `AlertData` 인터페이스 정의

## User Story 1.1: 알림 감지 ETL 로직

- [x] **T1.1.1**: 최신 거래일 조회 유틸리티 함수
  - 파일: `apps/web/src/etl/utils/date-helpers.ts`
  - `getLatestTradeDate()`: 최신 거래일 조회
  - `getPreviousTradeDate()`: 전일 거래일 조회

- [x] **T1.1.2**: 알림 감지 메인 함수 구현
  - 파일: `apps/web/src/etl/jobs/detect-price-alerts.ts`
  - `detectMa20BreakoutOrdered()`: 정배열 상태에서 20일선 돌파 감지

- [x] **T1.1.3**: 중복 알림 방지 로직
  - 메모리 캐시 기반 중복 방지
  - `getNotifiedToday()`, `markAsNotified()` 함수

- [x] **T1.1.4**: 메인 ETL 함수 구현
  - `main()` 함수: 알림 감지 → 중복 체크 → 로깅

- [x] **T1.1.5**: package.json에 ETL 스크립트 추가
  - 파일: `apps/web/package.json`
  - `yarn etl:detect-alerts` 스크립트 추가

## Phase 1 완료 기준

- ✅ ETL 실행 시 조건에 맞는 종목 감지
- ✅ 콘솔에 알림 정보 출력
- ✅ 중복 알림 방지 확인

## 다음 단계 (Phase 2)

- 이메일 알림 전송 구현
- 알림 이력 테이블 생성 (선택사항)

