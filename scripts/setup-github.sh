#!/usr/bin/env bash
# Crea el repo en GitHub con las tres ramas de oro y sus protecciones.
# Requiere: gh auth login
set -euo pipefail
REPO="${1:-anderman1981/payguard}"

git rev-parse --git-dir >/dev/null 2>&1 || git init -b main
npm run setup

git add -A
git diff --cached --quiet || git commit -m "release(m0): base del proyecto, gobierno y gates de calidad"
git tag -f v0.1.0

gh repo create "$REPO" --public --source=. --remote=origin --push
for b in staging dev; do git branch -f "$b" main && git push -u origin "$b"; done
git push origin v0.1.0
gh repo edit "$REPO" --default-branch dev --delete-branch-on-merge

for b in main staging dev; do
  gh api -X PUT "repos/$REPO/branches/$b/protection" \
    -F required_status_checks.strict=true \
    -f 'required_status_checks.contexts[]=gates' \
    -F enforce_admins=false \
    -F required_pull_request_reviews.required_approving_review_count=0 \
    -F restrictions= \
    -F allow_force_pushes=false \
    -F allow_deletions=false >/dev/null && echo "✓ $b protegida"
done
echo "Listo. Rama por defecto: dev. Trabaja en fea/* o fix/*."
