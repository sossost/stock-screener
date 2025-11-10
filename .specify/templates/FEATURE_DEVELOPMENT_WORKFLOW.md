# 피쳐 개발 워크플로우 체크리스트

이 문서는 새로운 피쳐 개발 시 따라야 할 표준 프로세스를 정리합니다.

## 📋 전체 프로세스 개요

```
1. 스펙 작성 → 2. 플랜 작성 → 3. 태스크 작성 → 4. 구현 → 5. 테스트 → 6. 리팩토링 → 7. 문서화 → 8. 사용자 확인 (빌드/커밋/배포)
```

---

## Phase 1: 스펙 작성 (Specification)

### 1.1 스펙 문서 작성

- [ ] `.specify/specs/[feature-name]/spec.md` 생성
- [ ] User Stories 작성 (P1, P2, P3 우선순위)
- [ ] Functional Requirements (FR1, FR2, ...)
- [ ] Non-Functional Requirements (성능, 사용성, 데이터 품질)
- [ ] API Contract 정의
- [ ] UI/UX 요구사항
- [ ] Success Metrics
- [ ] Edge Cases

### 1.2 스펙 검토

- [ ] Constitution 준수 확인
- [ ] 의존성 및 리스크 확인
- [ ] 사용자 승인 (필요시)

**체크리스트 파일**: `.specify/templates/checklist-template.md` 참고

---

## Phase 2: 플랜 작성 (Planning)

### 2.1 플랜 문서 작성

- [ ] `.specify/specs/[feature-name]/plan.md` 생성
- [ ] Summary (핵심 변경사항)
- [ ] Technical Context (기술 스택, 목표)
- [ ] Data Models (API 요청/응답 타입)
- [ ] SQL Query Logic (필요시)
- [ ] Implementation Phases (백엔드 → 프론트엔드 → 통합)
- [ ] Success Criteria

### 2.2 플랜 간소화 (선택사항)

- [ ] 핵심만 남기고 불필요한 내용 제거
- [ ] 실행 가능한 수준으로 단순화

**템플릿**: `.specify/templates/plan-template.md` 참고

---

## Phase 3: 태스크 작성 (Tasks)

### 3.1 태스크 문서 작성

- [ ] `.specify/specs/[feature-name]/tasks.md` 생성
- [ ] User Story별로 그룹화
- [ ] 파일 경로 명시
- [ ] 의존성 표시
- [ ] 우선순위 표시 (P1, P2, P3)

### 3.2 태스크 간소화 (선택사항)

- [ ] 핵심 작업만 남기기
- [ ] 중복 제거

**템플릿**: `.specify/templates/tasks-template.md` 참고

---

## Phase 4: 구현 (Implementation)

### 4.1 백엔드 구현

- [ ] API 라우트 수정/생성 (`src/app/api/.../route.ts`)
- [ ] SQL 쿼리 작성/수정
- [ ] 타입 정의 (`src/types/...`)
- [ ] 유틸리티 함수 분리 (필요시 `src/lib/...`)
- [ ] 에러 처리
- [ ] 유효성 검사

### 4.2 프론트엔드 구현

- [ ] 컴포넌트 생성/수정 (`src/components/...`)
- [ ] 페이지 컴포넌트 수정 (`src/app/screener/...`)
- [ ] 상태 관리 (`nuqs` 등)
- [ ] UI/UX 개선
- [ ] 캐시 태그 업데이트

### 4.3 타입 정의

- [ ] API 요청/응답 타입 업데이트
- [ ] 컴포넌트 Props 타입 정의
- [ ] 타입 안전성 확인

---

## Phase 5: 테스트 (Testing) ⚠️ 필수

### 5.1 테스트 환경 확인

- [ ] `vitest.config.ts` 설정 확인
- [ ] 테스트 라이브러리 설치 확인

### 5.2 단위 테스트 작성

- [ ] 핵심 로직 함수 테스트 (`src/lib/__tests__/...`)
- [ ] 정상 케이스
- [ ] 엣지 케이스 (NULL, 0, 음수 등)
- [ ] 에러 케이스

### 5.3 API 테스트 작성

- [ ] API 라우트 테스트 (`src/app/api/.../__tests__/route.test.ts`)
- [ ] 파라미터 검증
- [ ] 에러 처리
- [ ] 응답 형식 검증

### 5.4 컴포넌트 테스트 작성

- [ ] React 컴포넌트 테스트 (`src/components/.../__tests__/...`)
- [ ] 렌더링 테스트
- [ ] 사용자 인터랙션 테스트
- [ ] 상태 관리 테스트

### 5.5 테스트 실행

```bash
yarn test --run
```

