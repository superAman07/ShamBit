/**
 * Navigation Configuration
 * Centralized configuration for application navigation
 */

import {
  Dashboard as DashboardIcon,
  ShoppingCart as OrdersIcon,
  Inventory as InventoryIcon,
  Category as CategoryIcon,
  LocalShipping as DeliveryIcon,
  LocalOffer as PromotionsIcon,
  Sell as ProductOffersIcon,
  SupervisorAccount as AdminIcon,
  Storefront as BrandIcon,
  Settings as SettingsIcon,
  People as CustomersIcon,
  Assessment as ReportsIcon,
  Store as SellersIcon,
  Analytics as EnhancedDashboardIcon,
} from '@mui/icons-material';

export interface NavigationItem {
  text: string;
  icon: typeof DashboardIcon;
  path: string;
  roles?: string[]; // Optional: restrict access by role
}

export interface NavigationSection {
  title: string;
  items: NavigationItem[];
}



export const NAVIGATION_CONFIG = {
  DRAWER_WIDTH: 260,
  APP_NAME: 'ShamBit Admin',
  
  MENU_SECTIONS: [
    {
      title: 'Overview',
      items: [
        { text: 'Dashboard', icon: DashboardIcon, path: '/dashboard' },
        { text: 'Enhanced Dashboard', icon: EnhancedDashboardIcon, path: '/enhanced-dashboard' },
        { text: 'Reports', icon: ReportsIcon, path: '/reports' },
      ]
    },

    {
      title: 'Operations',
      items: [
        { text: 'Orders', icon: OrdersIcon, path: '/orders' },
        { text: 'Delivery', icon: DeliveryIcon, path: '/delivery' },
        { text: 'Customers', icon: CustomersIcon, path: '/customers' },
        { text: 'Sellers', icon: SellersIcon, path: '/sellers' },
      ]
    },
    {
      title: 'Catalog',
      items: [
        { text: 'Products', icon: CategoryIcon, path: '/products' },
        { text: 'Brands', icon: BrandIcon, path: '/brands' },
        { text: 'Inventory', icon: InventoryIcon, path: '/inventory' },
        { text: 'Promotions', icon: PromotionsIcon, path: '/promotions' },
        { text: 'Offers', icon: ProductOffersIcon, path: '/product-offers' },
      ]
    },
    {
      title: 'System',
      items: [
        { text: 'Admins', icon: AdminIcon, path: '/admins' },
        { text: 'Settings', icon: SettingsIcon, path: '/settings' },
      ]
    }
  ] as NavigationSection[],
} as const;
