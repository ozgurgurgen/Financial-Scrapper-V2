# 🗺️ MarketPulse AI - Kapsamlı API Haritası ve Entegrasyon Dokümantasyonu

Bu doküman, **MarketPulse AI** finansal analiz platformunun tüm REST API ve Realtime veri uç noktalarını, bu uç noktaların beslendiği **dış veri kaynaklarını (APIs/Adapters)** ve diğer yapay zeka (AI) sistemleri veya dış istemcilerin sistemle nasıl entegre olacağını detaylandırmaktadır.

---

## 📌 Genel Sistem ve Entegrasyon Bilgileri

* **Sunucu Bağlantı Adresi (Base URL):** `http://localhost:3000` (veya canlı sunucu domain adresi)
* **API Versiyon Sürümü:** `v1`
* **Veri Formatı:** `application/json` (GZIP sıkıştırma destekli)
* **Yetkilendirme (Authentication):**
  * Varsayılan okuma ve halka açık uç noktalar **açıktır / yetki gerektirmez**.
  * Güvenlik & Kota Takibi gerektiren durumlar için HTTP Header:
    * `X-API-Key: <SİZİN_API_ANAHTARINIZ>`
    * veya `Authorization: Bearer <SİZİN_API_ANAHTARINIZ>`
  * *API Anahtarı Yönetimi:* `/api/v1/admin/api-keys` uç noktasından yeni API anahtarı üretilebilir.

---

## 📡 Veri Kaynakları & Dış Bağlantı Adaptörleri (Data Sources)

Sistemdeki verilerin hangi dış kaynaklardan sağlandığı ve nasıl işlendiği aşağıdaki tabloda özetlenmiştir:

| Veri Kategorisi | Veri Sağlayıcı / Dış API Kaynağı | Dahili Servis / Adaptör | Açıklama |
| :--- | :--- | :--- | :--- |
| **BIST Hisseleri & Fiyatları** | Yahoo Finance (`.IS`), Borsa İstanbul | `BistUniverseService`, `YahooAdapter` | 625+ BIST hissesinin canlı fiyatları, hacimleri, F/K, 52 haftalık aralıkları. |
| **BIST 5 Yıllık OHLCV** | Yahoo Finance, Is Yatırım, BIST Arşiv | `FiveYearSyncService`, `HistoricalBackfillService` | Günlük Açılış, Yüksek, Düşük, Kapanış, Düzeltilmiş Kapanış ve Hacim zaman serileri. |
| **TEFAS Yatırım Fonları** | TEFAS (Takasbank), EGC Finans | `TEFASAdapter`, `TefasHoldingsService` | 1.063+ TEFAS fonunun fiyatı, risk değeri, yönetim ücreti, 1M/1Y/5Y getirileri. |
| **Fon Portföy Dağılımları (PDR)** | KAP (Kamuyu Aydınlatma Platformu) | `KapFundScraperService` | Fonların KAP'a bildirdiği resmi Portföy Dağılım Raporları ve içindeki tekil hisse ağırlıkları. |
| **ABD Borsaları & ETF'ler** | Yahoo Finance (US), SEC EDGAR | `UsUniverseService`, `UsEtfService` | ABD Top 1.000 Şirket ve En Büyük ETF'ler (SPY, QQQ, VOO) canlı fiyat ve 5Y geçmişi. |
| **KAP Bildirimleri** | Kamuyu Aydınlatma Platformu (kap.org.tr) | `KAPAdapter`, `KapCompanyService` | Anlık şirket özel durum açıklamaları, bilançolar, temettü ve sermaye artırımları. |
| **Makro Ekonomik Veriler** | TCMB EVDS, FRED (St. Louis FED) | `TCMBAdapter`, `FREDAdapter` | Dolar/TL, Euro/TL, Enflasyon (TÜFE), TCMB Politika Faizi, ABD 10Y Tahvil, FED Faizi, M2. |
| **Kripto Varlıklar & On-Chain** | Binance API, IntoTheBlock, CryptoCompare | `CryptoAdapter`, `CryptoService` | BTC, ETH ve majör kriptoların canlı tırnakları, 15m/1h/1d mumları ve On-Chain sinyalleri. |
| **Halka Arzlar (IPO)** | SPK Bültenleri, Gedik Yatırım, BIST | `IpoScraperService`, `PublicApiService` | Taslak, onaylı ve işlem gören halka arzlar, tavan serileri, kişi başı düşen lot sayıları. |
| **Analist Raporları & Sentez** | Kurumsal Yatırım Evleri, Yapay Zeka | `AnalystCommentaryService`, `AIService` | BIST/US hisseleri için aracı kurum hedef fiyatları, AL/SAT konsensüsleri ve YZ sentezleri. |
| **Genel Finans Haberleri** | Borsagündem, Matriks, Bloomberg HT | `NewsAggregatorService` | BIST, Makro, Kripto ve Halka Arz kategorilerine göre otomatik toplanan haber akışı. |
| **AI / LLM Motoru** | Google Gemini (3.8 Flash / 2.5), Multi-LLM | `MultiLLMService`, `AIService` | KAP bildirim özetleme, hisse sentezi, haber duyarlılık analizi ve otomatik şema onarımı. |

