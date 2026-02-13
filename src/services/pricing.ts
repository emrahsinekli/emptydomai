// Domain Pricing Service
// Provides dynamic pricing from local and global domain registrars based on user's country

export interface RegistrarPricing {
  registrar: string;
  url: string;
  price: number; // Price in USD
  currency: string;
  localPrice?: number; // Price in local currency
  localCurrency?: string;
  isLocal: boolean; // Whether this is a local registrar for user's country
  renewalPrice?: number;
  features?: string[];
}

export interface PricingResult {
  domain: string;
  tld: string;
  country: string;
  countryCode: string;
  registrars: RegistrarPricing[];
  cheapest: RegistrarPricing | null;
  fetchedAt: Date;
}

// Country-specific registrar configurations
interface CountryRegistrar {
  name: string;
  urlTemplate: string; // Use {domain} as placeholder
  tldPrices: Record<string, number>; // TLD -> price in USD
  currency: string;
  exchangeRate?: number; // To USD
}

// Note: RegistrarConfig interface reserved for future API expansion
// interface RegistrarConfig {
//   global: CountryRegistrar[];
//   byCountry: Record<string, CountryRegistrar[]>;
// }

// Global registrars with typical pricing
const GLOBAL_REGISTRARS: CountryRegistrar[] = [
  {
    name: 'Namecheap',
    urlTemplate: 'https://www.namecheap.com/domains/registration/results/?domain={domain}',
    currency: 'USD',
    tldPrices: {
      '.com': 9.98,
      '.net': 11.98,
      '.org': 9.98,
      '.io': 32.98,
      '.ai': 79.98,
      '.co': 11.98,
      '.app': 14.98,
      '.dev': 12.98,
      '.tech': 4.98,
      '.xyz': 1.98,
      '.me': 4.98,
      '.info': 4.98,
      '.biz': 12.98,
      '.us': 4.98,
      '.cc': 11.98,
      '.so': 74.98,
      '.de': 7.98,
      '.uk': 7.98,
      '.fr': 11.98,
      '.nl': 8.98,
      '.es': 8.98,
      '.it': 12.98,
      '.pl': 12.98,
      '.se': 22.98,
      '.au': 14.98,
      '.ca': 11.98,
    },
  },
  {
    name: 'Porkbun',
    urlTemplate: 'https://porkbun.com/checkout/search?q={domain}',
    currency: 'USD',
    tldPrices: {
      '.com': 9.73,
      '.net': 10.73,
      '.org': 9.73,
      '.io': 28.33,
      '.ai': 59.33,
      '.co': 9.73,
      '.app': 13.33,
      '.dev': 11.33,
      '.tech': 4.33,
      '.xyz': 1.00,
      '.me': 3.33,
      '.info': 3.33,
      '.biz': 10.73,
      '.us': 4.33,
      '.cc': 9.73,
      '.so': 59.33,
      '.de': 6.33,
      '.uk': 6.33,
      '.fr': 10.33,
      '.nl': 7.33,
      '.es': 7.33,
      '.it': 11.33,
      '.se': 19.33,
      '.au': 12.33,
      '.ca': 9.33,
    },
  },
  {
    name: 'Cloudflare',
    urlTemplate: 'https://www.cloudflare.com/products/registrar/',
    currency: 'USD',
    tldPrices: {
      '.com': 9.15,
      '.net': 10.55,
      '.org': 9.93,
      '.io': 33.98,
      '.ai': 89.00,
      '.co': 11.47,
      '.app': 14.00,
      '.dev': 12.00,
      '.xyz': 9.00,
      '.me': 13.00,
      '.info': 9.35,
      '.uk': 7.00,
      '.de': 6.50,
    },
  },
  {
    name: 'GoDaddy',
    urlTemplate: 'https://www.godaddy.com/domainsearch/find?domainToCheck={domain}',
    currency: 'USD',
    tldPrices: {
      '.com': 12.99,
      '.net': 14.99,
      '.org': 12.99,
      '.io': 44.99,
      '.ai': 99.99,
      '.co': 14.99,
      '.app': 19.99,
      '.dev': 15.99,
      '.tech': 9.99,
      '.xyz': 2.99,
      '.me': 9.99,
      '.info': 9.99,
      '.biz': 16.99,
      '.us': 9.99,
      '.de': 11.99,
      '.uk': 11.99,
      '.fr': 14.99,
    },
  },
  {
    name: 'Google Domains',
    urlTemplate: 'https://domains.google.com/registrar/search?searchTerm={domain}',
    currency: 'USD',
    tldPrices: {
      '.com': 12.00,
      '.net': 12.00,
      '.org': 12.00,
      '.io': 30.00,
      '.ai': 100.00,
      '.co': 12.00,
      '.app': 14.00,
      '.dev': 12.00,
      '.tech': 12.00,
      '.xyz': 12.00,
      '.me': 20.00,
      '.info': 12.00,
    },
  },
];

