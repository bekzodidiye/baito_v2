import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useUzbekistanGeoJson, getDistrictMetaList } from '../components/map/useUzbekistanGeoJson';
import { translateRegion, Language } from '../translations';
import { 
  REGIONS_LIST, 
  RegionListItem 
} from '../components/map/regionData';

export const useRegionSelector = () => {
  const { showRegionSelector, setShowRegionSelector, setFilterLocation, language } = useApp();

  const { districtsGeoJsonData } = useUzbekistanGeoJson();
  const [searchText, setSearchText] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<RegionListItem | null>(null);

  const getRegionCountText = (countStr: string, lang: Language) => {
    if (lang === 'uz') return countStr;
    const num = countStr.split('+')[0] || '';
    return lang === 'ru' ? `${num}+ вакансий` : `${num}+ job openings`;
  };

  const districtMetaList = useMemo(() => {
    return getDistrictMetaList(districtsGeoJsonData);
  }, [districtsGeoJsonData]);

  const filteredRegions = useMemo(() => {
    const term = searchText.toLowerCase().trim();
    if (!term) return REGIONS_LIST;
    return REGIONS_LIST.filter(r => 
      r.name.toLowerCase().includes(term)
    );
  }, [searchText]);

  const selectedRegionDistricts = useMemo(() => {
    if (!selectedRegion || districtMetaList.length === 0) return [];

    let rawDistricts: string[] = [];

    if (selectedRegion.isTashkentCity) {
      rawDistricts = districtMetaList
        .filter(d => d.parentRegion === "Toshkent shahri")
        .map(d => d.shapeName);
    } else if (selectedRegion.isTashkentViloyat) {
      rawDistricts = districtMetaList
        .filter(d => d.parentRegion === "Toshkent viloyati")
        .map(d => d.shapeName);
    } else {
      rawDistricts = districtMetaList
        .filter(d => d.regionId === selectedRegion.id)
        .map(d => d.shapeName);
    }

    return Array.from(new Set(rawDistricts)).sort((a, b) => a.localeCompare(b));
  }, [selectedRegion, districtMetaList]);

  const filteredDistricts = useMemo(() => {
    const term = searchText.toLowerCase().trim();
    if (!term) return selectedRegionDistricts;
    return selectedRegionDistricts.filter(d => 
      d.toLowerCase().includes(term)
    );
  }, [selectedRegionDistricts, searchText]);

  const searchResults = useMemo(() => {
    const term = searchText.toLowerCase().trim();
    if (!term) return [];
    const matches: { isRegion: boolean; name: string; subtitle?: string; value: string }[] = [];

    REGIONS_LIST.forEach(r => {
      if (r.name.toLowerCase().includes(term)) {
        matches.push({ isRegion: true, name: r.name, subtitle: "Viloyat", value: r.name });
      }
    });

    if ("toshkent shahri".includes(term)) {
      matches.push({
        isRegion: true,
        name: "Toshkent shahri",
        subtitle: "Toshkent viloyati tarkibida (Poytaxt)",
        value: "Toshkent shahri"
      });
    }

    districtMetaList.forEach(meta => {
      if (meta.shapeName.toLowerCase().includes(term)) {
        matches.push({
          isRegion: false,
          name: meta.shapeName,
          subtitle: meta.parentRegion,
          value: meta.shapeName
        });
      }
    });

    const seen = new Set<string>();
    return matches.filter(m => {
      const key = m.name + '|' + (m.subtitle || '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [searchText, districtMetaList]);

  const handleItemClick = (locationName: string) => {
    setShowRegionSelector(false);
    setSearchText('');
    setSelectedRegion(null);
    setTimeout(() => {
      setFilterLocation(locationName);
    }, 15);
  };

  const handleBackClick = () => {
    if (selectedRegion) {
      if (selectedRegion.isTashkentCity) {
        const tashkentViloyatItem = REGIONS_LIST.find(r => r.id === "Toshkent");
        setSelectedRegion(tashkentViloyatItem || null);
      } else {
        setSelectedRegion(null);
      }
      setSearchText('');
    } else {
      setShowRegionSelector(false);
    }
  };

  const closeSelector = () => {
    setShowRegionSelector(false);
    setSearchText('');
    setSelectedRegion(null);
  };

  return {
    showRegionSelector,
    language,
    searchText,
    setSearchText,
    selectedRegion,
    setSelectedRegion,
    filteredRegions,
    filteredDistricts,
    searchResults,
    getRegionCountText,
    handleItemClick,
    handleBackClick,
    closeSelector
  };
};
