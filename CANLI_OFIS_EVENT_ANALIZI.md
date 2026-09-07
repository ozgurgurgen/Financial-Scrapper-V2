# Proje Olay (Event) Analizi ve "Canlı Ofis" Simülasyon Haritası

Bu analiz, backend ve frontend mimarisinde gerçekleşen **tüm olayları (event)**, bunların tetiklenme noktalarını, hata/durum akışlarını ve gelecekte kurulacak **"Canlı Ofis Simülasyonu"** (görsel çalışanlar, masalar, veri akış hatları, durum ışıkları) için gerekli veri yüklerini (payload) detaylandırmaktadır.

---

## 1. Mikro Servisler ve Görev Dağılımı

Projede **12 adet çekirdek servis/adaptör** bulunmaktadır:

1. **`YahooAdapter` / `MarketService`**: BIST hisseleri, emtialar, global endeksler için anlık ve tarihsel OHLCV mum verisi çeker.
2. **`TEFASAdapter`**: TEFAS fonlarının günlük fiyat, getiri, kategori ve varlık dağılım oranlarını çeker.
3. **`TCMBAdapter`**: TCMB EVDS API üzerinden resmi döviz kurlarını ve politika faizini çeker.
4. **`FREDAdapter`**: ABD Merkez Bankası (FRED) API üzerinden ABD enflasyon, 10Y faiz ve FED faiz verilerini çeker.
5. **`KAPAdapter`**: Kamuyu Aydınlatma Platformu bildirimlerini (5 ana kategori) çeker ve kazır.
6. **`KAPFundScraperService`**: Fon profillerini ve KAP Portföy Dağılım Raporlarını (PDR) kazıyıp fon içi hisseleri ayrıştırır.
7. **`TefasHoldingsService`**: Fon içi tekil hisse senetleri ve sektör ağırlıklarını veritabanında yönetir, ters arama ve kurumsal hisse yoğunluğu hesaplar.
8. **`BistUniverseService`**: 630+ BIST şirketinin evrenini, sektörlerini ve güncellik durumunu yönetir.
9. **`HistoricalBackfillService`**: BIST ve TEFAS için ban korumalı (rate-limited) 5 yıllık geçmiş veri tamamlama motorudur.
10. **`AIService`**: KAP ve borsa duyurularını Gemini veya yerel finansal çıkarıcı ile özetler; kota durumunu yönetir.
11. **`SyncManager`**: Adaptörleri sırayla veya paralel koordine eden, normalizasyon ve varlık eşleştirme (mapping) yapan çekirdek motordur.
12. **`AutomatedSchedulerService`**: Seans saatlerine, hafta sonu boşluklarına ve cron kurallarına göre arkaplan görevlerini yürüten zamanlayıcıdır.

---

## 2. Sistemdeki Tüm Olayların (Event) Kataloğu

