import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Link, type LinkProps } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AccessDenied } from '@/components/access-denied';
import { ApiFeedback } from '@/components/api-feedback';
import {
  administracionDefaultSectionId,
  administracionModuleSections,
  administracionModulesMoreHref,
} from '@/data/administracion-modules';
import { generalModuleItems, generalModulesMoreHref } from '@/data/general-modules';
import { reportesModuleItems } from '@/data/reportes-modules';
import { ventasModuleItems } from '@/data/ventas-modules';
import { getHomeOverview, type HomeUnitRow } from '@/services/home';
import { queryKeys } from '@/services/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { toApiError } from '@/types/api-error';
import { PERMISSIONS } from '@/types/rbac';
import { can } from '@/utils/rbac';

type NavItem = {
  icon: keyof typeof Ionicons.glyphMap;
  href: LinkProps['href'];
  label: string;
};

type UnitRow = HomeUnitRow;

const navItems: NavItem[] = [
  { icon: 'home-outline', href: '/', label: 'Inicio' },
  { icon: 'cash-outline', href: '/ventas', label: 'Ventas' },
  { icon: 'information-circle-outline', href: '/general', label: 'General' },
  { icon: 'shield-checkmark-outline', href: '/administracion', label: 'Administracion' },
  { icon: 'calculator-outline', href: '/reportes-panel', label: 'Reportes' },
];

const statusChips = ['Todos', 'Abierta', 'Cerrada'] as const;

