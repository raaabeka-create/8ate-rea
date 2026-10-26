import { GhanaRegion } from '../types';

export interface RegionInfo {
  region: GhanaRegion;
  capital: string;
  majorTowns: string[];
}

export const GHANA_REGIONS: RegionInfo[] = [
  {
    region: 'Greater Accra',
    capital: 'Accra',
    majorTowns: [
      'Accra Central',
      'East Legon',
      'Osu',
      'Tema',
      'Madina',
      'Spintex',
      'Airport Residential',
      'Dansoman',
      'Achimota',
      'Adenta',
      'Kasoa Border',
      'Cantonments',
    ],
  },
  {
    region: 'Ashanti',
    capital: 'Kumasi',
    majorTowns: [
      'Kumasi Central',
      'KNUST Campus',
      'Asafo',
      'Bantama',
      'Ahodwo',
      'Ayeduase',
      'Obuasi',
      'Mampong',
      'Ejisu',
      'Konongo',
      'Tafo',
      'Suame',
    ],
  },
  {
    region: 'Central',
    capital: 'Cape Coast',
    majorTowns: [
      'Cape Coast Central',
      'UCC Campus',
      'Elmina',
      'Winneba',
      'Kasoa',
      'Mfantseman',
      'Agona Swedru',
      'Saltpond',
    ],
  },
  {
    region: 'Western',
    capital: 'Sekondi-Takoradi',
    majorTowns: [
      'Takoradi',
      'Sekondi',
      'Tarkwa',
      'Axim',
      'Effia-Kwesimintsim',
      'Prestea',
      'Shama',
    ],
  },
  {
    region: 'Northern',
    capital: 'Tamale',
    majorTowns: [
      'Tamale Central',
      'UDS Campus',
      'Yendi',
      'Savelugu',
      'Bimbilla',
      'Karaga',
      'Kumbungu',
    ],
  },
  {
    region: 'Eastern',
    capital: 'Koforidua',
    majorTowns: [
      'Koforidua',
      'Akuapem Ridge',
      'Nkawkaw',
      'Aburi',
      'Oda',
      'Suhum',
      'Nsawam',
      'Asamankese',
    ],
  },
  {
    region: 'Volta',
    capital: 'Ho',
    majorTowns: [
      'Ho Central',
      'Hohoe',
      'Aflao',
      'Keta',
      'Kpando',
      'Anloga',
      'Sogakope',
      'Dzodze',
    ],
  },
  {
    region: 'Bono',
    capital: 'Sunyani',
    majorTowns: ['Sunyani', 'Berekum', 'Dormaa Ahenkro', 'Wenchi', 'Drobo'],
  },
  {
    region: 'Bono East',
    capital: 'Techiman',
    majorTowns: ['Techiman', 'Kintampo', 'Nkoranza', 'Atebubu', 'Prang'],
  },
  {
    region: 'Ahafo',
    capital: 'Goaso',
    majorTowns: ['Goaso', 'Duayaw Nkwanta', 'Bechem', 'Kenyasi', 'Mim'],
  },
  {
    region: 'Upper East',
    capital: 'Bolgatanga',
    majorTowns: ['Bolgatanga', 'Navrongo', 'Bawku', 'Paga', 'Zuarungu'],
  },
  {
    region: 'Upper West',
    capital: 'Wa',
    majorTowns: ['Wa', 'Nandom', 'Lawra', 'Jirapa', 'Tumu'],
  },
  {
    region: 'Oti',
    capital: 'Dambai',
    majorTowns: ['Dambai', 'Nkwanta', 'Jasikan', 'Kadjebi', 'Kete Krachi'],
  },
  {
    region: 'Savannah',
    capital: 'Damongo',
    majorTowns: ['Damongo', 'Salaga', 'Bole', 'Sawla', 'Daboya'],
  },
  {
    region: 'North East',
    capital: 'Nalerigu',
    majorTowns: ['Nalerigu', 'Gambaga', 'Walewale', 'Bunkpurugu', 'Chereponi'],
  },
  {
    region: 'Western North',
    capital: 'Sefwi Wiawso',
    majorTowns: ['Sefwi Wiawso', 'Bibiani', 'Juaboso', 'Bodi', 'Dadieso'],
  },
];

export function getCitiesByRegion(region: GhanaRegion): string[] {
  const reg = GHANA_REGIONS.find((r) => r.region === region);
  return reg ? reg.majorTowns : ['Central Town'];
}

export function getAllRegions(): GhanaRegion[] {
  return GHANA_REGIONS.map((r) => r.region);
}
