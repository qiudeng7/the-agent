#!/bin/bash
# 使用 gh CLI 上传构建产物到 GitHub Release
# 用法: ./scripts/publish.sh [mac|win]

set -e

cd "$(dirname "$0)/.."

PLATFORM="${1:-mac}"
VERSION=$(node -p "require('./package.json').version")

echo "Publishing $PLATFORM release for version $VERSION..."

# 查找 zip 文件并确定 asset 名称
if [ "$PLATFORM" = "mac" ]; then
    ZIP_FILE="out/make/zip/darwin/arm64/the-agent-darwin-arm64-${VERSION}.zip"
    ASSET_NAME="the-agent-darwin-arm64-${VERSION}.zip"
elif [ "$PLATFORM" = "win" ]; then
    ZIP_FILE="out/make/zip/win32/x64/the-agent-win32-x64-${VERSION}.zip"
    ASSET_NAME="the-agent-win32-x64-${VERSION}.zip"
else
    echo "Unknown platform: $PLATFORM"
    echo "Usage: $0 [mac|win]"
    exit 1
fi

if [ ! -f "$ZIP_FILE" ]; then
    echo "Zip file not found: $ZIP_FILE"
    echo "Please run 'pnpm run make:$PLATFORM' first"
    exit 1
fi

echo "Found: $ZIP_FILE"
echo "Asset name: $ASSET_NAME"

# 检查 release 是否已存在
RELEASE_TAG="v${VERSION}"
if gh release view "$RELEASE_TAG" --repo qiudeng7/the-agent > /dev/null 2>&1; then
    echo "Release $RELEASE_TAG already exists, uploading asset..."
    gh release upload "$RELEASE_TAG" "$ZIP_FILE" --repo qiudeng7/the-agent --clobber
else
    echo "Creating release $RELEASE_TAG..."
    gh release create "$RELEASE_TAG" "$ZIP_FILE" \
        --repo qiudeng7/the-agent \
        --title "v${VERSION}" \
        --generate-notes
fi

echo "Published $ASSET_NAME to GitHub Release $RELEASE_TAG"