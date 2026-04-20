# Application Security VAPT Checklist
> Android

---

# ANDROID PENTESTING

---

## 1. Reconnaissance & Information Gathering

### APK Basic Information
```bash
aapt dump badging app.apk
```
- Check: App Name, Package Name, Version Name/Code, Min/Target SDK, Permissions, Launch Activity

### Signing Certificate
```bash
keytool -printcert -jarfile app.apk
apksigner verify --verbose app.apk
```
- Debug certificate in use (risk: APK tampering)
- Production certificate validation

### Attack Surface Mapping
- Activities, Services, Broadcast Receivers, Content Providers
- Deep links, network endpoints, APIs, third-party SDKs
- Tools: `MobSF`, `apktool`, `jadx`, `androguard`

---

## 2. Static Analysis

### AndroidManifest.xml
```bash
apktool d app.apk
```

#### Exported Activities
- `android:exported="true"` — launch without auth
```bash
adb shell am start -n <package>/<activity>
```
- Access hidden functionality, admin screens, bypass authentication

#### Exported Services
```bash
adb shell am startservice -n <package>/<service>
```
- Start service externally, abuse service functionality

#### Exported Broadcast Receivers
```bash
adb shell am broadcast -a <ACTION_NAME>
```
- Trigger sensitive operations, bypass authentication

#### Exported Content Providers
```bash
adb shell content query --uri content://<package>.provider/
adb shell content insert --uri content://<package>.provider/ --bind column:s:value
adb shell content update --uri content://<package>.provider/ --bind column:s:value
```
- Unauthorized read/write, SQL injection via content provider URIs

#### Dangerous Flags
| Flag | Risk |
|------|------|
| `android:debuggable="true"` | Full app compromise via debugger |
| `android:allowBackup="true"` | Data extraction via `adb backup` |
| `android:usesCleartextTraffic="true"` | MITM possible |
| `android:exported="true"` (unprotected) | Unauthorized access |

```bash
# Extract backup
adb backup -apk -shared <package>
```

### Permission Analysis
- Identify dangerous permissions:
  - `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`
  - `READ_CONTACTS`, `READ_SMS`, `RECORD_AUDIO`
  - `CAMERA`, `ACCESS_FINE_LOCATION`, `READ_CALL_LOG`
- Verify necessity of each permission

### Hardcoded Secrets
- Decompile with `jadx` or `apktool`
- Search for: `password`, `token`, `secret`, `key`, `authorization`, `bearer`, `firebase`, `aws`
- Check: `strings.xml`, `BuildConfig`, `assets/`, `res/raw/`
- Types: API keys, bearer tokens, Firebase keys, AWS keys, JWT tokens, encryption keys

### Reverse Engineering Protections
- Check ProGuard/R8/DexGuard obfuscation enabled
- Missing obfuscation = easy source code recovery
- Tools: `jadx`, `apktool`, `BytecodeViewer`

---

## 3. Local Storage Testing
Base path: `/data/data/<package>/`

### Shared Preferences
```bash
adb shell cat /data/data/<package>/shared_prefs/<file>.xml
```
- Tokens stored in plaintext, credentials, sensitive data

### SQLite Databases
```bash
adb shell sqlite3 /data/data/<package>/databases/<db>.db
.tables
SELECT * FROM users;
```
- Plaintext credentials, sensitive user data, unencrypted PII

### Internal Storage
```bash
adb shell ls /data/data/<package>/files/
```
- Sensitive files, cached credentials, private keys

### External Storage
```bash
adb shell ls /sdcard/<package>/
```
- Sensitive data stored on public SD card
- Readable by any app with `READ_EXTERNAL_STORAGE`

### Cache Storage
```bash
adb shell ls /data/data/<package>/cache/
```
- Sensitive data cached (HTTP responses, images with PII)

---

## 4. Network Communication Testing

### Traffic Interception Setup
```bash
# Set proxy on device
adb shell settings put global http_proxy <ip>:<port>

# Install Burp CA certificate on device
adb push burp_cert.der /sdcard/
# Then install via Settings > Security > Install from storage
```
- Tools: `Burp Suite`, `mitmproxy`, `Charles Proxy`

### Insecure Communication
- HTTP used for sensitive data transmission
- Sensitive data (passwords, tokens, PII) in HTTP traffic
- Cleartext credentials in request bodies or headers

### Sensitive Data Exposure in Transit
- Passwords, tokens, session IDs, personal data in cleartext
- Authorization headers logged or leaked

### SSL Pinning Testing
- Check if SSL pinning is implemented
- Bypass using:
  - `Frida` with SSL unpinning scripts
  - `Objection`: `objection -g <package> explore` → `android sslpinning disable`
  - `apk-mitm` for automated patching
  - Xposed + TrustMeAlready module

### Certificate Validation
- Accepts invalid/self-signed certificates
- Improper hostname verification
- `TrustAllCerts` implementation in code

---

## 5. Authentication Testing
- Biometric authentication bypass (Frida hook `FingerprintManager`, `BiometricPrompt`)
- Authentication state stored client-side (SharedPrefs, SQLite) — bypass by modifying storage
- Token not validated server-side after biometric success
- PIN/pattern stored insecurely

---

