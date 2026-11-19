import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CustomDropdown, DropdownOption } from '../common/CustomDropdown';
import { REGION_INFOS } from '../../data/regionInfos';

interface MapBreadcrumbsProps {
  breadcrumbItems: string[];
  handleBreadcrumbBack: () => void;
  filterLocation?: string;
  setFilterLocation?: (loc: string) => void;
}

const REGION_OPTIONS = [
  { id: 'Toshkent shahri', nameUz: 'Toshkent shahri', nameRu: 'г. Ташкент', nameEn: 'Tashkent city' },
  { id: 'Toshkent viloyati', nameUz: 'Toshkent viloyati', nameRu: 'Ташкентская область', nameEn: 'Tashkent region' },
  { id: 'Samarqand viloyati', nameUz: 'Samarqand viloyati', nameRu: 'Самаркандская область', nameEn: 'Samarkand region' },
  { id: 'Buxoro viloyati', nameUz: 'Buxoro viloyati', nameRu: 'Бухарская область', nameEn: 'Bukhara region' },
  { id: 'Andijon viloyati', nameUz: 'Andijon viloyati', nameRu: 'Андижанская область', nameEn: 'Andijan region' },
  { id: "Farg'ona viloyati", nameUz: "Farg'ona viloyati", nameRu: 'Ферганская область', nameEn: 'Fergana region' },
  { id: 'Namangan viloyati', nameUz: 'Namangan viloyati', nameRu: 'Наманганская область', nameEn: 'Namangan region' },
  { id: 'Jizzax viloyati', nameUz: 'Jizzax viloyati', nameRu: 'Джизакская область', nameEn: 'Jizzakh region' },
  { id: 'Sirdaryo viloyati', nameUz: 'Sirdaryo viloyati', nameRu: 'Сырдарьинская область', nameEn: 'Sirdarya region' },
  { id: 'Qashqadaryo viloyati', nameUz: 'Qashqadaryo viloyati', nameRu: 'Кашкадарьинская область', nameEn: 'Kashkadarya region' },
  { id: 'Surxondaryo viloyati', nameUz: 'Surxondaryo viloyati', nameRu: 'Сурхандарьинская область', nameEn: 'Surkhandarya region' },
  { id: 'Navoiy viloyati', nameUz: 'Navoiy viloyati', nameRu: 'Навоийская область', nameEn: 'Navoiy region' },
  { id: 'Xorazm viloyati', nameUz: 'Xorazm viloyati', nameRu: 'Хорезмская область', nameEn: 'Khorezm region' },
  { id: "Qoraqalpog'iston Respublikasi", nameUz: "Qoraqalpog'iston Respublikasi", nameRu: 'Республика Каракалпакстан', nameEn: 'Republic of Karakalpakstan' },
];

