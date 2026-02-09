"use client";
import React, { useState, useMemo, Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/src/contexts/AuthContext";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Building2,
  Home,
  FileText,
  Car,
  CreditCard,
  Wrench,
  Settings,
  Receipt,
  TrendingUp,
  Lightbulb,
  Banknote,
  Newspaper,
  Bell,
  Mail,
  Search,
  Menu,
  ChevronDown,
  X,
  ClipboardList,
  CheckSquare,
  UserCheck,
  UserCog,
  Briefcase
} from "lucide-react";

type SidebarVariant = "admin" | "tenant-owner" | "technician" | "supporter" | "accountant";

type NavItem = {
  href: string;
  icon: React.ReactNode;
  labelKey?: string;
  label?: string;
};

type NavSection = {
  titleKey: string;
  items: NavItem[];
};

const ICON_SIZE = 18;

const adminSections: NavSection[] = [
  {
    titleKey: "overview",
    items: [
      { href: "/dashboard", labelKey: "dashboard", icon: <LayoutDashboard size={ICON_SIZE} /> },
    ],
  },
  {
    titleKey: "accounts",
    items: [
      { href: "/accountList", labelKey: "accountList", icon: <Users size={ICON_SIZE} /> },
      { href: "/accountNewStaff", labelKey: "createStaffAccount", icon: <UserPlus size={ICON_SIZE} /> },
      { href: "/accountNewRe", labelKey: "createResidentAccount", icon: <UserPlus size={ICON_SIZE} /> },
    ],
  },
  {
    titleKey: "buildingsAndResidents",
    items: [
      { href: "/base/building/buildingList", labelKey: "buildingManagement", icon: <Building2 size={ICON_SIZE} /> },
      { href: "/base/unit/unitList", labelKey: "unitManagement", icon: <Home size={ICON_SIZE} /> },
      { href: "/base/residentView", labelKey: "residentList", icon: <Users size={ICON_SIZE} /> },
      { href: "/base/regisresiView", labelKey: "approveResidentAccount", icon: <UserCheck size={ICON_SIZE} /> },
      { href: "/base/household/householdMemberRequests", labelKey: "approveFamilyMember", icon: <UserCog size={ICON_SIZE} /> },
      { href: "/base/contract/contracts", labelKey: "unitContracts", icon: <FileText size={ICON_SIZE} /> },
      { href: "/base/contract/rental-review", labelKey: "rentalContractReview", icon: <ClipboardList size={ICON_SIZE} /> },
      { href: "/base/vehicles/vehicleAll", labelKey: "vehicleManagement", icon: <Car size={ICON_SIZE} /> },
      { href: "/base/cards/elevator", labelKey: "elevatorCard", icon: <CreditCard size={ICON_SIZE} /> },
      { href: "/base/cards/resident", labelKey: "residentCard", icon: <CreditCard size={ICON_SIZE} /> },
      { href: "/base/cards/approved", labelKey: "approvedCard", icon: <CheckSquare size={ICON_SIZE} /> },
      { href: "/base/cards/pricing", labelKey: "cardPricingManagement", icon: <Banknote size={ICON_SIZE} /> },
    ],
  },
  {
    titleKey: "assetManagement",
    items: [
      { href: "/base/asset-management", labelKey: "assetManagement", icon: <Wrench size={ICON_SIZE} /> },
      { href: "/base/meter-management", labelKey: "meterManagement", icon: <Settings size={ICON_SIZE} /> },
    ],
  },
  {
    titleKey: "services",
    items: [
      { href: "/base/serviceCateList", labelKey: "serviceCategories", icon: <Briefcase size={ICON_SIZE} /> },
      { href: "/base/serviceList", labelKey: "serviceList", icon: <Receipt size={ICON_SIZE} /> },
      { href: "/base/serviceNew", labelKey: "createService", icon: <FileText size={ICON_SIZE} /> }
    ],
  },
  {
    titleKey: "waterElectric",
    items: [
      { href: "/base/readingCycles", labelKey: "readingCycles", icon: <TrendingUp size={ICON_SIZE} /> },
      { href: "/base/readingAssign", labelKey: "assignReading", icon: <ClipboardList size={ICON_SIZE} /> },
      { href: "/base/billingCycles", labelKey: "billingCycles", icon: <Lightbulb size={ICON_SIZE} /> },
      { href: "/base/finance/invoices", labelKey: "incomeExpenseManagement", icon: <Banknote size={ICON_SIZE} /> },
      { href: "/base/finance/pricing-tiers", labelKey: "pricingTiersManagement", icon: <Banknote size={ICON_SIZE} /> },
    ],
  },
  {
    titleKey: "residentInteraction",
    items: [
      { href: "/customer-interaction/new/newList", labelKey: "news", icon: <Newspaper size={ICON_SIZE} /> },
      { href: "/customer-interaction/notiList", labelKey: "notifications", icon: <Bell size={ICON_SIZE} /> },
      { href: "/customer-interaction/request", labelKey: "supportRequests", icon: <Mail size={ICON_SIZE} /> },
    ],
  },
];