---

## 🚀 1. Halka Açık REST API v1 (`/api/v1/`)

Dış sistemlerin ve diğer yapay zekaların doğrudan veri çekmesi için tasarlanmış ana REST API grubudur.

### 🏢 A. Borsa İstanbul (BIST 625+ Hisse) Uç Noktaları

#### 1. BIST Hisseleri Listesi
* **Endpoint:** `GET /api/v1/bist/stocks`
* **Açıklama:** Borsa İstanbul'da işlem gören 625+ hisse senedinin canlı fiyatlarını, piyasa değerlerini, F/K oranlarını, günlük değişim % ve hacim verilerini döndürür.
* **Parametreler (Query):**
  * `search` (string): Hisse kodu veya şirket adı (örn: `THYAO`, `Türk Hava`)
  * `page` (number): Sayfa numarası (varsayılan: `1`)
  * `limit` (number): Sayfa başı kayıt (varsayılan: `50`, max: `1000`)
  * `sortBy` (string): `marketCap` | `price` | `changePct` | `volume` | `peRatio` | `ticker`
  * `order` (string): `asc` | `desc`
* **Örnek Yanıt:**
```json
{
  "success": true,
  "timestamp": "2026-09-09T07:15:00.000Z",
  "pagination": { "total": 625, "page": 1, "limit": 50, "totalPages": 13 },
  "data": [
    {
      "ticker": "THYAO",
      "companyName": "TÜRK HAVA YOLLARI A.O.",
      "price": 312.5,
      "changePct": 2.45,
      "marketCap": 431250000000,
      "volume": 8450000000,
      "peRatio": 4.82,
      "fiftyTwoWeekHigh": 335.0,
      "fiftyTwoWeekLow": 210.0,
      "lastUpdated": "2026-09-09T07:14:22.000Z"
    }
  ]
}
```

#### 2. Tek Bir BIST Hissesi Detayı
* **Endpoint:** `GET /api/v1/bist/stock/:ticker`
* **Açıklama:** Belirtilen hisse senedinin detaylı profil bilgilerini ve sistemdeki tarihsel veri derinliğini getirir.
* **Parametreler (Path):** `ticker` (örn: `THYAO`)

#### 3. 5 Yıllık Günlük OHLCV Fiyat Serisi
* **Endpoint:** `GET /api/v1/bist/stock/:ticker/history`
* **Açıklama:** BIST hissesinin 5 yıllık (veya mevcut en uzun) günlük Açılış, Yüksek, Düşük, Kapanış, Düzeltilmiş Kapanış ve Hacim mum verilerini verir.
* **Parametreler:**
  * `ticker` (Path): Hisse kodu
  * `limit` (Query): Döndürülecek mum sayısı (varsayılan: `1500`)

#### 4. Hesaplanmış Teknik İndikatörler
* **Endpoint:** `GET /api/v1/bist/stock/:ticker/indicators`
* **Açıklama:** Hisse için kod seviyesinde hesaplanan RSI(14), SMA20, SMA50, SMA200, Bollinger Bantları ve Trend Sinyalini (BULLISH/BEARISH/NEUTRAL) döndürür.

---

### 📊 B. TEFAS Yatırım Fonları & Portföy Dağılımları (PDR)

