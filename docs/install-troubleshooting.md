# Install Troubleshooting

If `npm install` hangs or fails, check these two common root causes.

## 1) Root-owned npm cache (EPERM)
Symptom:
- `npm cache verify` shows `EPERM` and root-owned files under `~/.npm/_cacache`.

Fix:
```bash
sudo chown -R $(id -u):$(id -g) ~/.npm
```
Or bypass global cache for this project:
```bash
npm install --cache .npm-cache
```

## 2) DNS/Network resolution failure (ENOTFOUND)
Symptom:
- npm logs contain `GET https://registry.npmjs.org/... failed with ENOTFOUND`.

Fix:
```bash
nslookup registry.npmjs.org
networksetup -getdnsservers Wi-Fi
```
Then either:
- switch network/VPN settings,
- set valid DNS servers,
- or run behind your corporate proxy with npm proxy settings.

Temporary check:
```bash
npm ping --registry=https://registry.npmjs.org/
```

## Recommended clean install sequence
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install --cache .npm-cache
npm run dev
```
