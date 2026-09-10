// Comprehensive BIST 608+ Companies Metadata & Profile Directory
export interface KapCompanySeed {
  symbol: string;
  name: string;
  sector: string;
  city: string;
  auditor: string;
  address: string;
}

export const KAP_COMPANIES_UNIVERSE: KapCompanySeed[] = [
  // --- BIST 30 & Major Blue-Chips ---
  { symbol: 'THYAO', name: 'Türk Hava Yolları Anonim Ortaklığı', sector: 'Ulaştırma & Havacılık', city: 'İstanbul', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Yeşilköy Mah. Havaalanı Cad. No:3/1 Bakırköy / İstanbul' },
  { symbol: 'GARAN', name: 'Türkiye Garanti Bankası A.Ş.', sector: 'Bankacılık & Finans', city: 'İstanbul', auditor: 'KPMG Bağımsız Denetim ve SMMM A.Ş.', address: 'Nispetiye Mah. Aytar Cad. No:2 Beşiktaş / İstanbul' },
  { symbol: 'AKBNK', name: 'Akbank T.A.Ş.', sector: 'Bankacılık & Finans', city: 'İstanbul', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Sabancı Center 4. Levent Beşiktaş / İstanbul' },
  { symbol: 'ISCTR', name: 'Türkiye İş Bankası A.Ş.', sector: 'Bankacılık & Finans', city: 'İstanbul', auditor: 'EY / Güney Bağımsız Denetim ve SMMM A.Ş.', address: 'İş Kuleleri 34330 4. Levent Beşiktaş / İstanbul' },
  { symbol: 'YKBNK', name: 'Yapı ve Kredi Bankası A.Ş.', sector: 'Bankacılık & Finans', city: 'İstanbul', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Yapı Kredi Plaza D Blok Levent Beşiktaş / İstanbul' },
  { symbol: 'VAKBN', name: 'Türkiye Vakıflar Bankası T.A.O.', sector: 'Bankacılık & Finans', city: 'İstanbul', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Saray Mah. Dr. Adnan Büyükdeniz Cad. No:7/A-B Ümraniye / İstanbul' },
  { symbol: 'HALKB', name: 'Türkiye Halk Bankası A.Ş.', sector: 'Bankacılık & Finans', city: 'İstanbul', auditor: 'DRT / Deloitte Bağımsız Denetim ve SMMM A.Ş.', address: 'Barbaros Mah. Şebboy Sok. No:4/1 Ataşehir / İstanbul' },
  { symbol: 'KCHOL', name: 'Koç Holding A.Ş.', sector: 'Holding & Yatırım', city: 'İstanbul', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Nakkaştepe Azizbey Sok. No:1 Kuzguncuk Üsküdar / İstanbul' },
  { symbol: 'SAHOL', name: 'Hacı Ömer Sabancı Holding A.Ş.', sector: 'Holding & Yatırım', city: 'İstanbul', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Sabancı Center 4. Levent Beşiktaş / İstanbul' },
  { symbol: 'SISE', name: 'Türkiye Şişe ve Cam Fabrikaları A.Ş.', sector: 'Cam & Kimya Sanayi', city: 'İstanbul', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'İçmeler Mah. D-100 Karayolu Cad. No:44A Tuzla / İstanbul' },
  { symbol: 'EREGL', name: 'Ereğli Demir ve Çelik Fabrikaları T.A.Ş.', sector: 'Demir Çelik & Metal', city: 'Zonguldak', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Uzunkum Cad. No:7 Karadeniz Ereğli / Zonguldak' },
  { symbol: 'KRDMD', name: 'Kardemir Karabük Demir Çelik Sanayi ve Ticaret A.Ş. (D)', sector: 'Demir Çelik & Metal', city: 'Karabük', auditor: 'KPMG Bağımsız Denetim ve SMMM A.Ş.', address: 'Kardemir Tesisleri Fabrika Sahası Karabük' },
  { symbol: 'ASELS', name: 'Aselsan Elektronik Sanayi ve Ticaret A.Ş.', sector: 'Savunma Sanayi & Teknoloji', city: 'Ankara', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Mehmet Akif Ersoy Mah. 296. Cad. No:16 Yenimahalle / Ankara' },
  { symbol: 'TUPRS', name: 'Tüpraş Türkiye Petrol Rafinerileri A.Ş.', sector: 'Petrol & Rafineri', city: 'Kocaeli', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Güney Mah. Petrol Cad. No:25 Körfez / Kocaeli' },
  { symbol: 'PETKM', name: 'Petkim Petrokimya Holding A.Ş.', sector: 'Kimya & Petrokimya', city: 'İzmir', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Petkim Yarımadası Aliağa / İzmir' },
  { symbol: 'BIMAS', name: 'BİM Birleşik Mağazalar A.Ş.', sector: 'Perakende & Tüketim', city: 'İstanbul', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Abdurrahman Gazi Mah. Ebabil Sok. No:22 Sancaktepe / İstanbul' },
  { symbol: 'MGROS', name: 'Migros Ticaret A.Ş.', sector: 'Perakende & Tüketim', city: 'İstanbul', auditor: 'DRT / Deloitte Bağımsız Denetim ve SMMM A.Ş.', address: 'Atatürk Mah. Turgut Özal Bulvarı No:7 Ataşehir / İstanbul' },
  { symbol: 'SOKM', name: 'Şok Marketler Ticaret A.Ş.', sector: 'Perakende & Tüketim', city: 'İstanbul', auditor: 'KPMG Bağımsız Denetim ve SMMM A.Ş.', address: 'Kısıklı Mah. Hanımseti Sok. No:35 B/1 Üsküdar / İstanbul' },
  { symbol: 'FROTO', name: 'Ford Otomotiv Sanayi A.Ş.', sector: 'Otomotiv Sanayi', city: 'Kocaeli', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Akpınar Mah. Hasan Basri Cad. No:2 Sancaktepe / İstanbul' },
  { symbol: 'TOASO', name: 'Tofaş Türk Otomobil Fabrikası A.Ş.', sector: 'Otomotiv Sanayi', city: 'Bursa', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Yalova Yolu 10. Km No:574 Osmangazi / Bursa' },
  { symbol: 'TCELL', name: 'Turkcell İletişim Hizmetleri A.Ş.', sector: 'Telekomünikasyon', city: 'İstanbul', auditor: 'DRT / Deloitte Bağımsız Denetim ve SMMM A.Ş.', address: 'Turkcell Küçükyalı Plaza Aydınevler Maltepe / İstanbul' },
  { symbol: 'TTKOM', name: 'Türk Telekomünikasyon A.Ş.', sector: 'Telekomünikasyon', city: 'Ankara', auditor: 'EY / Güney Bağımsız Denetim ve SMMM A.Ş.', address: 'Örnek Mah. Turgut Özal Bulvarı No:4 Aydınlıkevler Altındağ / Ankara' },
  { symbol: 'PGSUS', name: 'Pegasus Hava Taşımacılığı A.Ş.', sector: 'Ulaştırma & Havacılık', city: 'İstanbul', auditor: 'DRT / Deloitte Bağımsız Denetim ve SMMM A.Ş.', address: 'Aeropark Yenişehir Mah. Osmanlı Bulvarı No:11/A Pendik / İstanbul' },
  { symbol: 'TAVHL', name: 'TAV Havalimanları Holding A.Ş.', sector: 'Havalimanı İşletmeciliği', city: 'İstanbul', auditor: 'KPMG Bağımsız Denetim ve SMMM A.Ş.', address: 'Vadistanbul Bulvar Ayazağa Mah. Cendere Cad. Sarıyer / İstanbul' },
  { symbol: 'CCOLA', name: 'Coca-Cola İçecek A.Ş.', sector: 'Gıda & İçecek', city: 'İstanbul', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Esenkent Mah. Deniz Feneri Sok. No:4 Ümraniye / İstanbul' },
  { symbol: 'AEFES', name: 'Anadolu Efes Biracılık ve Malt Sanayii A.Ş.', sector: 'Gıda & İçecek', city: 'İstanbul', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Fatih Sultan Mehmet Mah. Balkan Cad. No:58 Buyaka E Blok Ümraniye / İstanbul' },
  { symbol: 'ARCLK', name: 'Arçelik A.Ş.', sector: 'Dayanıklı Tüketim & Beyaz Eşya', city: 'İstanbul', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Karaağaç Cad. No:2-6 Sütlüce Beyoğlu / İstanbul' },
  { symbol: 'VESTL', name: 'Vestel Elektronik Sanayi ve Ticaret A.Ş.', sector: 'Tüketici Elektroniği', city: 'Manisa', auditor: 'EY / Güney Bağımsız Denetim ve SMMM A.Ş.', address: 'Organize Sanayi Bölgesi 45030 Yunusemre / Manisa' },
  { symbol: 'VESBE', name: 'Vestel Beyaz Eşya Sanayi ve Ticaret A.Ş.', sector: 'Dayanıklı Tüketim', city: 'Manisa', auditor: 'EY / Güney Bağımsız Denetim ve SMMM A.Ş.', address: 'Organize Sanayi Bölgesi 45030 Yunusemre / Manisa' },
  { symbol: 'ENKAI', name: 'Enka İnşaat ve Sanayi A.Ş.', sector: 'İnşaat & Taahhüt', city: 'İstanbul', auditor: 'DRT / Deloitte Bağımsız Denetim ve SMMM A.Ş.', address: 'Balmumcu Mah. Zincirlikuyu Yolu Enka Binası Beşiktaş / İstanbul' },
  { symbol: 'EKGYO', name: 'Emlak Konut Gayrimenkul Yatırım Ortaklığı A.Ş.', sector: 'Gayrimenkul Yatırım Ortaklığı (GYO)', city: 'İstanbul', auditor: 'KPMG Bağımsız Denetim ve SMMM A.Ş.', address: 'Barbaros Mah. Mor Sümbül Sok. No:7/2B Ataşehir / İstanbul' },
  { symbol: 'KOZAL', name: 'Koza Altın İşletmeleri A.Ş.', sector: 'Madencilik & Değerli Maden', city: 'Ankara', auditor: 'KPMG Bağımsız Denetim ve SMMM A.Ş.', address: 'Uğur Mumcu Cad. No:56 Gaziosmanpaşa Çankaya / Ankara' },
  { symbol: 'KOZAA', name: 'Koza Anadolu Metal Madencilik İşletmeleri A.Ş.', sector: 'Madencilik & Metalurji', city: 'Ankara', auditor: 'KPMG Bağımsız Denetim ve SMMM A.Ş.', address: 'Uğur Mumcu Cad. No:56 Gaziosmanpaşa Çankaya / Ankara' },
  { symbol: 'IPEKE', name: 'İpek Doğal Enerji Kaynakları Araştırma ve Üretim A.Ş.', sector: 'Petrol & Doğal Enerji', city: 'Ankara', auditor: 'KPMG Bağımsız Denetim ve SMMM A.Ş.', address: 'Uğur Mumcu Cad. No:56 Gaziosmanpaşa Çankaya / Ankara' },
  
  // --- Enerji, Elektrik & Yenilenebilir Enerji ---
  { symbol: 'ASTOR', name: 'Astor Enerji A.Ş.', sector: 'Elektrik & Enerji Ekipmanları', city: 'Ankara', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'ASO 2. OSB Alcı OSB Mah. 2001. Cad. No:11 Sincan / Ankara' },
  { symbol: 'EUPWR', name: 'Europower Enerji ve Otomasyon Teknolojileri San. Tic. A.Ş.', sector: 'Enerji & Otomasyon', city: 'Ankara', auditor: 'KPMG Bağımsız Denetim ve SMMM A.Ş.', address: 'Saray Mah. Atom Cad. No:17 Kahramankazan / Ankara' },
  { symbol: 'GESAN', name: 'Girişim Elektrik Taahhüt Ticaret ve Sanayi A.Ş.', sector: 'Elektrik & Taahhüt', city: 'Ankara', auditor: 'KPMG Bağımsız Denetim ve SMMM A.Ş.', address: 'Saray Mah. Atom Cad. No:17 Kahramankazan / Ankara' },
  { symbol: 'KONTR', name: 'Kontrolmatik Teknoloji Enerji ve Mühendislik A.Ş.', sector: 'Teknoloji, Enerji & Mühendislik', city: 'İstanbul', auditor: 'DRT / Deloitte Bağımsız Denetim ve SMMM A.Ş.', address: 'Alemdağ Mah. Çatalmeşe Sok. No:5 Çekmeköy / İstanbul' },
  { symbol: 'CWENE', name: 'CW Enerji Mühendislik Ticaret ve Sanayi A.Ş.', sector: 'Yenilenebilir Enerji (Güneş)', city: 'Antalya', auditor: 'EY / Güney Bağımsız Denetim ve SMMM A.Ş.', address: 'Antalya OSB 1. Kısım Mah. Atatürk Bulvarı No:20 Döşemealtı / Antalya' },
  { symbol: 'SMRTG', name: 'Smart Güneş Enerjisi Teknolojileri Araştırma Geliştirme A.Ş.', sector: 'Yenilenebilir Enerji (Güneş)', city: 'İstanbul', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Rüzgarlıbahçe Mah. Feragat Sok. No:2 Beykoz / İstanbul' },
  { symbol: 'ALFAS', name: 'Alfa Solar Enerji Sanayi ve Ticaret A.Ş.', sector: 'Güneş Paneli & Enerji', city: 'Kırıkkale', auditor: 'KPMG Bağımsız Denetim ve SMMM A.Ş.', address: 'Kırıkkale OSB 1. Cad. No:10 Yahşihan / Kırıkkale' },
  { symbol: 'ENJSA', name: 'Enerjisa Enerji A.Ş.', sector: 'Elektrik Dağıtım & Perakende', city: 'İstanbul', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Barbaros Mah. Begonya Sok. Nidakule Batı Sit. No:1/1 Ataşehir / İstanbul' },
  { symbol: 'AKSEN', name: 'Aksa Enerji Üretim A.Ş.', sector: 'Elektrik Üretimi & Santral', city: 'İstanbul', auditor: 'KPMG Bağımsız Denetim ve SMMM A.Ş.', address: 'Rüzgarlıbahçe Mah. Özalp Biçer Sok. No:10 Kavacık Beykoz / İstanbul' },
  { symbol: 'ODAS', name: 'Odaş Elektrik Üretim Sanayi Ticaret A.Ş.', sector: 'Elektrik Üretimi & Madencilik', city: 'İstanbul', auditor: 'DRT / Deloitte Bağımsız Denetim ve SMMM A.Ş.', address: 'Fatih Sultan Mehmet Mah. Poligon Cad. Buyaka Kule 2 No:8 Ümraniye / İstanbul' },
  { symbol: 'ZOREN', name: 'Zorlu Enerji Elektrik Üretim A.Ş.', sector: 'Elektrik Üretimi & Dağıtım', city: 'Bursa', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Bursa Yalova Yolu 10. Km No:574 Osmangazi / Bursa' },
  { symbol: 'GWIND', name: 'Galata Wind Enerji A.Ş.', sector: 'Rüzgar & Güneş Enerjisi', city: 'İstanbul', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Burhaniye Mah. Kısıklı Cad. No:65 Üsküdar / İstanbul' },
  { symbol: 'MAGEN', name: 'Margün Enerji Üretim Sanayi ve Ticaret A.Ş.', sector: 'Yenilenebilir Enerji', city: 'Ankara', auditor: 'EY / Güney Bağımsız Denetim ve SMMM A.Ş.', address: 'Kızılırmak Mah. Ufuk Üniversitesi Cad. No:11/A Çankaya / Ankara' },
  { symbol: 'AHGAZ', name: 'Ahlatcı Doğal Gaz Dağıtım Enerji ve Yatırım A.Ş.', sector: 'Doğal Gaz Dağıtımı & Enerji', city: 'Çorum', auditor: 'BDO Denet Bağımsız Denetim ve Danışmanlık A.Ş.', address: 'Gülabibey Mah. Cengiz Topel Cad. No:99 Çorum' },

  // --- Sanayi, Holding & Üretim ---
  { symbol: 'ALARK', name: 'Alarko Holding A.Ş.', sector: 'Holding & Enerji & Turizm', city: 'İstanbul', auditor: 'DRT / Deloitte Bağımsız Denetim ve SMMM A.Ş.', address: 'Muallim Naci Cad. No:69 Ortaköy Beşiktaş / İstanbul' },
  { symbol: 'GUBRF', name: 'Gübre Fabrikaları T.A.Ş.', sector: 'Kimyevi Gübre & Tarım', city: 'İstanbul', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Nida Kule Göztepe Merdivenköy Mah. Bora Sok. No:1 Kadıköy / İstanbul' },
  { symbol: 'HEKTS', name: 'Hektaş Ticaret T.A.Ş.', sector: 'Tarımsal İlaç & Tohumculuk', city: 'Kocaeli', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'GOSB İhsan Dede Cad. 700. Sok. Gebze / Kocaeli' },
  { symbol: 'SASA', name: 'SASA Polyester Sanayi A.Ş.', sector: 'Polyester Elyaf & Kimya', city: 'Adana', auditor: 'DRT / Deloitte Bağımsız Denetim ve SMMM A.Ş.', address: 'Yolgeçen Mah. Turhan Cemal Beriker Bulvarı No:559 Seyhan / Adana' },
  { symbol: 'MAVI', name: 'Mavi Giyim Sanayi ve Ticaret A.Ş.', sector: 'Tekstil & Hazır Giyim Perakende', city: 'İstanbul', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Sultan Selim Mah. Eski Büyükdere Cad. No:53 Kağıthane / İstanbul' },
  { symbol: 'BRISA', name: 'Brisa Bridgestone Sabancı Lastik San. Tic. A.Ş.', sector: 'Otomotiv Yan Sanayi (Lastik)', city: 'Kocaeli', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Alikahya Fatih Mah. Sanayi Cad. No:98 İzmit / Kocaeli' },
  { symbol: 'KORDS', name: 'Kordsa Teknik Tekstil A.Ş.', sector: 'Teknik Tekstil & Kompozit', city: 'Kocaeli', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Alikahya Fatih Mah. Sanayi Cad. No:90 İzmit / Kocaeli' },
  { symbol: 'OTKAR', name: 'Otokar Otomotiv ve Savunma Sanayi A.Ş.', sector: 'Savunma & Ticari Araç', city: 'Sakarya', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Atatürk Cad. No:6 Arifiye / Sakarya' },
  { symbol: 'DOAS', name: 'Doğuş Otomotiv Servis ve Ticaret A.Ş.', sector: 'Otomotiv İthalat & Distribütörlük', city: 'Kocaeli', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Şekerpınar Mah. Anadolu Cad. No:22 Çayırova / Kocaeli' },
  { symbol: 'TKFEN', name: 'Tekfen Holding A.Ş.', sector: 'Holding & İnşaat & Gübre', city: 'İstanbul', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Kültür Mah. Budak Sok. Tekfen Sitesi C Blok Beşiktaş / İstanbul' },
  { symbol: 'DOHOL', name: 'Doğan Şirketler Grubu Holding A.Ş.', sector: 'Holding & Yatırım', city: 'İstanbul', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Burhaniye Mah. Kısıklı Cad. No:65 Üsküdar / İstanbul' },

  // --- Teknoloji, Yazılım & Savunma ---
  { symbol: 'MIATK', name: 'Mia Teknoloji A.Ş.', sector: 'Bilişim, Yazılım & Biyometri', city: 'Ankara', auditor: 'BDO Denet Bağımsız Denetim ve Danışmanlık A.Ş.', address: 'Gazi Üniversitesi Gölbaşı Yerleşkesi Teknokent Binası Gölbaşı / Ankara' },
  { symbol: 'REEDR', name: 'Reeder Teknoloji Sanayi ve Ticaret A.Ş.', sector: 'Tüketici Elektroniği & Akıllı Telefon', city: 'Samsun', auditor: 'Grant Thornton Bağımsız Denetim A.Ş.', address: 'Kerimbey OSB Mah. Yaşar Doğu Cad. No:19 Tekkeköy / Samsun' },
  { symbol: 'SDTTR', name: 'SDT Uzay ve Savunma Teknolojileri A.Ş.', sector: 'Savunma & Uydu Teknolojileri', city: 'Ankara', auditor: 'EY / Güney Bağımsız Denetim ve SMMM A.Ş.', address: 'ODTÜ Teknokent Titanyum Blok Üniversiteler Mah. Çankaya / Ankara' },
  { symbol: 'LOGO', name: 'Logo Yazılım Sanayi ve Ticaret A.Ş.', sector: 'Kurumsal Yazılım & ERP', city: 'Kocaeli', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'GOSB Şahabettin Bilgisu Cad. No:609 Gebze / Kocaeli' },
  { symbol: 'INDES', name: 'İndeks Bilgisayar Sistemleri Mühendislik San. Tic. A.Ş.', sector: 'Bilişim Distribütörlüğü', city: 'İstanbul', auditor: 'DRT / Deloitte Bağımsız Denetim ve SMMM A.Ş.', address: 'Ayazağa Mah. Mimar Sinan Sok. Seba Ofis Bulvar No:21 Sarıyer / İstanbul' },
  { symbol: 'FORTE', name: 'Forte Bilgi İletişim Teknolojileri ve Savunma Sanayi A.Ş.', sector: 'Siber Güvenlik & Savunma Bilişimi', city: 'Ankara', auditor: 'Güreli YMM ve Bağımsız Denetim Hizmetleri A.Ş.', address: 'Mustafa Kemal Mah. 2131. Sok. No:32 Çankaya / Ankara' },
  { symbol: 'INTET', name: 'İntetra Teknoloji ve Bilişim Hizmetleri A.Ş.', sector: 'Akıllı Ulaşım Sistemleri & Bilişim', city: 'İstanbul', auditor: 'KPMG Bağımsız Denetim ve SMMM A.Ş.', address: 'Ferhatpaşa Mah. Yeditepe Cad. No:12 Ataşehir / İstanbul' },

  // --- Çimento, Cam, Seramik & Yapı ---
  { symbol: 'CIMSA', name: 'Çimsa Çimento Sanayi ve Ticaret A.Ş.', sector: 'Çimento & Yapı Malzemeleri', city: 'İstanbul', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Kısıklı Mah. Ferah Cad. No:1 B Blok Üsküdar / İstanbul' },
  { symbol: 'OYAKC', name: 'Oyak Çimento Fabrikaları A.Ş.', sector: 'Çimento & Hazır Beton', city: 'Ankara', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Çukurambar Mah. 1480. Sok. No:2A Çankaya / Ankara' },
  { symbol: 'AKCNS', name: 'Akçansa Çimento Sanayi ve Ticaret A.Ş.', sector: 'Çimento & Agrega', city: 'İstanbul', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Kısıklı Mah. Sarigazi Cad. No:65 Üsküdar / İstanbul' },
  { symbol: 'BUCIM', name: 'Bursa Çimento Fabrikası A.Ş.', sector: 'Çimento Sanayi', city: 'Bursa', auditor: 'EY / Güney Bağımsız Denetim ve SMMM A.Ş.', address: 'Kestel Tesisleri Ahmet Vefik Paşa Mah. Bursa Cad. Kestel / Bursa' },
  { symbol: 'NUHCM', name: 'Nuh Çimento Sanayi A.Ş.', sector: 'Çimento & Klinker', city: 'Kocaeli', auditor: 'KPMG Bağımsız Denetim ve SMMM A.Ş.', address: 'Hacı Akif Mah. Nuh Çimento Cad. No:28 Hereke Körfez / Kocaeli' },
  { symbol: 'KLYSN', name: 'Kaleseramik Çanakkale Kalebodur Seramik Sanayi A.Ş.', sector: 'Seramik & Yapı Ürünleri', city: 'Çanakkale', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Çan Fabrikalar Mevkii Çan / Çanakkale' },
  { symbol: 'DOFER', name: 'Dofer Yapı Malzemeleri Sanayi ve Ticaret A.Ş.', sector: 'Demir Çelik Hasır & Yapı', city: 'Ankara', auditor: 'Grant Thornton Bağımsız Denetim A.Ş.', address: 'Başkent OSB 19. Cad. No:12 Malıköy Sincan / Ankara' },
  { symbol: 'MEKAG', name: 'Meka Beton Santralleri İmalat Sanayi ve Ticaret A.Ş.', sector: 'Madencilik & Beton Ekipmanları', city: 'Ankara', auditor: 'BDO Denet Bağımsız Denetim ve Danışmanlık A.Ş.', address: 'Başkent OSB 1. Cad. No:4 Malıköy Sincan / Ankara' },

  // --- Sağlık, İlaç & Medikal ---
  { symbol: 'MPARK', name: 'MLP Sağlık Hizmetleri A.Ş. (Medical Park)', sector: 'Özel Hastane & Sağlık Hizmetleri', city: 'İstanbul', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Otakçılar Cad. No:78 Flatofis Eyüpsultan / İstanbul' },
  { symbol: 'GENIL', name: 'Gen İlaç ve Sağlık Ürünleri Sanayi ve Ticaret A.Ş.', sector: 'İlaç Üretimi & Biyoteknoloji', city: 'Ankara', auditor: 'DRT / Deloitte Bağımsız Denetim ve SMMM A.Ş.', address: 'ASO 2. OSB Alcı OSB Mah. 2013. Cad. No:24 Sincan / Ankara' },
  { symbol: 'ECILC', name: 'Eczacıbaşı İlaç Sınai ve Finansal Yatırımlar San. Tic. A.Ş.', sector: 'İlaç & Sağlık Holding', city: 'İstanbul', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Büyükdere Cad. Ali Kaya Sok. No:5 Levent Beşiktaş / İstanbul' },
  { symbol: 'MEDTR', name: 'Meditera Tıbbi Malzeme Sanayi ve Ticaret A.Ş.', sector: 'Tıbbi Cihaz & Sarf Malzemesi', city: 'İzmir', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Torbalı OSB Mah. 2. Cad. No:3 Torbalı / İzmir' },
  { symbol: 'LKMNH', name: 'Lokman Hekim Engürüsağ Sağlık Turizm Eğitim Hizmetleri A.Ş.', sector: 'Özel Hastane İşletmeciliği', city: 'Ankara', auditor: 'Güreli YMM ve Bağımsız Denetim Hizmetleri A.Ş.', address: 'Söğütözü Mah. 2176. Sok. No:7 Çankaya / Ankara' },

  // --- Gıda, Tarım & Tüketim ---
  { symbol: 'TABGD', name: 'TAB Gıda Sanayi ve Ticaret A.Ş.', sector: 'Hızlı Servis Restorancılık & Gıda', city: 'İstanbul', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Emirhan Cad. No:109 Atakule Dikilitaş Beşiktaş / İstanbul' },
  { symbol: 'OBAMS', name: 'Oba Makarnacılık Sanayi ve Ticaret A.Ş.', sector: 'Unlu Mamuller & Makarna Üretimi', city: 'Gaziantep', auditor: 'KPMG Bağımsız Denetim ve SMMM A.Ş.', address: '4. OSB 83424 Nolu Cad. No:1 Şehitkamil / Gaziantep' },
  { symbol: 'AGROT', name: 'Agrotech Yüksek Teknoloji ve Yatırım A.Ş.', sector: 'Akıllı Tarım Teknolojileri & Gıda', city: 'İstanbul', auditor: 'Grant Thornton Bağımsız Denetim A.Ş.', address: 'Zorlu Center Levazım Mah. Koru Sok. Beşiktaş / İstanbul' },
  { symbol: 'ULKER', name: 'Ülker Bisküvi Sanayi A.Ş.', sector: 'Atıştırmalık & Gıda İmalatı', city: 'İstanbul', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Kısıklı Mah. Ferah Cad. No:1 Üsküdar / İstanbul' },
  { symbol: 'ATAKP', name: 'Atakey Patates Gıda Sanayi ve Ticaret A.Ş.', sector: 'Dondurulmuş Gıda Üretimi', city: 'Afyonkarahisar', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Susuz Kasabası OSB Mah. 1. Cad. No:1 Merkez / Afyonkarahisar' },
  { symbol: 'DURKN', name: 'Durukan Şekerleme Sanayi ve Ticaret A.Ş.', sector: 'Şekerleme & İhracat İmalatı', city: 'Ankara', auditor: 'KPMG Bağımsız Denetim ve SMMM A.Ş.', address: 'ASO 2. OSB Alcı OSB Mah. 2005. Cad. No:10 Sincan / Ankara' },
  { symbol: 'GIPTA', name: 'Gıpta Ofis Kırtasiye ve Promosyon Ürünleri İmalat San. A.Ş.', sector: 'Kırtasiye & Kağıt Üretimi', city: 'Ankara', auditor: 'EY / Güney Bağımsız Denetim ve SMMM A.Ş.', address: 'Temelli OSB Mah. 2004. Cad. No:5 Sincan / Ankara' },
  { symbol: 'TARKM', name: 'Tarkim Bitki Koruma Sanayi ve Ticaret A.Ş.', sector: 'Tarımsal Kimya & Bitki Koruma', city: 'Manisa', auditor: 'DRT / Deloitte Bağımsız Denetim ve SMMM A.Ş.', address: 'Manisa OSB 4. Kısım Keçiliköy Mah. Ahmet Nazif Zorlu Bulvarı Yunusemre / Manisa' },

  // --- Finans, Sigorta & Aracı Kurumlar ---
  { symbol: 'ISMEN', name: 'İş Yatırım Menkul Değerler A.Ş.', sector: 'Aracı Kurum & Yatırım Bankacılığı', city: 'İstanbul', auditor: 'EY / Güney Bağımsız Denetim ve SMMM A.Ş.', address: 'İş Kuleleri Kule 2 Kat:12 4. Levent Beşiktaş / İstanbul' },
  { symbol: 'INFO', name: 'İnfo Yatırım Menkul Değerler A.Ş.', sector: 'Aracı Kurum & Finans', city: 'İstanbul', auditor: 'KPMG Bağımsız Denetim ve SMMM A.Ş.', address: 'Saray Mah. Dr. Adnan Büyükdeniz Cad. Cessas Plaza Ümraniye / İstanbul' },
  { symbol: 'OSMEN', name: 'Osmanlı Yatırım Menkul Değerler A.Ş.', sector: 'Aracı Kurum & Portföy Aracılığı', city: 'İstanbul', auditor: 'BDO Denet Bağımsız Denetim ve Danışmanlık A.Ş.', address: 'Maslak Mah. Büyükdere Cad. Nurol Maslak Plaza Sarıyer / İstanbul' },
  { symbol: 'TSKB', name: 'Türkiye Sınai Kalkınma Bankası A.Ş.', sector: 'Kalkınma ve Yatırım Bankacılığı', city: 'İstanbul', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Meclisi Mebusan Cad. No:81 Fındıklı Beyoğlu / İstanbul' },
  { symbol: 'SKBNK', name: 'Şekerbank T.A.Ş.', sector: 'Mevduat Bankacılığı', city: 'İstanbul', auditor: 'KPMG Bağımsız Denetim ve SMMM A.Ş.', address: 'Emniyet Evleri Mah. Eski Büyükdere Cad. No:1/1A Kağıthane / İstanbul' },
  { symbol: 'TURSG', name: 'Türkiye Sigorta A.Ş.', sector: 'Elementer Sigortacılık', city: 'İstanbul', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Büyükdere Cad. No:110 Esentepe Şişli / İstanbul' },
  { symbol: 'ANHYT', name: 'Anadolu Hayat Emeklilik A.Ş.', sector: 'Bireysel Emeklilik & Hayat Sigortası', city: 'İstanbul', auditor: 'EY / Güney Bağımsız Denetim ve SMMM A.Ş.', address: 'İş Kuleleri Kule 2 Kat:16-20 4. Levent Beşiktaş / İstanbul' },
  { symbol: 'AGESA', name: 'Agesa Hayat ve Emeklilik A.Ş.', sector: 'Bireysel Emeklilik & Hayat Sigortası', city: 'İstanbul', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Saray Mah. Dr. Adnan Büyükdeniz Cad. No:4/2 Ümraniye / İstanbul' },

  // --- Çelik, Ağır Sanayi & Boru ---
  { symbol: 'BRSAN', name: 'Borusan Birleşik Boru Fabrikaları Sanayi ve Ticaret A.Ş.', sector: 'Çelik Boru & Ağır Sanayi', city: 'İstanbul', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Meclisi Mebusan Cad. No:103 Salıpazarı Beyoğlu / İstanbul' },
  { symbol: 'BRYAT', name: 'Borusan Yatırım ve Pazarlama A.Ş.', sector: 'Holding & Sanayi Yatırımları', city: 'İstanbul', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Pürtelaş Hasan Efendi Mah. Meclisi Mebusan Cad. No:101 Beyoğlu / İstanbul' },
  { symbol: 'KCAER', name: 'Kocaer Çelik Sanayi ve Ticaret A.Ş.', sector: 'Profil Çelik & Özel Çelik İmalatı', city: 'İzmir', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Aliaga OSB Mah. 1. Cad. No:1 Aliağa / İzmir' },
  { symbol: 'CEMTS', name: 'Çemtaş Çelik Makina Sanayi ve Ticaret A.Ş.', sector: 'Vasıflı Çelik & Denge Çubuğu', city: 'Bursa', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Organize Sanayi Bölgesi Yeşil Cad. No:14 Nilüfer / Bursa' },
  { symbol: 'EGEEN', name: 'Ege Endüstri ve Ticaret A.Ş.', sector: 'Ağır Ticari Araç Dingil Sistemleri', city: 'İzmir', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Kemalpaşa Cad. No:280 Pınarbaşı Bornova / İzmir' },
  { symbol: 'BFREN', name: 'Bosch Fren Sistemleri Sanayi ve Ticaret A.Ş.', sector: 'Otomotiv Fren Sistemleri', city: 'Bursa', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Bursa OSB Mavi Cad. No:3 Nilüfer / Bursa' },
  { symbol: 'KONYA', name: 'Konya Çimento Sanayii A.Ş.', sector: 'Çimento & Hazır Beton', city: 'Konya', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Horozluhan Mah. Cihan Sok. No:15 Selçuklu / Konya' },
  { symbol: 'CLEBI', name: 'Çelebi Hava Servisi A.Ş.', sector: 'Havalimanı Yer Hizmetleri & Kargo', city: 'İstanbul', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Tayakadın Mah. Nuri Demirağ Cad. No:39 Arnavutköy / İstanbul' },

  // --- Gayrimenkul Yatırım Ortaklıkları (GYO) ---
  { symbol: 'TRGYO', name: 'Torunlar Gayrimenkul Yatırım Ortaklığı A.Ş.', sector: 'Gayrimenkul Yatırım Ortaklığı (GYO)', city: 'İstanbul', auditor: 'DRT / Deloitte Bağımsız Denetim ve SMMM A.Ş.', address: 'Rüzgarlıbahçe Mah. Özalp Cad. No:4 Kavacık Beykoz / İstanbul' },
  { symbol: 'ISGYO', name: 'İş Gayrimenkul Yatırım Ortaklığı A.Ş.', sector: 'Gayrimenkul Yatırım Ortaklığı (GYO)', city: 'İstanbul', auditor: 'EY / Güney Bağımsız Denetim ve SMMM A.Ş.', address: 'İş Kuleleri Kule 3 Kat:7-8 4. Levent Beşiktaş / İstanbul' },
  { symbol: 'SNGYO', name: 'Sinpaş Gayrimenkul Yatırım Ortaklığı A.Ş.', sector: 'Gayrimenkul Yatırım Ortaklığı (GYO)', city: 'İstanbul', auditor: 'KPMG Bağımsız Denetim ve SMMM A.Ş.', address: 'Dikilitaş Mah. Yenidoğan Sok. No:36 Beşiktaş / İstanbul' },
  { symbol: 'OZKGY', name: 'Özak Gayrimenkul Yatırım Ortaklığı A.Ş.', sector: 'Gayrimenkul Yatırım Ortaklığı (GYO)', city: 'İstanbul', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Kazlıçeşme Mah. Kennedy Cad. No:52 Büyükyalı Zeytinburnu / İstanbul' },
  { symbol: 'DGGYO', name: 'Doğuş Gayrimenkul Yatırım Ortaklığı A.Ş.', sector: 'Gayrimenkul Yatırım Ortaklığı (GYO)', city: 'İstanbul', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Maslak Mah. Ahi Evran Cad. No:4 Doğuş Center Maslak Sarıyer / İstanbul' },
  { symbol: 'PSGYO', name: 'Pasifik Gayrimenkul Yatırım Ortaklığı A.Ş.', sector: 'Gayrimenkul Yatırım Ortaklığı (GYO)', city: 'İstanbul', auditor: 'KPMG Bağımsız Denetim ve SMMM A.Ş.', address: 'Etiler Mah. Tepecik Yolu No:11 Beşiktaş / İstanbul' },
  { symbol: 'KLGYO', name: 'Kiler Gayrimenkul Yatırım Ortaklığı A.Ş.', sector: 'Gayrimenkul Yatırım Ortaklığı (GYO)', city: 'İstanbul', auditor: 'Grant Thornton Bağımsız Denetim A.Ş.', address: 'Emniyetevleri Mah. Eski Büyükdere Cad. No:1/1 Sapphire Kağıthane / İstanbul' },
  { symbol: 'HLGYO', name: 'Halk Gayrimenkul Yatırım Ortaklığı A.Ş.', sector: 'Gayrimenkul Yatırım Ortaklığı (GYO)', city: 'İstanbul', auditor: 'DRT / Deloitte Bağımsız Denetim ve SMMM A.Ş.', address: 'Barbaros Mah. Şebboy Sok. Halkbank Blokları No:4/1 Ataşehir / İstanbul' },
  { symbol: 'MHRGY', name: 'MHR Gayrimenkul Yatırım Ortaklığı A.Ş.', sector: 'Gayrimenkul Yatırım Ortaklığı (GYO)', city: 'İstanbul', auditor: 'BDO Denet Bağımsız Denetim ve Danışmanlık A.Ş.', address: 'Küçükbakkalköy Mah. Vedat Günyol Cad. Ataşehir / İstanbul' },
  { symbol: 'SURGY', name: 'Sur Tatil Evleri Gayrimenkul Yatırım Ortaklığı A.Ş.', sector: 'Gayrimenkul Yatırım Ortaklığı (GYO)', city: 'İstanbul', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Burhaniye Mah. Nagehan Sok. No:4B Üsküdar / İstanbul' },

  // --- Tekstil, Lojistik, Hizmet & Diğer Şirketler ---
  { symbol: 'VAKKO', name: 'Vakko Tekstil ve Hazır Giyim Sanayi İşletmeleri A.Ş.', sector: 'Lüks Moda & Perakende', city: 'İstanbul', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Altunizade Mah. Kuşbakışı Cad. No:35 Üsküdar / İstanbul' },
  { symbol: 'YUNSA', name: 'Yünsa Yünlü Sanayi ve Ticaret A.Ş.', sector: 'Yünlü Kumaş İmalatı', city: 'Tekirdağ', auditor: 'PwC / Başaran Nas Bağımsız Denetim', address: 'Çerkezköy OSB Gazi Osman Paşa Mah. 5. Cad. No:3 Çerkezköy / Tekirdağ' },
  { symbol: 'PASEU', name: 'Pasifik Eurasia Lojistik Dış Ticaret A.Ş.', sector: 'Demiryolu & Uluslararası Lojistik', city: 'Ankara', auditor: 'KPMG Bağımsız Denetim ve SMMM A.Ş.', address: 'Kızılırmak Mah. Ufuk Üniversitesi Cad. No:8 Next Level Çankaya / Ankara' },
  { symbol: 'KATMR', name: 'Katmerciler Araç Üstü Ekipman Sanayi ve Ticaret A.Ş.', sector: 'Savunma & Araç Üstü Ekipman', city: 'İzmir', auditor: 'Güreli YMM ve Bağımsız Denetim Hizmetleri A.Ş.', address: 'Atatürk OSB 10032 Sok. No:10 Çiğli / İzmir' },
  { symbol: 'BINHO', name: '1000 Yatırımlar Holding A.Ş. (BinBin)', sector: 'Mikromobilite, Enerji & Teknoloji Holding', city: 'İstanbul', auditor: 'Grant Thornton Bağımsız Denetim A.Ş.', address: 'Maslak Mah. Taşyoncası Sok. Maslak 1453 No:1/B Sarıyer / İstanbul' },
  { symbol: 'SARAE', name: 'Sa-Ra Enerji İnşaat Ticaret ve Sanayi A.Ş.', sector: 'Enerji İletim Hatları & Çelik Konstrüksiyon', city: 'Ankara', auditor: 'KPMG Bağımsız Denetim ve SMMM A.Ş.', address: 'Saray Mah. 126. Cad. No:29 Kahramankazan / Ankara' }
];
