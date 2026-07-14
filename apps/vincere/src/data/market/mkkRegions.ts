import type { MarketRegion } from '../../domain/market/marketTypes';

export const MKK_REGIONS: MarketRegion[] = [
  {
    id: 'bruchkoebel',
    municipality: 'Bruchköbel',
    district: 'Main-Kinzig-Kreis',
    postalCodes: ['63486'],
    subdivisions: ['Bruchköbel', 'Butterstadt', 'Niederissigheim', 'Oberissigheim', 'Roßdorf'],
    aliases: ['bruchkoebel', 'bruchköbel', 'rossdorf bruchkoebel', 'roßdorf bruchköbel'],
  },
  {
    id: 'hanau',
    municipality: 'Hanau',
    district: 'Main-Kinzig-Kreis',
    postalCodes: ['63450', '63452', '63454', '63456', '63457'],
    subdivisions: ['Innenstadt', 'Kesselstadt', 'Großauheim', 'Klein-Auheim', 'Steinheim', 'Mittelbuchen', 'Wolfgang', 'Lamboy'],
    aliases: ['hanau', 'grossauheim', 'großauheim', 'klein auheim', 'klein-auheim'],
  },
  {
    id: 'schoeneck',
    municipality: 'Schöneck',
    district: 'Main-Kinzig-Kreis',
    postalCodes: ['61137'],
    subdivisions: ['Büdesheim', 'Kilianstädten', 'Oberdorfelden'],
    aliases: ['schoeneck', 'schöneck', 'buedesheim', 'büdesheim', 'kilianstaedten', 'kilianstädten'],
  },
  {
    id: 'nidderau',
    municipality: 'Nidderau',
    district: 'Main-Kinzig-Kreis',
    postalCodes: ['61130'],
    subdivisions: ['Eichen', 'Erbstadt', 'Heldenbergen', 'Ostheim', 'Windecken'],
    aliases: ['nidderau', 'heldenbergen', 'windecken'],
  },
  {
    id: 'erlensee',
    municipality: 'Erlensee',
    district: 'Main-Kinzig-Kreis',
    postalCodes: ['63526'],
    subdivisions: ['Langendiebach', 'Rückingen'],
    aliases: ['erlensee', 'langendiebach', 'rueckingen', 'rückingen'],
  },
  {
    id: 'langenselbold',
    municipality: 'Langenselbold',
    district: 'Main-Kinzig-Kreis',
    postalCodes: ['63505'],
    subdivisions: [],
    aliases: ['langenselbold'],
  },
  {
    id: 'maintal',
    municipality: 'Maintal',
    district: 'Main-Kinzig-Kreis',
    postalCodes: ['63477'],
    subdivisions: ['Bischofsheim', 'Dörnigheim', 'Hochstadt', 'Wachenbuchen'],
    aliases: ['maintal', 'doernigheim', 'dörnigheim', 'wachenbuchen'],
  },
  {
    id: 'neuberg',
    municipality: 'Neuberg',
    district: 'Main-Kinzig-Kreis',
    postalCodes: ['63543'],
    subdivisions: ['Ravolzhausen', 'Rüdigheim'],
    aliases: ['neuberg', 'ravolzhausen', 'ruedigheim', 'rüdigheim'],
  },
  {
    id: 'hammersbach',
    municipality: 'Hammersbach',
    district: 'Main-Kinzig-Kreis',
    postalCodes: ['63546'],
    subdivisions: ['Langen-Bergheim', 'Marköbel'],
    aliases: ['hammersbach', 'langen bergheim', 'langen-bergheim', 'markoebel', 'marköbel'],
  },
  {
    id: 'rodenbach',
    municipality: 'Rodenbach',
    district: 'Main-Kinzig-Kreis',
    postalCodes: ['63517'],
    subdivisions: ['Niederrodenbach', 'Oberrodenbach'],
    aliases: ['rodenbach', 'niederrodenbach', 'oberrodenbach'],
  },
  {
    id: 'freigericht',
    municipality: 'Freigericht',
    district: 'Main-Kinzig-Kreis',
    postalCodes: ['63579'],
    subdivisions: ['Altenmittlau', 'Bernbach', 'Horbach', 'Neuses', 'Somborn'],
    aliases: ['freigericht', 'altenmittlau', 'somborn'],
  },
  {
    id: 'gelnhausen',
    municipality: 'Gelnhausen',
    district: 'Main-Kinzig-Kreis',
    postalCodes: ['63571'],
    subdivisions: ['Gelnhausen', 'Hailer', 'Haitz', 'Höchst', 'Meerholz', 'Roth'],
    aliases: ['gelnhausen', 'hailer', 'haitz', 'meerholz'],
  },
];

function fold(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('de-DE')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function findMarketRegion(input: string | undefined): MarketRegion | undefined {
  if (!input?.trim()) return undefined;
  const normalized = fold(input);

  return MKK_REGIONS.find((region) => {
    const candidates = [
      region.id,
      region.municipality,
      ...region.postalCodes,
      ...region.subdivisions,
      ...region.aliases,
    ];
    return candidates.some((candidate) => fold(candidate) === normalized);
  });
}

export function normalizeMarketRegion(input: string | undefined) {
  const region = findMarketRegion(input);
  return region ? { regionId: region.id, municipality: region.municipality } : undefined;
}

export function findSubdivision(regionId: string, input: string | undefined) {
  if (!input?.trim()) return undefined;
  const region = MKK_REGIONS.find((item) => item.id === regionId);
  const normalized = fold(input);
  return region?.subdivisions.find((subdivision) => fold(subdivision) === normalized);
}
