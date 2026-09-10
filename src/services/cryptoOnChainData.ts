export interface CryptoOnChainSeedItem {
  symbol: string;
  inOutMoneyPct: string;
  outMoneyPct: string;
  largeTxsVolumeUsd: string;
  largeTxsCount: number;
  networkGrowthPct: string;
  concentrationWhalesPct: string;
  sentimentScore: 'BULLISH' | 'NEUTRAL' | 'BEARISH';
  summaryText: string;
}

export const COMPREHENSIVE_CRYPTO_ON_CHAIN: CryptoOnChainSeedItem[] = [
  {
    symbol: 'BTC',
    inOutMoneyPct: '84.60',
    outMoneyPct: '11.40',
    largeTxsVolumeUsd: '18450000000',
    largeTxsCount: 4210,
    networkGrowthPct: '4.80',
    concentrationWhalesPct: '11.20',
    sentimentScore: 'BULLISH',
    summaryText: 'Bitcoin ağında adreslerin %84.60 bölümü karda. Kurumsal cüzdan girişleri ve madenci rezervlerindeki stabilizasyon güçlü boğa sinyali üretmeye devam ediyor.'
  },
  {
    symbol: 'ETH',
    inOutMoneyPct: '78.20',
    outMoneyPct: '17.30',
    largeTxsVolumeUsd: '9840000000',
    largeTxsCount: 3120,
    networkGrowthPct: '3.60',
    concentrationWhalesPct: '38.40',
    sentimentScore: 'BULLISH',
    summaryText: 'Ethereum ağında kilitli DeFi varlıkları (TVL) ve staking oranı %28.5 seviyesine tırmanırken, L2 köprüleme hacimleri yüksek net büyüme sergiliyor.'
  },
  {
    symbol: 'SOL',
    inOutMoneyPct: '74.50',
    outMoneyPct: '21.00',
    largeTxsVolumeUsd: '4620000000',
    largeTxsCount: 2450,
    networkGrowthPct: '8.40',
    concentrationWhalesPct: '34.80',
    sentimentScore: 'BULLISH',
    summaryText: 'Solana ağında günlük aktif adres sayısı 2.1 milyonu aşarak rekor seviyede seyrediyor. DEX işlem hacmi ve yeni token ihraçları ağ gelirlerini katlıyor.'
  },
  {
    symbol: 'BNB',
    inOutMoneyPct: '81.00',
    outMoneyPct: '14.50',
    largeTxsVolumeUsd: '2150000000',
    largeTxsCount: 1180,
    networkGrowthPct: '2.40',
    concentrationWhalesPct: '46.20',
    sentimentScore: 'BULLISH',
    summaryText: 'BNB Chain üzerinde çeyreklik otomatik yakım (auto-burn) ve Launchpool kilitlenmeleri dolaşımdaki arzı daraltarak değerlemeyi destekliyor.'
  },
  {
    symbol: 'XRP',
    inOutMoneyPct: '68.40',
    outMoneyPct: '26.80',
    largeTxsVolumeUsd: '1980000000',
    largeTxsCount: 940,
    networkGrowthPct: '2.10',
    concentrationWhalesPct: '42.10',
    sentimentScore: 'NEUTRAL',
    summaryText: 'XRP Ledger üzerinde sınır ötesi likidite transferleri stabil kalırken balina hesaplarının hareketliliği nötr-hafif pozitif bir görünüm sunuyor.'
  },
  {
    symbol: 'AVAX',
    inOutMoneyPct: '65.20',
    outMoneyPct: '29.40',
    largeTxsVolumeUsd: '890000000',
    largeTxsCount: 650,
    networkGrowthPct: '4.20',
    concentrationWhalesPct: '48.60',
    sentimentScore: 'BULLISH',
    summaryText: 'Avalanche alt ağları (Subnets) kurumsal varlık tokenizasyonu ortaklıklarıyla işlem hacmini artırırken aktif staking katılımı %61 üzerinde.'
  },
  {
    symbol: 'DOGE',
    inOutMoneyPct: '72.80',
    outMoneyPct: '22.40',
    largeTxsVolumeUsd: '1420000000',
    largeTxsCount: 880,
    networkGrowthPct: '3.10',
    concentrationWhalesPct: '44.50',
    sentimentScore: 'BULLISH',
    summaryText: 'Dogecoin cüzdanlarında uzun vadeli tutucuların (HODLers) oranı %68 seviyesine ulaşarak satış baskısının azaldığını gösteriyor.'
  },
  {
    symbol: 'ADA',
    inOutMoneyPct: '58.40',
    outMoneyPct: '37.20',
    largeTxsVolumeUsd: '640000000',
    largeTxsCount: 420,
    networkGrowthPct: '1.90',
    concentrationWhalesPct: '32.10',
    sentimentScore: 'NEUTRAL',
    summaryText: 'Cardano ağında Plutus V3 akıllı sözleşme geliştirmeleri sürerken işlem aktivitesi yatay bir konsolidasyon bandında ilerliyor.'
  },
  {
    symbol: 'LINK',
    inOutMoneyPct: '76.40',
    outMoneyPct: '18.90',
    largeTxsVolumeUsd: '780000000',
    largeTxsCount: 560,
    networkGrowthPct: '5.20',
    concentrationWhalesPct: '54.20',
    sentimentScore: 'BULLISH',
    summaryText: 'Chainlink CCIP protokolü küresel bankacılık RWA entegrasyonlarında liderliği korurken oracle veri besleme gelirleri sürekli artış kaydediyor.'
  },
  {
    symbol: 'SUI',
    inOutMoneyPct: '79.10',
    outMoneyPct: '16.50',
    largeTxsVolumeUsd: '920000000',
    largeTxsCount: 710,
    networkGrowthPct: '12.40',
    concentrationWhalesPct: '58.00',
    sentimentScore: 'BULLISH',
    summaryText: 'Sui Network TVL değeri 1 milyar doları aşarken, Move programlama dilinin getirdiği yüksek TPS avantajı yeni kullanıcı girişlerini hızlandırıyor.'
  },
  {
    symbol: 'NEAR',
    inOutMoneyPct: '73.20',
    outMoneyPct: '22.10',
    largeTxsVolumeUsd: '610000000',
    largeTxsCount: 490,
    networkGrowthPct: '7.80',
    concentrationWhalesPct: '39.40',
    sentimentScore: 'BULLISH',
    summaryText: 'Near Protocol kullanıcıya açık zincir soyutlama (chain abstraction) ve yapay zeka entegrasyonları ile günlük aktif adreslerde ilk 3 sıraya girdi.'
  },
  {
    symbol: 'APT',
    inOutMoneyPct: '66.80',
    outMoneyPct: '28.40',
    largeTxsVolumeUsd: '480000000',
    largeTxsCount: 380,
    networkGrowthPct: '6.40',
    concentrationWhalesPct: '62.10',
    sentimentScore: 'NEUTRAL',
    summaryText: 'Aptos ekosisteminde DeFi protokolleri büyürken kilit açılımlarının yarattığı arz baskısı nötr bir denge oluşturuyor.'
  },
  {
    symbol: 'DOT',
    inOutMoneyPct: '54.20',
    outMoneyPct: '41.50',
    largeTxsVolumeUsd: '340000000',
    largeTxsCount: 260,
    networkGrowthPct: '1.40',
    concentrationWhalesPct: '29.80',
    sentimentScore: 'NEUTRAL',
    summaryText: 'Polkadot 2.0 Agile Coretime güncellemesi geliştirici katılımını artırırken stake edilen DOT miktarı %56 seviyesinde.'
  },
  {
    symbol: 'MATIC',
    inOutMoneyPct: '62.00',
    outMoneyPct: '33.50',
    largeTxsVolumeUsd: '520000000',
    largeTxsCount: 410,
    networkGrowthPct: '3.80',
    concentrationWhalesPct: '47.30',
    sentimentScore: 'BULLISH',
    summaryText: 'Polygon AggLayer çoklu zincir birleştirme mimarisi ZK kanıtları ile likiditeyi konsolide ediyor ve staking katılımını artırıyor.'
  },
  {
    symbol: 'LTC',
    inOutMoneyPct: '69.50',
    outMoneyPct: '25.80',
    largeTxsVolumeUsd: '1120000000',
    largeTxsCount: 790,
    networkGrowthPct: '2.00',
    concentrationWhalesPct: '24.10',
    sentimentScore: 'NEUTRAL',
    summaryText: 'Litecoin ödeme hacimleri ve MWEB gizlilik işlemlerinde artış gözlenirken kurumsal cüzdan hareketleri stabil seyrini koruyor.'
  },
  {
    symbol: 'UNI',
    inOutMoneyPct: '71.40',
    outMoneyPct: '23.80',
    largeTxsVolumeUsd: '670000000',
    largeTxsCount: 520,
    networkGrowthPct: '4.50',
    concentrationWhalesPct: '68.50',
    sentimentScore: 'BULLISH',
    summaryText: 'Uniswap v4 kancaları (hooks) ve protokol ücret paylaşımı mekanizması DAO cüzdanlarını ve token tutucularını güçlendiriyor.'
  },
  {
    symbol: 'ICP',
    inOutMoneyPct: '60.50',
    outMoneyPct: '35.20',
    largeTxsVolumeUsd: '290000000',
    largeTxsCount: 230,
    networkGrowthPct: '5.10',
    concentrationWhalesPct: '41.20',
    sentimentScore: 'BULLISH',
    summaryText: 'Internet Computer üzerinde doğrudan Bitcoin ve Ethereum akıllı sözleşme çağırma yeteneği (Chain Fusion) işlem sayısını artırıyor.'
  },
  {
    symbol: 'BCH',
    inOutMoneyPct: '67.80',
    outMoneyPct: '27.40',
    largeTxsVolumeUsd: '450000000',
    largeTxsCount: 310,
    networkGrowthPct: '1.80',
    concentrationWhalesPct: '28.40',
    sentimentScore: 'NEUTRAL',
    summaryText: 'Bitcoin Cash ağında CashTokens aktivitesi dengeli seyrederken madenci hash gücü istikrarlı kalmaya devam ediyor.'
  },
  {
    symbol: 'SHIB',
    inOutMoneyPct: '64.20',
    outMoneyPct: '31.50',
    largeTxsVolumeUsd: '580000000',
    largeTxsCount: 640,
    networkGrowthPct: '2.90',
    concentrationWhalesPct: '61.80',
    sentimentScore: 'NEUTRAL',
    summaryText: 'Shibarium L2 üzerinde toplam işlem sayısı 400 milyonu geçerken balina cüzdanlarında uzun vadeli tutma oranı %74.'
  },
  {
    symbol: 'PEPE',
    inOutMoneyPct: '75.80',
    outMoneyPct: '19.20',
    largeTxsVolumeUsd: '890000000',
    largeTxsCount: 1120,
    networkGrowthPct: '9.50',
    concentrationWhalesPct: '49.10',
    sentimentScore: 'BULLISH',
    summaryText: 'Pepe token zincir üstü transfer hacimleri ve yeni cüzdan kayıtları meme coin kategorisinde en yüksek likidite rotasyonuna sahip.'
  }
];
