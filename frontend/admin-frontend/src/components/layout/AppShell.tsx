'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';

import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import SchoolIcon from '@mui/icons-material/School';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import ClassIcon from '@mui/icons-material/Class';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import PersonIcon from '@mui/icons-material/Person';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import LogoutIcon from '@mui/icons-material/Logout';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';

import { useAuth } from '@/features/auth/hooks';
import { useUiStore } from '@/store/uiStore';
import { ROLES, APP_NAME } from '@/lib/constants';

const DRAWER_WIDTH = 260;

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/',
    icon: <DashboardIcon />,
  },
  {
    label: 'Students',
    href: '/students',
    icon: <SchoolIcon />,
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  },
  {
    label: 'Teachers',
    href: '/teachers',
    icon: <PeopleIcon />,
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  },
  {
    label: 'User Accounts',
    href: '/users',
    icon: <AdminPanelSettingsIcon />,
    roles: [ROLES.SUPER_ADMIN],
  },
  {
    label: 'Bulk Import',
    href: '/bulk-import',
    icon: <UploadFileIcon />,
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  },
  {
    label: 'Applications',
    href: '/applications',
    icon: <AssignmentTurnedInIcon />,
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  },
  {
    label: 'Parent Linking',
    href: '/parent-linking',
    icon: <FamilyRestroomIcon />,
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  },
  {
    label: 'My Classes',
    href: '/my-classes',
    icon: <ClassIcon />,
    roles: [ROLES.TEACHER],
  },
  {
    label: 'Report Missing Student',
    href: '/report-missing',
    icon: <ReportProblemIcon />,
    roles: [ROLES.TEACHER],
  },
  {
    label: 'Audit Logs',
    href: '/audit-logs',
    icon: <HistoryEduIcon />,
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  },
  {
    label: 'Profile & Security',
    href: '/profile',
    icon: <PersonIcon />,
  },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, logout } = useAuth();
  const { themeMode, toggleTheme } = useUiStore();

  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return role ? item.roles.includes(role) : false;
  });

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2.5,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <AdminPanelSettingsIcon color="primary" sx={{ fontSize: 32 }} />
        <Typography variant="h6" fontWeight={700} color="primary.main" noWrap>
          {APP_NAME}
        </Typography>
      </Toolbar>

      <Box sx={{ p: 2 }}>
        <Chip
          label={`Role: ${role || 'Staff'}`}
          color="primary"
          variant="filled"
          size="small"
          sx={{ fontWeight: 600, width: '100%' }}
        />
      </Box>

      <Divider />

      <List sx={{ px: 1.5, py: 1.5, flexGrow: 1, overflowY: 'auto' }}>
        {filteredNavItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <ListItem key={item.href} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={Link}
                href={item.href}
                selected={isActive}
                onClick={() => setMobileOpen(false)}
                sx={{
                  borderRadius: 2,
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: '#ffffff',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                    '& .MuiListItemIcon-root': {
                      color: '#ffffff',
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    color: isActive ? '#ffffff' : 'text.secondary',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: 14,
                    fontWeight: isActive ? 600 : 500,
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider />

      <Box sx={{ p: 2 }}>
        <ListItemButton
          onClick={logout}
          sx={{ borderRadius: 2, color: 'error.main' }}
        >
          <ListItemIcon sx={{ minWidth: 40, color: 'error.main' }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Log Out" primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }} />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { sm: `${DRAWER_WIDTH}px` },
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: 'none',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="subtitle1" fontWeight={600} noWrap>
              {filteredNavItems.find((n) => n.href === pathname)?.label || 'Administration'}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Tooltip title={`Switch to ${themeMode === 'light' ? 'Dark' : 'Light'} Mode`}>
              <IconButton onClick={toggleTheme} color="inherit" size="small">
                {themeMode === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}
              </IconButton>
            </Tooltip>

            <Tooltip title="User Profile">
              <IconButton onClick={handleMenuOpen} size="small" sx={{ ml: 1 }}>
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor: 'primary.main',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {user?.email?.charAt(0).toUpperCase() || 'A'}
                </Avatar>
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              PaperProps={{
                sx: { width: 220, mt: 1 },
              }}
            >
              <Box sx={{ px: 2, py: 1.5 }}>
                <Typography variant="subtitle2" noWrap fontWeight={600}>
                  {user?.email}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {user?.role}
                </Typography>
              </Box>
              <Divider />
              <MenuItem
                onClick={() => {
                  handleMenuClose();
                  router.push('/profile');
                }}
              >
                <ListItemIcon>
                  <PersonIcon fontSize="small" />
                </ListItemIcon>
                Profile & 2FA
              </MenuItem>
              <MenuItem
                onClick={() => {
                  handleMenuClose();
                  logout();
                }}
                sx={{ color: 'error.main' }}
              >
                <ListItemIcon sx={{ color: 'error.main' }}>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                Log Out
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}
        aria-label="navigation mailbox folders"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
          }}
        >
          {drawerContent}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: 8,
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

