# Map Components

This directory contains reusable map components for the admin portal, built with Leaflet for development and designed to switch to Google Maps for production.

## Components

### MapContainer
A basic map container component that displays an interactive map with markers.

**Props:**
- `center`: Map center coordinates [lat, lng]
- `zoom`: Initial zoom level (default: 13)
- `height`: Map height (default: 400)
- `width`: Map width (default: '100%')
- `markers`: Array of marker locations
- `onMarkerClick`: Callback when a marker is clicked
- `onMapClick`: Callback when the map is clicked
- `showControls`: Whether to show zoom controls (default: true)

**Usage:**
```tsx
import { MapContainer } from '@/components/Map';

<MapContainer
  center={[28.6139, 77.2090]}
  zoom={10}
  markers={[
    { lat: 28.6139, lng: 77.2090, title: 'Delhi', description: 'Capital of India' }
  ]}
  onMarkerClick={(marker) => console.log('Clicked:', marker)}
/>
```

### LocationPicker
A dialog component for selecting locations on a map with search functionality.

**Props:**
- `open`: Whether the dialog is open
- `onClose`: Callback to close the dialog
- `onLocationSelect`: Callback when a location is selected
- `initialLocation`: Initial map center (default: Delhi)
- `title`: Dialog title (default: 'Select Location')

**Usage:**
```tsx
import { LocationPicker } from '@/components/Map';

<LocationPicker
  open={isOpen}
  onClose={() => setIsOpen(false)}
  onLocationSelect={(location) => {
    console.log('Selected:', location.lat, location.lng);
  }}
  title="Select Warehouse Location"
/>
```

### WarehouseMap
A specialized map component for displaying warehouse locations with details.

**Props:**
- `warehouses`: Array of warehouse objects
- `selectedWarehouseId`: ID of currently selected warehouse
- `onWarehouseSelect`: Callback when a warehouse is selected
- `height`: Map height (default: 500)
- `showDetails`: Whether to show warehouse details (default: true)
- `center`: Optional map center override
- `zoom`: Map zoom level (default: 10)

**Usage:**
```tsx
import { WarehouseMap } from '@/components/Map';

<WarehouseMap
  warehouses={warehouses}
  selectedWarehouseId={selectedId}
  onWarehouseSelect={(warehouse) => setSelectedId(warehouse.id)}
  height={400}
/>
```

## Configuration

### Development vs Production
The map components automatically switch between providers based on the environment:

- **Development**: Uses Leaflet with OpenStreetMap tiles
- **Production**: Designed to use Google Maps (requires API key)

### Environment Variables
For production Google Maps integration, add to your `.env` file:
```
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### Map Configuration
Edit `src/config/maps.ts` to customize:
- Default map center and zoom
- Tile layer URLs and attribution
- Geocoding service settings
- Map styles and themes

## Services

### Geocoding Service
The `geocodingService` handles address search and reverse geocoding:

```tsx
import { geocodingService } from '@/services/geocodingService';

// Search for addresses
const results = await geocodingService.searchAddress('Delhi, India');

// Reverse geocode coordinates
const address = await geocodingService.reverseGeocode(28.6139, 77.2090);

// Get current location
const location = await geocodingService.getCurrentLocation();
```

## Features

### Current Features
- ✅ Interactive maps with Leaflet
- ✅ Marker support with popups
- ✅ Location picker with search
- ✅ Warehouse-specific map component
- ✅ Geocoding and reverse geocoding
- ✅ Current location detection
- ✅ Responsive design
- ✅ Environment-based provider switching

### Planned Features
- 🔄 Google Maps integration for production
- 🔄 Clustering for large numbers of markers
- 🔄 Route planning and directions
- 🔄 Geofencing capabilities
- 🔄 Offline map support
- 🔄 Custom marker icons
- 🔄 Heat maps for data visualization

## Dependencies

### Required Packages
```json
{
  "leaflet": "^1.9.4",
  "react-leaflet": "^4.2.1",
  "@types/leaflet": "^1.9.8"
}
```

### CSS Import
Make sure to import Leaflet CSS in your components:
```tsx
import 'leaflet/dist/leaflet.css';
```

## Troubleshooting

### Common Issues

1. **Markers not showing**: Make sure to import Leaflet CSS and fix default marker icons
2. **Map not loading**: Check console for tile layer errors
3. **Search not working**: Verify geocoding service configuration
4. **Production issues**: Ensure Google Maps API key is set correctly

### Marker Icon Fix
The components include a fix for default Leaflet markers:
```tsx
// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});
```

## Migration to Google Maps

When ready for production, follow these steps:

1. **Get Google Maps API Key**
   - Enable Maps JavaScript API
   - Enable Geocoding API
   - Set up billing and usage limits

2. **Update Configuration**
   ```tsx
   // In src/config/maps.ts
   export const mapConfig: MapConfig = {
     provider: 'google',
     apiKey: process.env.VITE_GOOGLE_MAPS_API_KEY,
     // ... other config
   };
   ```

3. **Install Google Maps Dependencies**
   ```bash
   npm install @googlemaps/react-wrapper @googlemaps/js-api-loader
   ```

4. **Create Google Maps Components**
   - Implement GoogleMapContainer
   - Update LocationPicker for Google Maps
   - Test all functionality

5. **Update Environment Variables**
   - Set production API key
   - Configure usage limits
   - Set up monitoring

## Performance Considerations

- Use marker clustering for large datasets
- Implement lazy loading for map components
- Cache geocoding results
- Optimize tile layer requests
- Consider using CDN for map assets

## Security Notes

- Never expose API keys in client-side code
- Use environment variables for sensitive data
- Implement rate limiting for geocoding requests
- Validate all user inputs for location data
- Consider using server-side geocoding for sensitive operations