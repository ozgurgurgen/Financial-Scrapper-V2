export interface IpoSeedItem {
  ticker: string;
  companyName: string;
  ipoPrice: string;
  totalOfferedShares: string;
  publicOfferingSizeTry: string;
  freeFloatPct: string;
  allotmentIndividualPct: string;
  allotmentInstitutionalPct: string;
  totalParticipants: number;
  individualParticipants: number;
  oversubscriptionRatio: string;
  firstTradingDate?: string;
  applicationStartDate: string;
  applicationEndDate: string;
  consortiumLeader: string;
  status: 'DRAFT' | 'APPROVED' | 'BOOK_BUILDING' | 'LISTED' | 'UPCOMING';
  ceilingDays: number;
  currentPrice?: string;
  returnSinceIpoPct?: string;
  peRatioPreIpo?: string;
  discountRatePct?: string;
  fundUsagePlan?: any;
}

export const COMPREHENSIVE_IPOS: IpoSeedItem[] = [
  {
    ticker: 'SARAE',
    companyName: 'Sa-Ra Enerji İnşaat Ticaret ve Sanayi A.Ş.',
    ipoPrice: '42.00',
    totalOfferedShares: '48000000',
    publicOfferingSizeTry: '2016000000',
    freeFloatPct: '20.00',
    allotmentIndividualPct: '70.00',
    allotmentInstitutionalPct: '30.00',
    totalParticipants: 2450000,
    individualParticipants: 2448000,
    oversubscriptionRatio: '4.80',
    firstTradingDate: '2026-09-02',
    applicationStartDate: '2026-08-25',
    applicationEndDate: '2026-08-27',
    consortiumLeader: 'İş Yatırım & Garanti BBVA Yatırım',
    status: 'LISTED',
    ceilingDays: 5,
    currentPrice: '67.60',
    returnSinceIpoPct: '60.95',
    peRatioPreIpo: '9.40',
    discountRatePct: '22.50',
    fundUsagePlan: {
      capacityExpansion: 45,
      debtRestructuring: 25,
      workingCapital: 20,
      rdInvestments: 10
    }
  },
  {
    ticker: 'DURKN',
    companyName: 'Durukan Şekerleme Sanayi ve Ticaret A.Ş.',
    ipoPrice: '17.00',
    totalOfferedShares: '42500000',
    publicOfferingSizeTry: '722500000',
    freeFloatPct: '22.37',
    allotmentIndividualPct: '75.00',
    allotmentInstitutionalPct: '25.00',
    totalParticipants: 2180000,
    individualParticipants: 2178500,
    oversubscriptionRatio: '3.90',
    firstTradingDate: '2026-08-19',
    applicationStartDate: '2026-08-11',
    applicationEndDate: '2026-08-13',
    consortiumLeader: 'Deniz Yatırım',
    status: 'LISTED',
    ceilingDays: 6,
    currentPrice: '30.12',
    returnSinceIpoPct: '77.18',
    peRatioPreIpo: '8.80',
    discountRatePct: '20.00',
    fundUsagePlan: {
      factoryExpansion: 50,
      renewableEnergy: 20,
      workingCapital: 30
    }
  },
  {
    ticker: 'KARYE',
    companyName: 'Kartal Yenilenebilir Enerji Üretim A.Ş.',
    ipoPrice: '24.50',
    totalOfferedShares: '28000000',
    publicOfferingSizeTry: '686000000',
    freeFloatPct: '25.00',
    allotmentIndividualPct: '60.00',
    allotmentInstitutionalPct: '40.00',
    totalParticipants: 1850000,
    individualParticipants: 1848000,
    oversubscriptionRatio: '5.20',
    firstTradingDate: '2026-07-28',
    applicationStartDate: '2026-07-18',
    applicationEndDate: '2026-07-20',
    consortiumLeader: 'A1 Capital Yatırım',
    status: 'LISTED',
    ceilingDays: 7,
    currentPrice: '47.75',
    returnSinceIpoPct: '94.90',
    peRatioPreIpo: '11.20',
    discountRatePct: '24.00',
    fundUsagePlan: {
      solarenergyInvestments: 60,
      storageSystems: 20,
      workingCapital: 20
    }
  },
  {
    ticker: 'ALTNY',
    companyName: 'Altınay Savunma Teknolojileri A.Ş.',
    ipoPrice: '32.00',
    totalOfferedShares: '58823530',
    publicOfferingSizeTry: '1882352960',
    freeFloatPct: '25.00',
    allotmentIndividualPct: '69.00',
    allotmentInstitutionalPct: '31.00',
    totalParticipants: 3620000,
    individualParticipants: 3618000,
    oversubscriptionRatio: '6.40',
    firstTradingDate: '2026-05-16',
    applicationStartDate: '2026-05-08',
    applicationEndDate: '2026-05-10',
    consortiumLeader: 'TSKB & Ziraat Yatırım',
    status: 'LISTED',
    ceilingDays: 9,
    currentPrice: '98.50',
    returnSinceIpoPct: '207.81',
    peRatioPreIpo: '14.50',
    discountRatePct: '25.00',
    fundUsagePlan: {
      defenseFacility: 50,
      rdFacility: 30,
      workingCapital: 20
    }
  },
  {
    ticker: 'BEWEN',
    companyName: 'Biotrend Çevre ve Enerji Yatırımları A.Ş.',
    ipoPrice: '18.00',
    totalOfferedShares: '36000000',
    publicOfferingSizeTry: '648000000',
    freeFloatPct: '21.00',
    allotmentIndividualPct: '70.00',
    allotmentInstitutionalPct: '30.00',
    totalParticipants: 2100000,
    individualParticipants: 2098000,
    oversubscriptionRatio: '4.10',
    firstTradingDate: '2026-06-12',
    applicationStartDate: '2026-06-04',
    applicationEndDate: '2026-06-06',
    consortiumLeader: 'Deniz Yatırım',
    status: 'LISTED',
    ceilingDays: 4,
    currentPrice: '26.40',
    returnSinceIpoPct: '46.67',
    peRatioPreIpo: '10.50',
    discountRatePct: '21.00',
    fundUsagePlan: {
      biogasFacilities: 55,
      workingCapital: 30,
      technologyInvestments: 15
    }
  },
  {
    ticker: 'OBAMS',
    companyName: 'Oba Makarnacılık Sanayi ve Ticaret A.Ş.',
    ipoPrice: '39.24',
    totalOfferedShares: '96336345',
    publicOfferingSizeTry: '3780238178',
    freeFloatPct: '20.10',
    allotmentIndividualPct: '49.00',
    allotmentInstitutionalPct: '51.00',
    totalParticipants: 3380000,
    individualParticipants: 3378000,
    oversubscriptionRatio: '3.80',
    firstTradingDate: '2026-03-01',
    applicationStartDate: '2026-02-22',
    applicationEndDate: '2026-02-23',
    consortiumLeader: 'Türkiye Kalkınma ve Yatırım Bankası & ÜNLÜ Menkul',
    status: 'LISTED',
    ceilingDays: 6,
    currentPrice: '58.40',
    returnSinceIpoPct: '48.83',
    peRatioPreIpo: '12.00',
    discountRatePct: '23.00',
    fundUsagePlan: {
      productDiversification: 40,
      cleanEnergy: 30,
      workingCapital: 30
    }
  },
  {
    ticker: 'AGROT',
    companyName: 'Agrotech Yüksek Teknoloji ve Yatırım A.Ş.',
    ipoPrice: '5.21',
    totalOfferedShares: '300000000',
    publicOfferingSizeTry: '1563000000',
    freeFloatPct: '25.00',
    allotmentIndividualPct: '70.00',
    allotmentInstitutionalPct: '30.00',
    totalParticipants: 3050000,
    individualParticipants: 3048000,
    oversubscriptionRatio: '5.80',
    firstTradingDate: '2025-11-23',
    applicationStartDate: '2025-11-15',
    applicationEndDate: '2025-11-17',
    consortiumLeader: 'Alcapital Menkul Değerler',
    status: 'LISTED',
    ceilingDays: 14,
    currentPrice: '18.40',
    returnSinceIpoPct: '253.17',
    peRatioPreIpo: '8.20',
    discountRatePct: '26.00',
    fundUsagePlan: {
      smartAgricultureTech: 50,
      warehousingInvestments: 25,
      workingCapital: 25
    }
  },
  {
    ticker: 'TABGD',
    companyName: 'TAB Gıda Sanayi ve Ticaret A.Ş.',
    ipoPrice: '130.00',
    totalOfferedShares: '52500000',
    publicOfferingSizeTry: '6825000000',
    freeFloatPct: '20.09',
    allotmentIndividualPct: '78.00',
    allotmentInstitutionalPct: '22.00',
    totalParticipants: 4943000,
    individualParticipants: 4940000,
    oversubscriptionRatio: '2.50',
    firstTradingDate: '2025-10-26',
    applicationStartDate: '2025-10-18',
    applicationEndDate: '2025-10-20',
    consortiumLeader: 'İş Yatırım, Yapı Kredi Yatırım, Ata Yatırım',
    status: 'LISTED',
    ceilingDays: 3,
    currentPrice: '158.50',
    returnSinceIpoPct: '21.92',
    peRatioPreIpo: '15.60',
    discountRatePct: '20.00',
    fundUsagePlan: {
      restaurantInvestments: 42,
      renewableEnergy: 23,
      fintechInvestments: 20,
      workingCapital: 15
    }
  },
  {
    ticker: 'REEDR',
    companyName: 'Reeder Teknoloji Sanayi ve Ticaret A.Ş.',
    ipoPrice: '9.30',
    totalOfferedShares: '215000000',
    publicOfferingSizeTry: '1999500000',
    freeFloatPct: '22.63',
    allotmentIndividualPct: '85.00',
    allotmentInstitutionalPct: '15.00',
    totalParticipants: 4208000,
    individualParticipants: 4205000,
    oversubscriptionRatio: '4.20',
    firstTradingDate: '2025-09-21',
    applicationStartDate: '2025-09-13',
    applicationEndDate: '2025-09-15',
    consortiumLeader: 'Türkiye Sınai Kalkınma Bankası & Yatırım Finansman',
    status: 'LISTED',
    ceilingDays: 9,
    currentPrice: '28.90',
    returnSinceIpoPct: '210.75',
    peRatioPreIpo: '9.10',
    discountRatePct: '24.00',
    fundUsagePlan: {
      evBatteryProduction: 35,
      smartphoneRAndD: 25,
      workingCapital: 40
    }
  },
  {
    ticker: 'INTET',
    companyName: 'İntetra Teknoloji ve Bilişim Hizmetleri A.Ş.',
    ipoPrice: '48.50',
    totalOfferedShares: '18000000',
    publicOfferingSizeTry: '873000000',
    freeFloatPct: '20.00',
    allotmentIndividualPct: '70.00',
    allotmentInstitutionalPct: '30.00',
    totalParticipants: 0,
    individualParticipants: 0,
    oversubscriptionRatio: '0.00',
    applicationStartDate: '2026-09-20',
    applicationEndDate: '2026-09-22',
    consortiumLeader: 'Gedik Yatırım',
    status: 'APPROVED',
    ceilingDays: 0,
    peRatioPreIpo: '10.80',
    discountRatePct: '21.50',
    fundUsagePlan: {
      itsTrafficSoftware: 45,
      exportExpansion: 30,
      workingCapital: 25
    }
  }
];