export const MapBreadcrumbs: React.FC<MapBreadcrumbsProps> = ({
  breadcrumbItems,
  handleBreadcrumbBack,
  filterLocation: propFilterLocation,
  setFilterLocation: propSetFilterLocation,
}) => {
  const { language, filterLocation: appFilterLocation, setFilterLocation: appSetFilterLocation } = useApp();

  const filterLocation = propFilterLocation ?? appFilterLocation;
  const setFilterLocation = propSetFilterLocation ?? appSetFilterLocation;

  const currentRegion = breadcrumbItems[1] || '';
  const currentDistrict = breadcrumbItems[2] || '';

  // 1. Build Region Dropdown Options
  const regionDropdownOptions: DropdownOption[] = REGION_OPTIONS.map((reg) => {
    const label = language === 'ru' ? reg.nameRu : language === 'en' ? reg.nameEn : reg.nameUz;
    return {
      value: reg.nameUz,
      label,
    };
  });

  // Find active region value in REGION_OPTIONS
  const activeRegionValue = (() => {
    if (!currentRegion) return '';
    const match = REGION_OPTIONS.find(
      (r) =>
        r.nameUz.toLowerCase() === currentRegion.toLowerCase() ||
        r.id.toLowerCase() === currentRegion.toLowerCase() ||
        currentRegion.toLowerCase().includes(r.id.toLowerCase())
    );
    return match ? match.nameUz : currentRegion;
  })();

  // 2. Build District Dropdown Options for the active region
  const matchedRegionInfo = REGION_INFOS.find((r) =>
    currentRegion.toLowerCase().includes(r.id.toLowerCase())
  );

  const districtDropdownOptions: DropdownOption[] = (() => {
    if (!matchedRegionInfo) return [];

    const allDistrictsLabel =
      language === 'ru'
        ? 'Все районы'
        : language === 'en'
        ? 'All districts'
        : 'Barcha tumanlar';

    const options: DropdownOption[] = [
      {
        value: activeRegionValue || currentRegion,
        label: allDistrictsLabel,
      },
    ];

    matchedRegionInfo.districtsUz.forEach((distUz, idx) => {
      const distLabel =
        language === 'ru' && matchedRegionInfo.districtsRu?.[idx]
          ? matchedRegionInfo.districtsRu[idx]
          : language === 'en' && matchedRegionInfo.districtsEn?.[idx]
          ? matchedRegionInfo.districtsEn[idx]
          : distUz;

      options.push({
        value: distUz,
        label: distLabel,
      });
    });

    return options;
  })();

  const activeDistrictValue = currentDistrict || activeRegionValue || currentRegion;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      className="absolute top-4 left-4 z-30 flex items-center gap-1.5 bg-white/95 text-slate-800 px-3 py-1.5 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.10)] backdrop-blur-md animate-fade-in max-w-[calc(100%-32px)] border border-slate-200/90 transition-all duration-300 ease-in-out h-11"
    >
      {/* Back button */}
      <button
        type="button"
        onClick={handleBreadcrumbBack}
        className="flex items-center justify-center p-1.5 text-brand-primary hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
        title={language === 'ru' ? 'Назад' : language === 'en' ? 'Back' : 'Orqaga'}
        aria-label={language === 'ru' ? 'Назад' : language === 'en' ? 'Back' : 'Orqaga'}
      >
        <ArrowLeft size={16} className="stroke-[2.5px]" aria-hidden="true" />
      </button>

      {/* Country root: O'zbekiston */}
      <button
        type="button"
        onClick={() => setFilterLocation('Barchasi')}
        className="text-xs font-semibold text-slate-500 hover:text-brand-primary hover:bg-slate-100/70 px-2 py-1 rounded-lg transition-colors cursor-pointer shrink-0"
        title={language === 'ru' ? 'Узбекистан' : language === 'en' ? 'Uzbekistan' : "O'zbekiston"}
      >
        {language === 'ru' ? 'Узбекистан' : language === 'en' ? 'Uzbekistan' : "O'zbekiston"}
      </button>

      {/* Region segment & dropdown */}
      {currentRegion && (
        <>
          <span className="text-slate-300 text-xs font-semibold shrink-0" aria-hidden="true">
            /
          </span>
          <CustomDropdown
            variant="pill"
            value={activeRegionValue}
            onChange={(val) => setFilterLocation(val)}
            options={regionDropdownOptions}
            aria-label={language === 'ru' ? 'Регион' : language === 'en' ? 'Region' : 'Viloyat'}
            minWidth={200}
            className="shrink-0"
          />
        </>
      )}

      {/* District segment & dropdown */}
      {currentRegion && districtDropdownOptions.length > 0 && (
        <>
          <span className="text-slate-300 text-xs font-semibold shrink-0" aria-hidden="true">
            /
          </span>
          <CustomDropdown
            variant="pill"
            value={activeDistrictValue}
            onChange={(val) => setFilterLocation(val)}
            options={districtDropdownOptions}
            aria-label={language === 'ru' ? 'Район' : language === 'en' ? 'District' : 'Tuman'}
            minWidth={210}
            className="shrink-0"
          />
        </>
      )}
    </div>
  );
};
