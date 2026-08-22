export interface MapRegion {
  id: string;
  name: string;
  center: [number, number];
  zoom: number;
  color: string;
}

export interface MapDistrict {
  id: string;
  name: string;
  center: [number, number];
  zoom: number;
  color: string;
  polygon?: [number, number][];
}

export const UZBEKISTAN_REGIONS: MapRegion[] = [
  {
    id: "Qoraqalpog'iston",
    name: "Qoraqalpog'iston Respublikasi",
    center: [43.2, 59.0],
    zoom: 5.4,
    color: "#059669" // Emerald
  },
  {
    id: "Xorazm",
    name: "Xorazm viloyati",
    center: [41.5, 60.5],
    zoom: 7.3,
    color: "#0891b2" // Cyan
  },
  {
    id: "Navoiy",
    name: "Navoiy viloyati",
    center: [42.0, 63.8],
    zoom: 6.0,
    color: "#eab308" // Yellow
  },
  {
    id: "Buxoro",
    name: "Buxoro viloyati",
    center: [40.2, 63.0],
    zoom: 7.0,
    color: "#db2777" // Pink
  },
  {
    id: "Samarqand",
    name: "Samarqand viloyati",
    center: [39.7, 66.4],
    zoom: 7.8,
    color: "#4f46e5" // Indigo
  },
  {
    id: "Qashqadaryo",
    name: "Qashqadaryo viloyati",
    center: [38.8, 66.0],
    zoom: 7.5,
    color: "#ea580c" // Orange
  },
  {
    id: "Surxondaryo",
    name: "Surxondaryo viloyati",
    center: [38.0, 67.6],
    zoom: 8.0,
    color: "#dc2626" // Red
  },
  {
    id: "Jizzax",
    name: "Jizzax viloyati",
    center: [40.3, 67.7],
    zoom: 8.0,
    color: "#9333ea" // Purple
  },
  {
    id: "Sirdaryo",
    name: "Sirdaryo viloyati",
    center: [40.7, 68.7],
    zoom: 8.2,
    color: "#0d9488" // Teal
  },
  {
    id: "Toshkent",
    name: "Toshkent viloyati",
    center: [41.2, 69.8],
    zoom: 8.0,
    color: "#2563eb" // Blue
  },
  {
    id: "Namangan",
    name: "Namangan viloyati",
    center: [41.1, 71.3],
    zoom: 8.2,
    color: "#e11d48" // Rose
  },
  {
    id: "Farg'ona",
    name: "Farg'ona viloyati",
    center: [40.3, 71.4],
    zoom: 8.2,
    color: "#65a30d" // Lime
  },
  {
    id: "Andijon",
    name: "Andijon viloyati",
    center: [40.7, 72.5],
    zoom: 8.5,
    color: "#c026d3" // Fuchsia
  }
];