// Country-specific registrars
const COUNTRY_REGISTRARS: Record<string, CountryRegistrar[]> = {
  // Turkey
  TR: [
    {
      name: 'İsimTescil',
      urlTemplate: 'https://www.isimtescil.net/domain/{domain}',
      currency: 'TRY',
      exchangeRate: 0.031, // 1 TRY = 0.031 USD (approximate)
      tldPrices: {
        '.com': 7.49, // in USD
        '.com.tr': 3.99,
        '.tr': 6.99,
        '.net': 8.99,
        '.org': 8.99,
        '.io': 39.99,
        '.ai': 89.99,
        '.co': 12.99,
      },
    },
    {
      name: 'Natro',
      urlTemplate: 'https://www.natro.com/domain-sorgulama?domain={domain}',
      currency: 'TRY',
      exchangeRate: 0.031,
      tldPrices: {
        '.com': 8.99,
        '.com.tr': 4.49,
        '.tr': 7.49,
        '.net': 9.99,
        '.org': 9.99,
        '.io': 44.99,
        '.ai': 94.99,
      },
    },
    {
      name: 'Turhost',
      urlTemplate: 'https://www.turhost.com/domain-sorgula?domain={domain}',
      currency: 'TRY',
      exchangeRate: 0.031,
      tldPrices: {
        '.com': 7.99,
        '.com.tr': 3.49,
        '.tr': 6.49,
        '.net': 8.49,
        '.org': 8.49,
      },
    },
    {
      name: 'GoDaddy TR',
      urlTemplate: 'https://tr.godaddy.com/domainsearch/find?domainToCheck={domain}',
      currency: 'TRY',
      exchangeRate: 0.031,
      tldPrices: {
        '.com': 11.99,
        '.com.tr': 9.99,
        '.tr': 12.99,
        '.net': 13.99,
        '.org': 11.99,
      },
    },
  ],

  // Germany
  DE: [
    {
      name: 'IONOS',
      urlTemplate: 'https://www.ionos.de/domains/domain-check?domain={domain}',
      currency: 'EUR',
      exchangeRate: 1.08, // 1 EUR = 1.08 USD (approximate)
      tldPrices: {
        '.com': 10.00,
        '.de': 5.00,
        '.net': 12.00,
        '.org': 10.00,
        '.io': 35.00,
        '.eu': 8.00,
      },
    },
    {
      name: 'Strato',
      urlTemplate: 'https://www.strato.de/domains/?domain={domain}',
      currency: 'EUR',
      exchangeRate: 1.08,
      tldPrices: {
        '.com': 9.00,
        '.de': 4.00,
        '.net': 11.00,
        '.org': 9.00,
        '.eu': 7.00,
      },
    },
    {
      name: 'United Domains',
      urlTemplate: 'https://www.united-domains.de/domain-check/?domain={domain}',
      currency: 'EUR',
      exchangeRate: 1.08,
      tldPrices: {
        '.com': 12.00,
        '.de': 6.00,
        '.net': 14.00,
        '.org': 12.00,
        '.io': 39.00,
        '.eu': 9.00,
      },
    },
  ],

  // France
  FR: [
    {
      name: 'OVH',
      urlTemplate: 'https://www.ovh.com/fr/domaines/?domain={domain}',
      currency: 'EUR',
      exchangeRate: 1.08,
      tldPrices: {
        '.com': 9.99,
        '.fr': 6.99,
        '.net': 11.99,
        '.org': 9.99,
        '.io': 35.99,
        '.eu': 7.99,
      },
    },
    {
      name: 'Gandi',
      urlTemplate: 'https://www.gandi.net/en/domain/search?domain={domain}',
      currency: 'EUR',
      exchangeRate: 1.08,
      tldPrices: {
        '.com': 15.50,
        '.fr': 12.54,
        '.net': 18.96,
        '.org': 14.94,
        '.io': 39.00,
        '.eu': 12.54,
      },
    },
    {
      name: 'Infomaniak',
      urlTemplate: 'https://www.infomaniak.com/en/domains?domain={domain}',
      currency: 'EUR',
      exchangeRate: 1.08,
      tldPrices: {
        '.com': 11.00,
        '.fr': 8.00,
        '.net': 13.00,
        '.org': 11.00,
        '.eu': 9.00,
      },
    },
  ],

  // UK
  GB: [
    {
      name: '123 Reg',
      urlTemplate: 'https://www.123-reg.co.uk/domain-names/search/?domain={domain}',
      currency: 'GBP',
      exchangeRate: 1.27, // 1 GBP = 1.27 USD
      tldPrices: {
        '.com': 9.99,
        '.co.uk': 5.99,
        '.uk': 5.99,
        '.net': 11.99,
        '.org': 9.99,
        '.io': 32.99,
      },
    },
    {
      name: 'Fasthosts',
      urlTemplate: 'https://www.fasthosts.co.uk/domain-names?domain={domain}',
      currency: 'GBP',
      exchangeRate: 1.27,
      tldPrices: {
        '.com': 10.99,
        '.co.uk': 6.99,
        '.uk': 6.99,
        '.net': 12.99,
        '.org': 10.99,
      },
    },
    {
      name: 'Namesco',
      urlTemplate: 'https://www.names.co.uk/domain-names/search?domain={domain}',
      currency: 'GBP',
      exchangeRate: 1.27,
      tldPrices: {
        '.com': 11.99,
        '.co.uk': 4.99,
        '.uk': 4.99,
        '.net': 13.99,
        '.org': 11.99,
      },
    },
  ],

  // Netherlands
  NL: [
    {
      name: 'TransIP',
      urlTemplate: 'https://www.transip.nl/domain-checker/?domain={domain}',
      currency: 'EUR',
      exchangeRate: 1.08,
      tldPrices: {
        '.com': 9.99,
        '.nl': 4.99,
        '.net': 11.99,
        '.org': 9.99,
        '.io': 34.99,
        '.eu': 7.99,
      },
    },
    {
      name: 'Hostnet',
      urlTemplate: 'https://www.hostnet.nl/domeinnamen?domain={domain}',
      currency: 'EUR',
      exchangeRate: 1.08,
      tldPrices: {
        '.com': 10.50,
        '.nl': 5.50,
        '.net': 12.50,
        '.org': 10.50,
        '.eu': 8.50,
      },
    },
  ],

  // Spain
  ES: [
    {
      name: 'Dinahosting',
      urlTemplate: 'https://dinahosting.com/dominios?domain={domain}',
      currency: 'EUR',
      exchangeRate: 1.08,
      tldPrices: {
        '.com': 9.95,
        '.es': 6.95,
        '.net': 11.95,
        '.org': 9.95,
        '.io': 35.95,
        '.eu': 7.95,
      },
    },
    {
      name: 'Arsys',
      urlTemplate: 'https://www.arsys.es/dominios?domain={domain}',
      currency: 'EUR',
      exchangeRate: 1.08,
      tldPrices: {
        '.com': 11.99,
        '.es': 7.99,
        '.net': 13.99,
        '.org': 11.99,
        '.eu': 9.99,
      },
    },
  ],

  // Italy
  IT: [
    {
      name: 'Aruba',
      urlTemplate: 'https://www.aruba.it/domini?domain={domain}',
      currency: 'EUR',
      exchangeRate: 1.08,
      tldPrices: {
        '.com': 9.90,
        '.it': 4.90,
        '.net': 11.90,
        '.org': 9.90,
        '.io': 34.90,
        '.eu': 6.90,
      },
    },
    {
      name: 'Register.it',
      urlTemplate: 'https://www.register.it/domini?domain={domain}',
      currency: 'EUR',
      exchangeRate: 1.08,
      tldPrices: {
        '.com': 10.90,
        '.it': 5.90,
        '.net': 12.90,
        '.org': 10.90,
        '.eu': 7.90,
      },
    },
  ],

  // Poland
  PL: [
    {
      name: 'home.pl',
      urlTemplate: 'https://home.pl/domeny?domain={domain}',
      currency: 'PLN',
      exchangeRate: 0.25, // 1 PLN = 0.25 USD
      tldPrices: {
        '.com': 10.99,
        '.pl': 6.99,
        '.net': 12.99,
        '.org': 10.99,
        '.eu': 8.99,
      },
    },
    {
      name: 'nazwa.pl',
      urlTemplate: 'https://www.nazwa.pl/rejestracja-domeny?domain={domain}',
      currency: 'PLN',
      exchangeRate: 0.25,
      tldPrices: {
        '.com': 11.99,
        '.pl': 5.99,
        '.net': 13.99,
        '.org': 11.99,
        '.eu': 9.99,
      },
    },
  ],

  // Brazil
  BR: [
    {
      name: 'Registro.br',
      urlTemplate: 'https://registro.br/busca-dominio/?fqdn={domain}',
      currency: 'BRL',
      exchangeRate: 0.20, // 1 BRL = 0.20 USD
      tldPrices: {
        '.com.br': 8.00,
        '.br': 12.00,
        '.net.br': 8.00,
        '.org.br': 8.00,
      },
    },
    {
      name: 'HostGator BR',
      urlTemplate: 'https://www.hostgator.com.br/registro-de-dominio?domain={domain}',
      currency: 'BRL',
      exchangeRate: 0.20,
      tldPrices: {
        '.com': 12.00,
        '.com.br': 9.00,
        '.net': 14.00,
        '.org': 12.00,
      },
    },
  ],

  // India
  IN: [
    {
      name: 'BigRock',
      urlTemplate: 'https://www.bigrock.in/domain-registration?domain={domain}',
      currency: 'INR',
      exchangeRate: 0.012, // 1 INR = 0.012 USD
      tldPrices: {
        '.com': 9.99,
        '.in': 4.99,
        '.co.in': 5.99,
        '.net': 11.99,
        '.org': 9.99,
        '.io': 35.99,
      },
    },
    {
      name: 'GoDaddy IN',
      urlTemplate: 'https://in.godaddy.com/domainsearch/find?domainToCheck={domain}',
      currency: 'INR',
      exchangeRate: 0.012,
      tldPrices: {
        '.com': 11.99,
        '.in': 5.99,
        '.co.in': 6.99,
        '.net': 13.99,
        '.org': 11.99,
      },
    },
  ],

  // Australia
  AU: [
    {
      name: 'VentraIP',
      urlTemplate: 'https://ventraip.com.au/domain-names?domain={domain}',
      currency: 'AUD',
      exchangeRate: 0.66, // 1 AUD = 0.66 USD
      tldPrices: {
        '.com': 14.95,
        '.com.au': 12.95,
        '.au': 14.95,
        '.net': 16.95,
        '.org': 14.95,
        '.io': 39.95,
      },
    },
    {
      name: 'Crazy Domains',
      urlTemplate: 'https://www.crazydomains.com.au/domain-names?domain={domain}',
      currency: 'AUD',
      exchangeRate: 0.66,
      tldPrices: {
        '.com': 15.00,
        '.com.au': 13.00,
        '.au': 15.00,
        '.net': 17.00,
        '.org': 15.00,
      },
    },
  ],

  // Japan
  JP: [
    {
      name: 'Onamae',
      urlTemplate: 'https://www.onamae.com/domain/?domain={domain}',
      currency: 'JPY',
      exchangeRate: 0.0067, // 1 JPY = 0.0067 USD
      tldPrices: {
        '.com': 12.00,
        '.jp': 28.00,
        '.co.jp': 35.00,
        '.net': 14.00,
        '.org': 12.00,
      },
    },
    {
      name: 'Value Domain',
      urlTemplate: 'https://www.value-domain.com/domain/search?domain={domain}',
      currency: 'JPY',
      exchangeRate: 0.0067,
      tldPrices: {
        '.com': 11.00,
        '.jp': 25.00,
        '.co.jp': 32.00,
        '.net': 13.00,
        '.org': 11.00,
      },
    },
  ],

  // Canada
  CA: [
    {
      name: 'Hover',
      urlTemplate: 'https://www.hover.com/domain-search?q={domain}',
      currency: 'CAD',
      exchangeRate: 0.74, // 1 CAD = 0.74 USD
      tldPrices: {
        '.com': 15.99,
        '.ca': 14.99,
        '.net': 17.99,
        '.org': 15.99,
        '.io': 42.99,
      },
    },
    {
      name: 'Canadian Domain',
      urlTemplate: 'https://www.canadiandomain.ca/domain-registration?domain={domain}',
      currency: 'CAD',
      exchangeRate: 0.74,
      tldPrices: {
        '.com': 14.95,
        '.ca': 12.95,
        '.net': 16.95,
        '.org': 14.95,
      },
    },
  ],

  // UAE
  AE: [
    {
      name: 'AE Domain',
      urlTemplate: 'https://ae.domains/whois/?domain={domain}',
      currency: 'AED',
      exchangeRate: 0.27, // 1 AED = 0.27 USD
      tldPrices: {
        '.com': 12.00,
        '.ae': 45.00,
        '.com.ae': 55.00,
        '.net': 14.00,
        '.org': 12.00,
      },
    },
    {
      name: 'GoDaddy AE',
      urlTemplate: 'https://ae.godaddy.com/domainsearch/find?domainToCheck={domain}',
      currency: 'AED',
      exchangeRate: 0.27,
      tldPrices: {
        '.com': 13.99,
        '.ae': 49.99,
        '.net': 15.99,
        '.org': 13.99,
      },
    },
  ],

  // Saudi Arabia
  SA: [
    {
      name: 'Saudi NIC',
      urlTemplate: 'https://nic.sa/en/domain?domain={domain}',
      currency: 'SAR',
      exchangeRate: 0.27, // 1 SAR = 0.27 USD
      tldPrices: {
        '.sa': 50.00,
        '.com.sa': 60.00,
        '.net.sa': 60.00,
        '.org.sa': 60.00,
      },
    },
    {
      name: 'GoDaddy SA',
      urlTemplate: 'https://sa.godaddy.com/domainsearch/find?domainToCheck={domain}',
      currency: 'SAR',
      exchangeRate: 0.27,
      tldPrices: {
        '.com': 14.99,
        '.sa': 55.00,
        '.net': 16.99,
        '.org': 14.99,
      },
    },
  ],

  // Russia
  RU: [
    {
      name: 'REG.RU',
      urlTemplate: 'https://www.reg.ru/domain/new/?domain={domain}',
      currency: 'RUB',
      exchangeRate: 0.011, // 1 RUB = 0.011 USD
      tldPrices: {
        '.com': 11.00,
        '.ru': 4.00,
        '.net': 13.00,
        '.org': 11.00,
        '.io': 38.00,
      },
    },
    {
      name: 'RU-CENTER',
      urlTemplate: 'https://www.nic.ru/en/domains?domain={domain}',
      currency: 'RUB',
      exchangeRate: 0.011,
      tldPrices: {
        '.com': 12.00,
        '.ru': 5.00,
        '.net': 14.00,
        '.org': 12.00,
      },
    },
  ],

  // South Korea
  KR: [
    {
      name: 'Gabia',
      urlTemplate: 'https://www.gabia.com/domain/?domain={domain}',
      currency: 'KRW',
      exchangeRate: 0.00076, // 1 KRW = 0.00076 USD
      tldPrices: {
        '.com': 13.00,
        '.kr': 8.00,
        '.co.kr': 10.00,
        '.net': 15.00,
        '.org': 13.00,
      },
    },
    {
      name: 'Whois',
      urlTemplate: 'https://www.whois.co.kr/domain/?domain={domain}',
      currency: 'KRW',
      exchangeRate: 0.00076,
      tldPrices: {
        '.com': 12.00,
        '.kr': 7.00,
        '.co.kr': 9.00,
        '.net': 14.00,
        '.org': 12.00,
      },
    },
  ],

  // China
  CN: [
    {
      name: 'Alibaba Cloud',
      urlTemplate: 'https://wanwang.aliyun.com/domain/searchresult/?domain={domain}',
      currency: 'CNY',
      exchangeRate: 0.14, // 1 CNY = 0.14 USD
      tldPrices: {
        '.com': 10.00,
        '.cn': 4.00,
        '.com.cn': 6.00,
        '.net': 12.00,
        '.org': 10.00,
      },
    },
    {
      name: 'DNSPOD',
      urlTemplate: 'https://dnspod.cloud.tencent.com/domain/?domain={domain}',
      currency: 'CNY',
      exchangeRate: 0.14,
      tldPrices: {
        '.com': 9.00,
        '.cn': 3.50,
        '.com.cn': 5.00,
        '.net': 11.00,
        '.org': 9.00,
      },
    },
  ],

  // Sweden
  SE: [
    {
      name: 'Loopia',
      urlTemplate: 'https://www.loopia.se/domannamn/?domain={domain}',
      currency: 'SEK',
      exchangeRate: 0.095, // 1 SEK = 0.095 USD
      tldPrices: {
        '.com': 12.00,
        '.se': 8.00,
        '.net': 14.00,
        '.org': 12.00,
        '.eu': 9.00,
      },
    },
    {
      name: 'Binero',
      urlTemplate: 'https://www.binero.se/domaner?domain={domain}',
      currency: 'SEK',
      exchangeRate: 0.095,
      tldPrices: {
        '.com': 13.00,
        '.se': 7.00,
        '.net': 15.00,
        '.org': 13.00,
        '.eu': 10.00,
      },
    },
  ],

  // Mexico
  MX: [
    {
      name: 'AKKY',
      urlTemplate: 'https://www.akky.mx/busca-dominio/?domain={domain}',
      currency: 'MXN',
      exchangeRate: 0.058, // 1 MXN = 0.058 USD
      tldPrices: {
        '.com': 11.00,
        '.mx': 25.00,
        '.com.mx': 30.00,
        '.net': 13.00,
        '.org': 11.00,
      },
    },
    {
      name: 'HostGator MX',
      urlTemplate: 'https://www.hostgator.mx/dominios?domain={domain}',
      currency: 'MXN',
      exchangeRate: 0.058,
      tldPrices: {
        '.com': 12.00,
        '.mx': 28.00,
        '.com.mx': 32.00,
        '.net': 14.00,
        '.org': 12.00,
      },
    },
  ],
};