const accounttantSections: NavSection[] = [
  {
    titleKey: "overview",
    items: [
      { href: "/dashboard", labelKey: "dashboard", icon: <LayoutDashboard size={ICON_SIZE} /> },
    ],
  },
  {
    titleKey: "waterElectric",
    items: [
      { href: "/base/readingCycles", labelKey: "readingCycles", icon: <TrendingUp size={ICON_SIZE} /> },
      { href: "/base/billingCycles", labelKey: "billingCycles", icon: <Lightbulb size={ICON_SIZE} /> },
      { href: "/base/finance/invoices", labelKey: "incomeExpenseManagement", icon: <Banknote size={ICON_SIZE} /> },
      { href: "/base/finance/pricing-tiers", labelKey: "pricingTiersManagement", icon: <Banknote size={ICON_SIZE} /> },
    ],
  },
  {
    titleKey: "residentInteraction",
    items: [
      { href: "/customer-interaction/new/newList", labelKey: "news", icon: <Newspaper size={ICON_SIZE} /> },
      { href: "/customer-interaction/notiList", labelKey: "notifications", icon: <Bell size={ICON_SIZE} /> },
    ],
  },
];

const supportSections: NavSection[] = [
  {
    titleKey: "overview",
    items: [
      { href: "/dashboard", labelKey: "dashboard", icon: <LayoutDashboard size={ICON_SIZE} /> },
    ],
  },
  {
    titleKey: "residentInteraction",
    items: [
      { href: "/customer-interaction/new/newList", labelKey: "news", icon: <Newspaper size={ICON_SIZE} /> },
      { href: "/customer-interaction/notiList", labelKey: "notifications", icon: <Bell size={ICON_SIZE} /> },
    ],
  },
];

const technicianSections: NavSection[] = [
  {
    titleKey: "overview",
    items: [
      { href: "/dashboard", labelKey: "dashboard", icon: <LayoutDashboard size={ICON_SIZE} /> },
    ],
  },
  {
    titleKey: "services",
    items: [
      { href: "/base/asset-inspection-assignments", labelKey: "assetInspectionAssignments", icon: <Search size={ICON_SIZE} /> },
    ],
  },
  {
    titleKey: "waterElectric",
    items: [
      { href: "/base/showAssign", labelKey: "taskList", icon: <ClipboardList size={ICON_SIZE} /> },
    ],
  },
  {
    titleKey: "residentInteraction",
    items: [
      { href: "/customer-interaction/new/newList", labelKey: "news", icon: <Newspaper size={ICON_SIZE} /> },
      { href: "/customer-interaction/notiList", labelKey: "notifications", icon: <Bell size={ICON_SIZE} /> },
      { href: "/customer-interaction/request", labelKey: "supportRequests", icon: <Mail size={ICON_SIZE} /> },
    ],
  },
];

const tenantOwnerSections: NavSection[] = [
  {
    titleKey: "overview",
    items: [
      { href: "/tenant-owner", labelKey: "home", icon: <Home size={ICON_SIZE} /> },
    ],
  },
  {
    titleKey: "management",
    items: [
      { href: "/tenant-owner/buildings", labelKey: "buildings", icon: <Building2 size={ICON_SIZE} /> },
      { href: "/tenant-owner/employees", labelKey: "employees", icon: <Users size={ICON_SIZE} /> },
    ],
  },
];

const menuConfig: Record<SidebarVariant, NavSection[]> = {
  admin: adminSections,
  technician: technicianSections,
  supporter: supportSections,
  accountant: accounttantSections,
  "tenant-owner": tenantOwnerSections,
};

interface SidebarProps {
  variant?: SidebarVariant;
}

