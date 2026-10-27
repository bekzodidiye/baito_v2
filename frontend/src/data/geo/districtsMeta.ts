import districtsData from './uzbekistan_districts_meta.json';

export interface DistrictMeta {
  shapeName: string;
  regionId: string;
  parentRegion: string;
}

export const defaultDistrictsMeta: DistrictMeta[] = districtsData as DistrictMeta[];
