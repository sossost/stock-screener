# FEATURE_DEVELOPMENT_WORKFLOW.md

## 기본 흐름

1. **브랜치 생성**: `git checkout -b feature/<name>`
2. **스펙/플랜/태스크 작성**: `.specify/specs/<feature>/spec.md` 또는 템플릿(`.specify/templates/feature-template.md`)을 사용
3. **의사결정 문서화**: `.specify/specs/<feature>/decisions.md` 작성 (스펙 작성 단계부터 시작)
4. **구현 순서**: 백엔드 → 프론트엔드 → 타입
5. **의사결정 업데이트**: 구현 과정에서 내린 의사결정을 `decisions.md`에 추가
6. **셀프 리뷰**: 작성 코드를 "PR 리뷰어 관점"으로 검토
7. **테스트**: 단위 → API → 컴포넌트 (`yarn test`, `yarn test:all`)
8. **문서화**: README/spec/plan/tasks 동시 업데이트
9. **빌드 테스트**: `yarn build` (또는 `yarn test:all`)

## 📝 의사결정 문서화 (필수)

피쳐 개발 과정에서 내린 모든 주요 의사결정과 그 근거를 문서화합니다.

### 문서 위치

- **파일**: `.specify/specs/<feature>/decisions.md`
- **형식**: ADR (Architecture Decision Record) 형식

### 문서화 시점

1. **스펙 작성 단계**: 설계 선택사항에 대한 의사결정
   - 예: 알림 채널 선택 (이메일 vs 푸시)
   - 예: 데이터 저장 방식 선택 (메모리 vs DB)
   - 예: 피쳐 분리 여부

2. **구현 단계**: 구현 방법에 대한 의사결정
   - 예: 타입 안전성 개선 방법
   - 예: 리소스 정리 패턴 선택
   - 예: 에러 처리 전략

### ADR 템플릿

템플릿 파일: [`.specify/templates/decisions-template.md`](../../.specify/templates/decisions-template.md)

새 피쳐 시작 시:
1. `.specify/specs/<feature>/decisions.md` 파일 생성
2. 템플릿 파일을 복사하여 사용
3. 스펙 작성 단계부터 의사결정 기록 시작

### 문서화 체크리스트

스펙 작성 시:
- [ ] 주요 설계 선택사항이 `decisions.md`에 기록되었는가?
- [ ] 각 옵션의 장단점이 명확히 정리되었는가?
- [ ] 선택한 옵션의 근거가 명확한가?

구현 중:
- [ ] 구현 과정에서 내린 의사결정이 `decisions.md`에 추가되었는가?
- [ ] 코드 리뷰에서 제기된 의사결정이 문서화되었는가?

## 구현 체크리스트 (코드 작성 시 필수)

코드 작성 전/중에 반드시 확인:

- [ ] **입력 검증**: API 파라미터, 사용자 입력에 대한 유효성 검사
- [ ] **에러 핸들링**: try-catch, 에러 응답, 폴백 처리
- [ ] **메모리 관리**: 이벤트 리스너, 구독, 타이머 cleanup 처리
- [ ] **배열/객체 접근**: 인덱스 범위 체크, null/undefined 가드
- [ ] **타입 안전성**: 타입 단언(as) 최소화, 타입 가드 사용
- [ ] **엣지 케이스**: 빈 배열, 단일 요소, 경계값 처리

**상세 체크리스트는 [`CODE_REVIEW_CHECKLIST.md`](./CODE_REVIEW_CHECKLIST.md)를 참조하세요.**

## 📋 3단계 검증 프로세스

코드 리뷰에서 놓치기 쉬운 문제들을 사전에 방지하고, 일관된 코드 품질을 유지합니다.

### 1단계: 작업 중 실시간 검증 (코딩 시)

**도구**: IDE 린터, TypeScript 컴파일러

- 실시간 에러 표시
- 타입 체크
- 기본 린트 규칙

**체크 항목**:

- [ ] 타입 에러 없음
- [ ] 기본 린트 규칙 통과
- [ ] 컴포넌트 분리 필요성 인지

### 2단계: 작업 완료 후 자동 검증 (커밋 전)

**도구**: `scripts/pre-commit-check.sh`

```bash
# 수동 실행
./scripts/pre-commit-check.sh

# 또는 Git hook으로 자동화 (선택)
cp scripts/pre-commit-check.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

**검증 항목**:

1. `yarn lint` - ESLint 검사
2. `yarn build` - 타입 체크 + 빌드
3. `yarn test` - 테스트 실행

### 3단계: 수동 체크리스트 검증 (PR 전)

**도구**: [`CODE_REVIEW_CHECKLIST.md`](./CODE_REVIEW_CHECKLIST.md)

**검증 항목**:

1. 컴포넌트 설계 원칙 (DRY)
2. 타입 안전성
3. 에러 핸들링
4. UI/UX 안전성
5. 폴더 구조
6. 성능 최적화

## 피쳐 완료 체크리스트 (구현 후 필수)

**"코드 완료" ≠ "피쳐 완료"**. 아래 모두 완료해야 피쳐 완료:

1. **셀프 리뷰**: 작성한 코드를 "PR 리뷰어 관점"으로 검토
   - **필수**: `docs/CODE_REVIEW_CHECKLIST.md` 체크리스트 전체 검증
   - 컴포넌트 설계 원칙, 타입 안전성, 에러 핸들링, UI/UX 안전성 확인
2. **UI 스타일 검토**: `docs/FRONTEND_PRACTICES.md` 기준으로 체크
3. **문서 업데이트**: README, spec, plan, tasks 동시 업데이트
4. **린트/테스트/빌드**: `yarn lint && yarn test && yarn build` 통과
5. **관련 단어 통일**: 코드/주석/문서에서 용어 일관성 확인

## 커밋 전 필수 체크 (생략 불가)

- [ ] `yarn lint` 통과
- [ ] `yarn test` 통과
- [ ] `yarn build` 통과
- [ ] **사용자 승인 후 커밋** (승인 없이 커밋 금지)
