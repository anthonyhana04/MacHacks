export interface ItineraryStop {
  id: string;
  name: string;
  description: string;
  time: string;
  duration: string;
  lat: number;
  lng: number;
  image?: string;
  rating?: number;
}

export interface Itinerary {
  id: string;
  title: string;
  mainImage: string;
  days: number;
  totalCost: string;
  stops: ItineraryStop[];
  media: { id: string; title: string; thumbnail: string }[];
}