## 6. WebView Testing
- `setJavaScriptEnabled(true)` — XSS possible in WebView
- `addJavascriptInterface()` — JS-to-Java bridge exploitation (RCE risk pre-API 17)
- `setAllowFileAccess(true)` — local file theft via `file://` URIs
- `setAllowUniversalAccessFromFileURLs(true)` — cross-origin file access
- Load arbitrary URLs in WebView (open redirect inside app)
- XSS in WebView via JavaScript-enabled interface
- Deep link → WebView URL injection

---

## 7. Deep Link Testing
```bash
# Check manifest for deep link handlers
grep -i "intent.action.VIEW" AndroidManifest.xml

# Test via ADB
adb shell am start -a android.intent.action.VIEW -d "app://target/path"
adb shell am start -a android.intent.action.VIEW -d "https://target.com/reset?token=xxx"
```
- Authentication bypass via deep link
- Access restricted activity/pages
- Parameter injection via deep link URL
- Host/path validation missing

---

## 8. Intent Security Testing
- Intent injection — malicious intent sent to exported activity/service/receiver
- Intent redirection — exported activity redirects to attacker-controlled component
- Sticky broadcasts — sensitive data in persistent broadcasts
- Implicit intent interception — sensitive data passed via unprotected implicit intent

---

## 9. Dynamic Analysis

### Frida / Objection
```bash
# Start Objection
objection -g <package> explore

# Common commands
android sslpinning disable
android root disable
android hooking list classes
android hooking watch class <ClassName>
android hooking watch method <ClassName>.<method> --dump-args --dump-return
```

### Runtime Checks
- Runtime manipulation of app state
- Token extraction from memory
- Bypass of root/emulator detection
- Method hooking and return value modification

### ADB Logcat Analysis
```bash
adb logcat | grep -i <package>
adb logcat *:E          # errors only
```
- Passwords, tokens, session IDs, sensitive data in logs
- Crash logs exposing internal paths, keys, or PII

---

## 10. Cryptography Testing
- Weak encryption algorithms: DES, 3DES, RC4, MD5 for security
- Hardcoded encryption keys in source code
- ECB mode in block ciphers (no IV, predictable patterns)
- Custom/home-grown cryptography
- Weak random: `java.util.Random` instead of `SecureRandom`
- IV reuse across encrypted blocks
- Insufficient key length (< 128-bit AES)

---

## 11. Runtime Protection Testing

### Root Detection
- Check if implemented
- Bypass:
  - `Frida` hook `RootBeer`, `SafetyNet`
  - `Magisk` with MagiskHide/Shamiko
  - `Objection`: `android root disable`

### Emulator Detection
- Check detection presence in code
- Bypass via: modifying build props, Frida hooks, custom emulator images

### Debugger Detection
- Check `android:debuggable` and `Debug.isDebuggerConnected()` calls
- Bypass via Frida hooks

### Frida Detection
- Check for Frida presence checks
- Bypass: use Frida gadget, custom Frida builds, obfuscated injection

### Code Tampering / Integrity Check
- Modify APK → re-sign → reinstall
- Check if tampering is detected (signature verification, checksum)
- Bypass: patch integrity check via smali/Frida

---

## 12. Miscellaneous Checks

### Clipboard Testing
- Sensitive data (passwords, tokens) copied to clipboard
- Other apps can read clipboard contents

### Screenshot Protection
- Check `FLAG_SECURE` is set on sensitive screens
- Test: take screenshot on sensitive screen → should be blocked

### Firebase Security
```bash
# Test unauthenticated access
curl https://<project>.firebaseio.com/.json
curl https://<project>.firebaseio.com/users.json
```
- Firebase Realtime DB/Firestore with public read/write rules
- Unauthorized access to Firebase storage

### Third-Party Library Security
- Outdated dependencies with known CVEs
- Tools: `MobSF` dependency scan, `OWASP Dependency-Check`

### File System Security
- Path traversal via content provider or file operations
- Arbitrary file read/write via exposed providers

### Overlay / Tapjacking
- Tapjacking: malicious overlay captures taps on sensitive UI
- Check `filterTouchesWhenObscured` flag on sensitive views
- `setFilterTouchesWhenObscured(true)` required

### Backup Testing
```bash
adb backup -apk -shared <package>
java -jar abe.jar unpack backup.ab backup.tar
tar -xvf backup.tar
```
- Sensitive data extracted from backup

---

## 13. Quick Reference: Tools

| Category | Tools |
|----------|-------|
| Static Analysis | `MobSF`, `jadx`, `apktool`, `BytecodeViewer`, `androguard` |
| Dynamic Analysis | `Frida`, `Objection`, `Drozer` |
| Traffic Interception | `Burp Suite`, `mitmproxy`, `Charles Proxy` |
| ADB | `adb`, Android Debug Bridge |
| SSL Bypass | `Frida`, `Objection`, `apk-mitm`, `TrustMeAlready` |
| Root Tools | `Magisk`, `Shamiko`, `MagiskHide` |
| Crypto Analysis | `jadx` + manual review |
| Firebase | `Firebase Scanner`, manual curl |
| Backup | `adb backup`, `abe.jar` |
| Repackaging | `apktool` + `apksigner` |
| Signing | `apksigner`, `jarsigner` |
| Automation | `MobSF` (full pipeline) |
