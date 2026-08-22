import L from 'leaflet';

export const createClusterIcon = (cluster: any, map: L.Map) => {
  const count = cluster.getChildCount();
  const currentZoom = map.getZoom();

  let size = 26;
  let fontSize = '10px';
  let borderWidth = '2px';
  let shadowClass = 'shadow-[0_4px_12px_rgba(0,6,102,0.3)]';

  if (currentZoom < 4.0) {
    size = 14;
    fontSize = '7px';
    borderWidth = '1px';
    shadowClass = 'shadow-2xs';
  } else if (currentZoom < 4.8) {
    size = 17;
    fontSize = '8px';
    borderWidth = '1.2px';
    shadowClass = 'shadow-xs';
  } else if (currentZoom < 5.8) {
    size = 20;
    fontSize = '9px';
    borderWidth = '1.5px';
    shadowClass = 'shadow-xs';
  } else if (currentZoom < 7.0) {
    size = 23;
    fontSize = '9.5px';
    borderWidth = '1.8px';
    shadowClass = 'shadow-md';
  }

  const lineHeight = `${size - 3}px`;
  const half = size / 2;

  return L.divIcon({
    html: `
      <div class="flex items-center justify-center rounded-full text-white font-extrabold ${shadowClass} select-none transition-all duration-200 hover:scale-105" 
           style="width: ${size}px; height: ${size}px; background-color: var(--color-brand-primary); line-height: ${lineHeight}; font-size: ${fontSize}; border: ${borderWidth} solid white;">
        ${count}
      </div>
    `,
    className: 'custom-cluster-marker',
    iconSize: [size, size],
    iconAnchor: [half, half]
  });
};