#### 1. TEFAS Fonları Listesi (1.063+ Fon)
* **Endpoint:** `GET /api/v1/tefas/funds`
* **Açıklama:** Tüm TEFAS yatırım fonlarını, güncel birim fiyatlarını, yönetim ücretlerini, risk değerlerini ve 1A/3A/6A/1Y/3Y/5Y getirilerini listeler.
* **Parametreler:** `search`, `category`, `page`, `limit`

#### 2. Tekil TEFAS Fon Detayı
* **Endpoint:** `GET /api/v1/tefas/fund/:code`
* **Açıklama:** Fonun varlık dağılımı (% Hisse, % Özel Sektör Tahvili, % Mevduat vb.) ve detaylı getirilerini verir.

#### 3. Fon İçindeki Tekil Hisseler (Portföy Dağılım Raporu - PDR)
* **Endpoint:** `GET /api/v1/tefas/fund/:code/holdings`
* **Açıklama:** Fonun KAP'a bildirdiği son resmi portföy dağılımına göre bünyesinde tuttuğu hisse senetlerini ve ağırlık yüzdelerini (%) döndürür.
* **Örnek Yanıt:**
```json
{
  "success": true,
  "fundCode": "TI2",
  "holdings": [
    { "stockTicker": "THYAO", "weightPct": 9.45 },
    { "stockTicker": "BIMAS", "weightPct": 8.12 },
    { "stockTicker": "TUPRS", "weightPct": 7.30 }
  ]
}
```

#### 4. Ters Arama: Hisseyi Taşıyan Fonlar
* **Endpoint:** `GET /api/v1/tefas/stock/:ticker/in-funds`
* **Açıklama:** Belirtilen BIST hisse senedini (örn: `THYAO`) portföyünde en yüksek oranda taşıyan TEFAS fonlarını sıralar.

#### 5. Fonlar Tarafından En Çok Taşınan Hisseler
* **Endpoint:** `GET /api/v1/tefas/top-held-stocks`
* **Açıklama:** Tüm TEFAS fonları genelinde en çok tercih edilen ve toplam portföylerde en yüksek ağırlığa sahip BIST hisselerini verir.

#### 6. Fon 5 Yıllık Günlük Fiyat / NAV Zaman Serisi
* **Endpoint:** `GET /api/v1/tefas/fund/:code/daily-history`
* **Açıklama:** Fonun tarihsel pay fiyatı ve toplam fon değerinin günlük değişim grafiği.

---

### 🇺🇸 C. ABD Borsaları & ETF'ler (Top 1.000 Equities & ETFs)

#### 1. ABD Şirketleri Listesi
* **Endpoint:** `GET /api/v1/us-stocks`
* **Açıklama:** ABD piyasalarındaki en büyük 1.000 şirketin (Apple, Microsoft, Nvidia, Tesla vb.) tırnaklarını ve sektörlerini sunar.
* **Parametreler:** `search`, `sector`, `sort`, `order`, `page`, `limit`

#### 2. ABD Şirket Detayı
* **Endpoint:** `GET /api/v1/us-stocks/:ticker`

#### 3. ABD ETF'leri Listesi
* **Endpoint:** `GET /api/v1/us-etfs`
* **Açıklama:** SPY, QQQ, VOO, IVV, IWM gibi majör ABD ETF'lerinin fiyatları ve fon büyüklükleri (AUM).

#### 4. ABD Varlığı 5 Yıllık Geçmiş & Performans
* **Endpoint:** `GET /api/v1/us-history/:type/:ticker`
* **Parametreler:** `type`: `stock` veya `etf`, `ticker`: `NVDA`

---

### 🚀 D. Halka Arzlar (IPO - SPK & BIST)

#### 1. Halka Arz Listesi
* **Endpoint:** `GET /api/v1/ipos`
* **Açıklama:** SPK onaylı veya taslak aşamasındaki BIST halka arzlarını, talep toplama tarihlerini, arz fiyatlarını, dağıtım yöntemlerini ve tavan serilerini verir.

#### 2. Tekil Halka Arz Detayı
* **Endpoint:** `GET /api/v1/ipos/:code`

---

### 📰 E. KAP Bildirimleri & Şirket Açıklamaları

#### 1. KAP Bildirim Akışı
* **Endpoint:** `GET /api/v1/kap/disclosures`
* **Parametreler:** `ticker` (opsiyonel), `page`, `limit`

