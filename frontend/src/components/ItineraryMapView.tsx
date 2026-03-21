import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { type Itinerary } from "@/types";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

interface Props {
  itinerary: Itinerary;
  onPinClick: (stop: any) => void;
  selectedStopId?: string;
}

export default function ItineraryMapView({ itinerary, onPinClick, selectedStopId }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});

  useEffect(() => {
    if (!mapContainer.current || !itinerary || !itinerary.stops || !itinerary.stops.length) return;
    
    const lngs = itinerary.stops.map(s => s.lng);
    const lats = itinerary.stops.map(s => s.lat);
    const bounds = new mapboxgl.LngLatBounds(
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)]
    );

    if (!map.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/standard",
        bounds,
        fitBoundsOptions: { padding: 100 }
      });
      map.current.on('style.load', () => {
        map.current?.setConfigProperty('basemap', 'lightPreset', 'dawn');
      });
      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
    } else {
      if (!selectedStopId) {
        map.current.fitBounds(bounds, { padding: 100 });
      }
    }

    // Clear old markers
    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};

    itinerary.stops.forEach((stop, index) => {
      const el = document.createElement("div");
      const isSelected = stop.id === selectedStopId;
      
      el.className = "marker";
      el.style.background = "transparent";
      el.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#EF4444" style="
          width: ${isSelected ? '36px' : '28px'};
          height: ${isSelected ? '36px' : '28px'};
          filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));
          transform: translateY(${isSelected ? '-8px' : '0px'});
          transition: all 0.2s ease;
          cursor: pointer;
        ">
          <path d="M12 2C8.13 2 5 5.14 5 9.04c0 4.19 6.2 12.24 6.64 12.82a.5.5 0 00.72 0C12.8 21.28 19 13.23 19 9.04 19 5.14 15.87 2 12 2zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/>
        </svg>
      `;

      el.addEventListener("click", () => {
        onPinClick(stop);
      });

      const marker = new mapboxgl.Marker(el)
        .setLngLat([stop.lng, stop.lat])
        .addTo(map.current!);
      
      markersRef.current[stop.id] = marker;
    });

    if (selectedStopId && map.current) {
      const selected = itinerary.stops.find(s => s.id === selectedStopId);
      if (selected) {
        map.current.flyTo({ center: [selected.lng, selected.lat], zoom: 13, duration: 1500 });
      }
    }

  }, [itinerary, selectedStopId]);

  return <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />;
}
