import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useNavStore } from '../../store/navStore';

interface BreadcrumbItem {
  label: string;
  path: string;
  isActive?: boolean;
}

export function Breadcrumb() {
  const location = useLocation();
  const { activeHub } = useNavStore();

  const getHubColorClasses = () => {
    switch (activeHub) {
      case 'AKADEMIK': return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
      case 'ABSENSI': return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20';
      case 'HUBIN': return 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20';
      case 'SARPRAS': return 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20';
      case 'KOPERASI': return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20';
      default: return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
    }
  };

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];

    // Always start with Dashboard
    breadcrumbs.push({
      label: 'Dashboard',
      path: '/dashboard',
      isActive: location.pathname === '/dashboard'
    });

    // Generate breadcrumbs from path segments
    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // Skip dashboard as it's already added
      if (segment === 'dashboard') return;

      // Convert segment to readable label
      const label = segment
        .split('-')
        .map(word => {
            // Handle common acronyms or special words if needed
            if (word.length <= 3 && !['dan', 'ke'].includes(word)) return word.toUpperCase();
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');

      breadcrumbs.push({
        label,
        path: currentPath,
        isActive: index === pathSegments.length - 1
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();
  const activeItem = breadcrumbs.find(b => b.isActive) || breadcrumbs[breadcrumbs.length - 1];

  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav className="flex items-center gap-4 py-3 px-6 bg-transparent animate-in fade-in duration-500 overflow-x-auto no-scrollbar">
      {/* Page Title Label - Precision ala MyASN */}
      <h1 className="text-2xl font-black text-[#0061C2] dark:text-cyan-400 tracking-tight whitespace-nowrap">
        {activeItem?.label}
      </h1>

      {/* Separator - Subtle Vertical Line */}
      <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-2" />

      {/* Path List - Subtle & Clean */}
      <div className="flex items-center gap-2">
          <Link 
              to="/dashboard" 
              className="text-gray-400 hover:text-[#0061C2] dark:hover:text-cyan-400 transition-colors"
          >
              <Home size={18} />
          </Link>
          
          {breadcrumbs.map((item, index) => (
              <React.Fragment key={item.path}>
                  <ChevronRight size={14} className="text-gray-300 dark:text-gray-600" />
                  
                    <Link
                        to={item.path}
                        className={cn(
                            "text-sm font-medium transition-colors whitespace-nowrap",
                            item.isActive 
                              ? "text-gray-900 dark:text-gray-100 font-bold" 
                              : "text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-1"
                        )}
                    >
                        {item.label}
                    </Link>
              </React.Fragment>
          ))}
      </div>
    </nav>
  );
}
