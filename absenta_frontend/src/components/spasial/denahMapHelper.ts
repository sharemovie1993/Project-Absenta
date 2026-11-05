export interface SearchResultItem {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

/**
 * Mem-parsing string input koordinat dari Google Maps.
 * Mendukung format:
 * 1. "-6.837123, 108.225456" atau "-6.837123,108.225456"
 * 2. URL Google Maps: "https://www.google.com/maps/@-6.837123,108.225456,18z" atau "...?q=-6.837,108.225"
 * 3. Format DMS: "6°50'13.6"S 108°13'31.6"E"
 */
export function parseGoogleMapsCoordinates(input: string): { lat: number; lng: number } | null {
  const clean = input.trim();
  if (!clean) return null;

  // 1. Google Maps URL pattern: /@(-?\d+\.\d+),(-?\d+\.\d+)/
  const urlAtMatch = clean.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (urlAtMatch) {
    const lat = parseFloat(urlAtMatch[1]);
    const lng = parseFloat(urlAtMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  // 2. Google Maps Query parameter: q=(-?\d+\.\d+),(-?\d+\.\d+)
  const urlQMatch = clean.match(/[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (urlQMatch) {
    const lat = parseFloat(urlQMatch[1]);
    const lng = parseFloat(urlQMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  // 3. Standard comma / space separated: "-6.837123, 108.225456"
  const commaMatch = clean.match(/(-?\d{1,3}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)/);
  if (commaMatch) {
    const lat = parseFloat(commaMatch[1]);
    const lng = parseFloat(commaMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  // 4. DMS (Degrees Minutes Seconds): 6°50'13.6"S 108°13'31.6"E
  const dmsMatch = clean.match(
    /(\d+)°(\d+)'([\d.]+)"([NS])[,\s]+(\d+)°(\d+)'([\d.]+)"([EW])/i
  );
  if (dmsMatch) {
    let lat = parseInt(dmsMatch[1], 10) + parseInt(dmsMatch[2], 10) / 60 + parseFloat(dmsMatch[3]) / 3600;
    if (dmsMatch[4].toUpperCase() === 'S') lat = -lat;
    let lng = parseInt(dmsMatch[5], 10) + parseInt(dmsMatch[6], 10) / 60 + parseFloat(dmsMatch[7]) / 3600;
    if (dmsMatch[8].toUpperCase() === 'W') lng = -lng;
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  return null;
}

function isValidLatLng(lat: number, lng: number): boolean {
  return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}
