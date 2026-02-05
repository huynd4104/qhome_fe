"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useNotifications } from "@/src/hooks/useNotifications";
import {
  PricingTierDto,
  getPricingTiersByService,
  createPricingTier,
  updatePricingTier,
  deletePricingTier,
  CreatePricingTierRequest,
  UpdatePricingTierRequest,
} from "@/src/services/finance/pricingTierService";
import DateBox from "@/src/components/customer-interaction/DateBox";
import Image from "next/image";
import Edit from "@/src/assets/Edit.svg";
import Delete from "@/src/assets/Delete.svg";

type ServiceCode = "WATER" | "ELECTRIC";

interface PricingFormulaModalProps {
  serviceCode: ServiceCode;
  onClose: () => void;
  onUpdated?: (serviceCode: ServiceCode) => void;
}

interface TierFormState {
  id?: string;
  tierOrder: number;
  minQuantity: number | null;
  maxQuantity: number | null;
  unitPrice: number | null;
  effectiveFrom: string;
  effectiveUntil: string | null;
  active: boolean;
  description: string;
}

type FormErrors = {
  minQuantity?: string;
  maxQuantity?: string;
  unitPrice?: string;
  effectiveFrom?: string;
  effectiveUntil?: string;
};

const EMPTY_FORM: TierFormState = {
  tierOrder: 1,
  minQuantity: null,
  maxQuantity: null,
  unitPrice: null,
  effectiveFrom: new Date().toISOString().split("T")[0],
  effectiveUntil: null,
  active: true,
  description: "",
};

