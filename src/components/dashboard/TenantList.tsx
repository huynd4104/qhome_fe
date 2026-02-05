// "use client";
// import React, { useEffect, useState } from 'react';
// import Link from 'next/link';
// import { Tenant, getAllTenants, Building, getBuildingsByTenant } from '@/src/services/base';
// import { useAuth } from '@/src/contexts/AuthContext';
// import TenantPermissionModal from './TenantPermissionModal';

// export default function TenantList() {
//   const { user, hasRole } = useAuth();
//   const [tenants, setTenants] = useState<Tenant[]>([]);
//   const [expandedTenant, setExpandedTenant] = useState<string | null>(null);
//   const [buildings, setBuildings] = useState<Record<string, Building[]>>({});
//   const [loading, setLoading] = useState(true);
//   const [loadingBuildings, setLoadingBuildings] = useState<string | null>(null);
//   const [error, setError] = useState<string | null>(null);
//   const [selectedTenantForPermission, setSelectedTenantForPermission] = useState<Tenant | null>(null);

//   useEffect(() => {
//     const loadTenants = async () => {
//       try {
//         setLoading(true);
//         const data = await getAllTenants();
        
//         // Filter tenants based on user role
//         let filteredData = data.filter(t => !t.isDeleted);
        
//         if (!hasRole('admin')) {
//           // If not admin, only show user's own tenant
//           filteredData = filteredData.filter(tenant => tenant.id === user?.tenantId);
//         }
        
//         setTenants(filteredData);
//       } catch (err: any) {
//         setError(err?.message || 'Không thể tải danh sách tenant');
//         console.error('Failed to load tenants:', err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     loadTenants();
//   }, [user, hasRole]);

//   const handleToggleTenant = async (tenantId: string) => {
//     if (expandedTenant === tenantId) {
//       setExpandedTenant(null);
//       return;
//     }

//     setExpandedTenant(tenantId);

//     // Load buildings if not loaded yet
//     if (!buildings[tenantId]) {
//       try {
//         setLoadingBuildings(tenantId);
//         const buildingData = await getBuildingsByTenant(tenantId);
//         setBuildings(prev => ({ ...prev, [tenantId]: buildingData }));
//       } catch (err: any) {
//         console.error('Failed to load buildings:', err);
//       } finally {
//         setLoadingBuildings(null);
//       }
//     }
//   };

//   if (loading) {
//     return (
//       <div className="bg-white rounded-lg border border-slate-200 p-6">
//         <h2 className="text-lg font-semibold mb-4">Danh sách Tenant / Công ty quản lý</h2>
//         <div className="text-center py-8 text-slate-500">Đang tải...</div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="bg-white rounded-lg border border-slate-200 p-6">
//         <h2 className="text-lg font-semibold mb-4">Danh sách Tenant / Công ty quản lý</h2>
//         <div className="text-center py-8 text-red-500">{error}</div>
//       </div>
//     );
//   }

//   return (
//     <div className="bg-white rounded-lg border border-slate-200">
//       <div className="p-6 border-b border-slate-200">
//         <div className="flex items-center justify-between">
//           <h2 className="text-lg font-semibold text-slate-800">Danh sách Tenant / Công ty quản lý</h2>
//           <span className="text-sm text-slate-500">{tenants.length} tenant</span>
//         </div>
//       </div>

