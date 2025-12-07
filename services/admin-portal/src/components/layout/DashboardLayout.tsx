import React, { useState } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
  ListSubheader,
} from '@mui/material';
import {
  Menu as MenuIcon,
  AccountCircle,
  ExitToApp,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAppDispatch } from '@/hooks/redux';
import { clearAuth } from '@/store/slices/authSlice';
import { authService } from '@/services/authService';
import { NAVIGATION_CONFIG } from '@/config/navigation.config';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { admin } = useAuth();
  const dispatch = useAppDispatch();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleClose();
    
    // Clear auth state immediately for instant UI response
    dispatch(clearAuth());
    
    // Navigate to login immediately
    navigate('/login', { replace: true });
    
    // Call logout API in background (fire and forget)
    try {
      await authService.logout();
    } catch (error) {
      // Ignore errors - we've already logged out locally
      console.error('Logout API call failed:', error);
    }
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2.5 }}>
        <Box
          component="img"
          src="/logo.png"
          alt="ShamBit Logo"
          sx={{
            width: 32,
            height: 32,
            borderRadius: '50%',
          }}
        />
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600, letterSpacing: '-0.5px' }}>
          {NAVIGATION_CONFIG.APP_NAME}
        </Typography>
      </Toolbar>
      <Divider />
      <Box sx={{ overflowY: 'auto', flex: 1 }}>
        {NAVIGATION_CONFIG.MENU_SECTIONS.map((section, sectionIndex) => (
          <List
            key={section.title}
            subheader={
              <ListSubheader
                component="div"
                sx={{
                  bgcolor: 'transparent',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: 'text.secondary',
                  lineHeight: '32px',
                  px: 2.5,
                  mt: sectionIndex === 0 ? 1 : 2,
                }}
              >
                {section.title}
              </ListSubheader>
            }
            sx={{ py: 0 }}
          >
            {section.items
              .filter((item) => {
                // If item has role restrictions, check if admin has required role
                if (item.roles && item.roles.length > 0) {
                  return admin?.role && item.roles.includes(admin.role);
                }
                return true;
              })
              .map((item) => {
                const IconComponent = item.icon;
                const isSelected = location.pathname === item.path;
                return (
                  <ListItem key={item.text} disablePadding sx={{ px: 1.5 }}>
                    <ListItemButton
                      selected={isSelected}
                      onClick={() => handleNavigation(item.path)}
                      sx={{
                        borderRadius: 1.5,
                        mb: 0.5,
                        '&.Mui-selected': {
                          bgcolor: 'primary.main',
                          color: 'primary.contrastText',
                          '&:hover': {
                            bgcolor: 'primary.dark',
                          },
                          '& .MuiListItemIcon-root': {
                            color: 'primary.contrastText',
                          },
                        },
                        '&:hover': {
                          bgcolor: 'action.hover',
                        },
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: 40,
                          color: isSelected ? 'inherit' : 'text.secondary',
                        }}
                      >
                        <IconComponent fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={item.text}
                        primaryTypographyProps={{
                          fontSize: '0.875rem',
                          fontWeight: isSelected ? 600 : 500,
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
          </List>
        ))}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${NAVIGATION_CONFIG.DRAWER_WIDTH}px)` },
          ml: { md: `${NAVIGATION_CONFIG.DRAWER_WIDTH}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
            <Box
              component="img"
              src="/logo.png"
              alt="ShamBit Logo"
              sx={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                display: { xs: 'block', md: 'none' }, // Only show on mobile when sidebar is hidden
              }}
            />
            <Typography variant="h6" noWrap component="div">
              {NAVIGATION_CONFIG.MENU_SECTIONS.flatMap(section => section.items).find((item) => item.path === location.pathname)?.text || 'Dashboard'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ mr: 2, display: { xs: 'none', sm: 'block' } }}>
              {admin?.name}
            </Typography>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
            >
              <AccountCircle />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem disabled>
                <Typography variant="body2" color="text.secondary">
                  {admin?.email}
                </Typography>
              </MenuItem>
              <MenuItem disabled>
                <Typography variant="body2" color="text.secondary">
                  Role: {admin?.role}
                </Typography>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <ExitToApp sx={{ mr: 1 }} />
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { md: NAVIGATION_CONFIG.DRAWER_WIDTH }, flexShrink: { md: 0 } }}
        aria-label="navigation"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: NAVIGATION_CONFIG.DRAWER_WIDTH },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: NAVIGATION_CONFIG.DRAWER_WIDTH },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${NAVIGATION_CONFIG.DRAWER_WIDTH}px)` },
          mt: 8,
        }}
      >
        {children}
      </Box>
    </Box>
  );
};