// Map country names to country codes (exported for potential future use)
export const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  'turkey': 'TR',
  'türkiye': 'TR',
  'germany': 'DE',
  'deutschland': 'DE',
  'france': 'FR',
  'united kingdom': 'GB',
  'uk': 'GB',
  'netherlands': 'NL',
  'holland': 'NL',
  'spain': 'ES',
  'españa': 'ES',
  'italy': 'IT',
  'italia': 'IT',
  'poland': 'PL',
  'polska': 'PL',
  'brazil': 'BR',
  'brasil': 'BR',
  'india': 'IN',
  'australia': 'AU',
  'japan': 'JP',
  '日本': 'JP',
  'canada': 'CA',
  'uae': 'AE',
  'united arab emirates': 'AE',
  'saudi arabia': 'SA',
  'russia': 'RU',
  'россия': 'RU',
  'south korea': 'KR',
  'korea': 'KR',
  '한국': 'KR',
  'china': 'CN',
  '中国': 'CN',
  'sweden': 'SE',
  'sverige': 'SE',
  'mexico': 'MX',
  'méxico': 'MX',
};

// Detect user's country from browser
export async function detectUserCountry(): Promise<{ code: string; name: string }> {
  try {
    // Method 1: Try to get from browser's language/locale
    const browserLang = navigator.language || (navigator as any).userLanguage;
    if (browserLang) {
      const parts = browserLang.split('-');
      if (parts.length >= 2) {
        const countryCode = parts[1].toUpperCase();
        if (COUNTRY_REGISTRARS[countryCode]) {
          return { code: countryCode, name: getCountryName(countryCode) };
        }
      }
    }

    // Method 2: Try timezone-based detection
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const countryFromTimezone = getCountryFromTimezone(timezone);
    if (countryFromTimezone && COUNTRY_REGISTRARS[countryFromTimezone]) {
      return { code: countryFromTimezone, name: getCountryName(countryFromTimezone) };
    }

    // Method 3: Use IP geolocation API (free, no API key needed)
    try {
      const response = await fetch('https://ipapi.co/json/', {
        signal: AbortSignal.timeout(3000)
      });
      if (response.ok) {
        const data = await response.json();
        if (data.country_code && COUNTRY_REGISTRARS[data.country_code]) {
          return { code: data.country_code, name: data.country_name || getCountryName(data.country_code) };
        }
      }
    } catch (e) {
      console.log('IP geolocation failed, using fallback');
    }

    // Default to US if no country detected
    return { code: 'US', name: 'United States' };
  } catch (error) {
    console.error('Country detection failed:', error);
    return { code: 'US', name: 'United States' };
  }
}