export default function PricingFormulaModal({
  serviceCode,
  onClose,
  onUpdated,
}: PricingFormulaModalProps) {
  const { show } = useNotifications();

  const [tiers, setTiers] = useState<PricingTierDto[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [editingTier, setEditingTier] = useState<TierFormState | null>(null);
  const [isCreateMode, setIsCreateMode] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  useEffect(() => {
    loadTiers();
  }, [serviceCode]);

  const sortedTiers = useMemo(() => {
    return [...tiers].sort((a, b) => {
      const orderDiff = (a.tierOrder ?? 0) - (b.tierOrder ?? 0);
      if (orderDiff !== 0) return orderDiff;
      return (Number(a.minQuantity ?? 0) || 0) - (Number(b.minQuantity ?? 0) || 0);
    });
  }, [tiers]);

  const isTierCurrentlyActive = (tier: PricingTierDto) => {
    if (!tier.effectiveFrom) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const from = new Date(tier.effectiveFrom);
    if (Number.isNaN(from.getTime())) return false;
    from.setHours(0, 0, 0, 0);

    if (from > today) return false;

    const until = tier.effectiveUntil ? new Date(tier.effectiveUntil) : null;
    if (until) {
      if (Number.isNaN(until.getTime())) return false;
      until.setHours(0, 0, 0, 0);
      if (until < today) return false;
    }

    if (tier.active === false) return false;

    return true;
  };

  const loadTiers = async () => {
    try {
      setLoading(true);
      const data = await getPricingTiersByService(serviceCode);
      setTiers(data ?? []);
    } catch (error: any) {
      console.error("Failed to load pricing tiers:", error);
      show(
        error?.response?.data?.message || error?.message || "Failed to load pricing tiers",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const startCreate = () => {
    setIsCreateMode(true);
    setEditingTier({ ...EMPTY_FORM, tierOrder: tiers.length + 1 });
    setFormErrors({});
  };

  const startEdit = (tier: PricingTierDto) => {
    setIsCreateMode(false);
    setEditingTier({
      id: tier.id,
      tierOrder: tier.tierOrder ?? 1,
      minQuantity: Number(tier.minQuantity ?? 0),
      maxQuantity: tier.maxQuantity !== null && tier.maxQuantity !== undefined ? Number(tier.maxQuantity) : null,
      unitPrice: Number(tier.unitPrice ?? 0),
      effectiveFrom: tier.effectiveFrom ?? new Date().toISOString().split("T")[0],
      effectiveUntil: tier.effectiveUntil ?? null,
      active: tier.active ?? true,
      description: tier.description ?? "",
    });
    setFormErrors({});
  };

  const resetForm = () => {
    setEditingTier(null);
    setIsCreateMode(false);
    setFormErrors({});
  };

  const handleDelete = async (tier: PricingTierDto) => {
    const confirmed = confirm(`Delete tier #${tier.tierOrder}?`);
    if (!confirmed) return;

    try {
      setSaving(true);
      await deletePricingTier(tier.id);
      show(`Deleted tier #${tier.tierOrder}`, "success");
      await loadTiers();
      onUpdated?.(serviceCode);
    } catch (error: any) {
      console.error("Failed to delete pricing tier:", error);
      show(
        error?.response?.data?.message || error?.message || "Failed to delete pricing tier",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const validateForm = (form: TierFormState): string | null => {
    const errors: FormErrors = {};

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const min = form.minQuantity ?? null;
    const max = form.maxQuantity ?? null;

    const overlapping = tiers.filter((tier) => tier.id !== form.id);

    const matchesRange = overlapping.some((tier) => {
      const tierMin = Number(tier.minQuantity ?? 0);
      const tierMax = tier.maxQuantity !== null && tier.maxQuantity !== undefined
        ? Number(tier.maxQuantity)
        : Infinity;

      if (min !== null && min >= tierMin && min <= tierMax) return true;
      if (max !== null && max >= tierMin && max <= tierMax) return true;
      if (min !== null && max !== null && min <= tierMin && max >= tierMax) return true;

      return false;
    });

    if (matchesRange) {
      errors.minQuantity = 'Range overlaps with existing tiers';
      errors.maxQuantity = 'Range overlaps with existing tiers';
    }

    if (min === null || Number.isNaN(min)) {
      errors.minQuantity = 'Min quantity is required';
    } else if (min < 0) {
      errors.minQuantity = 'Min quantity must be >= 0';
    }

    if (max === null || Number.isNaN(max)) {
        errors.maxQuantity = 'Max quantity is required';
      } else if (max < 0) {
        errors.maxQuantity = 'Max quantity must be >= 0';
      }

    if (max !== null && !Number.isNaN(max)) {
      if (max < 0) {
        errors.maxQuantity = 'Max quantity must be >= 0';
      } else if (min !== null && max < min) {
        errors.maxQuantity = 'Max quantity must be >= min quantity';
      }
    }

    if (form.unitPrice === null || Number.isNaN(form.unitPrice)) {
      errors.unitPrice = 'Unit price is required';
    } else if (form.unitPrice < 0) {
      errors.unitPrice = 'Unit price must be >= 0';
    }

    if (!form.effectiveFrom) {
      errors.effectiveFrom = 'Effective from is required';
    } else {
      const effFrom = new Date(form.effectiveFrom);
      effFrom.setHours(0, 0, 0, 0);
      if (!form.id && effFrom < today) {
        errors.effectiveFrom = 'Effective from must be today or later';
      }
    }

    if (form.effectiveUntil) {
      const effUntil = new Date(form.effectiveUntil);
      effUntil.setHours(0, 0, 0, 0);
      if (effUntil < today) {
        errors.effectiveUntil = 'Effective until must be today or later';
      }
      if (form.effectiveFrom && effUntil < new Date(form.effectiveFrom)) {
        errors.effectiveUntil = 'Effective until must be after effective from';
      }
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      return 'Validation failed';
    }

    return null;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingTier) return;

    const validationError = validateForm(editingTier);
    if (validationError) {
      show(validationError, "error");
      return;
    }

    try {
      setSaving(true);

      if (editingTier.id) {
        const payload: UpdatePricingTierRequest = {
          tierOrder: editingTier.tierOrder,
          minQuantity: editingTier.minQuantity ?? null,
          maxQuantity: editingTier.maxQuantity ?? null,
          unitPrice: editingTier.unitPrice ?? null,
          effectiveFrom: editingTier.effectiveFrom,
          effectiveUntil: editingTier.effectiveUntil ?? undefined,
          active: editingTier.active,
          description: editingTier.description || undefined,
        };

        await updatePricingTier(editingTier.id, payload);
        show("Updated pricing tier successfully", "success");
      } else {
        const payload: CreatePricingTierRequest = {
          serviceCode,
          tierOrder: editingTier.tierOrder,
          minQuantity: editingTier.minQuantity ?? 0,
          maxQuantity: editingTier.maxQuantity ?? null,
          unitPrice: editingTier.unitPrice ?? 0,
          effectiveFrom: editingTier.effectiveFrom,
          effectiveUntil: editingTier.effectiveUntil ?? undefined,
          active: editingTier.active,
          description: editingTier.description || undefined,
        };

        await createPricingTier(payload);
        show("Created pricing tier successfully", "success");
      }

      await loadTiers();
      resetForm();
      onUpdated?.(serviceCode);
    } catch (error: any) {
      console.error("Failed to save pricing tier:", error);
      show(
        error?.response?.data?.message || error?.message || "Failed to save pricing tier",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const renderTiersTable = () => {
    if (loading) {
      return (
        <div className="py-8 text-center text-gray-500">Loading pricing tiers...</div>
      );
    }

    if (sortedTiers.length === 0) {
      return (
        <div className="py-8 text-center text-gray-500">
          No pricing tiers found. Please create a new tier.
        </div>
      );
    }

    return (
      <div className="overflow-x-auto bg-white border border-[#CDCDCD] rounded-xl border-t-4 border-[#14AE5C] shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b-2 border-[#14AE5C]">
            <tr>
              <th className="px-4 py-3 text-[13px] font-bold text-[#024023] uppercase tracking-wide text-center">Unit Price</th>
              <th className="px-4 py-3 text-[13px] font-bold text-[#024023] uppercase tracking-wide text-center">Min</th>
              <th className="px-4 py-3 text-[13px] font-bold text-[#024023] uppercase tracking-wide text-center">Max</th>
              <th className="px-4 py-3 text-[13px] font-bold text-[#024023] uppercase tracking-wide text-center">Effective From</th>
              <th className="px-4 py-3 text-[13px] font-bold text-[#024023] uppercase tracking-wide text-center">Effective Until</th>
              <th className="px-4 py-3 text-[13px] font-bold text-[#024023] uppercase tracking-wide text-center">Description</th>
              <th className="px-4 py-3 text-[13px] font-bold text-[#024023] uppercase tracking-wide text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedTiers.map((tier, index) => {
              const isActiveTier = isTierCurrentlyActive(tier);
              const baseBorderClass = index < sortedTiers.length - 1 ? "border-b border-[#CDCDCD]" : "";
              const rowClass = `${baseBorderClass} transition ${
                isActiveTier ? "bg-green-50 hover:bg-green-100" : "bg-gray-100 hover:bg-gray-200"
              }`;
              const textColorClass = isActiveTier ? "text-[#024023]" : "text-gray-500";
              const editButtonClass = isActiveTier
                ? "w-[47px] h-[34px] flex items-center justify-center rounded-md bg-blue-500 hover:bg-blue-600 transition disabled:opacity-80"
                : "w-[47px] h-[34px] flex items-center justify-center rounded-md bg-blue-300 hover:bg-blue-500 text-blue-600 transition disabled:opacity-60";
              const deleteButtonClass = isActiveTier
                ? "w-[47px] h-[34px] flex items-center justify-center rounded-md bg-red-500 hover:bg-red-600 transition disabled:opacity-80"
                : "w-[47px] h-[34px] flex items-center justify-center rounded-md bg-red-300 hover:bg-red-500 text-red-600 transition disabled:opacity-60";

              return (
                <tr key={tier.id} className={rowClass}>
                  <td className={`px-4 py-3 text-sm font-semibold text-center ${textColorClass}`}>
                    {Number(tier.unitPrice ?? 0).toLocaleString("vi-VN")} VNĐ
                  </td>
                  <td className={`px-4 py-3 text-sm font-semibold text-center ${textColorClass}`}>
                    {Number(tier.minQuantity ?? 0).toLocaleString()}
                  </td>
                  <td className={`px-4 py-3 text-sm font-semibold text-center ${textColorClass}`}>
                    {tier.maxQuantity !== null && tier.maxQuantity !== undefined
                      ? Number(tier.maxQuantity).toLocaleString()
                      : "∞"}
                  </td>
                  <td className={`px-4 py-3 text-sm font-semibold text-center ${textColorClass}`}>
                    {tier.effectiveFrom ?? ""}
                  </td>
                  <td className={`px-4 py-3 text-sm font-semibold text-center ${textColorClass}`}>
                    {tier.effectiveUntil ?? "—"}
                  </td>
                  <td className={`px-4 py-3 text-sm font-semibold text-center ${textColorClass}`}>
                    {tier.description ?? ""}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-center">
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={() => startEdit(tier)}
                        className={editButtonClass}
                        title="Edit tier"
                        disabled={saving}
                      >
                        <Image src={Edit} alt="Edit" width={24} height={24} />
                      </button>
                      <button
                        onClick={() => handleDelete(tier)}
                        className={deleteButtonClass}
                        title="Delete tier"
                        disabled={saving}
                      >
                        <Image src={Delete} alt="Delete" width={24} height={24} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const updateFormField = <K extends keyof TierFormState>(field: K, value: TierFormState[K]) => {
    if (!editingTier) return;
    setEditingTier({ ...editingTier, [field]: value });
  };

  const renderForm = () => {
    if (!editingTier) return null;

    return (
      <div className="mt-6 pt-6 border-t border-gray-200">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (VNĐ)</label>
              <input
                type="number"
                min={0}
                value={editingTier.unitPrice ?? ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? null : Number(e.target.value);
                  updateFormField('unitPrice', value);
                }}
                className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#739559] border-gray-300`}
              />
              {formErrors.unitPrice && <p className="text-xs text-red-500 mt-1">{formErrors.unitPrice}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Quantity</label>
              <input
                type="number"
                min={0}
                value={editingTier.minQuantity ?? ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? null : Number(e.target.value);
                  updateFormField('minQuantity', value);
                }}
                className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#739559] border-gray-300`}
              />
              {formErrors.minQuantity && <p className="text-xs text-red-500 mt-1">{formErrors.minQuantity}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Quantity</label>
              <input
                type="number"
                min={0}
                value={editingTier.maxQuantity ?? ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? null : Number(e.target.value);
                  updateFormField('maxQuantity', value);
                }}
                className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#739559] border-gray-300`}
                placeholder="∞"
              />
              {formErrors.maxQuantity && <p className="text-xs text-red-500 mt-1">{formErrors.maxQuantity}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Effective From</label>
              <DateBox
                value={editingTier.effectiveFrom}
                onChange={(e) => updateFormField("effectiveFrom", e.target.value)}
              />
              {formErrors.effectiveFrom && <p className="text-xs text-red-500 mt-1">{formErrors.effectiveFrom}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Effective Until</label>
              <DateBox
                value={editingTier.effectiveUntil ?? ""}
                onChange={(e) => {
                  const value = e.target.value === "" ? null : e.target.value;
                  updateFormField("effectiveUntil", value);
                }}
                placeholderText="—"
              />
              {formErrors.effectiveUntil && <p className="text-xs text-red-500 mt-1">{formErrors.effectiveUntil}</p>}
            </div>
          </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={editingTier.description}
                onChange={(e) => updateFormField("description", e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#739559]"
              />
            </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#739559] text-white rounded-md hover:bg-[#5a7447] disabled:opacity-60"
              disabled={saving}
            >
              {saving ? "Saving..." : isCreateMode ? "Create" : "Update"}
            </button>
          </div>
        </form>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-[#02542D]">
              Pricing Formula - {serviceCode === "WATER" ? "Water" : "Electric"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-[#024023]">Pricing Tiers</h3>
            <button
              onClick={startCreate}
              className="px-4 py-2 bg-[#739559] text-white rounded-md hover:bg-[#5a7447] disabled:opacity-60"
              disabled={saving}
            >
              Add Tier
            </button>
          </div>

          {renderTiersTable()}

          {renderForm()}
        </div>
      </div>
    </div>
  );
}