#### 2. KAP Bildirimi AI Özetleme
* **Endpoint:** `POST /api/kap/summarize/:index`
* **Açıklama:** Uzun KAP özel durum açıklamasını Gemini LLM kullanarak 3 maddelik yönetici özetine dönüştürür.

---

### 💡 F. Analist Raporları & Piyasa Konsensüsü

#### 1. Analist Raporları Listesi
* **Endpoint:** `GET /api/v1/analyst-reports`
* **Parametreler:** `market` (`BIST` | `US` | `TEFAS` | `CRYPTO` | `ALL`), `ticker`, `sentiment`, `recommendation`

#### 2. Piyasa Konsensüsü
* **Endpoint:** `GET /api/v1/analyst-reports/consensus`
* **Açıklama:** Piyasaya dair aracı kurumların genel AL/TUT/SAT oranları ve hedef fiyat potansiyelleri.

#### 3. Hisse Bazlı Analist Konsensüsü
* **Endpoint:** `GET /api/v1/analyst-reports/ticker/:ticker`

#### 4. YZ ile Analist Raporu Sentezleme
* **Endpoint:** `POST /api/v1/analyst-reports/synthesize`
* **Body:** `{ "ticker": "THYAO", "rawText": "..." }`

---

### 🔄 G. 360° Birleşik Varlık Motoru (Unified Asset Hub)

#### 1. Birleşik Varlık Profili
* **Endpoint:** `GET /api/v1/assets/profile/:code`
* **Açıklama:** Tek çağrıda hissenin canlı fiyatını, taşıyan fonları, KAP haberlerini, analist raporlarını ve teknik verilerini 360° birleştirerek döndürür.

---

### 📊 H. Sektörel İstihbarat & Rotasyon Radarı

#### 1. Sektörel Genel Bakış & Isı Haritası
* **Endpoint:** `GET /api/v1/sectors/overview`
* **Parametreler:** `market`: `BIST` | `US` | `ALL`

#### 2. Canlı Hisse Treemap (Finviz / BIST Isı Haritası)
* **Endpoint:** `GET /api/v1/sectors/stocks-heatmap`

#### 3. Göreceli Değerleme Taraması (Sektörüne Göre İskontolu Hisseler)
* **Endpoint:** `GET /api/v1/sectors/valuation-screener`

---

### 📈 I. Canlı Piyasa, Kripto & Makro Göstergeler

#### 1. Canlı Piyasa Özeti
* **Endpoint:** `GET /api/market/overview`
* **Açıklama:** BIST 100, Dolar/TL, Euro/TL, Gram Altın, Brent Petrol ve Bitcoin tırnaklarını tek pakette verir.

#### 2. Kripto Canlı Fiyatlar (Binance Smart Cache)
* **Endpoint:** `GET /api/crypto/prices`

#### 3. Kripto Mum Verileri (OHLCV + RSI + MACD)
* **Endpoint:** `GET /api/crypto/candles/:symbol`
* **Parametreler:** `timeframe`: `15m` | `1h` | `1d`

#### 4. Kripto On-Chain Sinyalleri
* **Endpoint:** `GET /api/crypto/onchain/:symbol` (IntoTheBlock verileri)

#### 5. Makro Ekonomik Göstergeler
* **Endpoint:** `GET /api/macro`
* **Açıklama:** TCMB ve FRED kaynaklı Enflasyon, Politika Faizi, M2, İşsizlik ve Dolar Kuru zaman serisi.

---

### ⚙️ J. Sistem Sağlığı, Zamanlayıcı & Telemetri

#### 1. Sistem ve Veritabanı Sağlık Durumu
* **Endpoint:** `GET /api/v1/health`
* **Örnek Yanıt:**
```json
{
  "success": true,
  "status": "OPERATIONAL",
  "service": "BIST & TEFAS Financial Data Hub API v1",
  "timestamp": "2026-09-09T07:15:00.000Z",
  "databaseCounts": {
    "bistStocks": 625,
    "tefasFunds": 1063,
    "tefasFundHoldingsRows": 14200,
    "totalBistHistoricalBars": 850000,
    "kapDisclosures": 12500
  }
}
```