//       {tenants.length === 0 ? (
//         <div className="p-6 text-center text-slate-500">
//           Chưa có tenant nào
//         </div>
//       ) : (
//         <div className="divide-y divide-slate-200">
//           {tenants.map((tenant) => (
//             <div key={tenant.id}>
//               {/* Tenant Row */}
//               <div 
//                 className="p-6 hover:bg-slate-50 cursor-pointer transition"
//                 onClick={() => handleToggleTenant(tenant.id)}
//               >
//                 <div className="flex items-start justify-between">
//                   <div className="flex-1">
//                     <div className="flex items-center gap-3">
//                       <span className="text-2xl">{expandedTenant === tenant.id ? '▼' : '▶'}</span>
//                       <div>
//                         <div className="flex items-center gap-2">
//                           <h3 className="text-base font-semibold text-slate-800">{tenant.name}</h3>
//                           <span className="text-sm text-[#6B9B6E] font-medium">({tenant.code})</span>
//                         </div>
//                         <div className="text-sm text-slate-600 mt-1">{tenant.address}</div>
//                         <div className="flex gap-4 mt-2 text-xs text-slate-500">
//                           <span>📧 {tenant.email}</span>
//                           <span>📞 {tenant.contact}</span>
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                   <div className="flex items-center gap-3">
//                     <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
//                       tenant.status === 'ACTIVE' 
//                         ? 'bg-green-100 text-green-800' 
//                         : 'bg-slate-100 text-slate-800'
//                     }`}>
//                       {tenant.status}
//                     </span>
//                     <Link
//                       href={`/users/permissions?tenant=${tenant.id}&tenantName=${encodeURIComponent(tenant.name)}`}
//                       onClick={(e) => e.stopPropagation()}
//                       className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition"
//                     >
//                       View Permissions
//                     </Link>
//                     <button
//                       onClick={(e) => {
//                         e.stopPropagation();
//                         setSelectedTenantForPermission(tenant);
//                       }}
//                       className="px-3 py-1.5 bg-[#6B9B6E] text-white text-sm font-medium rounded-md hover:bg-[#5a8259] transition"
//                     >
//                       🔑 Phân quyền
//                     </button>
//                   </div>
//                 </div>
//               </div>

//               {/* Buildings List (expanded) */}
//               {expandedTenant === tenant.id && (
//                 <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
//                   {loadingBuildings === tenant.id ? (
//                     <div className="text-center py-4 text-slate-500">Đang tải buildings...</div>
//                   ) : buildings[tenant.id]?.length > 0 ? (
//                     <div className="space-y-2">
//                       <h4 className="text-sm font-medium text-slate-700 mb-3">
//                         Danh sách Dự án / Building ({buildings[tenant.id].length})
//                       </h4>
//                       <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
//                         <table className="w-full text-sm">
//                           <thead className="bg-slate-100 border-b border-slate-200">
//                             <tr>
//                               <th className="px-4 py-2 text-left font-medium text-slate-600">Mã</th>
//                               <th className="px-4 py-2 text-left font-medium text-slate-600">Tên dự án</th>
//                               <th className="px-4 py-2 text-left font-medium text-slate-600">Địa chỉ</th>
//                               <th className="px-4 py-2 text-center font-medium text-slate-600">Tầng</th>
//                               <th className="px-4 py-2 text-center font-medium text-slate-600">Căn hộ</th>
//                             </tr>
//                           </thead>
//                           <tbody className="divide-y divide-slate-200">
//                             {buildings[tenant.id].map((building) => (
//                               <tr key={building.id} className="hover:bg-slate-50">
//                                 <td className="px-4 py-3">
//                                   <span className="font-medium text-[#6B9B6E]">{building.code}</span>
//                                 </td>
//                                 <td className="px-4 py-3">{building.name}</td>
//                                 <td className="px-4 py-3 text-slate-600">{building.address}</td>
//                                 <td className="px-4 py-3 text-center">{building.floorsMax}</td>
//                                 <td className="px-4 py-3 text-center">
//                                   <span className="text-green-600 font-medium">
//                                     {building.totalApartmentsActive}
//                                   </span>
//                                   <span className="text-slate-400">/{building.totalApartmentsAll}</span>
//                                 </td>
//                               </tr>
//                             ))}
//                           </tbody>
//                         </table>
//                       </div>
//                     </div>
//                   ) : (
//                     <div className="text-center py-4 text-slate-500">Chưa có building nào</div>
//                   )}
//                 </div>
//               )}
//             </div>
//           ))}
//         </div>
//       )}

//       {/* Permission Modal */}
//       {selectedTenantForPermission && (
//         <TenantPermissionModal
//           tenant={selectedTenantForPermission}
//           onClose={() => setSelectedTenantForPermission(null)}
//         />
//       )}
//     </div>
//   );
// }