| Olay Adı (Event Name) | Tetiklendiği Yer (Dosya / Modül) | Sıklık / Ne Zaman Olur? | Mevcut Loglama Durumu | Önerilen Event Payload (`Canlı Ofis` için) |
| :--- | :--- | :--- | :--- | :--- |
| **`JOB_SCHEDULED_TRIGGER`** | `AutomatedSchedulerService.ts` | Zamanı geldikçe (Cron: 5 dk, 15 dk, günlük, hafta sonu) | Konsol logu | `{"event": "JOB_SCHEDULED_TRIGGER", "taskId": "bist_intraday", "scheduledTime": "...", "targetService": "MarketService"}` |
| **`SYNC_STARTED`** | `SyncManager.ts` / Adaptörler | Manuel tetikleme veya Scheduler ile | Konsol + `sync_logs` tablosu | `{"event": "SYNC_STARTED", "source": "YAHOO", "timestamp": "...", "triggerType": "MANUAL\|CRON"}` |
| **`DATA_FETCH_INITIATED`** | Adaptörler (`axios.get/post`) | API çağrısı veya HTML kazıma başlarken | Sadece kod içi | `{"event": "DATA_FETCH_INITIATED", "source": "TEFAS", "endpoint": "/api/DB/BindHistoryAllocative", "symbolCount": 40}` |
| **`DATA_FETCH_SUCCESS`** | Adaptörler | HTTP 200 yanıtı ve geçerli veri geldiğinde | Konsol logu | `{"event": "DATA_FETCH_SUCCESS", "source": "TCMB", "bytesReceived": 14200, "rawItemsCount": 15, "durationMs": 340}` |
| **`DATA_FETCH_FAILED`** | Adaptörler (`catch` blokları) | Network timeout, HTTP 429/500, HTML yapı değişimi | Konsol `console.error` | `{"event": "DATA_FETCH_FAILED", "source": "KAP", "error": "Timeout 15000ms", "willRetry": true, "attempt": 1}` |
| **`DATA_NORMALIZED`** | `SyncManager.ts` / Adaptörler | Ham veri standart `AssetData` şemasına çevrilince | Sadece memory | `{"event": "DATA_NORMALIZED", "source": "FRED", "assetCode": "FEDFUNDS", "standardValue": 5.33, "period": "2026-08"}` |
| **`ASSET_MATCH_SUCCESS`** | `SyncManager.ts` | Gelen sembol ana `assets` tablosunda bulunursa | Veritabanı yazımı | `{"event": "ASSET_MATCH_SUCCESS", "source": "YAHOO", "sourceCode": "THYAO.IS", "masterAssetId": 12, "symbol": "THYAO"}` |
| **`ASSET_MATCH_FAILED`** | `SyncManager.ts` | Gelen kod master sözlükte yoksa | `unmatched_data` tablosu | `{"event": "ASSET_MATCH_FAILED", "source": "KAP", "sourceCode": "YENI_FON", "action": "QUEUED_FOR_APPROVAL"}` |
| **`DB_WRITE_BATCH_SUCCESS`** | `SyncManager.ts` / Tablolar | Veritabanına toplu `insert` / `upsert` bittiğinde | `sync_logs` tablosu | `{"event": "DB_WRITE_BATCH_SUCCESS", "table": "asset_data", "recordsCount": 120, "durationMs": 45}` |
| **`AI_SUMMARIZE_TRIGGERED`** | `KAPAdapter.ts` / `AIService.ts` | KAP bildirimi metni uzunsa | Konsol logu | `{"event": "AI_SUMMARIZE_TRIGGERED", "disclosureId": "1049281", "docLength": 4500, "engine": "GEMINI\|LOCAL"}` |
| **`AI_QUOTA_COOLDOWN`** | `AIService.ts` | Gemini 429 Rate Limit aldığında | Konsol + Bellek flagi | `{"event": "AI_QUOTA_COOLDOWN", "cooldownUntil": "2026-09-04T10:15:00Z", "fallback": "LOCAL_EXTRACTOR"}` |
| **`PDR_PARSE_COMPLETED`** | `KAPFundScraperService.ts` | Fon içi hisseler KAP bildiriminden ayrıştırılınca | Konsol logu | `{"event": "PDR_PARSE_COMPLETED", "fundCode": "MAC", "equitiesExtracted": 14, "reportPeriod": "2026/08"}` |
| **`BACKFILL_PROGRESS_TICK`** | `HistoricalBackfillService.ts` | 5 yıllık veri çekerken her hisse/yıl tamamlandığında | Bellek durumu (`status`) | `{"event": "BACKFILL_PROGRESS_TICK", "ticker": "ASELS", "year": "2023", "candlesFetched": 252, "sleepMs": 800}` |
| **`BACKFILL_WINDOW_STATUS`** | `HistoricalBackfillService.ts` | Hafta sonu / Cuma 19:00 penceresine girip çıkıldığında | Bellek durumu | `{"event": "BACKFILL_WINDOW_STATUS", "isSafeWindow": true, "reason": "WEEKEND_TAKASBANK_CLOSED"}` |
| **`SETTINGS_UPDATED`** | `server.ts` (`/api/v1/settings`) | Kullanıcı senkron aralığı veya API anahtarı değiştirirse | `settings` tablosu | `{"event": "SETTINGS_UPDATED", "settingKey": "sync_interval", "oldValue": "15m", "newValue": "5m"}` |
| **`USER_MANUAL_ACTION`** | `server.ts` / UI Sekmeleri | Kullanıcı "Şimdi Senkronize Et", "Eşleştir" butonuna basınca | Endpoint tetiklenmesi | `{"event": "USER_MANUAL_ACTION", "action": "KAP_SYNC_MATCH", "userId": "admin", "timestamp": "..."}` |
| **`SYSTEM_HEALTH_CHECK`** | `server.ts` (`/api/v1/health`) | Sağlık durumu sorgulandığında | HTTP Yanıtı | `{"event": "SYSTEM_HEALTH_CHECK", "dbConnected": true, "schedulerActive": true, "memoryUsageMb": 142}` |