export default function Sidebar({ variant = "admin" }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const t = useTranslations('Sidebar');
  const [mobileOpen, setMobileOpen] = useState(false);

  const normalizedRoles = user?.roles?.map(role => role.toLowerCase()) ?? [];

  const resolvedVariant: SidebarVariant =
    variant === "admin"
      ? normalizedRoles.includes("admin")
        ? "admin"
        : normalizedRoles.includes("technician")
          ? "technician"
          : normalizedRoles.includes("supporter")
            ? "supporter"
            : normalizedRoles.includes("accountant")
              ? "accountant"
              : "admin"
      : variant;

  const sections = menuConfig[resolvedVariant];

  // Helper function to check if a pathname matches an item
  const isItemActive = (item: NavItem, currentPath: string): boolean => {
    return currentPath === item.href || currentPath.startsWith(`${item.href}/`);
  };

  // Helper function to find sections that should be open (contain active items)
  const getOpenSections = (sections: NavSection[], currentPath: string): Set<string> => {
    const openSections = new Set<string>();
    sections.forEach(section => {
      const hasActiveItem = section.items.some(item => isItemActive(item, currentPath));
      if (hasActiveItem) {
        openSections.add(section.titleKey);
      }
    });
    return openSections;
  };

  // Initialize sections: all collapsed except those containing active items
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => {
    const allSections = new Set(sections.map(section => section.titleKey));
    const openSections = getOpenSections(sections, pathname);
    // Remove open sections from collapsed set
    openSections.forEach(key => allSections.delete(key));
    return allSections;
  });

  // Track previous variant to detect variant changes
  const prevVariantRef = React.useRef(resolvedVariant);

  // Update collapsed sections when variant or pathname changes
  React.useEffect(() => {
    const variantChanged = prevVariantRef.current !== resolvedVariant;
    prevVariantRef.current = resolvedVariant;

    if (variantChanged) {
      // When variant changes, reset all sections and open only those with active items
      const allSections = new Set(sections.map(section => section.titleKey));
      const openSections = getOpenSections(sections, pathname);
      openSections.forEach(key => allSections.delete(key));
      setCollapsedSections(allSections);
    } else {
      // When only pathname changes, ensure sections with active items are open
      // but keep other open sections as they are
      setCollapsedSections(prev => {
        const newSet = new Set(prev);
        const openSections = getOpenSections(sections, pathname);
        // Remove sections with active items from collapsed set (open them)
        openSections.forEach(key => newSet.delete(key));
        return newSet;
      });
    }

    // Auto-close mobile menu on route change
    setMobileOpen(false);
  }, [resolvedVariant, pathname, sections]);

  const toggleSection = (sectionKey: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionKey)) {
        newSet.delete(sectionKey);
      } else {
        newSet.add(sectionKey);
      }
      return newSet;
    });
  };

  return (
    <Fragment>
      {/* Mobile Menu Toggle Button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-[72px] left-4 z-[60] p-2 bg-white rounded-lg shadow-md border border-slate-200 text-slate-600 md:hidden hover:bg-slate-50 hover:text-emerald-600 transition-colors"
        aria-label="Toggle Menu"
      >
        {mobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay Background for Mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <aside
        className={`
          fixed top-16 left-0 h-[calc(100vh-64px)] w-64 bg-white border-r border-slate-200 flex flex-col z-40 transition-transform duration-300 ease-in-out shadow-2xl shadow-slate-200/50 md:shadow-none
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          md:flex
        `}
      >
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-6">
          {sections.map((section) => {
            const isCollapsed = collapsedSections.has(section.titleKey);
            return (
              <div key={section.titleKey} className="space-y-1">
                <button
                  onClick={() => toggleSection(section.titleKey)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-emerald-600 transition-colors group"
                >
                  <span className="group-hover:translate-x-0.5 transition-transform duration-200">{t(section.titleKey)}</span>
                  <ChevronDown
                    size={14}
                    className={`text-slate-300 transition-transform duration-200 group-hover:text-emerald-500 ${isCollapsed ? "rotate-90" : ""}`}
                  />
                </button>
                {!isCollapsed && (
                  <div className="space-y-1 animate-in slide-in-from-top-1 duration-200">
                    {section.items.map((item: NavItem) => {
                      const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`
                            flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                            ${active
                              ? "bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-100"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            }
                          `}
                        >
                          <span className={`${active ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-600"}`}>
                            {item.icon}
                          </span>
                          <span className="truncate">
                            {item.labelKey ? t(item.labelKey) : item.label ?? item.href}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </Fragment>
  );
}
