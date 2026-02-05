"use client";
import React, { useState } from 'react';

type Props = {
  service: string;
  permissions: string[];
  searchQuery?: string;
};

const serviceDisplayNames: Record<string, string> = {
  'iam': 'IAM Service',
  'base': 'Base Service',
  'finance': 'Finance & Billing Service',
  'maintenance': 'Maintenance Service',
  'customer': 'Customer Interaction Service',
  'report': 'Reporting Service',
  'system': 'System Management',
  'other': 'Other Permissions',
};

const serviceIcons: Record<string, string> = {
  'iam': '🔐',
  'base': '🏢',
  'finance': '💰',
  'maintenance': '🔧',
  'customer': '👥',
  'report': '📊',
  'system': '⚙️',
  'other': '📦',
};

export default function PermissionGroup({ service, permissions, searchQuery = '' }: Props) {
  const [isExpanded, setIsExpanded] = useState(true);

  const serviceName = serviceDisplayNames[service] || service.charAt(0).toUpperCase() + service.slice(1);
  const serviceIcon = serviceIcons[service] || '📦';

  // Highlight search query in permission
  const highlightPermission = (permission: string) => {
    if (!searchQuery) return permission;
    
    const index = permission.toLowerCase().indexOf(searchQuery.toLowerCase());
    if (index === -1) return permission;
    
    const before = permission.slice(0, index);
    const match = permission.slice(index, index + searchQuery.length);
    const after = permission.slice(index + searchQuery.length);
    
    return (
      <>
        {before}
        <mark className="bg-yellow-200 font-semibold">{match}</mark>
        {after}
      </>
    );
  };

  // Format permission description
  const getPermissionDescription = (permission: string) => {
    const parts = permission.split('.');
    if (parts.length < 2) return '';
    
    const action = parts[parts.length - 1];
    const resource = parts.slice(1, -1).join(' ');
    
    return `${action.charAt(0).toUpperCase()}${action.slice(1)} ${resource}`;
  };

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 transition flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{serviceIcon}</span>
          <div className="text-left">
            <h3 className="font-semibold text-slate-800">{serviceName}</h3>
            <p className="text-sm text-slate-600">
              {permissions.length} permission{permissions.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-slate-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Permissions List */}
      {isExpanded && (
        <div className="p-4 bg-white">
          <div className="space-y-2">
            {permissions.sort().map((permission, index) => (
              <div
                key={`${permission}-${index}`}
                className="flex items-start gap-3 p-3 rounded-md hover:bg-slate-50 transition border border-slate-100"
              >
                <div className="mt-0.5">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="flex-1">
                  <code className="text-sm font-mono text-slate-800">
                    {highlightPermission(permission)}
                  </code>
                  <p className="text-xs text-slate-500 mt-1">
                    {getPermissionDescription(permission)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

