import React, { useEffect, useRef } from 'react';
import { MapContainer as LeafletMapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Box, Paper, Typography } from '@mui/material';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export interface MapLocation {
  lat: number;
  lng: number;
  title?: string;
  description?: string;
  id?: string;
}

export interface MapContainerProps {
  center: [number, number];
  zoom?: number;
  height?: string | number;
  width?: string | number;
  markers?: MapLocation[];
  onMarkerClick?: (marker: MapLocation) => void;
  onMapClick?: (lat: number, lng: number) => void;
  showControls?: boolean;
  className?: string;
}

// Component to handle map events
const MapEventHandler: React.FC<{ onMapClick?: (lat: number, lng: number) => void }> = ({ onMapClick }) => {
  const map = useMap();

  useEffect(() => {
    if (onMapClick) {
      const handleClick = (e: L.LeafletMouseEvent) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      };

      map.on('click', handleClick);

      return () => {
        map.off('click', handleClick);
      };
    }
  }, [map, onMapClick]);

  return null;
};

// Component to handle map center updates
const MapCenterUpdater: React.FC<{ center: [number, number]; zoom?: number }> = ({ center, zoom }) => {
  const map = useMap();

  useEffect(() => {
    if (center && center[0] !== 0 && center[1] !== 0) {
      map.setView(center, zoom || map.getZoom(), {
        animate: true,
        duration: 1.0,
      });
    }
  }, [map, center, zoom]);

  return null;
};

const MapContainer: React.FC<MapContainerProps> = ({
  center,
  zoom = 13,
  height = 400,
  width = '100%',
  markers = [],
  onMarkerClick,
  onMapClick,
  showControls = true,
  className,
}) => {
  const mapRef = useRef<L.Map | null>(null);

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        width, 
        height, 
        overflow: 'hidden',
        '& .leaflet-container': {
          height: '100%',
          width: '100%',
        }
      }}
      className={className}
    >
      <LeafletMapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={showControls}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Map center updater */}
        <MapCenterUpdater center={center} zoom={zoom} />
        
        {/* Map event handler */}
        <MapEventHandler onMapClick={onMapClick} />
        
        {/* Render markers */}
        {markers.map((marker, index) => (
          <Marker
            key={marker.id || index}
            position={[marker.lat, marker.lng]}
            eventHandlers={{
              click: () => onMarkerClick?.(marker),
            }}
          >
            {(marker.title || marker.description) && (
              <Popup>
                <Box>
                  {marker.title && (
                    <Typography variant="subtitle2" fontWeight="bold">
                      {marker.title}
                    </Typography>
                  )}
                  {marker.description && (
                    <Typography variant="body2" color="text.secondary">
                      {marker.description}
                    </Typography>
                  )}
                </Box>
              </Popup>
            )}
          </Marker>
        ))}
      </LeafletMapContainer>
    </Paper>
  );
};

export default MapContainer;