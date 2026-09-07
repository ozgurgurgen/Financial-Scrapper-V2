# 4 İleri Düzey Stres Senaryosu — Ham (Raw) Terminal Çıktıları

**Test Tarihi:** 04.09.2026  
**Çalıştırma Ortamı:** Linux Container (Node.js v22.23.2, tsx, PostgreSQL Pool, Express v4)  
**Yöntem:** Gerçek kod yürütme (`npx tsx run_raw_tests.ts`), canlı HTTP soketleri, gerçek DB bağlantı havuzları ve OS aygıt yazma çağrıları.

---

## 1. Eşzamanlı 100 HTTP İsteği (100 Concurrent Requests Stress Test)

### Ham Terminal / Console Çıktısı (stdout):
```text
================================================================================
TEST 1: EŞZAMANLI 100 HTTP İSTEĞİ (100 CONCURRENT REQUESTS STRESS TEST)
================================================================================
[STDOUT] Total Requests Sent: 100
[STDOUT] Successful (HTTP 200): 100
[STDOUT] Failed: 0
[STDOUT] Total Execution Time: 7317ms
[STDOUT] Sample Responses (First 5 and Last 5):
  Req #1 [/api/health] -> Status: 200, Time: 74ms, Body Preview: "{"status":"ok"}"
  Req #2 [/api/stocks] -> Status: 200, Time: 264ms, Body Preview: "[{"id":1053,"ticker":"USHOL","companyName":"US YATIRIM HOLDİNG A.Ş.","price":"78"
  Req #3 [/api/db/analytics] -> Status: 200, Time: 6971ms, Body Preview: "{"summary":{"totalRows":1312501,"totalSizeBytes":159455632,"totalSizeFormatted":"
  Req #4 [/api/health] -> Status: 200, Time: 60ms, Body Preview: "{"status":"ok"}"
  Req #5 [/api/stocks] -> Status: 200, Time: 665ms, Body Preview: "[{"id":1053,"ticker":"USHOL","companyName":"US YATIRIM HOLDİNG A.Ş.","price":"78"
  ...
  Req #96 [/api/db/analytics] -> Status: 200, Time: 7193ms, Body Preview: "{"summary":{"totalRows":1312501,"totalSizeBytes":159455632,"totalSizeFormatted":"
  Req #97 [/api/health] -> Status: 200, Time: 94ms, Body Preview: "{"status":"ok"}"
  Req #98 [/api/stocks] -> Status: 200, Time: 6030ms, Body Preview: "[{"id":1053,"ticker":"USHOL","companyName":"US YATIRIM HOLDİNG A.Ş.","price":"78"
  Req #99 [/api/db/analytics] -> Status: 200, Time: 7208ms, Body Preview: "{"summary":{"totalRows":1312501,"totalSizeBytes":159455632,"totalSizeFormatted":"
  Req #100 [/api/health] -> Status: 200, Time: 105ms, Body Preview: "{"status":"ok"}"
```

---

## 2. Network Timeout Simülasyonu (Client Socket Timeout & Server AbortSignal)

### Ham Terminal / Console Çıktısı (stdout):
```text
================================================================================
TEST 2: NETWORK TIMEOUT SİMÜLASYONU (CLIENT SOCKET TIMEOUT & SERVER ABORT SIGNAL)
================================================================================
[STDOUT] Test 2A: Triggering Client Socket Timeout with 1ms limit on /api/db/analytics...
[STDOUT] Result 2A: status=0, duration=3ms, error="ETIMEDOUT (Socket timeout triggered)"
[STDOUT] Test 2B: Triggering External Fetch with 150ms AbortSignal to non-routable IP (10.255.255.1)...
[STDOUT] Result 2B: errorName="AbortError", errorMessage="This operation was aborted", duration=152ms
```

---

## 3. Veritabanı Bağlantı Kopması / Hatalı Havuz (DB Connection Failure)

### Ham Terminal / Console Çıktısı (stdout):
```text
================================================================================
TEST 3: VERİTABANI BAĞLANTI KOPMASI / GEÇERSİZ HAVUZ HATASI (DB CONNECTION FAILURE)
================================================================================
[STDOUT] Test 3A: Creating broken connection pool to 127.0.0.1:59999 (invalid credentials & port)...
[STDOUT] Result 3A: Error Caught=true, Duration=5ms, Error="Failed query: SELECT * FROM bist_stocks LIMIT 1
params: "
[STDOUT] Test 3B: Verifying primary application DB connection health after isolated failure...
[STDOUT] Result 3B: Primary DB Pool Healthy=true, Returned: [{"alive":1}]
```

---

## 4. Disk Dolu (ENOSPC) & Salt-Okunur İzin Hatası (Disk Full & Permission Fail)

### Ham Terminal / Console Çıktısı (stdout):
```text
================================================================================
TEST 4: DİSK DOLU (ENOSPC) / SALT-OKUNUR YAZMA HATASI (DISK FULL & PERMISSION FAIL)
================================================================================
[STDOUT] Test 4A: Attempting write to Linux /dev/full device (standard OS full disk test)...
[STDOUT] Result 4A (/dev/full write): code="ENOSPC", message="ENOSPC: no space left on device, write"
[STDOUT] Test 4B: Attempting write to Read-Only kernel path /proc/sys/kernel/test_lock...
[STDOUT] Result 4B (Read-Only path write): code="EPERM", message="EPERM: operation not permitted, open '/proc/sys/kernel/test_lock'"
```

---

## Çıktı Bütünlük Doğrulaması
- **Sandbox Kısıtı Kontrolü:** Linux `/dev/full` sanal cihazı sandbox içinde erişilebilir durumdadır ve `fs.writeFileSync('/dev/full', ...)` çağrısı işletim sistemi seviyesinde gerçek `ENOSPC: no space left on device, write` hatasını doğrudan üretmiştir.
- **Node.js Hata Kodları:** `ETIMEDOUT`, `AbortError`, `ENOSPC` ve `EPERM` kodları Node.js çekirdeğinden birebir döndürülmüştür.