// Get country code from timezone
function getCountryFromTimezone(timezone: string): string | null {
  const tzToCountry: Record<string, string> = {
    'Europe/Istanbul': 'TR',
    'Europe/Berlin': 'DE',
    'Europe/Paris': 'FR',
    'Europe/London': 'GB',
    'Europe/Amsterdam': 'NL',
    'Europe/Madrid': 'ES',
    'Europe/Rome': 'IT',
    'Europe/Warsaw': 'PL',
    'America/Sao_Paulo': 'BR',
    'Asia/Kolkata': 'IN',
    'Australia/Sydney': 'AU',
    'Asia/Tokyo': 'JP',
    'America/Toronto': 'CA',
    'Asia/Dubai': 'AE',
    'Asia/Riyadh': 'SA',
    'Europe/Moscow': 'RU',
    'Asia/Seoul': 'KR',
    'Asia/Shanghai': 'CN',
    'Europe/Stockholm': 'SE',
    'America/Mexico_City': 'MX',
  };

  return tzToCountry[timezone] || null;
}

// Get country name from code
function getCountryName(code: string): string {
  const names: Record<string, string> = {
    TR: 'Turkey',
    DE: 'Germany',
    FR: 'France',
    GB: 'United Kingdom',
    NL: 'Netherlands',
    ES: 'Spain',
    IT: 'Italy',
    PL: 'Poland',
    BR: 'Brazil',
    IN: 'India',
    AU: 'Australia',
    JP: 'Japan',
    CA: 'Canada',
    AE: 'UAE',
    SA: 'Saudi Arabia',
    RU: 'Russia',
    KR: 'South Korea',
    CN: 'China',
    SE: 'Sweden',
    MX: 'Mexico',
    US: 'United States',
  };
  return names[code] || code;
}