#### 2. OpenAPI 3.0 / Swagger JSON Şeması
* **Endpoint:** `GET /api/v1/openapi.json`
* **Açıklama:** Tüm v1 API uç noktalarının makine tarafından okunabilir (Swagger/OpenAPI) şemasını döndürür.

#### 3. Otomatik Zamanlayıcı (Scheduler) Durumu
* **Endpoint:** `GET /api/v1/scheduler/status`
* **Açıklama:** Arka planda çalışan KAP, TEFAS, BIST ve Kripto veri senkronizasyon botlarının durumunu ve bir sonraki çalışma zamanlarını verir.

#### 4. Zamanlanmış Görevi Tetikle
* **Endpoint:** `POST /api/v1/scheduler/trigger/:taskId`

---

## 📤 2. Toplu Veri Dışa / İçe Aktarma Endpoints (`/api/export/*`, `/api/import/*`)

Dış veritabanları, Excel/CSV araçları veya Python veri bilimi modülleri için toplu veri alma uç noktalarıdır.

| Endpoint | Method | Açıklama |
| :--- | :--- | :--- |
| `/api/export/companies` | `GET` | Tüm BIST şirketlerinin detaylı profil ve bilanço özetlerini verir. |
| `/api/export/financials/:ticker` | `GET` | Şirketin 36 standart finansal kalemden oluşan KAP bilanço ve gelir tablosunu döner. |
| `/api/export/funds` | `GET` | 1.063 TEFAS yatırım fonunun tüm teknik parametrelerini toplu dışa aktarır. |
| `/api/export/ipos` | `GET` | Halka arz geçmişi ve istatistiklerini JSON formatında verir. |
| `/api/export/buybacks` | `GET` | Şirketlerin hisse geri alım programlarını ve alınan lot miktarlarını verir. |
| `/api/export/bulk` | `GET` | `tables=bist_stocks,tefas_funds` parametresiyle seçilen tabloları toplu indirir. |
| `/api/import/bulk` | `POST` | Dış sistemlerden JSON yükü kabul ederek veritabanını günceller. |

---

## ⚡ 3. Canlı Ofis Realtime Server-Sent Events (SSE)

Sistemdeki anlık senkronizasyonları, bot hareketlerini ve hataları canlı dinlemek için SSE bağlantı uç noktası:

* **Endpoint:** `GET /api/v1/events/stream`
* **Protokol:** HTTP Server-Sent Events (Event-Stream)
* **Olay Türleri:** `INITIAL_STATE`, `SYNC_COMPLETED`, `KAP_DISCLOSURE_RECEIVED`, `ERROR_LOGGED`, `SETTINGS_UPDATED`

---

## 🤖 Dış Yapay Zeka (AI) Sistemleri İçin Bağlantı Kılavuzu

Bir diğer Yapay Zeka modeli veya otonom ajan bu sistemle etkileşime geçerken şu adımları izlemelidir:

1. **Sağlık Kontrolü Yapın:** `GET /api/v1/health` çağrısı yaparak sunucunun ve veritabanının ayakta olduğunu doğrulayın.
2. **OpenAPI Şemasını Okuyun:** İhtiyaç duyulan uç noktaların detaylı parametre tipleri için `GET /api/v1/openapi.json` adresini çekebilirsiniz.
3. **Soruya Uygun API Seçimi:**
   * *Hisse fiyatı / teknik analiz soruluyorsa:* `GET /api/v1/bist/stock/THYAO` ve `/indicators` kullanın.
   * *Hisse geçmiş verisi isteniyorsa:* `GET /api/v1/bist/stock/THYAO/history` kullanın.
   * *Hangi fon THYAO almış soruluyorsa:* `GET /api/v1/tefas/stock/THYAO/in-funds` çağrın.
   * *Fonun içindeki hisseler soruluyorsa:* `GET /api/v1/tefas/fund/TI2/holdings` çağrın.
   * *Son KAP haberleri isteniyorsa:* `GET /api/v1/kap/disclosures?ticker=THYAO` çağrın.
   * *Kripto mum verileri isteniyorsa:* `GET /api/crypto/candles/BTCUSDT` çağrın.
   * *Makro faiz / enflasyon soruluyorsa:* `GET /api/macro` çağrın.

---

*Doküman Son Güncelleme Tarihi: 9 Eylül 2026*
