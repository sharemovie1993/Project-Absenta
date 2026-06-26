import React from 'react';
import { Checkbox } from '@/components/ui';
import { type PermissionCatalogItem } from '@/api/user.api';

interface PermissionSelectorProps {
  permissions: PermissionCatalogItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  searchQuery: string;
}

export const PermissionSelector = ({
  permissions,
  selectedIds,
  onToggle,
  searchQuery
}: PermissionSelectorProps) => {
    const groups = React.useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        const filtered = permissions.filter(p => {
           if (!q) return true;
           return p.id.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q) || (p.group || '').toLowerCase().includes(q);
        });
        const g: Record<string, PermissionCatalogItem[]> = {};
        filtered.forEach(p => {
            const key = p.group || 'Other';
            if (!g[key]) g[key] = [];
            g[key].push(p);
        });
        return g;
    }, [permissions, searchQuery]);

    return (
        <div className="space-y-4">
            {Object.entries(groups).map(([group, items]) => (
                <div key={group} className="border rounded-md p-3">
                    <h4 className="font-bold text-sm mb-2 capitalize">{group}</h4>
                    <div className="grid grid-cols-1 gap-2">
                        {items.map(p => (
                            <div key={p.id} className="flex items-center gap-2">
                                <Checkbox 
                                    checked={selectedIds.includes(p.id)}
                                    onCheckedChange={() => onToggle(p.id)}
                                    id={`perm-${p.id}`}
                                />
                                <label htmlFor={`perm-${p.id}`} className="text-xs cursor-pointer select-none">
                                    <span className="font-mono text-gray-600">{p.id}</span>
                                    {p.description && <span className="text-gray-400 ml-2">- {p.description}</span>}
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};