// Get pricing for a domain from all relevant registrars
export async function getDomainPricing(
  domain: string,
  tld: string,
  countryCode?: string
): Promise<PricingResult> {
  // Detect country if not provided
  let country = { code: 'US', name: 'United States' };
  if (countryCode) {
    country = { code: countryCode, name: getCountryName(countryCode) };
  } else {
    country = await detectUserCountry();
  }

  const fullDomain = domain + tld;
  const registrars: RegistrarPricing[] = [];

  // Add local registrars first
  const localRegistrars = COUNTRY_REGISTRARS[country.code] || [];
  for (const reg of localRegistrars) {
    const price = reg.tldPrices[tld];
    if (price !== undefined) {
      registrars.push({
        registrar: reg.name,
        url: reg.urlTemplate.replace('{domain}', fullDomain),
        price: price,
        currency: 'USD',
        localPrice: reg.exchangeRate ? Math.round(price / reg.exchangeRate * 100) / 100 : undefined,
        localCurrency: reg.currency !== 'USD' ? reg.currency : undefined,
        isLocal: true,
      });
    }
  }

  // Add global registrars
  for (const reg of GLOBAL_REGISTRARS) {
    const price = reg.tldPrices[tld];
    if (price !== undefined) {
      registrars.push({
        registrar: reg.name,
        url: reg.urlTemplate.replace('{domain}', fullDomain),
        price: price,
        currency: 'USD',
        isLocal: false,
      });
    }
  }

  // Sort by price (cheapest first)
  registrars.sort((a, b) => a.price - b.price);

  return {
    domain,
    tld,
    country: country.name,
    countryCode: country.code,
    registrars,
    cheapest: registrars.length > 0 ? registrars[0] : null,
    fetchedAt: new Date(),
  };
}

