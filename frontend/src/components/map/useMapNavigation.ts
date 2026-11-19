import { UZBEKISTAN_REGIONS } from './mapConstants';
import { areDistrictNamesEqual, isRegionName } from './mapUtils';

interface UseMapNavigationProps {
  filterLocation: string;
  setFilterLocation: (loc: string) => void;
  districtsGeoJsonData: any;
  panToCoords: (lat: number, lng: number, zoom: number) => void;
}

export const useMapNavigation = ({
  filterLocation,
  setFilterLocation,
  districtsGeoJsonData,
  panToCoords,
}: UseMapNavigationProps) => {
  const isRegion = isRegionName(filterLocation);

  const selectedRegion = (isRegion && filterLocation !== 'Toshkent shahri')
    ? UZBEKISTAN_REGIONS.find(r => 
        filterLocation.toLowerCase() === r.id.toLowerCase() ||
        filterLocation.toLowerCase() === r.name.toLowerCase() ||
        filterLocation.toLowerCase().replace(/['’'`‘]/g, '') === r.id.toLowerCase().replace(/['’'`‘]/g, '') ||
        filterLocation.toLowerCase().includes(r.id.toLowerCase() + ' viloyati') ||
        filterLocation.toLowerCase().includes(r.name.toLowerCase())
      )
    : undefined;

  const breadcrumbItems = (() => {
    if (filterLocation === 'Barchasi') return [];
    const items = ["O'zbekiston"];

    if (filterLocation === 'Toshkent shahri') {
      items.push('Toshkent shahri');
    } else if (isRegion && selectedRegion) {
      items.push(selectedRegion.name);
    } else {
      const matchedDistrict = districtsGeoJsonData?.features?.find((f: any) => 
        f.properties && areDistrictNamesEqual(filterLocation, f.properties.shapeName || "")
      );

      if (matchedDistrict?.properties?.regionId) {
        const parentRegion = UZBEKISTAN_REGIONS.find(r => r.id === matchedDistrict.properties.regionId);
        if (parentRegion) {
          items.push(parentRegion.name);
        } else {
          items.push("Toshkent viloyati");
        }
      } else {
        const isTashkentCityDistrict = [
          'yunusobod', 'chilonzor', 'bektemir', 'mirzo ulug', 'mirobod', 
          'yashnobod', 'shayxontohur', 'uchtepa', 'yakkasaroy', 'olmazor', 
          'sergeli', 'yangihayot'
        ].some(name => filterLocation.toLowerCase().includes(name));

        items.push(isTashkentCityDistrict ? "Toshkent shahri" : "Toshkent viloyati");
      }
      items.push(filterLocation);
    }
    return items;
  })();

  const handleBreadcrumbBack = () => {
    if (isRegion || filterLocation.toLowerCase() === 'toshkent shahri') {
      setFilterLocation('Barchasi');
      return;
    }

    const isTashkentCityDistrict = [
      'yunusobod', 'chilonzor', 'bektemir', 'mirzo ulug', 'mirobod', 
      'yashnobod', 'shayxontohur', 'uchtepa', 'yakkasaroy', 'olmazor', 
      'sergeli', 'yangihayot'
    ].some(name => filterLocation.toLowerCase().includes(name));

    if (isTashkentCityDistrict) {
      setFilterLocation('Toshkent shahri');
      return;
    }

    const matchedDistrict = districtsGeoJsonData?.features?.find((f: any) => 
      f.properties && areDistrictNamesEqual(filterLocation, f.properties.shapeName || "")
    );
    
    if (matchedDistrict?.properties?.regionId) {
      const parentRegion = UZBEKISTAN_REGIONS.find(r => r.id === matchedDistrict.properties.regionId);
      if (parentRegion) {
        setFilterLocation(parentRegion.name || parentRegion.id);
        return;
      }
    }
    
    setFilterLocation('Barchasi');
  };

  return {
    selectedRegion,
    breadcrumbItems,
    handleBreadcrumbBack,
  };
};
