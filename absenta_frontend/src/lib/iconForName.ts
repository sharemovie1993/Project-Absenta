import {
  LayoutDashboard,
  Home,
  Users,
  User,
  CreditCard,
  FileText,
  BarChart3,
  Settings,
  GraduationCap,
  CalendarCheck,
  TrendingUp,
  UserCheck,
  School,
  Bell,
  UserCog,
  BookOpen,
  Calendar,
  Clock,
  DoorOpen,
  Activity,
  ListChecks,
  Camera,
  BadgeCheck,
  CheckCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Trash2,
  Eye,
  Send,
  Download,
  Plus,
  ShieldCheck,
  UserSquare,
  BarChart2,
  List,
  CalendarClock,
  FileEdit,
  ScanFace,
  Map,
  Mail,
  MessageCircle,
  Cog,
  Circle,
  Store,
  Wallet,
  ShoppingCart,
  Smartphone,
  Handshake,
  Briefcase,
  Shield,
  Database,
  Layout,
  Compass,
  Network,
  Move,
  Contact,
  UserMinus,
  Monitor,
  MapPin,
  Zap,
  Package,
  Archive,
  ArrowUpCircle,
  Wrench,
  History,
  Cpu,
  Scan,
  UserPlus,
  Fingerprint,
  FolderTree,
  Crown,
  MessageSquare,
  FilePieChart,
  HeartHandshake,
  PlusCircle,
  ShoppingBag,
  CalendarDays,
  TestTube,
  ClipboardCheck,
  Sparkles,
  Building2,
  Hammer,
  Layers,
  LayoutTemplate,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Whitelist map of all icons used in the application
const iconMap: Record<string, LucideIcon> = {
  // Navigation & Menu Icons
  LayoutDashboard,
  Home,
  Users,
  User,
  CreditCard,
  Layers,
  LayoutTemplate,
  FileText,
  BarChart3,
  Settings,
  GraduationCap,
  CalendarCheck,
  TrendingUp,
  UserCheck,
  School,
  Bell,
  UserCog,
  BookOpen,
  Calendar,
  Clock,
  DoorOpen,
  Activity,
  ListChecks,
  Camera,
  BadgeCheck,
  CheckCheck,
  ShieldCheck,
  UserSquare,
  BarChart2,
  List,
  CalendarClock,
  FileEdit,
  ScanFace,
  Map,
  Mail,
  MessageCircle,
  Cog,
  Plus,
  Store,
  Wallet,
  ShoppingCart,
  Smartphone,
  Handshake,
  Briefcase,
  Shield,
  Database,
  Layout,
  Compass,
  Network,
  Move,
  Contact,
  UserMinus,
  Monitor,
  MapPin,
  Zap,
  Package,
  Archive,
  ArrowUpCircle,
  Wrench,
  History,
  Cpu,
  Scan,
  UserPlus,
  Fingerprint,
  FolderTree,
  Crown,
  MessageSquare,
  FilePieChart,
  HeartHandshake,
  PlusCircle,
  ShoppingBag,
  CalendarDays,
  TestTube,
  ClipboardCheck,
  Sparkles,
  Building2,
  Hammer,

  // Action Icons
  CheckCircle,
  XCircle,
  AlertTriangle,
  Trash2,
  Eye,
  Send,
  Download,
  
  // Default/Fallback
  Circle
};

export const iconNames = Object.keys(iconMap);

// Common synonyms mapping to canonical Lucide icon names
const synonyms: Record<string, string> = {
  dashboard: 'LayoutDashboard',
  home: 'LayoutDashboard',
  users: 'Users',
  user: 'User',
  billing: 'CreditCard',
  payment: 'CreditCard',
  payments: 'CreditCard',
  invoice: 'FileText',
  invoices: 'FileText',
  reports: 'BarChart3',
  report: 'BarChart3',
  analytics: 'BarChart3',
  settings: 'Settings',
  config: 'Settings',
  configuration: 'Settings',
  academic: 'GraduationCap',
  education: 'GraduationCap',
  school: 'GraduationCap',
  attendance: 'CalendarCheck',
  absensi: 'CalendarCheck',
  tool: 'Wrench',
  maintenance: 'Wrench',
  whatsappsetting: 'MessageSquare',
  'whatsapp setting': 'MessageSquare',
  'pengaturan whatsapp': 'MessageSquare',
  'paket & langganan': 'Crown',
  'paket dan langganan': 'Crown',
  paketlangganan: 'Crown',
  'registrasi siswa': 'UserPlus',
  registrasisiswa: 'UserPlus',
  'input absensi': 'Fingerprint',
  inputabsensi: 'Fingerprint',
  'kelompok laporan': 'FilePieChart',
  kelompoklaporan: 'FilePieChart',
};

// Convert various string styles to PascalCase expected by lucide-react exports
const toPascalCase = (name?: string | null): string => {
  if (!name) return '';
  const s = name.trim();
  if (!s) return '';
  // Replace separators with spaces, split, capitalize
  return s
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
};

export const iconForName = (name?: string | null): LucideIcon => {
  if (!name) return iconMap.Circle;
  
  const key = (name ?? '').toLowerCase().trim();

  // 1. KEYWORD PRIORITY (Our special premium icons)
  if (key.includes('paket') && key.includes('langganan')) return iconMap.Crown;
  if (key.includes('whatsapp') || key.includes('wa setting')) return iconMap.MessageSquare;
  if (key.includes('registrasi') && key.includes('siswa')) return iconMap.UserPlus;
  if (key.includes('absensi') && key.includes('input')) return iconMap.Fingerprint;
  if (key.includes('laporan') && key.includes('kelompok')) return iconMap.FolderTree;

  // 2. Try direct match from map (PascalCase)
  const pascal = toPascalCase(name);
  if (pascal && iconMap[pascal]) {
    return iconMap[pascal];
  }

  // 3. Try synonyms
  const syn = synonyms[key];
  if (syn && iconMap[syn]) {
    return iconMap[syn];
  }

  // 4. Fallback
  return iconMap.Circle;
};

export const isValidIconName = (name?: string | null, available?: string[]): boolean => {
  if (!name) return false;
  
  const pascal = toPascalCase(name);
  if (pascal && iconMap[pascal]) return true;
  
  const key = name.toLowerCase().trim();
  if (synonyms[key]) return true;
  
  // Check if it's in the available list (which might come from API, but we validate against our map)
  if (available && available.includes(pascal) && iconMap[pascal]) return true;
  
  return false;
};

export default iconForName;