// Get pricing for multiple TLDs at once
export async function getMultiTLDPricing(
  domain: string,
  tlds: string[],
  countryCode?: string
): Promise<PricingResult[]> {
  const results = await Promise.all(
    tlds.map(tld => getDomainPricing(domain, tld, countryCode))
  );
  return results;
}

// Format price for display
export function formatPrice(price: number, currency: string = 'USD'): string {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    TRY: '₺',
    INR: '₹',
    JPY: '¥',
    CNY: '¥',
    AUD: 'A$',
    CAD: 'C$',
    BRL: 'R$',
    PLN: 'zł',
    SEK: 'kr',
    MXN: 'MX$',
    AED: 'AED',
    SAR: 'SAR',
    RUB: '₽',
    KRW: '₩',
  };

  const symbol = symbols[currency] || currency + ' ';
  return `${symbol}${price.toFixed(2)}`;
}

// Get the cheapest registrar for a TLD
export function getCheapestRegistrar(
  tld: string,
  countryCode?: string
): { registrar: string; price: number; isLocal: boolean } | null {
  let cheapest: { registrar: string; price: number; isLocal: boolean } | null = null;

  // Check local registrars first
  if (countryCode && COUNTRY_REGISTRARS[countryCode]) {
    for (const reg of COUNTRY_REGISTRARS[countryCode]) {
      const price = reg.tldPrices[tld];
      if (price !== undefined && (!cheapest || price < cheapest.price)) {
        cheapest = { registrar: reg.name, price, isLocal: true };
      }
    }
  }

  // Check global registrars
  for (const reg of GLOBAL_REGISTRARS) {
    const price = reg.tldPrices[tld];
    if (price !== undefined && (!cheapest || price < cheapest.price)) {
      cheapest = { registrar: reg.name, price, isLocal: false };
    }
  }

  return cheapest;
}

// Cache for pricing results
const pricingCache = new Map<string, { result: PricingResult; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Get cached pricing or fetch new
export async function getCachedDomainPricing(
  domain: string,
  tld: string,
  countryCode?: string
): Promise<PricingResult> {
  const cacheKey = `${domain}${tld}-${countryCode || 'auto'}`;
  const cached = pricingCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }

  const result = await getDomainPricing(domain, tld, countryCode);
  pricingCache.set(cacheKey, { result, timestamp: Date.now() });

  return result;
}
