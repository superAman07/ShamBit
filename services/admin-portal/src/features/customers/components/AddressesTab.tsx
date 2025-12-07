import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
} from '@mui/material';
import {
  Home as HomeIcon,
} from '@mui/icons-material';
import { Address } from '@/types/customer';

interface AddressesTabProps {
  addresses: Address[];
}

export const AddressesTab: React.FC<AddressesTabProps> = ({ addresses }) => {
  if (addresses.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body1" color="textSecondary">
          No saved addresses found.
        </Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={3}>
      {addresses.map((address) => (
        <Grid item xs={12} md={6} key={address.id}>
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <HomeIcon color="action" />
                  <Typography variant="h6">
                    Address
                  </Typography>
                </Box>
                {address.isDefault && (
                  <Chip label="Default" color="primary" size="small" />
                )}
              </Box>
              
              <Typography variant="body2">
                {address.addressLine1}
              </Typography>
              {address.addressLine2 && (
                <Typography variant="body2">
                  {address.addressLine2}
                </Typography>
              )}
              <Typography variant="body2">
                {address.city}, {address.state}
              </Typography>
              <Typography variant="body2">
                {address.pincode}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};
