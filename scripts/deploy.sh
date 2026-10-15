#!/usr/bin/env bash
# GitHub Pages へ公開する。dist を gh-pages ブランチに強制 push する方式
# （このアカウントでは GitHub Actions が使えないため、手元でビルドして送る）
set -euo pipefail
cd "$(dirname "$0")/.."

repo_url=$(git remote get-url origin)
name=$(basename -s .git "$repo_url")
rev=$(git rev-parse --short HEAD)

BASE_PATH="/$name/" npm run build
touch dist/.nojekyll

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
cp -R dist/. "$tmp"
git -C "$tmp" init -q -b gh-pages
git -C "$tmp" add -A
git -C "$tmp" commit -q -m "Deploy $rev"
git -C "$tmp" push -q -f "$repo_url" gh-pages

echo "公開しました: https://$(git remote get-url origin | sed -E 's#.*github.com[:/]([^/]+)/.*#\1#').github.io/$name/"
