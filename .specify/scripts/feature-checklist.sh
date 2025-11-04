#!/bin/bash

# 피쳐 개발 체크리스트 스크립트
# Usage: ./feature-checklist.sh [feature-name]

FEATURE_NAME=${1:-"new-feature"}
FEATURE_DIR=".specify/specs/${FEATURE_NAME}"

echo "📋 피쳐 개발 체크리스트: ${FEATURE_NAME}"
echo "=========================================="
echo ""

# Phase 1: 스펙 작성
echo "✅ Phase 1: 스펙 작성"
if [ -f "${FEATURE_DIR}/spec.md" ]; then
    echo "  ✓ spec.md 존재"
else
    echo "  ✗ spec.md 없음"
fi
echo ""

# Phase 2: 플랜 작성
echo "✅ Phase 2: 플랜 작성"
if [ -f "${FEATURE_DIR}/plan.md" ]; then
    echo "  ✓ plan.md 존재"
else
    echo "  ✗ plan.md 없음"
fi
echo ""

# Phase 3: 태스크 작성
echo "✅ Phase 3: 태스크 작성"
if [ -f "${FEATURE_DIR}/tasks.md" ]; then
    echo "  ✓ tasks.md 존재"
else
    echo "  ✗ tasks.md 없음"
fi
echo ""

# Phase 5: 테스트
echo "✅ Phase 5: 테스트"
TEST_COUNT=$(yarn test --run --reporter=json 2>/dev/null | jq -r '.numTotalTests' 2>/dev/null || echo "0")
if [ "$TEST_COUNT" -gt 0 ]; then
    echo "  ✓ 테스트 ${TEST_COUNT}개 실행됨"
else
    echo "  ⚠ 테스트 실행 확인 필요"
fi
echo ""

# Phase 8: 빌드 테스트
echo "✅ Phase 8: 빌드 테스트"
if [ -d ".next" ]; then
    echo "  ✓ 빌드 결과 존재"
else
    echo "  ⚠ 빌드 실행 필요: yarn build"
fi
echo ""

echo "=========================================="
echo "📚 전체 워크플로우: .specify/templates/FEATURE_DEVELOPMENT_WORKFLOW.md 참고"
echo ""

