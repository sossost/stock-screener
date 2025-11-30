#!/bin/bash

# Pre-commit 검증 스크립트
# 사용법: ./.git/hooks/pre-commit 또는 수동 실행

set -e

echo "🔍 Pre-commit 검증 시작..."

# 1. 린트 검사
echo "📝 ESLint 검사 중..."
yarn lint

# 2. 타입 체크 (빌드)
echo "🔨 타입 체크 및 빌드 중..."
yarn build

# 3. 테스트 (선택적, 빠른 테스트만)
if [ -f "apps/web/vitest.config.ts" ]; then
  echo "🧪 테스트 실행 중..."
  yarn test --run
fi

echo "✅ 모든 검증 통과!"
exit 0

