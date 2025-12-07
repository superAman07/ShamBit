import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  CircularProgress,
  Box,
  Alert,
  Divider,
} from '@mui/material';
import { Warning } from '@mui/icons-material';
import { LowStockProduct } from '@/types/dashboard';
import { DASHBOARD_CONFIG, StockAlertColor } from '@/config/dashboard.config';

interface LowStockAlertsProps {
  products: LowStockProduct[];
  loading: boolean;
  error: string | null;
}

const getStockColor = (availableStock: number): StockAlertColor => {
  return availableStock === DASHBOARD_CONFIG.STOCK_ALERT.OUT_OF_STOCK
    ? DASHBOARD_CONFIG.STOCK_ALERT.OUT_OF_STOCK_COLOR
    : DASHBOARD_CONFIG.STOCK_ALERT.LOW_STOCK_COLOR;
};

export const LowStockAlerts: React.FC<LowStockAlertsProps> = ({ products = [], loading, error }) => {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Warning sx={{ color: 'warning.main', mr: 1 }} />
          <Typography variant="h6">Low Stock Alerts</Typography>
        </Box>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : products.length === 0 ? (
          <Alert severity="info" sx={{ textAlign: 'center' }}>
            No low stock alerts
          </Alert>
        ) : (
          <List>
            {products.map((product, index) => (
              <React.Fragment key={product.id}>
                {index > 0 && <Divider />}
                <ListItem
                  sx={{
                    px: 0,
                    py: 1.5,
                  }}
                >
                  <ListItemText
                    primary={
                      <Typography variant="body2" fontWeight="medium">
                        {product.productName}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="textSecondary">
                        {product.categoryName}
                      </Typography>
                    }
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={`${product.availableStock} left`}
                      color={getStockColor(product.availableStock)}
                      size="small"
                    />
                  </Box>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
};
