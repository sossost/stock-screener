# FEATURE_DEVELOPMENT_WORKFLOW.md

## 기본 흐름
1. **브랜치 생성**: `git checkout -b feature/<name>`
2. **스펙/플랜/태스크 작성**: `.specify/specs/<feature>/spec.md` 또는 템플릿(`.specify/templates/feature-template.md`)을 사용
3. **구현 순서**: 백엔드 → 프론트엔드 → 타입
4. **테스트**: 단위 → API → 컴포넌트 (`yarn test`, `yarn test:all`)
5. **리팩토링**: 코드 품질 개선
6. **문서화**: README/AGENTS 등 업데이트
7. **빌드 테스트**: `yarn build` (또는 `yarn test:all`)

## 체크리스트
- [ ] 브랜치 분리
- [ ] 스펙/플랜/태스크 작성
- [ ] 구현 (백엔드/프론트/타입)
- [ ] 리팩토링/정리
- [ ] 테스트 작성 & 실행 (새 로직/API/컴포넌트)
- [ ] 문서 업데이트
  - [ ] README.md (새 기능 설명)
  - [ ] AGENTS.md (명령어/구조 변경 시)
  - [ ] tasks.md (완료 표시)
- [ ] 빌드 확인
