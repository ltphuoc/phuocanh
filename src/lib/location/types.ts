export type LocationProvider = 'mapbox' | 'nominatim';

export interface LocationDraft {
  readonly address: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly name: string;
  readonly provider: LocationProvider;
  readonly providerId: string;
}

export interface StoredLocation {
  readonly address: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly name: string | null;
  readonly provider: string | null;
  readonly providerId: string | null;
}
