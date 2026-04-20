# Application Security VAPT Checklist
> API

---

# API PENTESTING

---

## 1. Reconnaissance & Enumeration
- Map all API endpoints (REST, GraphQL, gRPC, WebSocket)
- Discover API documentation: `swagger.json`, `/api-docs`, `/openapi.json`, `/swagger-ui`, Swagger UI exposed
- Check for versioned endpoints: `/api/v1/`, `/api/v2/`, `/api/beta/`
- Identify deprecated/legacy endpoints still active
- Check mobile app binaries (APK/IPA) for hardcoded endpoints
- Review JS files for API endpoint references
- Tools: `Postman`, `Insomnia`, `Burp Suite`, `kiterunner`, `ffuf`, `arjun`

---

## 2. Authentication & Authorization

### Authentication
- Missing authentication on sensitive endpoints
- Weak/no auth on internal or admin endpoints
- Test API keys — hardcoded, leaked in JS, predictable
- JWT issues (see Web section § 2.5)
- OAuth2 misconfigurations: token leakage, implicit flow abuse, open redirect
- API key rotation — check if old keys are invalidated

### Authorization (Broken Object Level Authorization — BOLA/IDOR)
- Change object IDs in requests: `GET /api/users/123` → `GET /api/users/124`
- Replace own ID with another user's ID in body/path/header
- Access other users' resources: orders, invoices, documents, profiles
- Mass assignment: send additional fields in POST/PUT body (`role`, `isAdmin`, `verified`)
- Broken Function Level Authorization: regular user accessing admin functions
  - `GET /api/admin/users`, `DELETE /api/users/all`
- HTTP method switching: `GET /api/resource/1` vs `DELETE /api/resource/1`

---

## 3. Input Validation & Injection
- SQL injection in all query params, path params, body fields, headers
- NoSQL injection in MongoDB-backed endpoints
- Command injection in fields processed server-side
- XXE in endpoints accepting XML (including SOAP)
- SSTI in template-rendering endpoints
- SSRF via URL parameters processed server-side
- Path traversal in file download/fetch endpoints
- Parameter tampering: modify price, quantity, role, status fields
- Mass assignment: inject unexpected fields (`admin=true`, `balance=999999`)

---

## 4. Excessive Data Exposure
- API returns more fields than the client needs — check raw response vs UI display
- Sensitive fields in responses: passwords (hashed or plain), tokens, PII, internal IDs
- Filter bypass: omit filter params and check if full data is returned
- GraphQL — overfetching via broad queries
- Search responses leaking other users' data

---

## 5. Rate Limiting & Resource Abuse
- No rate limiting on login, registration, OTP, password reset
- No throttling on expensive/computational endpoints
- Pagination missing or bypassable — dump entire dataset
- Request size limits missing — large payload DoS
- GraphQL query depth/complexity DoS — deeply nested queries
- Batch request abuse — send 1000 operations in one request
- Bypass rate limit via: IP rotation, `X-Forwarded-For` spoofing, multiple API keys, multiple accounts

---

## 6. REST API Specific
- Test all HTTP methods on each endpoint: GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD
- Missing auth on specific methods (e.g., GET is protected but POST is not)
- Parameter pollution: `?id=1&id=2`
- IDOR on all CRUD operations
- Insecure `PATCH` — partial update allows overwriting protected fields
- Unrestricted bulk operations
- Verbose error messages leaking stack traces, DB info, internal paths

---

## 7. GraphQL Specific
- **Introspection enabled:** `{"query":"{__schema{types{name}}}"}`
- Enumerate all types, queries, mutations via introspection
- Bypass disabled introspection using `__type` queries
- Excessive query depth — craft deeply nested queries to cause DoS
- Query complexity abuse — combine many expensive resolvers
- IDOR via GraphQL arguments: `query { user(id: 2) { email } }`
- Mass assignment via mutations: inject unexpected fields
- Batching attacks: send multiple operations in one request
- Schema leaks via error messages
- Alias-based rate limit bypass: `{ a: sensitiveQuery, b: sensitiveQuery, ... }`
- Tools: `InQL`, `GraphQL Voyager`, `Altair`, `Burp GraphQL Raider`

---

## 8. gRPC & WebSocket Testing

### gRPC
- Authentication on all methods (metadata-based tokens)
- Message validation — malformed protobuf inputs
- Unary vs streaming — test auth on all call types
- Reflection service enabled (analogous to introspection)
- Tools: `grpcurl`, `grpcui`, `Postman`

### WebSocket
- Authentication: token passed on upgrade request or early message?
- Message validation — inject XSS, SQLi, command injection payloads in WS messages
- Replay attacks — resend captured WS messages
- Cross-Site WebSocket Hijacking (CSWSH) — missing `Origin` check on upgrade
- Session invalidation — check if WS connection persists after logout

---

## 9. API Versioning & Deprecated Endpoints
- Test all discovered API versions: `v1`, `v2`, `v3`, `beta`, `internal`, `legacy`
- Older versions may lack new security controls (auth, rate limiting, input validation)
- Check if deprecated endpoints still function
- Admin/internal endpoints exposed on public base URL

---

## 10. Quick Reference: Tools

| Category | Tools |
|----------|-------|
| API Mapping | `Burp Suite`, `Postman`, `Insomnia`, `kiterunner` |
| Fuzzing | `ffuf`, `arjun`, `api-fuzzers` |
| GraphQL | `InQL`, `GraphQL Voyager`, `Altair`, `Burp GraphQL Raider` |
| gRPC | `grpcurl`, `grpcui` |
| Auth | `jwt_tool`, `oauth2-proxy`, `Burp` |
| Docs Discovery | `ffuf` (swagger wordlist), `kiterunner` |
| General | `OWASP ZAP`, `mitmproxy` |