---

## 3. Canlı Ofis Simülasyonunda Bu Olayların Görsel Karşılıkları

İleride oluşturulacak simülasyon için bu olaylar şu "Ofis Karakterleri ve İstasyonları" ile eşleşebilir:

1. **`Borsa & Fiyat Masası` (Yahoo/Market Servisi)**: `DATA_FETCH_INITIATED` olduğunda karakter ekrana eğilir, `DATA_FETCH_SUCCESS` ile grafik kağıtlarını dosyalar.
2. **`KAP & Mevzuat Masası` (KAP Scraper & AI)**: `AI_SUMMARIZE_TRIGGERED` olduğunda büyüteçle belge okur; `PDR_PARSE_COMPLETED` olduğunda portföy dosyasını Fon Masasına iletir.
3. **`Merkez Bankası Masası` (TCMB & FRED)**: Makro gösterge panosuna yeni kur ve faiz oranlarını asar.
4. **`Arşiv & Veritabanı Odası` (PostgreSQL)**: `DB_WRITE_BATCH_SUCCESS` olduğunda dolaba yeni klasör eklenir; `ASSET_MATCH_FAILED` olduğunda kırmızı "Onay Bekleyenler" kutusuna evrak bırakılır.
5. **`Gece / Hafta Sonu Vardiyası Robotu` (Historical Backfill)**: Hafta sonu ışıklar loşlaştığında masaları dolaşıp 5 yıllık arşiv çekmecelerini doldurur.

---

## 4. Teknik Altyapı ve İletim Mekanizması Analizi

### Mevcut Durum:
- **Kalıcı Log:** Sadece `sync_logs` tablosunda genel senkronizasyon özeti (Başarılı / Hatalı / İşlenen Kayıt) tutuluyor.
- **Detaylı Olaylar:** Büyük oranda Node.js `console.log` / `console.error` ve servis bellek durumlarında (`isSyncing`, `backfillState`) tutuluyor; frontend bunları `polling` (5-10 saniyede bir `GET` atarak) sorguluyor.

### "Canlı Ofis" İçin Önerilen Event İletim Mimarisi:
Görsel simülasyonun akıcı, anlık ve sıfır gecikmeyle (zero-latency) çalışabilmesi için:
1. **Event Bus (Node.js `EventEmitter`):** Backend içinde tek bir merkezi `AppEventBus` tanımlanır. Her servis iş yaparken buraya `AppEventBus.emit('event', payload)` fırlatır.
2. **Server-Sent Events (SSE) veya WebSocket:** 
   - Express üzerinden `/api/v1/events/stream` SSE kanalı açılır.
   - Frontend bu kanalı dinler; ofisteki karakterler ve ışıklar hiçbir gecikme olmadan eşzamanlı hareket eder.
3. **Standart Event Veri Şeması:**
   ```typescript
   interface OfficeSimEvent {
     id: string;
     type: string;             // örn: 'DATA_FETCH_SUCCESS'
     actor: string;            // örn: 'KAP_SCRAPER', 'YAHOO_AGENT', 'SCHEDULER'
     department: string;       // örn: 'BORSA', 'FONLAR', 'MERKEZ_BANKASI', 'ARŞİV'
     status: 'IDLE' | 'BUSY' | 'SUCCESS' | 'ERROR' | 'COOLDOWN';
     detail: string;           // İnsan tarafından okunabilir durum cümlesi
     payload: any;             // İlgili veriler (hisse, kayıt sayısı vb.)
     timestamp: string;
   }
   ```

---

## 5. Eksik ve Teyitleşilecek Noktalar

1. **Olayların Granülerliği:** Simülasyon için tek tek her hisse fiyatı çekildiğinde mi event üretilmeli (yüksek yoğunluklu), yoksa paket/toplu işlem bazında mı (örneğin "BIST 100 paketi tamamlandı") üretilmeli?
2. **Simülasyon Geçmişi:** Kullanıcı sayfayı yenilediğinde ofisin son 5 dakikadaki olay geçmişini (Event Replay) veritabanından tekrar oynatması gerekir mi, yoksa sadece bağlandığı andan itibaren canlı akış yeterli midir?
3. **Kullanıcı Müdahalesi (İnteraktivite):** Canlı ofis simülasyonunda kullanıcı ofisteki masalara/karakterlere tıklayarak o servisi manuel tetikleyebilecek (örn. KAP masasına tıklayıp "Şimdi Tara" emri vermek) mi?
