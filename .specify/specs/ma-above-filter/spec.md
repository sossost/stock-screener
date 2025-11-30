# 이평선 위 필터 스펙

## 목표

스크리너에 이평선 위 필터 기능을 추가하여, 최근 거래일 종가 기준으로 특정 이평선(20/50/100/200일선) 위에 있는 종목만 필터링할 수 있도록 한다.

## 정의·범위

### 필터 옵션

- **20일선 위**: 종가 > MA20
- **50일선 위**: 종가 > MA50
- **100일선 위**: 종가 > MA100
- **200일선 위**: 종가 > MA200

### 필터 동작

- 각 이평선은 독립적인 체크박스로 표시
- 여러 이평선을 체크하면 **모두 만족하는 종목만** 표시 (AND 조건)
- 예: 20일선 위 + 50일선 위를 체크하면 `종가 > MA20 AND 종가 > MA50` 조건을 만족하는 종목만 표시

### 데이터 기준

- 최근 거래일(`daily_prices`의 최대 `date`) 기준
- 해당 날짜의 `daily_ma` 테이블의 `ma20`, `ma50`, `ma100`, `ma200` 값과 `daily_prices`의 `adj_close` 비교
- MA 데이터가 없는 종목은 필터링 대상에서 제외 (NULL 처리)

## 데이터 모델

### 기존 테이블 활용

- `daily_ma`: `ma20`, `ma50`, `ma100`, `ma200` 컬럼 사용
- `daily_prices`: `adj_close` 컬럼 사용
- 스키마 변경 없음

## API / 쿼리

### 필터 파라미터 추가

`ScreenerParams` 타입에 다음 필드 추가:

```typescript
interface ScreenerParams {
  // ... 기존 필드들
  ma20Above?: boolean; // 20일선 위
  ma50Above?: boolean; // 50일선 위
  ma100Above?: boolean; // 100일선 위
  ma200Above?: boolean; // 200일선 위
}
```

### SQL 쿼리 수정

`buildScreenerQuery` 함수에서:

1. `buildCurrentDataCTE`에서 이미 `daily_ma`와 조인하여 MA 데이터를 가져오고 있음
2. `buildWhereFilters` 함수에 이평선 위 필터 조건 추가:
   ```sql
   ${ma20Above ? sql`AND cd.close > cd.ma20` : sql``}
   ${ma50Above ? sql`AND cd.close > cd.ma50` : sql``}
   ${ma100Above ? sql`AND cd.close > cd.ma100` : sql``}
   ${ma200Above ? sql`AND cd.close > cd.ma200` : sql``}
   ```
3. MA 데이터가 NULL인 경우 필터링에서 제외 (기존 로직 유지)

## UI / UX

### 필터 카테고리

- **카테고리명**: "이평선 위치" 또는 "이평선 필터"
- **위치**: 기존 필터 다이얼로그 내 새로운 카테고리로 추가

### 필터 UI

- 체크박스 형태로 표시:
  ```
  ☐ 20일선 위
  ☐ 50일선 위
  ☐ 100일선 위
  ☐ 200일선 위
  ```
- 각 체크박스는 독립적으로 선택 가능
- 여러 개 선택 시 모두 만족하는 종목만 표시

### 필터 요약

- 활성화된 필터가 있으면 필터박스에 요약 표시
- 예: "20일선 위, 50일선 위"
- 필터가 없으면 표시하지 않음

## 상태 관리

### URL 쿼리 파라미터

- `ma20Above`: boolean (기본값: false)
- `ma50Above`: boolean (기본값: false)
- `ma100Above`: boolean (기본값: false)
- `ma200Above`: boolean (기본값: false)

### FilterState 타입 확장

```typescript
interface FilterState {
  // ... 기존 필드들
  ma20Above?: boolean;
  ma50Above?: boolean;
  ma100Above?: boolean;
  ma200Above?: boolean;
}
```

### useFilterState 훅 확장

- `ma20Above`, `setMa20Above` 추가
- `ma50Above`, `setMa50Above` 추가
- `ma100Above`, `setMa100Above` 추가
- `ma200Above`, `setMa200Above` 추가
- 모두 `parseAsBoolean.withDefault(false)` 사용

## 예시 / 수락 기준

### 테스트 케이스

1. **단일 필터**: 20일선 위만 체크 → 종가 > MA20인 종목만 표시
2. **다중 필터**: 20일선 위 + 50일선 위 체크 → 종가 > MA20 AND 종가 > MA50인 종목만 표시
3. **모든 필터**: 4개 모두 체크 → 종가 > MA20 AND 종가 > MA50 AND 종가 > MA100 AND 종가 > MA200인 종목만 표시
4. **필터 해제**: 모든 체크박스 해제 → 필터링 없음 (전체 종목 표시)
5. **MA 데이터 없음**: MA 데이터가 NULL인 종목은 필터링 대상에서 제외

### 수락 기준

- [x] 필터 체크박스가 정상적으로 표시됨 (20MA/50MA/100MA/200MA 가로 배치)
- [x] 단일 필터가 정상 작동함 (코드 검증 완료)
- [x] 다중 필터(AND 조건)가 정상 작동함 (코드 검증 완료)
- [x] 필터 요약이 정상적으로 표시됨 (`getMAFilterSummary` 구현 완료)
- [x] URL 쿼리 파라미터가 정상적으로 업데이트됨 (`useQueryState` 사용)
- [x] 페이지 새로고침 시 필터 상태가 유지됨 (URL 동기화 확인)
- [x] MA 데이터가 없는 종목이 필터링에서 제외됨 (`IS NOT NULL` 체크 포함)

## UX 개선

### 종목 테이블 개선

- 심볼 클릭 시 상세 페이지가 새 탭에서 열리도록 개선
- `target="_blank"` 및 `rel="noopener noreferrer"` 추가 (보안)

## 참고사항

- 기존 "정배열" 필터(`ordered`)와는 별개의 독립적인 필터
- 기존 "골든크로스" 필터(`goldenCross`)와도 별개의 독립적인 필터
- 이 필터들은 함께 사용 가능 (AND 조건으로 결합)
