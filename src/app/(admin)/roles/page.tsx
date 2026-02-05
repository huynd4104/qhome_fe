"use client";
import React from 'react';
import { useTranslations } from 'next-intl';
import RolePermissionManager from '@/src/components/admin/RolePermissionManager';

export default function RolesPage() {
  const t = useTranslations('AdminRoles');
  return (
    <div className="lg:col-span-1 space-y-6">
      <div className="max-w-screen overflow-x-hidden ">
        <h1 className="text-2xl font-semibold text-[#02542D] mb-4">
          {t('title')}
        </h1>
        <p className="text-slate-600 mb-4">
          {t('subtitle')}
        </p>

        <RolePermissionManager />
      </div>
    </div>
  );
}

