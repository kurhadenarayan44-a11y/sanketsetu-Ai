import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Search, X, Check, Navigation } from 'lucide-react';
import L from 'leaflet';

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (locationName: string, lat?: number, lon?: number) => void;
  currentLocationName?: string;
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectLocation,
  currentLocationName = ''
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [searchQuery, setSearchQuery] = useState(currentLocationName);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [resolvedAddress, setResolvedAddress] = useState(currentLocationName);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Default center: Pune, India (18.5204, 73.8567) or world center
    const defaultLat = 18.5204;
    const defaultLng = 73.8567;

    const timer = setTimeout(() => {
      if (mapContainerRef.current && !mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current).setView([defaultLat, defaultLng], 13);

        // OpenStreetMap Tile Layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);

        // Custom pin icon
        const pinIcon = L.divIcon({
          className: 'custom-pin',
          html: `<div style="background-color: #22D3EE; width: 14px; height: 14px; border-radius: 50%; border: 3px solid #0B1020; box-shadow: 0 0 10px #22D3EE;"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        });

        // Click handler to pin coordinates
        map.on('click', async (e: L.LeafletMouseEvent) => {
          const { lat, lng } = e.latlng;
          setSelectedCoords({ lat, lng });

          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          } else {
            markerRef.current = L.marker([lat, lng], { icon: pinIcon }).addTo(map);
          }

          // Reverse geocode via Nominatim
          try {
            const resp = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
            );
            if (resp.ok) {
              const data = await resp.json();
              const addr = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
              setResolvedAddress(addr);
              setSearchQuery(addr);
            }
          } catch {
            setResolvedAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          }
        });

        mapInstanceRef.current = map;
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [isOpen]);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !mapInstanceRef.current) return;
    setIsSearching(true);
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`
      );
      if (resp.ok) {
        const results = await resp.json();
        if (results && results.length > 0) {
          const lat = parseFloat(results[0].lat);
          const lon = parseFloat(results[0].lon);
          mapInstanceRef.current.setView([lat, lon], 15);
          setSelectedCoords({ lat, lng: lon });

          const pinIcon = L.divIcon({
            className: 'custom-pin',
            html: `<div style="background-color: #22D3EE; width: 14px; height: 14px; border-radius: 50%; border: 3px solid #0B1020; box-shadow: 0 0 10px #22D3EE;"></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7]
          });

          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lon]);
          } else {
            markerRef.current = L.marker([lat, lon], { icon: pinIcon }).addTo(mapInstanceRef.current);
          }
          setResolvedAddress(results[0].display_name);
        }
      }
    } catch (e) {
      console.warn('Geocoding search failed:', e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleBrowserGPS = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setSelectedCoords({ lat: latitude, lng: longitude });
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 16);
          const pinIcon = L.divIcon({
            className: 'custom-pin',
            html: `<div style="background-color: #10B981; width: 14px; height: 14px; border-radius: 50%; border: 3px solid #0B1020; box-shadow: 0 0 10px #10B981;"></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7]
          });
          if (markerRef.current) {
            markerRef.current.setLatLng([latitude, longitude]);
          } else {
            markerRef.current = L.marker([latitude, longitude], { icon: pinIcon }).addTo(mapInstanceRef.current);
          }
          setResolvedAddress(`GPS Location (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`);
          setSearchQuery(`GPS Location (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`);
        }
      },
      (err) => console.warn('GPS position error:', err),
      { timeout: 5000 }
    );
  };

  const handleConfirm = () => {
    const finalName = resolvedAddress || searchQuery || 'Verified Coordinates';
    onSelectLocation(finalName, selectedCoords?.lat, selectedCoords?.lng);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl rounded-2xl border border-navy-700 bg-navy-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-800">
          <div className="flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-cyan-accent" />
            <h3 className="text-base font-semibold text-slate-100">
              OpenStreetMap Geographic Pinpoint
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-navy-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search controls */}
        <div className="p-4 bg-navy-850/80 border-b border-navy-800 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search landmark, college, street, or junction..."
              className="w-full bg-navy-900 border border-navy-700 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-accent"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors"
            >
              {isSearching ? 'Searching...' : 'Locate'}
            </button>
            <button
              onClick={handleBrowserGPS}
              type="button"
              className="flex items-center space-x-1 px-3 py-2 bg-navy-800 hover:bg-navy-700 border border-navy-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
              title="Use current GPS location"
            >
              <Navigation className="w-3.5 h-3.5 text-cyan-accent" />
              <span>My GPS</span>
            </button>
          </div>
        </div>

        {/* Map Body */}
        <div className="relative flex-1 min-h-[350px] w-full bg-navy-950">
          <div ref={mapContainerRef} className="w-full h-full" />
        </div>

        {/* Footer info & confirm */}
        <div className="p-4 bg-navy-900 border-t border-navy-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs">
            <div className="text-slate-400 font-mono">
              Selected Point: <span className="text-cyan-accent">{selectedCoords ? `${selectedCoords.lat.toFixed(5)}, ${selectedCoords.lng.toFixed(5)}` : 'Click anywhere on map to pin'}</span>
            </div>
            <div className="text-slate-300 truncate max-w-md text-[11px] mt-0.5">
              {resolvedAddress}
            </div>
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-navy-800"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="flex items-center space-x-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-navy-950 font-semibold rounded-lg text-xs transition-colors shadow-glow-cyan"
            >
              <Check className="w-4 h-4" />
              <span>Confirm Location</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
