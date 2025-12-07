import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Grid,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
} from '@mui/material';
import { MyLocation, Search } from '@mui/icons-material';
import MapContainer, { MapLocation } from './MapContainer';

export interface LocationPickerProps {
  open: boolean;
  onClose: () => void;
  onLocationSelect: (location: { lat: number; lng: number; address?: string }) => void;
  initialLocation?: { lat: number; lng: number };
  title?: string;
}

const LocationPicker: React.FC<LocationPickerProps> = ({
  open,
  onClose,
  onLocationSelect,
  initialLocation = { lat: 28.6139, lng: 77.2090 }, // Default to Delhi
  title = 'Select Location',
}) => {
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(
    initialLocation
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
  }, []);

  const handleCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser');
      return;
    }

    setIsGettingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        console.log('✅ Current location obtained:', latitude, longitude);
        
        // Update the selected location which will automatically move the map
        setSelectedLocation({ lat: latitude, lng: longitude });
        setIsGettingLocation(false);
        
        // Clear any previous error
        setLocationError(null);
      },
      (error) => {
        console.error('❌ Geolocation error:', error);
        setIsGettingLocation(false);
        
        let errorMessage = 'Failed to get current location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable. Please check your device location settings.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.';
            break;
          default:
            errorMessage = 'An unknown error occurred while retrieving location.';
            break;
        }
        setLocationError(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000, // Increased timeout
        maximumAge: 0, // Don't use cached location
      }
    );
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      // Using geocoding service that supports both Nominatim and Google Maps
      const { geocodingService } = await import('../../services/geocodingService');
      const results = await geocodingService.searchAddress(searchQuery);

      if (results && results.length > 0) {
        const result = results[0];
        setSelectedLocation({ lat: result.lat, lng: result.lng });
      }
    } catch (error) {
      console.error('Error searching location:', error);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  const handleConfirm = useCallback(() => {
    if (selectedLocation) {
      onLocationSelect({
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
        address: searchQuery || undefined,
      });
      onClose();
    }
  }, [selectedLocation, searchQuery, onLocationSelect, onClose]);

  const markers: MapLocation[] = selectedLocation
    ? [
        {
          lat: selectedLocation.lat,
          lng: selectedLocation.lng,
          title: '📍 Selected Location',
          description: `Coordinates: ${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}`,
          id: 'selected-location',
        },
      ]
    : [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs>
              <TextField
                fullWidth
                placeholder="Search for a location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                size="small"
              />
            </Grid>
            <Grid item>
              <Button
                variant="outlined"
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
                startIcon={<Search />}
                size="small"
              >
                Search
              </Button>
            </Grid>
            <Grid item>
              <Tooltip title="Use current location">
                <IconButton 
                  onClick={handleCurrentLocation} 
                  size="small"
                  disabled={isGettingLocation}
                >
                  {isGettingLocation ? (
                    <CircularProgress size={20} />
                  ) : (
                    <MyLocation />
                  )}
                </IconButton>
              </Tooltip>
            </Grid>
          </Grid>
        </Box>

        {locationError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setLocationError(null)}>
            {locationError}
          </Alert>
        )}

        <Box sx={{ height: 400, mb: 2 }}>
          <MapContainer
            center={selectedLocation ? [selectedLocation.lat, selectedLocation.lng] : [initialLocation.lat, initialLocation.lng]}
            zoom={13}
            markers={markers}
            onMapClick={handleMapClick}
            height="100%"
          />
        </Box>

        {selectedLocation && (
          <Box>
            <Typography variant="body2" color="text.secondary">
              Selected coordinates: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
            </Typography>
          </Box>
        )}


      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={!selectedLocation}
        >
          Confirm Location
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LocationPicker;