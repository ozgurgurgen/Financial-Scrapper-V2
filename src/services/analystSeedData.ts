export interface AnalystSeedReport {
  market: 'BIST' | 'US' | 'TEFAS' | 'CRYPTO';
  source: string;
  sourceName: string;
  sourceUrl: string;
  author: string;
  ticker: string;
  assetName: string;
  title: string;
  rawContent: string;
  recommendation: 'AL' | 'TUT' | 'SAT' | 'OVERWEIGHT' | 'NEUTRAL' | 'UNDERWEIGHT' | 'BULLISH' | 'BEARISH';
  targetPrice?: number;
  currentPriceAtReport?: number;
  upsidePct?: number;
  currency: 'TRY' | 'USD' | 'USDT';
  publishDate: string;
  aiSummary: string;
  aiSentiment: 'POZİTİF' | 'NÖTR' | 'NEGATİF';
  aiSentimentScore: number;
  keyBullArguments: string[];
  keyBearRisks: string[];
}

export const INITIAL_ANALYST_REPORTS: AnalystSeedReport[] = [
  // --- 1. BIST: İŞ YATIRIM ---
  {
    market: 'BIST',
    source: 'IS_YATIRIM',
    sourceName: 'İş Yatırım Araştırma',
    sourceUrl: 'https://www.isyatirim.com.tr/tr-tr/analiz/hisse/Sayfalar/default.aspx',
    author: 'İş Yatırım Araştırma Direktörlüğü',
    ticker: 'THYAO',
    assetName: 'Türk Hava Yolları',
    title: 'THYAO 2026 Görünümü: Güçlü Yolcu Hacmi ve Kargo Katkısıyla Model Portföyde',
    rawContent: 'Türk Hava Yolları için 12 aylık hedef fiyatımızı 420.00 TL seviyesinde korurken hisse için AL önerimizi yineliyoruz. 2026 yılının ilk çeyreğinde uluslararası yolcu doluluk oranlarının %84 üzerinde seyretmesi, AJet markasının filo ayrışmasıyla marjlara sağlanan pozitif esneklik ve Turkish Cargo küresel pazar payının %5.4 seviyesine yükselmesi operasyonel nakit akışını desteklemektedir. Jeopolitik hava sahası kısıtlamaları ve jet yakıtı maliyet dalgalanmaları aşağı yönlü riskler barındırsa da, şirketin 5.2x seviyesindeki düşük FD/FAVÖK çarpanı küresel benzerlerine kıyasla %35 iskontoya işaret etmektedir.',
    recommendation: 'AL',
    targetPrice: 420.00,
    currentPriceAtReport: 312.50,
    upsidePct: 34.40,
    currency: 'TRY',
    publishDate: '2026-09-04T08:30:00Z',
    aiSummary: 'İş Yatırım, Türk Hava Yolları için 420 TL hedef fiyat ve "AL" tavsiyesini koruyor. Yüksek uluslararası doluluk oranları, kargo pazar payındaki artış ve emsallerine göre %35 çarpan iskontosu değerlemeyi desteklerken, yakıt maliyetleri ana risk olarak izleniyor.',
    aiSentiment: 'POZİTİF',
    aiSentimentScore: 0.820,
    keyBullArguments: [
      'Uluslararası yolcu doluluğunun %84 üzerinde seyretmesi',
      'Turkish Cargo pazar payının %5.4 seviyesine ulaşması',
      'Küresel benzerlerine kıyasla %35 FD/FAVÖK çarpan iskontosu'
    ],
    keyBearRisks: [
      'Jet yakıtı fiyatlarındaki olası oynaklık',
      'Orta Doğu ve bölgesel hava sahası kısıtlamaları'
    ]
  },
  {
    market: 'BIST',
    source: 'IS_YATIRIM',
    sourceName: 'İş Yatırım Araştırma',
    sourceUrl: 'https://www.isyatirim.com.tr/tr-tr/analiz/hisse/Sayfalar/default.aspx',
    author: 'İş Yatırım Araştırma Direktörlüğü',
    ticker: 'EREGL',
    assetName: 'Ereğli Demir Çelik',
    title: 'EREGL: Peletleme Yatırımı ve Yeşil Çelik Dönüşümü Uzun Vadeli Değeri Artırıyor',
    rawContent: 'Ereğli Demir Çelik için tavsiyemizi TUT seviyesinde muhafaza ederken 12 aylık hedef fiyatımızı 58.50 TL olarak hesaplıyoruz. Küresel çelik fiyatlarındaki Çin kaynaklı arz baskısı kısa vadede marjları sınırlasa da, Bingöl Avnik pelet tesisi yatırımıyla özkaynak hammadde karşılama oranının %85 üzerine çıkacak olması şirketin operasyonel maliyetlerini kalıcı olarak düşürecektir.',
    recommendation: 'TUT',
    targetPrice: 58.50,
    currentPriceAtReport: 49.80,
    upsidePct: 17.47,
    currency: 'TRY',
    publishDate: '2026-09-03T11:15:00Z',
    aiSummary: 'İş Yatırım, EREGL için "TUT" önerisi ve 58.50 TL hedef fiyat belirledi. Çin kaynaklı çelik arz baskısı kısa vadeli marjları kısıtlarken, Bingöl pelet yatırımı uzun vadeli maliyet avantajı sağlayacak temel unsur olarak öne çıkıyor.',
    aiSentiment: 'NÖTR',
    aiSentimentScore: 0.250,
    keyBullArguments: [
      'Bingöl Avnik peletleme yatırımı ile hammadde bağımsızlığı',
      'Güneş enerjisi ve yeşil çelik dönüşüm teşvikleri'
    ],
    keyBearRisks: [
      'Çin dampingli ucuz çelik ihracatının küresel fiyatları baskılaması',
      'İnşaat ve otomotiv sektöründeki faiz duyarlılığı'
    ]
  },

  // --- 2. BIST: KAP ARAŞTIRMA RAPORLARI ---
  {
    market: 'BIST',
    source: 'KAP_RESEARCH',
    sourceName: 'KAP Araştırma Bildirimi / Garanti BBVA Yatırım',
    sourceUrl: 'https://www.kap.org.tr/tr/api/disclosure/members/byCriteria',
    author: 'Garanti BBVA Yatırım Strateji',
    ticker: 'BIMAS',
    assetName: 'BİM Birleşik Mağazalar',
    title: 'BIMAS Finansal Değerlendirme & Araştırma Notu: Trafik Büyümesiyle Marj Artışı',
    rawContent: 'Garanti BBVA Yatırım Araştırma Masası tarafından KAP üzerinden paylaşılan şirket araştırma notunda BIMAS için Endeks Üzeri Getiri (AL) tavsiyesi ve 680.00 TL hedef fiyat yinelendi. Şirketin FILE mağazalarındaki çift haneli sepet büyümesi, operasyonel giderlerin ciroya oranının sıkı kontrol altında tutulması ve yüksek serbest nakit akımı üretimi güçlü temettü dağıtım potansiyelini pekiştirmektedir.',
    recommendation: 'AL',
    targetPrice: 680.00,
    currentPriceAtReport: 524.00,
    upsidePct: 29.77,
    currency: 'TRY',
    publishDate: '2026-09-05T09:00:00Z',
    aiSummary: 'KAP araştırma bildirimine göre Garanti BBVA Yatırım, BIMAS için 680 TL hedef fiyatla "Endeks Üzeri Getiri" öngörüyor. Güçlü mağaza trafiği, FİLE konseptinin cirosal katkısı ve yüksek serbest nakit üretimi güçlü temettü potansiyeli yaratıyor.',
    aiSentiment: 'POZİTİF',
    aiSentimentScore: 0.880,
    keyBullArguments: [
      'FILE mağazalarında yüksek büyüme ve marj katkısı',
      'Defansif tüketim karakteri ve enflasyon geçişkenliği',
      'Yüksek nakit dönüşüm oranı ve temettü potansiyeli'
    ],
    keyBearRisks: [
      'Asgari ücret ve personel giderlerindeki olası artışlar',
      'Tedarikçi maliyet baskıları ve regülatif denetimler'
    ]
  },
  {
    market: 'BIST',
    source: 'KAP_RESEARCH',
    sourceName: 'KAP Araştırma Bildirimi / Ünlü & Co',
    sourceUrl: 'https://www.kap.org.tr/tr/api/disclosure/members/byCriteria',
    author: 'Ünlü & Co Araştırma Grubu',
    ticker: 'ASELS',
    assetName: 'Aselsan',
    title: 'ASELS Araştırma Raporu: Rekor Bakiye Siparişler ve İhracat Odaklı Büyüme',
    rawContent: 'Ünlü & Co tarafından yayınlanan araştırma raporuna göre Aselsan için 12 aylık hedef fiyat 92.00 TL olarak güncellenmiş ve AL tavsiyesi korunmuştur. Şirketin bakiye siparişlerinin (backlog) 14 milyar doları aşması, dost ve müttefik ülkelere yapılan radar ve aviyonik ihracat sözleşmelerinin döviz cinsi nakit akışı sağlaması değerlemeyi desteklemektedir.',
    recommendation: 'AL',
    targetPrice: 92.00,
    currentPriceAtReport: 68.40,
    upsidePct: 34.50,
    currency: 'TRY',
    publishDate: '2026-09-04T14:20:00Z',
    aiSummary: 'Ünlü & Co KAP araştırma notunda Aselsan için 92 TL hedef fiyatla "AL" tavsiyesi verdi. 14 milyar doları aşan tarihi rekor sipariş defteri ve yüksek katma değerli savunma ihracatı şirketin döviz bazlı büyümesini garanti altına alıyor.',
    aiSentiment: 'POZİTİF',
    aiSentimentScore: 0.850,
    keyBullArguments: [
      '14 milyar doları aşan tarihi yüksek bakiye sipariş portföyü',
      'Döviz cinsi savunma sanayii ihracat sözleşmeleri',
      'Savunma elektroniği ve mikroçip Ar-Ge yatırımları'
    ],
    keyBearRisks: [
      'Kamu bütçe ödeme vadelerindeki dönemsel uzamalar',
      'Yarı iletken tedarik zinciri lojistik aksamaları'
    ]
  },

  // --- 3. BIST: MIDAS KULAKLARI ---
  {
    market: 'BIST',
    source: 'MIDAS',
    sourceName: 'Midas Kulakları',
    sourceUrl: 'https://www.getmidas.com/midas-kulaklari/borsa-ve-hisse-yorumlari/',
    author: 'Midas Piyasa Analiz Ekibi',
    ticker: 'BIST100',
    assetName: 'BIST 100 Endeksi',
    title: 'Midas Kulakları Günlük Borsa Yorumu: Faiz İndirim Döngüsü ve Banka Rallisi',
    rawContent: 'TCMB politikalarındaki dezenflasyonist patika ve küresel merkez bankalarının gevşeme döngüsü Borsa İstanbul genelinde risk iştahını canlı tutuyor. Bankacılık sektöründe net faiz marjlarındaki dipten dönüş beklentisi XBANK öncülüğünde BIST100 endeksini 11.200 direnç seviyesine taşırken, aracı kurumlar holding ve havacılık hisselerinde ağırlık artır tavsiyesini koruyor.',
    recommendation: 'AL',
    targetPrice: 12500.00,
    currentPriceAtReport: 10450.00,
    upsidePct: 19.62,
    currency: 'TRY',
    publishDate: '2026-09-05T07:45:00Z',
    aiSummary: 'Midas Kulakları analizine göre dezenflasyon süreci ve faiz indirim döngüsü BIST 100 endeksinde bankacılık ve holdingler öncülüğünde yükseliş trendini destekliyor. Yabancı girişinin artmasıyla 11.200 seviyesinin aşılması durumunda yeni zirve arayışı bekleniyor.',
    aiSentiment: 'POZİTİF',
    aiSentimentScore: 0.740,
    keyBullArguments: [
      'TCMB dezenflasyon patikası ve faiz indirim beklentileri',
      'Bankacılık net faiz marjlarında dipten toparlanma',
      'Türkiye CDS priminin gerilemesi ve yabancı portföy girişleri'
    ],
    keyBearRisks: [
      'Kısa vadeli kâr realizasyonları',
      'Küresel büyüme endişeleri ve emtia dalgalanmaları'
    ]
  },

  // --- 4. BIST: PARABORSA / HALK YATIRIM & AK YATIRIM ---
  {
    market: 'BIST',
    source: 'PARABORSA',
    sourceName: 'ParaBorsa / Halk Yatırım',
    sourceUrl: 'https://paraborsa.net/kategori/hisse-onerileri/',
    author: 'Halk Yatırım Araştırma & ParaBorsa',
    ticker: 'TUPRS',
    assetName: 'Tüpraş',
    title: 'Halk Yatırım BIST Yorumu: Rafineri Marjları ve Yeşil Hidrojen Stratejisi',
    rawContent: 'Halk Yatırım günlük hisse önerileri bülteninde Tüpraş için 215.00 TL hedef fiyat ve AL görüşü yinelendi. Akdeniz rafineri marjlarındaki toparlanma, motorin ve jet yakıtı crack spreadlerindeki dirençli tablo ve şirketin Entek Elektrik birleşmesi sonrası sıfır karbon vizyonu doğrultusunda açıkladığı yeşil hidrojen yatırımları nakit üretme gücünü güvenceye alıyor.',
    recommendation: 'AL',
    targetPrice: 215.00,
    currentPriceAtReport: 172.30,
    upsidePct: 24.78,
    currency: 'TRY',
    publishDate: '2026-09-04T06:50:00Z',
    aiSummary: 'ParaBorsa platformunda derlenen Halk Yatırım analizine göre Tüpraş için 215 TL hedef fiyat öngörülüyor. Akdeniz rafineri marjlarının toparlanması ve Entek entegrasyonuyla hızlanan yeşil enerji yatırımları güçlü temettü beklentisini destekliyor.',
    aiSentiment: 'POZİTİF',
    aiSentimentScore: 0.780,
    keyBullArguments: [
      'Akdeniz rafineri marjlarında dirençli seyir',
      'Entek Elektrik katkısıyla yeşil hidrojen ve yenilenebilir enerji',
      'Yüksek temettü verimi ve güçlü nakit dengesi'
    ],
    keyBearRisks: [
      'Ham petrol fiyatlarında ani dalgalanmalar ve stok zararı riski',
      'Planlı rafineri bakım duruşları'
    ]
  },

  // --- 5. BIST: INVESTING.COM TR ---
  {
    market: 'BIST',
    source: 'INVESTING_TR',
    sourceName: 'Investing.com Türkiye',
    sourceUrl: 'https://tr.investing.com/analysis/stock-markets',
    author: 'Investing TR Kıdemli Analistleri',
    ticker: 'KCHOL',
    assetName: 'Koç Holding',
    title: 'Holding Sektör Analizi: Koç Holding NAD İskontosu Tarihsel Ortalamanın Üzerinde',
    rawContent: 'Investing TR platformunda yayınlanan analiz notuna göre Koç Holding için hedef fiyat 310.00 TL olarak öngörülmektedir. Tüpraş, Ford Otosan, Tofaş ve Yapı Kredi gibi iştiraklerin güçlü operasyonel performansına rağmen holdingin net aktif değer (NAD) iskontosunun %38 seviyelerine ulaşması cazip bir uzun vadeli giriş fırsatı yaratmaktadır.',
    recommendation: 'AL',
    targetPrice: 310.00,
    currentPriceAtReport: 232.00,
    upsidePct: 33.62,
    currency: 'TRY',
    publishDate: '2026-09-03T16:40:00Z',
    aiSummary: 'Investing.com TR hisse analizine göre Koç Holding, %38 seviyesindeki yüksek Net Aktif Değer (NAD) iskontosuyla güçlü bir iskonto sunuyor. İştiraklerin döviz bazlı gelir çeşitliliği holdingi piyasa dalgalanmalarına karşı koruyor.',
    aiSentiment: 'POZİTİF',
    aiSentimentScore: 0.810,
    keyBullArguments: [
      'Tarihsel ortalamanın üzerindeki %38 NAD iskontosu',
      'İhracatçı iştirakler sayesinde dengeli döviz nakit akışı',
      'Güçlü konsolide bilanço ve düşük borçluluk'
    ],
    keyBearRisks: [
      'Otomotiv sektöründe Avrupa pazarındaki talep yavaşlaması',
      'Sermaye piyasası genel dalgalanmaları'
    ]
  },

  // --- BANKACILIK & FİNANS ---
  {
    market: 'BIST',
    source: 'AK_YATIRIM',
    sourceName: 'Ak Yatırım Araştırma',
    sourceUrl: 'https://www.akyatirim.com.tr',
    author: 'Ak Yatırım Bankacılık Analisti',
    ticker: 'AKBNK',
    assetName: 'Akbank T.A.Ş.',
    title: 'AKBNK 2026 Strateji Raporu: Marj Genişlemesi ve Güçlü Sermaye Yeterliliği',
    rawContent: 'Akbank için 78.50 TL hedef fiyat ile Endeks Üzeri Getiri (GÜÇLÜ AL) tavsiyemizi koruyoruz. Fonlama maliyetlerinin gerilemesiyle birlikte kredi-mevduat makasında beklenen toparlanma net faiz marjlarını 2026 genelinde destekleyecektir. Güçlü sermaye yeterlilik rasyosu ve düşük takipteki kredi oranı bankanın risk profilini sektör genelinden pozitif ayrıştırmaktadır.',
    recommendation: 'AL',
    targetPrice: 78.50,
    currentPriceAtReport: 56.80,
    upsidePct: 38.20,
    currency: 'TRY',
    publishDate: '2026-09-05T10:15:00Z',
    aiSummary: 'Ak Yatırım, Akbank için 78.50 TL hedef fiyat ve "GÜÇLÜ AL" önerisini sürdürüyor. Fonlama maliyetlerindeki normalleşme ve yüksek sermaye tamponu ana katalizörler olarak değerlendiriliyor.',
    aiSentiment: 'POZİTİF',
    aiSentimentScore: 0.840,
    keyBullArguments: ['Net faiz marjında beklenen hızlı toparlanma', 'Yüksek sermaye yeterliliği ve güçlü karşılık oranları'],
    keyBearRisks: ['Aktif kalitesi dalgalanmaları', 'Kredi büyüme sınırlandırmaları']
  },
  {
    market: 'BIST',
    source: 'GARANTI_BBVA',
    sourceName: 'Garanti BBVA Yatırım',
    sourceUrl: 'https://www.garantibbvayatirim.com.tr',
    author: 'Garanti BBVA Hisse Araştırma Masası',
    ticker: 'GARAN',
    assetName: 'Garanti BBVA Bankası',
    title: 'GARAN Hisse Raporu: Dijital Liderlik ve Çekirdek Bankacılık Kârlılığı',
    rawContent: 'Garanti BBVA için 12 aylık hedef fiyatımızı 148.00 TL seviyesinde korurken hisse için GÜÇLÜ AL tavsiyemizi yineliyoruz. Güçlü vadesiz mevduat tabanı ve yüksek net ücret-komisyon gelirleri sayesinde bankanın özkaynak kârlılığı sektör ortalamasının üzerinde kalmaya devam etmektedir.',
    recommendation: 'AL',
    targetPrice: 148.00,
    currentPriceAtReport: 109.30,
    upsidePct: 35.41,
    currency: 'TRY',
    publishDate: '2026-09-04T14:30:00Z',
    aiSummary: 'Garanti BBVA Yatırım, GARAN hissesi için 148 TL hedef fiyat ile GÜÇLÜ AL tavsiyesini koruyor. Yüksek vadesiz mevduat tabanı ve komisyon gelirleri güçlü kârlılığı destekliyor.',
    aiSentiment: 'POZİTİF',
    aiSentimentScore: 0.860,
    keyBullArguments: ['Düşük maliyetli vadesiz mevduat avantajı', 'Dijital bankacılık penetrasyonu ve komisyon gelirleri'],
    keyBearRisks: ['Makroekonomik faiz volatilitesi']
  },
  {
    market: 'BIST',
    source: 'IS_YATIRIM',
    sourceName: 'İş Yatırım Araştırma',
    sourceUrl: 'https://www.isyatirim.com.tr',
    author: 'İş Yatırım Araştırma Direktörlüğü',
    ticker: 'ISCTR',
    assetName: 'Türkiye İş Bankası C',
    title: 'ISCTR Araştırma Notu: İştirak Portföyü ve Kredi Büyümesiyle Model Portföyde',
    rawContent: 'Türkiye İş Bankası için 18.50 TL hedef fiyat ve AL tavsiyemizi koruyoruz. Bankanın sanayi ve finans iştiraklerinden sağladığı zengin temettü ve değerleme akışı, ticari kredi dinamizmi ile birleşerek hisse performansını desteklemektedir.',
    recommendation: 'AL',
    targetPrice: 18.50,
    currentPriceAtReport: 14.00,
    upsidePct: 32.14,
    currency: 'TRY',
    publishDate: '2026-09-03T09:40:00Z',
    aiSummary: 'İş Yatırım, ISCTR için 18.50 TL hedef fiyat ve AL tavsiyesini koruyor. Geniş iştirak portföyü ve güçlü bilanço yapısı değerlemeyi öne çıkarıyor.',
    aiSentiment: 'POZİTİF',
    aiSentimentScore: 0.800,
    keyBullArguments: ['Geniş sanayi ve finansal iştirak portföyü', 'Dengeli kredi kompozisyonu'],
    keyBearRisks: ['Sektörel regülasyonlar']
  },
  {
    market: 'BIST',
    source: 'YAPI_KREDI',
    sourceName: 'Yapı Kredi Yatırım',
    sourceUrl: 'https://www.ykyatirim.com.tr',
    author: 'Yapı Kredi Araştırma Masası',
    ticker: 'YKBNK',
    assetName: 'Yapı ve Kredi Bankası',
    title: 'YKBNK: Bireysel Kredi Kartları ve Tüketici Kredilerinde Güçlü Pazar Payı',
    rawContent: 'Yapı Kredi için 39.50 TL hedef fiyat ile AL önerimizi yineliyoruz. Kredi kartı hacimlerindeki pazar payı ve yüksek spread yönetimi bankanın net kârını yukarı taşımaktadır.',
    recommendation: 'AL',
    targetPrice: 39.50,
    currentPriceAtReport: 30.00,
    upsidePct: 31.67,
    currency: 'TRY',
    publishDate: '2026-09-02T11:20:00Z',
    aiSummary: 'Yapı Kredi Yatırım, YKBNK için 39.50 TL hedef fiyat ve AL önerisi sunuyor. Bireysel krediler ve kartlardaki pazar liderliği kârlılığı artırıyor.',
    aiSentiment: 'POZİTİF',
    aiSentimentScore: 0.790,
    keyBullArguments: ['Kredi kartı ve ödeme sistemlerinde pazar liderliği', 'Esnek fonlama yönetimi'],
    keyBearRisks: ['Tüketici kredileri takip oranları']
  },

  // --- TELEKOMÜNİKASYON ---
  {
    market: 'BIST',
    source: 'DENIZ_YATIRIM',
    sourceName: 'Deniz Yatırım Strateji',
    sourceUrl: 'https://www.denizyatirim.com',
    author: 'Deniz Yatırım Telekom Analisti',
    ticker: 'TCELL',
    assetName: 'Turkcell İletişim Hizmetleri',
    title: 'TCELL: ARPU Büyümesi ve Dijital Servislerle Sektör Liderliği',
    rawContent: 'Turkcell için 135.00 TL hedef fiyat ve GÜÇLÜ AL tavsiyemizi yineliyoruz. Enflasyon üzeri ARPU (abone başına ortalama gelir) artışı, veri merkezi yatırımları ve fintech iştiraklerinin katkısıyla nakit akışı ivmelenmektedir.',
    recommendation: 'AL',
    targetPrice: 135.00,
    currentPriceAtReport: 99.00,
    upsidePct: 36.36,
    currency: 'TRY',
    publishDate: '2026-09-04T12:00:00Z',
    aiSummary: 'Deniz Yatırım, Turkcell için 135 TL hedef fiyat ve GÜÇLÜ AL önerisi belirledi. Güçlü faturalı abone geçişi ve dijital servis gelirleri öne çıkıyor.',
    aiSentiment: 'POZİTİF',
    aiSentimentScore: 0.850,
    keyBullArguments: ['Faturalı abone oranı ve ARPU artışı', 'Veri merkezi ve yenilenebilir enerji yatırımları'],
    keyBearRisks: ['5G ihale lisans maliyetleri ve döviz bazlı CAPEX harcamaları']
  },
  {
    market: 'BIST',
    source: 'OYAK_YATIRIM',
    sourceName: 'Oyak Yatırım Araştırma',
    sourceUrl: 'https://www.oyakyatirim.com.tr',
    author: 'Oyak Yatırım Araştırma Bölümü',
    ticker: 'TTKOM',
    assetName: 'Türk Telekomünikasyon',
    title: 'TTKOM Araştırma Raporu: Sabit Genişbantta Fiyat Güncellemeleri Marjları Güçlendiriyor',
    rawContent: 'Türk Telekom için 72.00 TL hedef fiyat ile AL önerimizi koruyoruz. Fiber altyapı hane erişiminin 32 milyona ulaşması ve sabit internet tarifelerindeki fiyat düzeltmeleri operasyonel FAVÖK marjını %42 seviyesine taşımaktadır.',
    recommendation: 'AL',
    targetPrice: 72.00,
    currentPriceAtReport: 54.60,
    upsidePct: 31.87,
    currency: 'TRY',
    publishDate: '2026-09-03T15:20:00Z',
    aiSummary: 'Oyak Yatırım, Türk Telekom için 72 TL hedef fiyat ve AL tavsiyesini yineliyor. Fiber hane erişimindeki artış ve taahhüt yenilemeleri gelirleri kuvvetlendiriyor.',
    aiSentiment: 'POZİTİF',
    aiSentimentScore: 0.800,
    keyBullArguments: ['Sabit genişbantta fiber penetrasyonu', 'İmtiyaz sözleşmesi uzatım beklentisi'],
    keyBearRisks: ['Yüksek borçluluk ve finansman giderleri']
  },

  // --- OTOMOTİV & YAN SANAYİ ---
  {
    market: 'BIST',
    source: 'IS_YATIRIM',
    sourceName: 'İş Yatırım Araştırma',
    sourceUrl: 'https://www.isyatirim.com.tr',
    author: 'İş Yatırım Otomotiv Analisti',
    ticker: 'FROTO',
    assetName: 'Ford Otomotiv Sanayi',
    title: 'FROTO 2026 Değerleme Notu: Crafter/Transit Projeleri ve Romanya Tesisi Katkısı',
    rawContent: 'Ford Otosan için 12 aylık hedef fiyatımızı 1380.00 TL olarak belirliyor ve AL tavsiyemizi koruyoruz. Romanya Craiova tesisinin tam kapasiteye ulaşması ve yeni nesil elektrikli Transit modellerinin Avrupa ihracatı şirketin uzun vadeli büyüme hikayesini sağlamlaştırmaktadır.',
    recommendation: 'AL',
    targetPrice: 1380.00,
    currentPriceAtReport: 1033.00,
    upsidePct: 33.59,
    currency: 'TRY',
    publishDate: '2026-09-04T08:45:00Z',
    aiSummary: 'İş Yatırım, Ford Otosan için 1380 TL hedef fiyat ve AL tavsiyesini sürdürüyor. Romanya tesisinin sağladığı hacim büyümesi ve elektrikli araç ihracatı temel katalizörler.',
    aiSentiment: 'POZİTİF',
    aiSentimentScore: 0.830,
    keyBullArguments: ['Romanya Craiova fabrikasının tam entegrasyonu', 'Avrupa ticari araç pazarında %15 üzeri liderlik'],
    keyBearRisks: ['Avrupa otomotiv pazarında daralma riski']
  },
  {
    market: 'BIST',
    source: 'GARANTI_BBVA',
    sourceName: 'Garanti BBVA Yatırım',
    sourceUrl: 'https://www.garantibbvayatirim.com.tr',
    author: 'Garanti BBVA Sektör Masası',
    ticker: 'TOASO',
    assetName: 'Tofaş Türk Otomobil Fabrikası',
    title: 'TOASO: Stellantis Dağıtım Entegrasyonu Yeni Bir Boyut Kazandırıyor',
    rawContent: 'Tofaş için 325.00 TL hedef fiyat ve AL tavsiyemizi sürdürüyoruz. Stellantis Türkiye dağıtım ağının bünyeye katılmasıyla şirketin iç pazardaki pazar payı %30 seviyelerine yaklaşırken yeni ticari araç K0 platformu yatırımı üretimi destekleyecektir.',
    recommendation: 'AL',
    targetPrice: 325.00,
    currentPriceAtReport: 253.00,
    upsidePct: 28.46,
    currency: 'TRY',
    publishDate: '2026-09-03T10:10:00Z',
    aiSummary: 'Garanti BBVA Yatırım, TOASO için 325 TL hedef fiyat ve AL tavsiyesini koruyor. Stellantis entegrasyonu şirketin iç pazar liderliğini ve kârlılığını pekiştiriyor.',
    aiSentiment: 'POZİTİF',
    aiSentimentScore: 0.790,
    keyBullArguments: ['Stellantis Türkiye entegrasyonu', 'Yüksek nakit temettü dağıtım kültürü'],
    keyBearRisks: ['Taşıt kredisi faiz oranlarının iç pazar talebine etkisi']
  },
  {
    market: 'BIST',
    source: 'DENIZ_YATIRIM',
    sourceName: 'Deniz Yatırım',
    sourceUrl: 'https://www.denizyatirim.com',
    author: 'Deniz Yatırım Hisse Araştırma',
    ticker: 'DOAS',
    assetName: 'Doğuş Otomotiv',
    title: 'DOAS: Güçlü Nakit Akımı, Yüksek Temettü Verimi ve Lüks Segment Direnci',
    rawContent: 'Doğuş Otomotiv için hedef fiyatımız 355.00 TL olup AL tavsiyemizi koruyoruz. Şirketin temsil ettiği Volkswagen, Audi, Porsche ve Scania markalarının pazar payı gücü ile yüksek serbest nakit akımı %12 civarında cazip bir temettü verimine işaret etmektedir.',
    recommendation: 'AL',
    targetPrice: 355.00,
    currentPriceAtReport: 272.50,
    upsidePct: 30.28,
    currency: 'TRY',
    publishDate: '2026-09-02T13:45:00Z',
    aiSummary: 'Deniz Yatırım, Doğuş Otomotiv için 355 TL hedef fiyat ve AL önerisi veriyor. Yüksek temettü verimi ve lüks segment pazar payı şirketi güçlü kılıyor.',
    aiSentiment: 'POZİTİF',
    aiSentimentScore: 0.810,
    keyBullArguments: ['Çift haneli temettü verimi beklentisi', 'Lüks segment otomobilde talep esnekliği'],
    keyBearRisks: ['İç pazar otomotiv satış adetlerinde yavaşlama']
  },

  // --- SANAYİ, CAM & KİMYA ---
  {
    market: 'BIST',
    source: 'IS_YATIRIM',
    sourceName: 'İş Yatırım Araştırma',
    sourceUrl: 'https://www.isyatirim.com.tr',
    author: 'İş Yatırım Sanayi Analisti',
    ticker: 'SISE',
    assetName: 'Türkiye Şişe ve Cam Fabrikaları',
    title: 'SISE 2026 Şirket Raporu: ABD Doğal Soda Külü Yatırımı ve Küresel Cam Liderliği',
    rawContent: 'Şişecam için 12 aylık hedef fiyatımızı 68.50 TL olarak koruyor ve hisse için AL önerimizi yineliyoruz. ABD Wyoming doğal soda külü yatırımının devreye girmesiyle maliyet yapısında küresel ölçekte en rekabetçi konuma erişecek olması orta-uzun vadeli marj genişlemesini temin etmektedir.',
    recommendation: 'AL',
    targetPrice: 68.50,
    currentPriceAtReport: 51.05,
    upsidePct: 34.18,
    currency: 'TRY',
    publishDate: '2026-09-05T08:15:00Z',
    aiSummary: 'İş Yatırım, Şişecam için 68.50 TL hedef fiyat ve AL tavsiyesini koruyor. ABD doğal soda külü yatırımı ve ihracat kapasitesi uzun vadeli değerlemeyi destekliyor.',
    aiSentiment: 'POZİTİF',
    aiSentimentScore: 0.820,
    keyBullArguments: ['Wyoming soda külü yatırımının maliyet avantajı', 'Küresel cam pazarında ilk 5 üretici pozisyonu'],
    keyBearRisks: ['Avrupa inşaat ve otomotiv sektörlerinde cam talebi zayıflığı']
  },
  {
    market: 'BIST',
    source: 'YAPI_KREDI',
    sourceName: 'Yapı Kredi Yatırım',
    sourceUrl: 'https://www.ykyatirim.com.tr',
    author: 'Yapı Kredi Araştırma Masası',
    ticker: 'PETKM',
    assetName: 'Petkim Petrokimya Holding',
    title: 'PETKM: Etilen-Nafta Makasında Kısmi Dengelenme ve STAR Rafineri Sinerjisi',
    rawContent: 'Petkim için hedef fiyatımızı 27.50 TL seviyesinde, tavsiyemizi ise TUT olarak belirliyoruz. Etilen-nafta makasındaki toparlanma henüz sınırlı kalsa da STAR Rafineri ile hammadde entegrasyonu şirketi operasyonel dalgalanmalardan korumaktadır.',
    recommendation: 'TUT',
    targetPrice: 27.50,
    currentPriceAtReport: 22.46,
    upsidePct: 22.44,
    currency: 'TRY',
    publishDate: '2026-09-04T16:00:00Z',
    aiSummary: 'Yapı Kredi Yatırım, Petkim için 27.50 TL hedef fiyat ve TUT tavsiyesinde bulunuyor. Küresel petrokimya arz fazlası marjları baskılarken STAR rafineri sinerjisi denge unsuru.',
    aiSentiment: 'NÖTR',
    aiSentimentScore: 0.350,
    keyBullArguments: ['STAR Rafineri ile kesintisiz hammadde tedariği', 'Düşük çarpan seviyeleri'],
    keyBearRisks: ['Küresel petrokimya kapasite fazlası ve nafta fiyatları']
  },

  // --- ÇİMENTO & İNŞAAT ---
  {
    market: 'BIST',
    source: 'DENIZ_YATIRIM',
    sourceName: 'Deniz Yatırım',
    sourceUrl: 'https://www.denizyatirim.com',
    author: 'Deniz Yatırım Araştırma Bölümü',
    ticker: 'ENKAI',
    assetName: 'Enka İnşaat ve Sanayi',
    title: 'ENKAI: Güçlü Dolar Net Nakit Pozisyonu ve Küresel Mühendislik Portföyü',
    rawContent: 'Enka İnşaat için 55.00 TL hedef fiyat ile AL tavsiyemizi sürdürüyoruz. Şirketin yaklaşık 4.8 milyar dolarlık net nakit ve finansal yatırım büyüklüğü, yüksek faiz ortamında güçlü finansman geliri üretirken küresel enerji santrali ve altyapı sözleşmeleri ciroyu büyütmektedir.',
    recommendation: 'AL',
    targetPrice: 55.00,
    currentPriceAtReport: 42.80,
    upsidePct: 28.50,
    currency: 'TRY',
    publishDate: '2026-09-05T11:00:00Z',
    aiSummary: 'Deniz Yatırım, ENKAI için 55 TL hedef fiyat ve AL önerisini yineliyor. Devasa döviz net nakit pozisyonu ve uluslararası taahhüt projeleri güvenli liman niteliği taşıyor.',
    aiSentiment: 'POZİTİF',
    aiSentimentScore: 0.810,
    keyBullArguments: ['4.8 milyar doları aşan devasa döviz nakit tamponu', 'Yurt dışı enerji ve taahhüt sözleşmeleri'],
    keyBearRisks: ['Doğal gaz elektrik santrallerinde kapasite kullanım oranları']
  },
  {
    market: 'BIST',
    source: 'OYAK_YATIRIM',
    sourceName: 'Oyak Yatırım Araştırma',
    sourceUrl: 'https://www.oyakyatirim.com.tr',
    author: 'Oyak Yatırım Çimento Analisti',
    ticker: 'OYAKC',
    assetName: 'Oyak Çimento Fabrikaları',
    title: 'OYAKC: Deprem Bölgesi Yeniden Yapılanması ve Klinker İhracat Gücü',
    rawContent: 'Oyak Çimento için 88.00 TL hedef fiyat ve AL önerimizi koruyoruz. Kentsel dönüşüm, altyapı projeleri ve deprem bölgesi yeniden inşasında kullanılan çimento talebi şirket fabrikalarında yüksek kapasite kullanımını garanti altına almaktadır.',
    recommendation: 'AL',
    targetPrice: 88.00,
    currentPriceAtReport: 67.60,
    upsidePct: 30.18,
    currency: 'TRY',
    publishDate: '2026-09-04T13:10:00Z',
    aiSummary: 'Oyak Yatırım, OYAKC için 88 TL hedef fiyat ve AL tavsiyesini yineliyor. Altyapı ve kentsel dönüşüm talebi güçlü kârlılığı destekliyor.',
    aiSentiment: 'POZİTİF',
    aiSentimentScore: 0.820,
    keyBullArguments: ['Kentsel dönüşüm ve altyapı talebi', 'Alternatif yakıt kullanımı ile enerji maliyeti kontrolü'],
    keyBearRisks: ['İnşaat sektöründeki konut kredisi faiz baskısı']
  },

  // --- SİGORTA & FİNANSAL HİZMETLER ---
  {
    market: 'BIST',
    source: 'VAKIF_YATIRIM',
    sourceName: 'Vakıf Yatırım Araştırma',
    sourceUrl: 'https://www.vakifyatirim.com.tr',
    author: 'Vakıf Yatırım Sigortacılık Analisti',
    ticker: 'TURSG',
    assetName: 'Türkiye Sigorta',
    title: 'TURSG: Yüksek Portföy Faiz Geliri ve Hayat Dışı Liderlik',
    rawContent: 'Türkiye Sigorta için 12 aylık hedef fiyatımızı 92.00 TL olarak belirlerken hisse için GÜÇLÜ AL önerimizi koruyoruz. Teknik kârlılıktaki iyileşmenin yanı sıra yüksek faiz ortamında şirketin yönettiği devasa nakit portföyünün ürettiği finansal gelirler net kârı rekor seviyelere taşımaktadır.',
    recommendation: 'AL',
    targetPrice: 92.00,
    currentPriceAtReport: 68.10,
    upsidePct: 35.10,
    currency: 'TRY',
    publishDate: '2026-09-05T09:30:00Z',
    aiSummary: 'Vakıf Yatırım, Türkiye Sigorta için 92 TL hedef fiyat ve GÜÇLÜ AL tavsiyesini koruyor. Yüksek faiz ortamındaki mali kâr üretimi ve prim üretimindeki liderlik şirketi destekliyor.',
    aiSentiment: 'POZİTİF',
    aiSentimentScore: 0.870,
    keyBullArguments: ['Yüksek faizden kaynaklanan rekor finansal yatırım gelirleri', 'Pazar payı liderliği ve kamu sinerjisi'],
    keyBearRisks: ['Doğal afet hasar frekansı artışı']
  },
  {
    market: 'BIST',
    source: 'IS_YATIRIM',
    sourceName: 'İş Yatırım Araştırma',
    sourceUrl: 'https://www.isyatirim.com.tr',
    author: 'İş Yatırım Araştırma Bölümü',
    ticker: 'ANSGR',
    assetName: 'Anadolu Anonim Türk Sigorta Şirketi',
    title: 'ANSGR: Bileşik Oranda Düşüş ve Güçlü Özkaynak Kârlılığı',
    rawContent: 'Anadolu Sigorta için hedef fiyatımızı 125.00 TL ve tavsiyemizi AL olarak sürdürüyoruz. Kasko ve sağlık segmentinde hasar prim oranlarının normalize olması ve mali gelir katkısı hisseyi desteklemektedir.',
    recommendation: 'AL',
    targetPrice: 125.00,
    currentPriceAtReport: 94.70,
    upsidePct: 32.00,
    currency: 'TRY',
    publishDate: '2026-09-03T14:15:00Z',
    aiSummary: 'İş Yatırım, Anadolu Sigorta için 125 TL hedef fiyat ve AL tavsiyesini koruyor. Hasar prim dengesi ve güçlü bilanço cazip değerleme sunuyor.',
    aiSentiment: 'POZİTİF',
    aiSentimentScore: 0.830,
    keyBullArguments: ['Dengeli portföy dağılımı ve kasko kârlılığı', 'Yüksek finansal gelir katkısı'],
    keyBearRisks: ['Yedek parça ve asgari ücret kaynaklı hasar maliyeti artışları']
  },

  // --- GAYRİMENKUL (GYO) ---
  {
    market: 'BIST',
    source: 'HALK_YATIRIM',
    sourceName: 'Halk Yatırım Araştırma',
    sourceUrl: 'https://www.halkyatirim.com.tr',
    author: 'Halk Yatırım GYO Masası',
    ticker: 'EKGYO',
    assetName: 'Emlak Konut Gayrimenkul Yatırım Ortaklığı',
    title: 'EKGYO 2026 Raporu: Arsa Portföyü Satışları ve Yüksek NAD İskontosu',
    rawContent: 'Emlak Konut GYO için hedef fiyatımızı 18.50 TL olarak koruyor ve GÜÇLÜ AL tavsiyemizi sürdürüyoruz. Şirketin net aktif değerine (NAD) göre %55 gibi rekor seviyedeki iskontosu, konut projelerindeki ön satış hasılatı ve gelir paylaşımı modeliyle güçlü bir yükseliş potansiyeline işaret etmektedir.',
    recommendation: 'AL',
    targetPrice: 18.50,
    currentPriceAtReport: 13.02,
    upsidePct: 42.09,
    currency: 'TRY',
    publishDate: '2026-09-05T12:40:00Z',
    aiSummary: 'Halk Yatırım, EKGYO için 18.50 TL hedef fiyat ve GÜÇLÜ AL önerisi sunuyor. %55 seviyesindeki tarihsel yüksek NAD iskontosu güçlü bir getiri marjı vadediyor.',
    aiSentiment: 'POZİTİF',
    aiSentimentScore: 0.880,
    keyBullArguments: ['Tarihsel ortalamanın çok üzerindeki %55 NAD iskontosu', 'Gelir paylaşımı projelerinden düzenli nakit akışı'],
    keyBearRisks: ['Konut kredi faizlerinin tüketici alım gücüne baskısı']
  },
  {
    market: 'BIST',
    source: 'DENIZ_YATIRIM',
    sourceName: 'Deniz Yatırım Strateji',
    sourceUrl: 'https://www.denizyatirim.com',
    author: 'Deniz Yatırım Gayrimenkul Analisti',
    ticker: 'TRGYO',
    assetName: 'Torunlar Gayrimenkul Yatırım Ortaklığı',
    title: 'TRGYO: Düzenli AVM ve Ofis Kira Gelirleri ile Enflasyona Karşı Güçlü Kalkan',
    rawContent: 'Torunlar GYO için 62.00 TL hedef fiyat ile AL tavsiyemizi yineliyoruz. Portföyündeki Torun Center, Mall of İstanbul ve ofis kulelerinden sağlanan döviz endeksli ve ciro paylaşımlı kira gelirleri şirketin nakit üretimini güvenceye almaktadır.',
    recommendation: 'AL',
    targetPrice: 62.00,
    currentPriceAtReport: 47.15,
    upsidePct: 31.50,
    currency: 'TRY',
    publishDate: '2026-09-04T15:50:00Z',
    aiSummary: 'Deniz Yatırım, Torunlar GYO için 62 TL hedef fiyat ve AL tavsiyesinde bulunuyor. AVM ve ticari gayrimenkul kira gelirleri nakit gücünü pekiştiriyor.',
    aiSentiment: 'POZİTİF',
    aiSentimentScore: 0.810,
    keyBullArguments: ['Perakende ve ofis portföyünden düzenli kira nakit akışı', 'Düşük borçluluk ve yüksek doluluk oranları'],
    keyBearRisks: ['Ticari gayrimenkul değerleme oynaklığı']
  },

  // --- DİĞER İMALAT & HİZMET / GIDA & PERAKENDE ---
  {
    market: 'BIST',
    source: 'IS_YATIRIM',
    sourceName: 'İş Yatırım Araştırma',
    sourceUrl: 'https://www.isyatirim.com.tr',
    author: 'İş Yatırım Perakende Analisti',
    ticker: 'MGROS',
    assetName: 'Migros Ticaret A.Ş.',
    title: 'MGROS Model Portföy Notu: Online Penetrasyon ve Güçlü Nakit Akışı',
    rawContent: 'Migros için 12 aylık hedef fiyatımızı 645.00 TL olarak belirliyor ve GÜÇLÜ AL önerimizi yineliyoruz. Yeni mağaza açılışları, Migros Sanal Market ve Yemek operasyonlarının toplam cirodaki payının %19 seviyesine yükselmesi ve işletme sermayesi yönetimi yüksek serbest nakit akımı üretmektedir.',
    recommendation: 'AL',
    targetPrice: 645.00,
    currentPriceAtReport: 471.50,
    upsidePct: 36.80,
    currency: 'TRY',
    publishDate: '2026-09-05T08:50:00Z',
    aiSummary: 'İş Yatırım, Migros için 645 TL hedef fiyat ve GÜÇLÜ AL tavsiyesini koruyor. Çift haneli hacim büyümesi ve e-ticaret lojistik avantajı kârlılığı artırıyor.',
    aiSentiment: 'POZİTİF',
    aiSentimentScore: 0.860,
    keyBullArguments: ['Hızlı mağaza genişlemesi ve online pazar payı', 'Negatif işletme sermayesi ile yüksek nakit üretimi'],
    keyBearRisks: ['Asgari ücret ve mağaza kira maliyet artışları']
  },
  {
    market: 'BIST',
    source: 'GARANTI_BBVA',
    sourceName: 'Garanti BBVA Yatırım',
    sourceUrl: 'https://www.garantibbvayatirim.com.tr',
    author: 'Garanti BBVA İçecek & Gıda Masası',
    ticker: 'CCOLA',
    assetName: 'Coca-Cola İçecek',
    title: 'CCOLA: Orta Asya Pazarlarında Güçlü Büyüme ve Yüksek FAVÖK Marjı',
    rawContent: 'Coca-Cola İçecek için hedef fiyatımız 82.50 TL ve tavsiyemiz GÜÇLÜ AL seviyesindedir. Kazakistan, Özbekistan ve Pakistan operasyonlarının sağladığı döviz bazlı satış büyümesi ve etkin hammadde hedging stratejisi şirketin FAVÖK marjını %22 seviyelerinde tutmaktadır.',
    recommendation: 'AL',
    targetPrice: 82.50,
    currentPriceAtReport: 61.55,
    upsidePct: 34.04,
    currency: 'TRY',
    publishDate: '2026-09-04T11:40:00Z',
    aiSummary: 'Garanti BBVA Yatırım, CCOLA için 82.50 TL hedef fiyat ve GÜÇLÜ AL tavsiyesini koruyor. Orta Asya pazarlarındaki çift haneli hacim artışı şirketi destekliyor.',
    aiSentiment: 'POZİTİF',
    aiSentimentScore: 0.850,
    keyBullArguments: ['Orta Asya ve Pakistan pazarlarında güçlü büyüme', 'Yüksek FAVÖK marjı ve sağlam döviz bilançosu'],
    keyBearRisks: ['Gelişmekte olan piyasalarda kur devalüasyonu']
  },

  // --- DEMİR-ÇELİK & MADENCİLİK ---
  {
    market: 'BIST',
    source: 'OYAK_YATIRIM',
    sourceName: 'Oyak Yatırım Araştırma',
    sourceUrl: 'https://www.oyakyatirim.com.tr',
    author: 'Oyak Yatırım Emtia Masası',
    ticker: 'KRDMD',
    assetName: 'Kardemir D Grubu',
    title: 'KRDMD: Katma Değerli Ürün Portföyü, Ray ve Tekerlek Üretimi Sinerjisi',
    rawContent: 'Kardemir D için 36.00 TL hedef fiyat ve AL tavsiyemizi sürdürüyoruz. Şirketin demiryolu rayı ve tekerleği gibi yüksek katma değerli çelik üretimindeki tekel konumu, inşaat demirine olan bağımlılığı azaltarak kârlılık tamponu sağlamaktadır.',
    recommendation: 'AL',
    targetPrice: 36.00,
    currentPriceAtReport: 27.50,
    upsidePct: 30.91,
    currency: 'TRY',
    publishDate: '2026-09-03T16:15:00Z',
    aiSummary: 'Oyak Yatırım, Kardemir D için 36 TL hedef fiyat ve AL önerisi veriyor. Demiryolu ray ve tekerlek üretimindeki katma değerli ürünler marjları koruyor.',
    aiSentiment: 'POZİTİF',
    aiSentimentScore: 0.790,
    keyBullArguments: ['Demiryolu rayı ve tekerleğinde Türkiye tekeli', 'Filyos Limanı lojistik maliyet avantajı'],
    keyBearRisks: ['Küresel çelik fiyatlarında baskı ve kömür maliyetleri']
  },
  {
    market: 'BIST',
    source: 'AK_YATIRIM',
    sourceName: 'Ak Yatırım Araştırma',
    sourceUrl: 'https://www.akyatirim.com.tr',
    author: 'Ak Yatırım Madencilik Analisti',
    ticker: 'KOZAL',
    assetName: 'Koza Altın İşletmeleri',
    title: 'KOZAL: Rekor Ons Altın Fiyatları ve Yeni Rezerv Arama Faaliyetleri',
    rawContent: 'Koza Altın için 32.00 TL hedef fiyat ve AL tavsiyemizi koruyoruz. Ons altın fiyatlarının 2.800 dolar üzerinde rekor kırması, şirketin nakit maliyetlerinin çok üzerinde bir ons başı operasyonel marj elde etmesini sağlayarak kârı katlamaktadır.',
    recommendation: 'AL',
    targetPrice: 32.00,
    currentPriceAtReport: 24.80,
    upsidePct: 29.03,
    currency: 'TRY',
    publishDate: '2026-09-02T15:00:00Z',
    aiSummary: 'Ak Yatırım, Koza Altın için 32 TL hedef fiyat ve AL önerisinde bulunuyor. Rekor seviyedeki altın fiyatları ve yüksek nakit pozisyonu kârlılığı artırıyor.',
    aiSentiment: 'POZİTİF',
    aiSentimentScore: 0.830,
    keyBullArguments: ['Rekor seviyedeki küresel ons altın fiyatları', 'Net nakit pozisyonu ve borçsuz bilanço'],
    keyBearRisks: ['Tenör düşüşü ve maden ruhsat izin süreçleri']
  },

  // --- 6. TEFAS: İŞ PORTFÖY, AK PORTFÖY, YAPI KREDİ PORTFÖY ---
  {
    market: 'TEFAS',
    source: 'IS_PORTFOY',
    sourceName: 'İş Portföy Yönetimi',
    sourceUrl: 'https://www.isportfoy.com.tr',
    author: 'İş Portföy Yatırım Komitesi',
    ticker: 'TCD',
    assetName: 'Tacirler Portföy Değişken Fon',
    title: 'Portföy Yönetici Görünümü: Değişken ve Hisse Fonlarında Dinamik Varlık Dağılımı',
    rawContent: 'İş Portföy aylık strateji bülteninde yayınlanan piyasa görünümünde, dezenflasyonist süreçte faiz getirilerinin düşüşe geçmesiyle birlikte hisse senedi yoğun ve çoklu varlık içeren değişken fonlara portföylerde %40-50 bandında ağırlık verilmesi önerilmektedir. Seçici hisse taşınan portföylerde özellikle ihracatçı sanayi ve yüksek temettü ödeyen kurumsal şirketlerin pozitif ayrışacağı vurgulanmaktadır.',
    recommendation: 'BULLISH',
    currency: 'TRY',
    publishDate: '2026-09-02T10:00:00Z',
    aiSummary: 'İş Portföy strateji notunda, düşen faiz ortamında hisse senedi ve değişken fon ağırlıklarının artırılması tavsiye ediliyor. İhracatçı sanayi şirketleri ile düzenli temettü ödeyen sağlam bilançolu hisselerin fon getirilerine liderlik edeceği öngörülüyor.',
    aiSentiment: 'POZİTİF',
    aiSentimentScore: 0.790,
    keyBullArguments: [
      'Düşen mevduat faizleriyle fonlara yönelen bireysel tasarruflar',
      'Dinamik varlık dağılımı ile hisse/tahvil getiri optimizasyonu',
      'Yüksek temettülü hisselerin defansif getiri katkısı'
    ],
    keyBearRisks: [
      'BIST endeks düzeltme dönemlerinde fon volatilitesi',
      'Stopaj ve mevzuat değişiklikleri'
    ]
  },
  {
    market: 'TEFAS',
    source: 'AK_PORTFOY',
    sourceName: 'Ak Portföy Yönetimi',
    sourceUrl: 'https://www.akportfoy.com.tr',
    author: 'Ak Portföy Araştırma & Strateji',
    ticker: 'AFA',
    assetName: 'Ak Portföy Amerika Yabancı Hisse Fonu',
    title: 'Küresel Portföy Bülteni: ABD Yapay Zeka ve Yarı İletken Fonlarında Trend Güçlü',
    rawContent: 'Ak Portföy küresel piyasalar görünüm raporunda, S&P 500 ve Nasdaq öncülüğünde teknoloji hisselerindeki üretken yapay zeka yatırım döngüsünün 2026-2027 yıllarında da kurumsal yazılım ve veri merkezi donanımı gelirlerine dönüşmeye devam edeceği belirtildi. Yabancı hisse fonlarında yarı iletken ve bulut bilişim şirketlerinin ana lokomotif kalacağı ifade edildi.',
    recommendation: 'BULLISH',
    currency: 'TRY',
    publishDate: '2026-09-01T14:30:00Z',
    aiSummary: 'Ak Portföy küresel fon bülteninde, üretken yapay zeka ve veri merkezi yatırımlarının yabancı hisse fonlarının performansını taşımayı sürdüreceği belirtiliyor. Yarı iletken ve bulut altyapı hisselerine odaklanan fonların pozitif momentumunu koruyacağı vurgulanıyor.',
    aiSentiment: 'POZİTİF',
    aiSentimentScore: 0.850,
    keyBullArguments: [
      'Yapay zeka altyapı ve hyperscaler harcamalarının sürmesi',
      'Kurumsal bulut dönüşümü ve veri merkezi talebi',
      'Döviz bazlı getiri koruması'
    ],
    keyBearRisks: [
      'Büyük teknoloji şirketlerinde yüksek çarpan değerleme baskısı',
      'ABD regülatif antitröst soruşturmaları'
    ]
  },

  // --- 7. ABD BORSALARI: BENZINGA, FINNHUB, MARKETWATCH, SEEKING ALPHA ---
  {
    market: 'US',
    source: 'BENZINGA',
    sourceName: 'Benzinga Analyst Ratings',
    sourceUrl: 'https://www.benzinga.com/analyst-ratings',
    author: 'Wedbush Securities (Dan Ives)',
    ticker: 'NVDA',
    assetName: 'NVIDIA Corporation',
    title: 'Wedbush Upgrades NVIDIA: Blackwell Mimarisi ve Veri Merkezi Harcamaları Hedefi Yükseltti',
    rawContent: 'Wedbush Securities analisti Dan Ives, Benzinga üzerinden aktarılan araştırma notunda NVIDIA için Outperform (Al) tavsiyesini sürdürürken hedef fiyatını 175.00 dolardan 195.00 dolara yükseltti. Blackwell Ultra çiplerinin teslimat takviminin hızlanması, büyük bulut sağlayıcılarının (Microsoft, Google, Meta) 2026 sermaye harcamalarını (CapEx) yukarı yönlü revize etmesi ve yazılım ekosistemindeki (CUDA) rakipsiz pazar hakimiyeti büyümenin ana motorları olarak gösterildi.',
    recommendation: 'AL',
    targetPrice: 195.00,
    currentPriceAtReport: 142.50,
    upsidePct: 36.84,
    currency: 'USD',
    publishDate: '2026-09-05T13:00:00Z',
    aiSummary: 'Wedbush analisti Dan Ives, NVIDIA için hedef fiyatını 195 dolara çıkardı. Blackwell Ultra teslimatlarının hızlanması ve hyperscaler bulut devlerinin yapay zeka yatırımlarını artırması hissenin gelir görünümünü güçlendiren birincil faktörler olarak öne çıkıyor.',
    aiSentiment: 'POZİTİF',
    aiSentimentScore: 0.920,
    keyBullArguments: [
      'Blackwell mimarisi çiplerine yönelik rekor talep ve siparişler',
      'Büyük teknoloji şirketlerinin yapay zeka CapEx bütçelerini artırması',
      'CUDA yazılım ekosisteminin yarattığı derin giriş engeli'
    ],
    keyBearRisks: [
      'Tayvan ve küresel dökümhane (TSMC) jeopolitik tedarik riskleri',
      'Çin pazarına yönelik olası yeni ABD ihracat kısıtlamaları'
    ]
  },
  {
    market: 'US',
    source: 'MARKETWATCH',
    sourceName: 'MarketWatch Analyst Corner',
    sourceUrl: 'https://www.marketwatch.com',
    author: 'Morgan Stanley Equity Research',
    ticker: 'AAPL',
    assetName: 'Apple Inc.',
    title: 'Morgan Stanley: Apple Intelligence Cihaz Değişim Döngüsünü Hızlandırıyor',
    rawContent: 'Morgan Stanley analistleri, MarketWatch değerlendirmesinde Apple için Overweight notunu koruyarak 275.00 dolar hedef fiyat belirledi. Cihaz içi üretken yapay zeka yeteneklerini içeren Apple Intelligence entegrasyonunun 1.5 milyarı aşkın aktif iPhone kullanıcısında son 4 yılın en büyük donanım yenileme döngüsünü tetikleyeceği ve hizmet (Services) gelirlerinde çift haneli marj büyümesini destekleyeceği öngörüldü.',
    recommendation: 'AL',
    targetPrice: 275.00,
    currentPriceAtReport: 228.00,
    upsidePct: 20.61,
    currency: 'USD',
    publishDate: '2026-09-04T15:30:00Z',
    aiSummary: 'Morgan Stanley, Apple için 275 dolar hedef fiyatla "Overweight" tavsiyesini yineledi. Apple Intelligence özelliklerinin geniş bir kullanıcı tabanında donanım yenileme döngüsünü tetikleyeceği ve yüksek marjlı servis gelirlerini artıracağı öngörülüyor.',
    aiSentiment: 'POZİTİF',
    aiSentimentScore: 0.770,
    keyBullArguments: [
      'Apple Intelligence ile tetiklenen güçlü iPhone yenileme döngüsü',
      'Yüksek marjlı Hizmetler (Services) gelirlerindeki düzenli büyüme',
      'Geniş nakit rezervi ve hisse geri alım programları'
    ],
    keyBearRisks: [
      'Avrupa Birliği DMA regülasyonları ve App Store komisyon baskısı',
      'Çin pazarındaki yerel rakiplerin pazar payı kazanımları'
    ]
  },
  {
    market: 'US',
    source: 'FINNHUB',
    sourceName: 'Finnhub News & Sentiment',
    sourceUrl: 'https://finnhub.io',
    author: 'Finnhub Kurumsal Analiz Konsensüsü',
    ticker: 'MSFT',
    assetName: 'Microsoft Corporation',
    title: 'Wall Street Konsensüsü: Azure Büyümesi ve Copilot Kurumsal Benimsenmesi',
    rawContent: 'Finnhub duyarlılık ve analist derecelendirme verilerine göre Microsoft hisseleri için 48 analistin konsensüs hedef fiyatı 520.00 dolar seviyesindedir (Güçlü Al). Azure bulut platformunun yapay zeka iş yüklerinde AWS karşısında pazar payı kazanması, kurumsal Office 365 Copilot lisanslarının ARR büyümesine katkısı ve siber güvenlik çözümlerindeki liderlik güven vermektedir.',
    recommendation: 'AL',
    targetPrice: 520.00,
    currentPriceAtReport: 435.00,
    upsidePct: 19.54,
    currency: 'USD',
    publishDate: '2026-09-05T11:00:00Z',
    aiSummary: 'Finnhub analist konsensüsüne göre Microsoft için 520 dolar ortalama hedef fiyat ve "Güçlü Al" tavsiyesi bulunuyor. Azure bulut büyümesi, kurumsal Copilot lisans gelirleri ve kurumsal siber güvenlik talebi pozitif görünümün temel direkleri.',
    aiSentiment: 'POZİTİF',
    aiSentimentScore: 0.860,
    keyBullArguments: [
      'Azure bulut gelirlerinde yapay zeka hızlandırıcılı büyüme',
      'Microsoft 365 Copilot kurumsal lisans penetrasyonu',
      'OpenAI stratejik ortaklığı ve çoklu kurumsal ürün entegrasyonu'
    ],
    keyBearRisks: [
      'Yüksek sermaye yatırımlarının (CapEx) kısa vadeli serbest nakit akışını törpülemesi',
      'Küresel BT bütçelerinde harcama optimizasyonu baskısı'
    ]
  },
  {
    market: 'US',
    source: 'SEEKING_ALPHA',
    sourceName: 'Seeking Alpha Analist Masası',
    sourceUrl: 'https://seekingalpha.com',
    author: 'Goldman Sachs & Seeking Alpha Contributors',
    ticker: 'TSLA',
    assetName: 'Tesla, Inc.',
    title: 'Analist Değerlendirmesi: Otonom Robotaksi ve Enerji Depolama Segmenti Ayrışıyor',
    rawContent: 'Seeking Alpha platformunda derlenen Goldman Sachs analist notuna göre Tesla için Nötr (TUT) tavsiyesi ve 245.00 dolar hedef fiyat verilmektedir. Elektrikli araç pazarında Çinli üreticilerin fiyat rekabeti otomotiv brüt marjlarını zorlarken, şirketin Megapack enerji depolama gelirlerindeki %120 artış ve Full Self-Driving (FSD) v13 testlerindeki ilerleme şirketi salt bir otomobil üreticisinden otonomi ve enerji devine dönüştürmektedir.',
    recommendation: 'TUT',
    targetPrice: 245.00,
    currentPriceAtReport: 218.00,
    upsidePct: 12.38,
    currency: 'USD',
    publishDate: '2026-09-04T18:15:00Z',
    aiSummary: 'Seeking Alpha analizlerine göre Tesla için 245 dolar hedef fiyat ve "TUT" tavsiyesi öne çıkıyor. Elektrikli araç segmentinde fiyat indirimleri ve marj baskısı sürerken, Megapack enerji depolama işi ve otonom sürüş (FSD) yatırımları uzun vadeli değeri destekliyor.',
    aiSentiment: 'NÖTR',
    aiSentimentScore: 0.150,
    keyBullArguments: [
      'Megapack enerji depolama çözümlerinde üç haneli ciro büyümesi',
      'FSD otonomi yazılımı ve Robotaxi filosu potansiyeli',
      'Optimus insansı robot projesi Ar-Ge ilerlemeleri'
    ],
    keyBearRisks: [
      'Elektrikli araç sektöründe küresel fiyat savaşı ve daralan marjlar',
      'Yüksek F/K çarpanı ve otonom regülasyon onay süreçleri'
    ]
  },

  // --- 8. KRİPTO: CRYPTOPANIC, COINDESK, LUNARCRUSH ---
  {
    market: 'CRYPTO',
    source: 'CRYPTOPANIC',
    sourceName: 'CryptoPanic Sentiment & Community',
    sourceUrl: 'https://cryptopanic.com',
    author: 'CryptoPanic Topluluk & Duyarlılık Konsensüsü',
    ticker: 'BTC',
    assetName: 'Bitcoin',
    title: 'CryptoPanic Topluluk Sentezi: Kurumsal ETF Girişleri ve Halving Sonrası Arz Şoku',
    rawContent: 'CryptoPanic API üzerinden toplanan 1.400 topluluk oyu ve haber akışında Bitcoin duyarlılığı %86 pozitif (Bullish) düzeyindedir. Spot Bitcoin ETF fonlarına BlackRock ve Fidelity öncülüğünde haftalık net 1.8 milyar dolar yeni sermaye girişi gerçekleşirken, borsalardaki likit BTC miktarının son 6 yılın en düşük seviyesine gerilemesi arz şokunu tetiklemektedir.',
    recommendation: 'BULLISH',
    targetPrice: 120000.00,
    currentPriceAtReport: 88500.00,
    upsidePct: 35.59,
    currency: 'USD',
    publishDate: '2026-09-05T16:00:00Z',
    aiSummary: 'CryptoPanic verilerine göre Bitcoin topluluk duyarlılığı %86 pozitif seyrediyor. Spot ETF kanalıyla süren kurumsal sermaye girişleri ve borsalardaki likit BTC rezervlerinin 6 yılın en düşük seviyesine gerilemesi güçlü bir arz şoku dinamizmi yaratıyor.',
    aiSentiment: 'POZİTİF',
    aiSentimentScore: 0.890,
    keyBullArguments: [
      'Kurumsal Spot ETF ihraççılarından düzenli net para girişi',
      'Borsalardaki satılabilir BTC arzının tarihi dip seviyede olması',
      'Merkez bankalarının gevşeme adımlarıyla artan küresel likidite'
    ],
    keyBearRisks: [
      'Makroekonomik jeopolitik gerginliklerdeki ani riskten kaçış satışları',
      'Madencilik zorluk seviyesi ve enerji regülasyon baskıları'
    ]
  },
  {
    market: 'CRYPTO',
    source: 'COINDESK',
    sourceName: 'CoinDesk Research',
    sourceUrl: 'https://www.coindesk.com',
    author: 'CoinDesk Araştırma Masası',
    ticker: 'ETH',
    assetName: 'Ethereum',
    title: 'CoinDesk Analizi: Layer-2 Aktivitesi ve Gerçek Dünya Varlıkları (RWA) Benimsemesi',
    rawContent: 'CoinDesk kıdemli piyasa analistlerinin teknik ve zincir üstü (on-chain) raporuna göre Ethereum için hedef bant 4.500 - 5.200 dolar olarak öngörülmektedir. Base, Arbitrum ve Optimism gibi Layer-2 ağlarında kilitli toplam değerin (TVL) rekor kırması ve BlackRock BUIDL fonu öncülüğünde ABD Hazine tahvillerinin Ethereum üzerinde tokenize edilmesi kurumsal güveni sağlamlaştırmaktadır.',
    recommendation: 'BULLISH',
    targetPrice: 4800.00,
    currentPriceAtReport: 3450.00,
    upsidePct: 39.13,
    currency: 'USD',
    publishDate: '2026-09-04T19:30:00Z',
    aiSummary: 'CoinDesk Research analizine göre Ethereum, Layer-2 ekosistemindeki rekor işlem hacimleri ve kurumsal RWA (Tokenize Hazine Bonoları) projelerinin ana üssü olması sayesinde 4.800 dolar hedef bandına doğru pozitif momentum sergiliyor.',
    aiSentiment: 'POZİTİF',
    aiSentimentScore: 0.820,
    keyBullArguments: [
      'Layer-2 ölçeklenme çözümlerinde rekor TVL ve işlem sayısı',
      'Kurumsal RWA (Real World Assets) tokenizasyon projelerinde liderlik',
      'Staking mekanizması ile piyasadan çekilen likit ETH arzı'
    ],
    keyBearRisks: [
      'Layer-1 ana ağ gas gelirlerindeki L2 kaynaklı düşüş',
      'Kripto regülasyonlarında staking getirilerine yönelik yasal belirsizlikler'
    ]
  },
  {
    market: 'CRYPTO',
    source: 'LUNARCRUSH',
    sourceName: 'LunarCrush Social Sentiment',
    sourceUrl: 'https://lunarcrush.com',
    author: 'LunarCrush Sosyal Zeka Algoritmaları',
    ticker: 'SOL',
    assetName: 'Solana',
    title: 'LunarCrush Sosyal Analizi: Geliştirici Etkileşimi ve DeFi Hacimlerinde Zirve',
    rawContent: 'LunarCrush sosyal medya duyarlılık endeksinde Solana için Galaxy Score 82/100 ile güçlü boğa sinyali vermektedir. X ve YouTube üzerinde Solana etiketli paylaşımlarda pozitif etkileşim oranı %78 olarak ölçülürken, DEX (Merkeziyetsiz Borsa) günlük işlem hacimlerinde Ethereum ana ağını geride bırakan performans ekosistem canlılığını kanıtlamaktadır.',
    recommendation: 'BULLISH',
    targetPrice: 260.00,
    currentPriceAtReport: 195.00,
    upsidePct: 33.33,
    currency: 'USD',
    publishDate: '2026-09-05T02:10:00Z',
    aiSummary: 'LunarCrush sosyal metriklerine göre Solana 82/100 Galaxy Score ile yüksek topluluk ilgisi çekiyor. DEX işlem hacimlerindeki güçlü seyir ve yüksek hızlı altyapı geliştirici katılımını artırarak 260 dolar hedefine destek veriyor.',
    aiSentiment: 'POZİTİF',
    aiSentimentScore: 0.840,
    keyBullArguments: [
      'DEX günlük hacimlerinde rekor kıran kullanıcı sayısı',
      'Firedancer istemcisi ile beklenen saniyede 1 milyon işlem kapasitesi',
      'Yüksek sosyal medya etkileşimi ve aktif cüzdan büyümesi'
    ],
    keyBearRisks: [
      'Ağda aşırı yük altında yaşanabilecek tıkanıklık riskleri',
      'Meme coin spekülasyonunun hacimlerdeki yüksek payı'
    ]
  }
];
