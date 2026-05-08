import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ui } from '@/constants/ui';
import { useAuthStore } from '@/store/auth-store';
import { PERMISSIONS, ROLES } from '@/types/rbac';
import { can } from '@/utils/rbac';

export default function TabLayout() {
  const { session } = useAuthStore();
  const userPermissions = session?.user.permissions ?? [];
  const userRole = session?.user.role;

  const isAdmin = userRole === ROLES.ADMIN;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: ui.colors.primary,
        tabBarInactiveTintColor: ui.colors.textMuted,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: ui.colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          href: can(PERMISSIONS.VIEW_HOME, userPermissions) ? undefined : null,
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="house.fill" color={color} />,
        }}
      />

      <Tabs.Screen
        name="(shared)/dashboard"
        options={{
          title: 'Dashboard',
          href: can(PERMISSIONS.VIEW_HOME, userPermissions) ? undefined : null,
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="chart.bar.fill" color={color} />,
        }}
      />

      <Tabs.Screen
        name="(collector)/cobros/clients/index"
        options={{
          title: 'Cobros',
          href: can(PERMISSIONS.VIEW_HOME, userPermissions) ? undefined : null,
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="dollarsign.circle.fill" color={color} />,
        }}
      />

      <Tabs.Screen
        name="(collector)/caja/session"
        options={{
          title: 'Caja',
          href: can(PERMISSIONS.VIEW_HOME, userPermissions) ? undefined : null,
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="tray.full.fill" color={color} />,
        }}
      />

      <Tabs.Screen
        name="(collector)/gastos/index"
        options={{
          title: 'Gastos',
          href: can(PERMISSIONS.REGISTER_EXPENSE, userPermissions) ? undefined : null,
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="receipt.fill" color={color} />,
        }}
      />

      <Tabs.Screen
        name="(admin)/reportes"
        options={{
          title: 'Reportes',
          href: can(PERMISSIONS.VIEW_HOME, userPermissions) ? undefined : null,
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="doc.text.fill" color={color} />,
        }}
      />

      <Tabs.Screen
        name="(admin)/usuarios"
        options={{
          title: 'Usuarios',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.2.fill" color={color} />,
        }}
      />

      <Tabs.Screen
        name="(admin)/roles"
        options={{
          title: 'Roles',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="lock.shield.fill" color={color} />,
        }}
      />

      <Tabs.Screen
        name="(admin)/configuracion"
        options={{
          title: 'Config',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="gearshape.fill" color={color} />,
        }}
      />

      <Tabs.Screen
        name="(shared)/notifications"
        options={{
          title: 'Alertas',
          href: can(PERMISSIONS.VIEW_HOME, userPermissions) ? undefined : null,
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="bell.fill" color={color} />,
        }}
      />

      <Tabs.Screen
        name="(shared)/profile"
        options={{
          title: 'Perfil',
          href: can(PERMISSIONS.VIEW_PROFILE, userPermissions) ? undefined : null,
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.fill" color={color} />,
        }}
      />

      <Tabs.Screen
        name="(planning)/modules"
        options={{
          title: 'Módulos',
          href: can(PERMISSIONS.VIEW_MODULES, userPermissions) ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="(planning)/roadmap"
        options={{
          title: 'Roadmap',
          href: can(PERMISSIONS.VIEW_ROADMAP, userPermissions) ? undefined : null,
        }}
      />

      <Tabs.Screen name="ventas" options={{ href: null }} />
      <Tabs.Screen name="ventas-modulo/[slug]" options={{ href: null }} />
      <Tabs.Screen name="general" options={{ href: null }} />
      <Tabs.Screen name="general-modulo/[slug]" options={{ href: null }} />
      <Tabs.Screen name="administracion" options={{ href: null }} />
      <Tabs.Screen name="administracion-modulo/[slug]" options={{ href: null }} />
      <Tabs.Screen name="reportes-panel" options={{ href: null }} />
      <Tabs.Screen name="reportes-modulo/[slug]" options={{ href: null }} />

      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}
