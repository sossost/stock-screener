# 이름 변경 가이드

## 변경 사항

### 폴더명
- `src/app/screener/golden-cross/` → `src/app/screener/main/` (또는 `src/app/screener/`로 통합)

### 컴포넌트명
- `GoldenCrossClient` → `ScreenerClient`
- `GoldenCrossPage` → `ScreenerPage` (또는 제거, 메인 페이지로 통합)

### 타입명
- `GoldenCrossCompany` → `ScreenerCompany`
- `GoldenCrossClientProps` → `ScreenerClientProps`
- `GoldenCrossResponse` → `ScreenerResponse` (선택적)
- `GoldenCrossParams` → `ScreenerParams` (선택적)

### 파일명
- `GoldenCrossClient.tsx` → `ScreenerClient.tsx`
- `DataWrapper.tsx` → 유지 (내부에서만 사용)

### API 경로
- `/api/screener/golden-cross` → 유지 (하위 호환성)
- 또는 `/api/screener/main` (선택적)

## 영향 범위

### 변경이 필요한 파일
1. `src/app/screener/golden-cross/GoldenCrossClient.tsx` → `src/app/screener/main/ScreenerClient.tsx`
2. `src/app/screener/golden-cross/page.tsx` → `src/app/screener/main/page.tsx` (또는 제거)
3. `src/app/screener/golden-cross/DataWrapper.tsx` → `src/app/screener/main/DataWrapper.tsx`
4. `src/app/screener/golden-cross/TableSkeleton.tsx` → `src/app/screener/main/TableSkeleton.tsx`
5. `src/app/page.tsx` (import 경로)
6. `src/types/golden-cross.ts` → `src/types/screener.ts` (선택적)
7. 모든 테스트 파일

### 변경이 필요 없는 파일
- `src/app/api/screener/golden-cross/route.ts` (API 경로는 유지 가능)

## 주의사항

1. **점진적 변경**: 한 번에 모든 것을 바꾸지 말고 단계적으로 진행
2. **하위 호환성**: API 경로는 유지하여 기존 북마크/링크가 작동하도록
3. **테스트 업데이트**: 모든 테스트 파일의 import 경로 업데이트 필요
4. **타입 안정성**: 타입명 변경 시 모든 사용처 업데이트 필요