- [ ] 모든 테스트 통과 확인
- [ ] 커버리지 확인 (선택사항): `yarn test --coverage`

---

## Phase 6: 리팩토링 (Refactoring)

### 6.1 코드 품질 검토

- [ ] 중복 코드 제거
- [ ] 함수 분리 (SQL 로직 → TypeScript 함수, 필요시)
- [ ] 주석 개선
- [ ] 타입 안전성 확인

### 6.2 UI 개선

- [ ] TableCaption 조건 표시 개선
- [ ] 사용자 피드백 메시지 개선
- [ ] 에러 메시지 명확화

### 6.3 린터 확인

```bash
# 자동으로 실행됨 (빌드 시)
```

- [ ] 린터 에러 없음

---

## Phase 7: 문서화 (Documentation)

### 7.1 README 업데이트

- [ ] 새 기능 설명 추가
- [ ] 사용법 섹션 업데이트
- [ ] 예시 추가

### 7.2 테스트 문서 업데이트 (필요시)

- [ ] `TESTING.md` 업데이트
- [ ] 새 테스트 케이스 설명

### 7.3 코드 주석

- [ ] SQL 쿼리 주석 추가
- [ ] 복잡한 로직 설명

---

## Phase 8: 빌드 테스트 (Build Test)

**⚠️ 중요: 빌드 테스트, 배포 테스트, 커밋은 사용자가 직접 수행합니다. AI는 구현만 담당합니다.**

### 8.1 프로덕션 빌드 (사용자 수행)

```bash
yarn build
```

사용자가 직접 확인:

- [ ] 빌드 성공 확인
- [ ] 타입 에러 없음
- [ ] 린터 에러 없음
- [ ] 경고 확인 (필요시 수정)

### 8.2 배포 전 체크리스트 (사용자 수행)

- [ ] 환경변수 확인
- [ ] 데이터베이스 마이그레이션 (필요시)
- [ ] API 엔드포인트 동작 확인

### 8.3 커밋 (사용자 수행)

- [ ] 사용자가 직접 커밋 메시지 작성 및 커밋 수행

---

## 🚀 빠른 체크리스트 (Quick Checklist)

새 피쳐 개발 시작 전:

```
[ ] 스펙 문서 작성 완료
[ ] 플랜 문서 작성 완료
[ ] 태스크 문서 작성 완료
```

구현 완료 후 (AI 담당):

```
[ ] 테스트 작성 완료 (36개 이상 통과)
[ ] 리팩토링 완료
[ ] README 업데이트 완료
```

사용자 확인 및 수행:

```
[ ] 빌드 테스트 통과 (사용자 직접 수행)
[ ] 커밋 (사용자 직접 수행)
[ ] 배포 (사용자 직접 수행)
```

---

## 📝 체크리스트 템플릿 사용법

새 피쳐를 시작할 때:

1. `.specify/specs/[feature-name]/` 폴더 생성
2. `spec.md`, `plan.md`, `tasks.md` 작성
3. 이 워크플로우 문서를 열어두고 단계별로 체크

---

## 🔄 반복 프로세스 (Iterative Process)

테스트 우선 개발 (TDD):

1. **Red**: 테스트 작성 → 실패 확인
2. **Green**: 구현 → 테스트 통과
3. **Refactor**: 코드 개선 → 테스트 유지

---

## 📚 참고 문서

- Constitution: `.specify/memory/constitution.md`
- 스펙 템플릿: `.specify/templates/spec-template.md`
- 플랜 템플릿: `.specify/templates/plan-template.md`
- 태스크 템플릿: `.specify/templates/tasks-template.md`
- 테스트 가이드: `TESTING.md`

---

## 💡 팁

1. **⚠️ 빌드/커밋/배포는 사용자 직접 수행**: AI는 구현만 담당하며, 빌드 테스트, 커밋, 배포는 사용자가 직접 수행합니다.
2. **테스트 먼저**: 구현 전에 테스트 작성
3. **문서화 병행**: 구현하면서 문서도 업데이트
4. **리뷰 요청**: 주요 Phase 완료 후 리뷰 요청
5. **자동화 활용**: 스크립트가 있으면 활용

---

## 🎯 이번 피쳐 (Golden Cross Growth Rate Filter) 완료 체크리스트

- [x] Phase 1: 스펙 작성
- [x] Phase 2: 플랜 작성
- [x] Phase 3: 태스크 작성
- [x] Phase 4: 구현 (백엔드 + 프론트엔드)
- [x] Phase 5: 테스트 (36개 테스트 통과)
- [x] Phase 6: 리팩토링
- [x] Phase 7: 문서화 (README 업데이트)
- [x] Phase 8: 빌드 테스트 (성공)
