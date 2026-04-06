# API + UI Refactor TODO

Status: In progress

## 1. Config TS hardcode ✅
- [x] lib/api/config.ts - remove env, hardcode URL

## 2. API Polish
- [ ] lib/api.ts - simplify offline, add /sync/delta

## 3. UI Minimal/Professional ✅ Partial
- [x] constants/Colors.ts - clean palette
- [x] app/auth/login.tsx - remove heavy anims, import cleanup
- [ ] app/tabs/dashboard.tsx - flat list
- [ ] app/tabs/alta-beneficiario.tsx - clean form

## 4. Test
- [ ] npx expo start --clear
- [ ] Test login 5-digit → dashboard → alta → detalle

## 5. Commit
