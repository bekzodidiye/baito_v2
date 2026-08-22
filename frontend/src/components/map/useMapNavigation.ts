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
  const selectedRegion = filterLocation === 'Toshkent shahri'
    ? undefined
    : UZBEKISTAN_REGIONS.find(r => 
        filterLocation.toLowerCase().includes(r.id.toLowerCase()) ||
        filterLocation.toLowerCase().includes(r.name.toLowerCase())
      );

  const breadcrumbItems = (() => {
    if (filterLocation === 'Barchasi') return [];
    const items = ["O'zbekiston"];

    if (filterLocation === 'Toshkent shahri') {
      items.push('Toshkent shahri');
    } else if (selectedRegion) {
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
    const isRegion = isRegionName(filterLocation) || filterLocation.toLowerCase() === 'toshkent shahri';

    if (isRegion) {
      setFilterLocation('Barchasi');
      panToCoords(41.2, 64.0, 5.1);
      return;
    }

    const isTashkentCityDistrict = [
      'yunusobod', 'chilonzor', 'bektemir', 'mirzo ulug', 'mirobod', 
      'yashnobod', 'shayxontohur', 'uchtepa', 'yakkasaroy', 'olmazor', 
      'sergeli', 'yangihayot'
    ].some(name => filterLocation.toLowerCase().includes(name));

    if (isTashkentCityDistrict) {
      setFilterLocation('Toshkent shahri');
      panToCoords(41.311081, 69.275, 11);
      return;
    }

    const matchedDistrict = districtsGeoJsonData?.features?.find((f: any) => 
      f.properties && areDistrictNamesEqual(filterLocation, f.properties.shapeName || "")
    );
    
    if (matchedDistrict?.properties?.regionId) {
      const parentRegion = UZBEKISTAN_REGIONS.find(r => r.id === matchedDistrict.properties.regionId);
      if (parentRegion) {
        setFilterLocation(parentRegion.id);
        if (parentRegion.center) {
          panToCoords(parentRegion.center[0], parentRegion.center[1], parentRegion.zoom);
        }
        return;
      }
    }
    
    setFilterLocation('Barchasi');
    panToCoords(41.2, 64.0, 5.1);
  };

  return {
    selectedRegion,
    breadcrumbItems,
    handleBreadcrumbBack,
  };
};