function formatMoney(value: number) {
  return value.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function TableCell({
  align = 'left',
  children,
  header = false,
  width,
}: {
  align?: 'left' | 'center';
  children: string;
  header?: boolean;
  width: number;
}) {
  return (
    <View style={[styles.tableCell, { width }]}>
      <Text
        numberOfLines={header ? 2 : 3}
        style={[styles.tableCellText, header && styles.tableHeaderText, { textAlign: align }]}>
        {children}
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  const { session } = useAuthStore();
  const userPermissions = session?.user.permissions ?? [];
  const [companyIndex, setCompanyIndex] = useState(0);
  const [scopeIndex, setScopeIndex] = useState(0);
  const [statusChip, setStatusChip] = useState<(typeof statusChips)[number]>('Todos');
  const [showAllUnits, setShowAllUnits] = useState(true);
  const [showVentasMenu, setShowVentasMenu] = useState(false);
  const [showGeneralMenu, setShowGeneralMenu] = useState(false);
  const [showAdministracionMenu, setShowAdministracionMenu] = useState(false);
  const [showReportesMenu, setShowReportesMenu] = useState(false);
  const [administracionSectionId, setAdministracionSectionId] = useState(administracionDefaultSectionId);

  const {
    data: homeOverview,
    isLoading: isHomeLoading,
    error: homeError,
  } = useQuery({
    queryKey: queryKeys.homeOverview(),
    queryFn: getHomeOverview,
  });

  const companies = homeOverview?.companies?.length ? homeOverview.companies : ['Operacion'];
  const unreadNotifications = homeOverview?.unreadNotifications ?? 0;
  const safeCompanyIndex = companies.length === 0 ? 0 : companyIndex % companies.length;
  const baseRows = homeOverview?.rows ?? [];
  const unitScopes = useMemo(
    () => [`Todas las unidades (${baseRows.length})`, 'Solo unidades cerradas', 'Solo unidades abiertas'],
    [baseRows.length]
  );

  const tableRows = useMemo(() => {
    let rows = [...baseRows];

    if (!showAllUnits) {
      if (scopeIndex === 1) {
        rows = rows.filter((row) => row.status === 'Cerrada');
      } else if (scopeIndex === 2) {
        rows = rows.filter((row) => row.status === 'Abierta');
      }
    }

    if (statusChip !== 'Todos') {
      rows = rows.filter((row) => row.status === statusChip);
    }

    return rows;
  }, [baseRows, scopeIndex, showAllUnits, statusChip]);

  const activeAdministracionSection = useMemo(
    () =>
      administracionModuleSections.find((section) => section.id === administracionSectionId) ??
      administracionModuleSections[0],
    [administracionSectionId]
  );

  function closeTopMenus() {
    setShowVentasMenu(false);
    setShowGeneralMenu(false);
    setShowAdministracionMenu(false);
    setShowReportesMenu(false);
  }

  if (!can(PERMISSIONS.VIEW_HOME, userPermissions)) {
    return <AccessDenied message="Tu rol no tiene acceso al inicio." />;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <ScrollView
          contentContainerStyle={styles.topNavContent}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.topNav}>
          {navItems.map((item) => {
            const isVentasMenu = item.label === 'Ventas';
            const isGeneralMenu = item.label === 'General';
            const isAdministracionMenu = item.label === 'Administracion';
            const isReportesMenu = item.label === 'Reportes';
            const isMenuButton = isVentasMenu || isGeneralMenu || isAdministracionMenu || isReportesMenu;
            const isMenuOpen =
              (isVentasMenu && showVentasMenu) ||
              (isGeneralMenu && showGeneralMenu) ||
              (isAdministracionMenu && showAdministracionMenu) ||
              (isReportesMenu && showReportesMenu);

            if (isMenuButton) {
              return (
                <Pressable
                  key={item.label}
                  onPress={() => {
                    if (isVentasMenu) {
                      setShowGeneralMenu(false);
                      setShowAdministracionMenu(false);
                      setShowReportesMenu(false);
                      setShowVentasMenu((current) => !current);
                    } else if (isGeneralMenu) {
                      setShowVentasMenu(false);
                      setShowAdministracionMenu(false);
                      setShowReportesMenu(false);
                      setShowGeneralMenu((current) => !current);
                    } else if (isAdministracionMenu) {
                      setShowVentasMenu(false);
                      setShowGeneralMenu(false);
                      setShowReportesMenu(false);
                      setShowAdministracionMenu((current) => {
                        const next = !current;
                        if (next) {
                          setAdministracionSectionId(administracionDefaultSectionId);
                        }
                        return next;
                      });
                    } else {
                      setShowVentasMenu(false);
                      setShowGeneralMenu(false);
                      setShowAdministracionMenu(false);
                      setShowReportesMenu((current) => !current);
                    }
                  }}
                  style={({ pressed }) => [
                    styles.navButton,
                    isMenuOpen && styles.navButtonActive,
                    pressed && styles.navButtonPressed,
                  ]}>
                  <Ionicons color={isMenuOpen ? '#ffffff' : '#6d11a3'} name={item.icon} size={20} />
                  <Text style={[styles.navButtonText, isMenuOpen && styles.navButtonTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            }

            return (
              <Link asChild href={item.href} key={item.label}>
                <Pressable
                  onPress={closeTopMenus}
                  style={({ pressed }) => [styles.navButton, pressed && styles.navButtonPressed]}>
                  <Ionicons color="#6d11a3" name={item.icon} size={20} />
                  <Text style={styles.navButtonText}>{item.label}</Text>
                </Pressable>
              </Link>
            );
          })}
        </ScrollView>

        <View style={styles.actionsArea}>
          <Link asChild href="/notifications">
            <Pressable style={styles.actionButton}>
              <Ionicons color="#ffffff" name="notifications-outline" size={22} />
              <Text style={styles.actionCounter}>{unreadNotifications}</Text>
            </Pressable>
          </Link>
          <Link asChild href="/profile">
            <Pressable style={styles.actionButton}>
              <Ionicons color="#ffffff" name="person-outline" size={22} />
            </Pressable>
          </Link>
        </View>
      </View>

      {showVentasMenu ? (
        <View style={styles.salesMenuOverlay}>
          <Pressable onPress={closeTopMenus} style={styles.salesMenuBackdrop} />
          <View style={styles.salesMenuCard}>
            {ventasModuleItems.map((module) => (
              <Link asChild href={module.href} key={module.label}>
                <Pressable
                  onPress={closeTopMenus}
                  style={({ pressed }) => [styles.salesMenuItem, pressed && styles.selectBoxPressed]}>
                  <Text style={styles.salesMenuText}>{module.label}</Text>
                  {module.trailingArrow ? (
                    <Ionicons color="#8f97a6" name="chevron-forward" size={16} />
                  ) : null}
                </Pressable>
              </Link>
            ))}
          </View>
        </View>
      ) : null}
      {showGeneralMenu ? (
        <View style={styles.generalMenuOverlay}>
          <Pressable onPress={closeTopMenus} style={styles.generalMenuBackdrop} />
          <View style={styles.generalMenuCard}>
            {generalModuleItems.map((module) => (
              <Link asChild href={module.href} key={module.label}>
                <Pressable
                  onPress={closeTopMenus}
                  style={({ pressed }) => [styles.generalMenuItem, pressed && styles.selectBoxPressed]}>
                  <Text style={styles.generalMenuText}>{module.label}</Text>
                  {module.trailingArrow ? (
                    <Ionicons color="#8f97a6" name="chevron-forward" size={16} />
                  ) : null}
                </Pressable>
              </Link>
            ))}
            <Link asChild href={generalModulesMoreHref}>
              <Pressable
                onPress={closeTopMenus}
                style={({ pressed }) => [styles.generalMenuMoreButton, pressed && styles.selectBoxPressed]}>
                <Ionicons color="#ffffff" name="shield-checkmark-outline" size={14} />
                <Text style={styles.generalMenuMoreText}>Ver mas</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      ) : null}
      {showAdministracionMenu ? (
        <View style={styles.administrationMenuOverlay}>
          <Pressable onPress={closeTopMenus} style={styles.administrationMenuBackdrop} />
          <View style={styles.administrationMenuRow}>
            <View style={styles.administrationMenuPrimaryCard}>
              {administracionModuleSections.map((section) => {
                const isActive = activeAdministracionSection?.id === section.id;

                return (
                  <Pressable
                    key={section.id}
                    onPress={() => setAdministracionSectionId(section.id)}
                    style={({ pressed }) => [
                      styles.administrationMenuPrimaryItem,
                      isActive && styles.administrationMenuPrimaryItemActive,
                      pressed && styles.selectBoxPressed,
                    ]}>
                    <Text
                      style={[
                        styles.administrationMenuPrimaryText,
                        isActive && styles.administrationMenuPrimaryTextActive,
                      ]}>
                      {section.label}
                    </Text>
                    {section.trailingArrow ? (
                      <Ionicons
                        color={isActive ? '#d8ef96' : '#8f97a6'}
                        name="chevron-forward"
                        size={16}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.administrationMenuSecondaryCard}>
              {activeAdministracionSection?.items.map((item) => (
                <Link asChild href={item.href} key={item.label}>
                  <Pressable
                    onPress={closeTopMenus}
                    style={({ pressed }) => [styles.administrationMenuSecondaryItem, pressed && styles.selectBoxPressed]}>
                    <Text style={styles.administrationMenuSecondaryText}>{item.label}</Text>
                  </Pressable>
                </Link>
              ))}

              <Link asChild href={administracionModulesMoreHref}>
                <Pressable
                  onPress={closeTopMenus}
                  style={({ pressed }) => [styles.administrationMenuMoreButton, pressed && styles.selectBoxPressed]}>
                  <Ionicons color="#ffffff" name="shield-checkmark-outline" size={14} />
                  <Text style={styles.administrationMenuMoreText}>Ver mas</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </View>
      ) : null}
      {showReportesMenu ? (
        <View style={styles.reportesMenuOverlay}>
          <Pressable onPress={closeTopMenus} style={styles.reportesMenuBackdrop} />
          <View style={styles.reportesMenuCard}>
            {reportesModuleItems.map((module) => (
              <Link asChild href={module.href} key={module.label}>
                <Pressable
                  onPress={closeTopMenus}
                  style={({ pressed }) => [styles.reportesMenuItem, pressed && styles.selectBoxPressed]}>
                  <Text style={styles.reportesMenuText}>{module.label}</Text>
                </Pressable>
              </Link>
            ))}
          </View>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ApiFeedback
          error={homeError ? toApiError(homeError, 'No fue posible cargar el dashboard principal.').message : null}
          isLoading={isHomeLoading}
        />
        <View style={styles.filtersRow}>
          <Pressable
            onPress={() =>
              setCompanyIndex((current) => {
                const total = Math.max(companies.length, 1);
                return (current + 1) % total;
              })
            }
            style={({ pressed }) => [styles.selectBox, pressed && styles.selectBoxPressed]}>
            <Text numberOfLines={1} style={styles.selectText}>
              {companies[safeCompanyIndex]}
            </Text>
            <Ionicons color="#6f6f6f" name="chevron-down" size={18} />
          </Pressable>

          <Pressable
            onPress={() => setScopeIndex((current) => (current + 1) % unitScopes.length)}
            style={({ pressed }) => [styles.selectBox, pressed && styles.selectBoxPressed]}>
            <Text numberOfLines={1} style={styles.selectText}>
              {unitScopes[scopeIndex]}
            </Text>
            <Ionicons color="#6f6f6f" name="chevron-down" size={18} />
          </Pressable>

          <Pressable
            onPress={() => setShowAllUnits((current) => !current)}
            style={({ pressed }) => [styles.checkboxBox, pressed && styles.selectBoxPressed]}>
            <Ionicons
              color="#5a5a5a"
              name={showAllUnits ? 'checkbox-outline' : 'square-outline'}
              size={18}
            />
            <Text style={styles.checkboxText}>Ver todas las unidades</Text>
          </Pressable>
        </View>

        <View style={styles.tableCard}>
          <View style={styles.tagsRow}>
            {statusChips.map((chip) => (
              <Pressable
                key={chip}
                onPress={() => setStatusChip(chip)}
                style={({ pressed }) => [
                  styles.statusChip,
                  statusChip === chip && styles.statusChipActive,
                  pressed && styles.selectBoxPressed,
                ]}>
                <Text style={[styles.statusChipText, statusChip === chip && styles.statusChipTextActive]}>
                  x {chip}
                </Text>
              </Pressable>
            ))}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View style={styles.tableHeaderRow}>
                <TableCell header width={188}>
                  Unidad
                </TableCell>
                <TableCell header width={90}>
                  CN
                </TableCell>
                <TableCell header width={170}>
                  Ubicacion
                </TableCell>
                <TableCell header width={110}>
                  Estado
                </TableCell>
                <TableCell header width={110}>
                  Score
                </TableCell>
                <TableCell header width={90}>
                  Caja
                </TableCell>
                <TableCell header width={160}>
                  Fecha de la Caja
                </TableCell>
                <TableCell header width={130}>
                  Caja Inicial
                </TableCell>
                <TableCell header width={130}>
                  Caja Final
                </TableCell>
                <TableCell header width={110}>
                  Progreso
                </TableCell>
                <TableCell header width={200}>
                  Ultima Sincronizacion
                </TableCell>
                <TableCell header width={210}>
                  PIN / Version App
                </TableCell>
              </View>

              {tableRows.map((row, index) => (
                <View
                  key={row.id}
                  style={[styles.tableBodyRow, index % 2 === 1 && styles.tableBodyRowAlt]}>
                  <TableCell width={188}>{row.unit}</TableCell>
                  <TableCell width={90}>{row.cn}</TableCell>
                  <TableCell width={170}>{row.location}</TableCell>
                  <TableCell width={110}>{row.status}</TableCell>
                  <TableCell width={110}>{row.score}</TableCell>
                  <TableCell width={90}>{row.cashBox}</TableCell>
                  <TableCell width={160}>{row.cashDate}</TableCell>
                  <TableCell width={130}>{formatMoney(row.initialCash)}</TableCell>
                  <TableCell width={130}>{formatMoney(row.finalCash)}</TableCell>
                  <TableCell width={110}>{row.progress}</TableCell>
                  <TableCell width={200}>{row.lastSync}</TableCell>
                  <TableCell width={210}>{row.pinVersion}</TableCell>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={styles.nextCard}>
          <Text style={styles.nextTitle}>Siguiente desarrollo</Text>
          <Text style={styles.nextSubtitle}>
            Estas paginas ya estan creadas para que continues con el flujo completo del sistema.
          </Text>
          <View style={styles.nextLinks}>
            <Link href="/ventas" style={styles.nextLink}>
              Ir a Ventas
            </Link>
            <Link href="/general" style={styles.nextLink}>
              Ir a General
            </Link>
            <Link href="/administracion" style={styles.nextLink}>
              Ir a Administracion
            </Link>
            <Link href="/reportes-panel" style={styles.nextLink}>
              Ir a Reportes
            </Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#ececef',
    flex: 1,
  },
  topBar: {
    alignItems: 'stretch',
    backgroundColor: '#6e10a5',
    flexDirection: 'row',
    minHeight: 82,
  },
  logoArea: {
    backgroundColor: '#69109d',
    justifyContent: 'center',
    minWidth: 170,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  logoTextTop: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 28,
  },
  logoTextBottom: {
    color: '#95d22d',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 26,
  },
  topNav: {
    backgroundColor: '#efefef',
    flex: 1,
  },
  topNavContent: {
    alignItems: 'center',
    minHeight: 82,
  },
  navButton: {
    alignItems: 'center',
    borderColor: '#d0d0d0',
    borderRightWidth: 1,
    flexDirection: 'row',
    gap: 8,
    height: '100%',
    justifyContent: 'center',
    minWidth: 138,
    paddingHorizontal: 16,
  },
  navButtonPressed: {
    backgroundColor: '#e8e8e8',
  },
  navButtonActive: {
    backgroundColor: '#8cc52f',
  },
  navButtonText: {
    color: '#5f5f65',
    fontSize: 16,
    fontWeight: '500',
  },
  navButtonTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  salesMenuOverlay: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 82,
    zIndex: 20,
  },
  salesMenuBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  salesMenuCard: {
    backgroundColor: '#f5f6f8',
    borderColor: '#d5d7dc',
    borderRadius: 8,
    borderWidth: 1,
    left: 12,
    maxWidth: 420,
    paddingVertical: 8,
    position: 'absolute',
    right: 12,
    top: 8,
  },
  salesMenuItem: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  salesMenuText: {
    color: '#768096',
    fontSize: 16,
  },
  generalMenuOverlay: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 82,
    zIndex: 20,
  },
  generalMenuBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  generalMenuCard: {
    backgroundColor: '#f5f6f8',
    borderColor: '#d5d7dc',
    borderRadius: 8,
    borderWidth: 1,
    left: 142,
    maxWidth: 360,
    minWidth: 250,
    paddingBottom: 10,
    paddingTop: 8,
    position: 'absolute',
    right: 12,
    top: 8,
  },
  generalMenuItem: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  generalMenuText: {
    color: '#768096',
    fontSize: 16,
  },
  generalMenuMoreButton: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: '#6d11a3',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 6,
    marginRight: 14,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  generalMenuMoreText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  administrationMenuOverlay: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 82,
    zIndex: 20,
  },
  administrationMenuBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  administrationMenuRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    left: 12,
    position: 'absolute',
    right: 12,
    top: 8,
  },
  administrationMenuPrimaryCard: {
    backgroundColor: '#f5f6f8',
    borderColor: '#d5d7dc',
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 290,
    overflow: 'hidden',
  },
  administrationMenuPrimaryItem: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  administrationMenuPrimaryItemActive: {
    backgroundColor: '#96c832',
  },
  administrationMenuPrimaryText: {
    color: '#768096',
    fontSize: 16,
    fontWeight: '500',
  },
  administrationMenuPrimaryTextActive: {
    color: '#6d11a3',
    fontWeight: '700',
  },
  administrationMenuSecondaryCard: {
    backgroundColor: '#f5f6f8',
    borderColor: '#d5d7dc',
    borderRadius: 8,
    borderWidth: 1,
    flexGrow: 1,
    maxWidth: 420,
    minWidth: 280,
    paddingBottom: 10,
    paddingTop: 8,
  },
  administrationMenuSecondaryItem: {
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  administrationMenuSecondaryText: {
    color: '#687387',
    fontSize: 17,
    fontWeight: '500',
  },
  administrationMenuMoreButton: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: '#6d11a3',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 6,
    marginRight: 14,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  administrationMenuMoreText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  reportesMenuOverlay: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 82,
    zIndex: 20,
  },
  reportesMenuBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  reportesMenuCard: {
    backgroundColor: '#f5f6f8',
    borderColor: '#d5d7dc',
    borderRadius: 8,
    borderWidth: 1,
    left: 12,
    maxWidth: 420,
    minWidth: 290,
    overflow: 'hidden',
    paddingVertical: 8,
    position: 'absolute',
    right: 12,
    top: 8,
  },
  reportesMenuItem: {
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  reportesMenuText: {
    color: '#687387',
    fontSize: 17,
    fontWeight: '500',
  },
  actionsArea: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
    minHeight: 36,
    minWidth: 36,
  },
  actionCounter: {
    color: '#97d733',
    fontWeight: '700',
  },
  content: {
    gap: 16,
    paddingBottom: 28,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  selectBox: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#8a2bb2',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    minWidth: 240,
    paddingHorizontal: 14,
  },
  selectBoxPressed: {
    opacity: 0.8,
  },
  selectText: {
    color: '#555569',
    flex: 1,
    fontSize: 18,
    marginRight: 8,
  },
  checkboxBox: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    minHeight: 48,
    minWidth: 210,
    paddingHorizontal: 4,
  },
  checkboxText: {
    color: '#3e3e4d',
    fontSize: 18,
  },
  tableCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    elevation: 2,
    padding: 12,
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 10,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  statusChip: {
    backgroundColor: '#eeeeee',
    borderColor: '#7f7f88',
    borderRadius: 7,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusChipActive: {
    backgroundColor: '#e7f0d2',
    borderColor: '#88b726',
  },
  statusChipText: {
    color: '#565668',
    fontSize: 16,
    fontWeight: '600',
  },
  statusChipTextActive: {
    color: '#446600',
  },
  tableHeaderRow: {
    backgroundColor: '#96c832',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    flexDirection: 'row',
    paddingVertical: 3,
  },
  tableBodyRow: {
    backgroundColor: '#ffffff',
    borderBottomColor: '#e4e4e4',
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 46,
  },
  tableBodyRowAlt: {
    backgroundColor: '#f5f8ed',
  },
  tableCell: {
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  tableCellText: {
    color: '#26262e',
    fontSize: 17,
  },
  tableHeaderText: {
    color: '#233206',
    fontSize: 16,
    fontWeight: '700',
  },
  nextCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e3e3e3',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  nextTitle: {
    color: '#332048',
    fontSize: 20,
    fontWeight: '800',
  },
  nextSubtitle: {
    color: '#5e5f6b',
    fontSize: 15,
    marginTop: 4,
  },
  nextLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  nextLink: {
    backgroundColor: '#f1e8f7',
    borderRadius: 8,
    color: '#6d11a3',
    fontSize: 15,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
});
