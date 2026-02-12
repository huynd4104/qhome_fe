'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Arrow from '@/src/assets/Arrow.svg';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Select from '@/src/components/customer-interaction/Select';
import { useBuildingDetailPage } from '@/src/hooks/useBuildingDetailPage';
import { Building } from '@/src/types/building';
import { useAuth } from '@/src/contexts/AuthContext';
import { useNotifications } from '@/src/hooks/useNotifications';
import {
    ArrowLeft,
    Building2,
    MapPin,
    Layers,
    Save,
    XCircle,
    Loader2,
    Navigation,
    Home,
    Hash
} from 'lucide-react';

// Minimal types for provinces API
type Province = { code: number; name: string };
type District = { code: number; name: string };
type Ward = { code: number; name: string };

export default function BuildingEdit() {
    const { user, hasRole } = useAuth();
    const t = useTranslations('Building');
    const tProject = useTranslations('Project');
    const router = useRouter();
    const params = useParams();
    const buildingId = params.id as string;
    const { show } = useNotifications();

    const { buildingData, loading, error, isSubmitting, editBuilding } =
        useBuildingDetailPage(buildingId);

    const [formData, setFormData] = useState<Partial<Building> & { status: string; numberOfFloors: number | null }>({
        address: '',
        totalApartmentsAll: 0,
        totalApartmentsActive: 0,
        status: '',
        name: '',
        numberOfFloors: null,
    });

    const [errors, setErrors] = useState<{
        name?: string;
        city?: string;
        district?: string;
        ward?: string;
        addressDetail?: string;
        numberOfFloors?: string;
    }>({});

    // Address hierarchical state
    const [cities, setCities] = useState<Province[]>([]);
    const [districts, setDistricts] = useState<District[]>([]);
    const [wards, setWards] = useState<Ward[]>([]);

    const [selectedCity, setSelectedCity] = useState<string>('');
    const [selectedDistrict, setSelectedDistrict] = useState<string>('');
    const [selectedWard, setSelectedWard] = useState<string>('');
    const [roads, setRoads] = useState<{ name: string }[]>([]);
    const [road, setRoad] = useState<string>('');
    const [addressDetail, setAddressDetail] = useState<string>('');

    // Gate cascading effects to only run after the user actually changes a selection
    const userInteractedRef = React.useRef(false);

    // Helpers for VN text matching
    const normalizeText = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const stripVNPrefixes = (s: string) => {
        let x = normalizeText(s);
        x = x.replace(/^(tinh|thanh pho|tp)\s+/g, '')
            .replace(/^(quan|huyen|thi xa|tp)\s+/g, '')
            .replace(/^(phuong|xa|thi tran)\s+/g, '');
        return x.trim();
    };
    const findProvinceByName = (name: string) => {
        const target = stripVNPrefixes(name);
        return cities.find(p => {
            const pn = stripVNPrefixes(p.name);
            return pn === target || pn.includes(target) || target.includes(pn);
        });
    };
    const findDistrictByName = (list: District[], name: string) => {
        const target = stripVNPrefixes(name);
        return list.find(d => {
            const dn = stripVNPrefixes(d.name);
            return dn === target || dn.includes(target) || target.includes(dn);
        });
    };
    const findWardByName = (list: Ward[], name: string) => {
        const target = stripVNPrefixes(name);
        return list.find(w => {
            const wn = stripVNPrefixes(w.name);
            return wn === target || wn.includes(target) || target.includes(wn);
        });
    };
    const fetchDistrictsOfCity = async (code: string): Promise<District[]> => {
        try { const res = await fetch(`https://provinces.open-api.vn/api/p/${code}?depth=2`); const data = await res.json(); return Array.isArray(data?.districts) ? data.districts.map((d: any) => ({ code: d.code, name: d.name })) : []; } catch { return []; }
    };
    const fetchWardsOfDistrict = async (code: string): Promise<Ward[]> => {
        try { const res = await fetch(`https://provinces.open-api.vn/api/d/${code}?depth=2`); const data = await res.json(); return Array.isArray(data?.wards) ? data.wards.map((w: any) => ({ code: w.code, name: w.name })) : []; } catch { return []; }
    };

    // Load cities on mount
    useEffect(() => {
        const loadCities = async () => {
            try { const res = await fetch('https://provinces.open-api.vn/api/?depth=1'); const data: Province[] = await res.json(); setCities(Array.isArray(data) ? data : []); } catch { setCities([]); }
        };
        loadCities();
    }, []);

    // When city changes: fetch districts and reset district/ward/roads
    useEffect(() => {
        if (!userInteractedRef.current) return; // skip on initial prefill
        const load = async () => {
            setDistricts([]);
            setWards([]);
            setSelectedDistrict('');
            setSelectedWard('');
            setRoads([]);
            setRoad('');
            if (!selectedCity) return;
            const dList = await fetchDistrictsOfCity(selectedCity);
            setDistricts(dList);
        };
        void load();
    }, [selectedCity]);

    // When district changes: fetch wards and reset ward/roads
    useEffect(() => {
        if (!userInteractedRef.current) return; // skip on initial prefill
        const load = async () => {
            setWards([]);
            setSelectedWard('');
            setRoads([]);
            setRoad('');
            if (!selectedDistrict) return;
            const wList = await fetchWardsOfDistrict(selectedDistrict);
            setWards(wList);
        };
        void load();
    }, [selectedDistrict]);

    // When ward changes: load nearby roads (best-effort)
    useEffect(() => {
        if (!userInteractedRef.current) return; // skip on initial prefill
        const loadNearbyRoads = async (queryPlace: string) => {
            try {
                const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(queryPlace)}&format=json&limit=1`, { headers: { 'Accept': 'application/json' } });
                if (!geoRes.ok) return [] as string[];
                const geo = await geoRes.json();
                if (!Array.isArray(geo) || geo.length === 0) return [] as string[];
                const lat = parseFloat(geo[0].lat);
                const lon = parseFloat(geo[0].lon);
                if (!isFinite(lat) || !isFinite(lon)) return [] as string[];
                const overpassQuery = `
                    [out:json][timeout:30];
                    (
                      way(around:3000,${lat},${lon})["highway"]["name"];     
                      way(around:3000,${lat},${lon})["place"]["name"];       
                      node(around:3000,${lat},${lon})["place"]["name"];      
                    );
                    out tags;`;
                const overRes = await fetch('https://overpass-api.de/api/interpreter', {
                    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }, body: `data=${encodeURIComponent(overpassQuery)}`
                });
                if (!overRes.ok) return [] as string[];
                const overJson = await overRes.json();
                const names = new Set<string>();
                if (Array.isArray(overJson?.elements)) {
                    for (const el of overJson.elements) {
                        const n = el?.tags?.name; if (typeof n === 'string' && n.trim()) names.add(n.trim());
                    }
                }
                return Array.from(names).sort((a, b) => a.localeCompare(b));
            } catch {
                return [] as string[];
            }
        };

        const load = async () => {
            setRoads([]);
            setRoad('');
            if (!selectedWard || !selectedDistrict || !selectedCity) return;
            const cityName = cities.find(c => String(c.code) === selectedCity)?.name || '';
            const districtName = districts.find(d => String(d.code) === selectedDistrict)?.name || '';
            const wardName = wards.find(w => String(w.code) === selectedWard)?.name || '';
            let names = await loadNearbyRoads(`${wardName}, ${districtName}, ${cityName}`);
            if (names.length === 0) names = await loadNearbyRoads(`${districtName}, ${cityName}`);
            if (names.length === 0) names = await loadNearbyRoads(`${cityName}`);
            setRoads(names.map(n => ({ name: n })));
        };
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedWard]);

    useEffect(() => {
        if (buildingData) {
            setFormData({
                name: buildingData.name ?? '',
                address: buildingData.address ?? '',
                totalApartmentsAll: buildingData.totalApartmentsAll ?? 0,
                totalApartmentsActive: buildingData.totalApartmentsActive ?? 0,
                status: buildingData.status ?? 'ACTIVE',
                numberOfFloors: buildingData.floorsMax ?? null,
            });
            // Prefill address selects from stored address string: "detail, road, ward, district, city"
            const parts = (buildingData.address || '').split(',').map(s => s.trim()).filter(Boolean);
            const cityName = parts.length > 0 ? parts[parts.length - 1] : '';
            const districtName = parts.length > 1 ? parts[parts.length - 2] : '';
            const wardName = parts.length > 2 ? parts[parts.length - 3] : '';
            const roadName = parts.length > 3 ? parts[parts.length - 4] : ''; // Try to extract road if possible
            const detail = parts.length > 3 ? parts.slice(0, parts.length - 3).join(', ') : (parts[0] || '');

            // Adjust detail to remove road if we think we found it? 
            // Actually the original logic was: "detail" is everything before ward/district/city.
            // But if we have road support, we might want to split it better. 
            // For now, keep original logic for detail, but try to match road if exists in road list (will happen after roads load).

            setAddressDetail(detail);

            // Map names to codes sequentially
            const prefill = async () => {
                // wait until cities loaded
                let tries = 0; while (cities.length === 0 && tries < 10) { await new Promise(r => setTimeout(r, 100)); tries++; }
                const p = findProvinceByName(cityName);
                if (!p) return;
                setSelectedCity(String(p.code));
                const dList = await fetchDistrictsOfCity(String(p.code));
                setDistricts(dList);
                const d = findDistrictByName(dList, districtName);
                if (!d) return;
                setSelectedDistrict(String(d.code));
                const wList = await fetchWardsOfDistrict(String(d.code));
                setWards(wList);
                const w = findWardByName(wList, wardName);
                if (w) setSelectedWard(String(w.code));

                // If we want to set road, we'd need to wait for roads to load which happens in the useEffect[selectedWard].
                // So strict prefill of road might be tricky without triggering a cascade. 
                // We'll leave road for user to re-select if needed, or if it was part of detail, it stays in detail.
            };
            void prefill();
        }
    }, [buildingData, cities]);

    const handleBack = () => {
        router.push('/base/building/buildingList');
    };

    const handleCancel = () => {
        router.back();
    };

    // Helper: validate building name (required, max 40, no special chars, allow spaces)
    const validateBuildingName = (value: string): string | undefined => {
        const trimmed = (value ?? '').trim();
        if (!trimmed) return t('nameError');
        if (trimmed.length > 40) return t('nameMaxError') || 'Tên tòa nhà không được vượt quá 40 ký tự';
        // Allow letters (including Vietnamese), digits and spaces only
        const nameRegex = /^[a-zA-ZÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶàáảãạâầấẩẫậăằắẳẵặÈÉẺẼẸÊỀẾỂỄỆèéẻẽẹêềếểễệÌÍỈĨỊìíỉĩịÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢòóỏõọôồốổỗộơờớởỡợÙÚỦŨỤƯỪỨỬỮỰùúủũụưừứửữựỲÝỶỸỴỳýỷỹỵĐđ0-9\s]+$/;
        if (!nameRegex.test(trimmed)) return t('nameSpecialCharError') || 'Tên tòa nhà không được chứa ký tự đặc biệt';
        return undefined;
    };

    const validateField = (fieldName: string, value: string | number) => {
        const newErrors = { ...errors };

        switch (fieldName) {
            case 'name': {
                const msg = validateBuildingName(String(value ?? ''));
                if (msg) newErrors.name = msg; else delete newErrors.name;
                break;
            }
            case 'addressDetail': {
                const trimmed = String(value || '').trim();
                if (!trimmed) newErrors.addressDetail = t('addressDetailError') || 'Địa chỉ chi tiết không được để trống'; else delete newErrors.addressDetail;
                break;
            }
            case 'numberOfFloors': {
                const numValue = typeof value === 'number' ? value : (value ? parseInt(String(value)) : null);
                if (numValue === null || numValue === undefined || isNaN(numValue)) {
                    newErrors.numberOfFloors = t('floorsRequired');
                } else if (numValue < 1) {
                    newErrors.numberOfFloors = t('floorsMustBeGreaterThanZero');
                } else if (numValue >= 100) {
                    newErrors.numberOfFloors = t('floorsMustBeLessThan100');
                } else {
                    delete newErrors.numberOfFloors;
                }
                break;
            }
        }

        setErrors(newErrors);
    };

    const validateAllFields = () => {
        const newErrors: { name?: string; city?: string; district?: string; ward?: string; addressDetail?: string; numberOfFloors?: string } = {};
        const nameMsg = validateBuildingName(String(formData.name ?? ''));
        if (nameMsg) newErrors.name = nameMsg;
        if (!selectedCity) newErrors.city = t('cityRequired') || 'Vui lòng chọn thành phố';
        if (!selectedDistrict) newErrors.district = t('districtRequired') || 'Vui lòng chọn quận/huyện';
        if (!selectedWard) newErrors.ward = t('wardRequired') || 'Vui lòng chọn phường/xã';
        if (!addressDetail.trim()) newErrors.addressDetail = t('addressDetailError') || 'Địa chỉ chi tiết không được để trống';

        const floorsValue = formData.numberOfFloors;
        if (floorsValue === null || floorsValue === undefined || isNaN(floorsValue)) {
            newErrors.numberOfFloors = t('floorsRequired');
        } else if (floorsValue < 1) {
            newErrors.numberOfFloors = t('floorsMustBeGreaterThanZero');
        } else if (floorsValue >= 100) {
            newErrors.numberOfFloors = t('floorsMustBeLessThan100');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        if (name === 'totalApartmentsAll') {
            setFormData(prev => ({
                ...prev,
                totalApartmentsAll: parseInt(value) || 0,
            }));
        } else if (name === 'name') {
            const limited = value.slice(0, 40);
            setFormData(prev => ({ ...prev, name: limited }));
            validateField('name', limited);
        } else {
            setFormData((prevData) => ({
                ...prevData,
                [name]: value,
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isSubmitting) return;

        // Validate all fields at once
        const isValid = validateAllFields();

        if (!isValid) {
            show(t('error'), 'error');
            return;
        }

        // Compose address string and submit
        const cityName = cities.find(c => String(c.code) === selectedCity)?.name || '';
        const districtName = districts.find(d => String(d.code) === selectedDistrict)?.name || '';
        const wardName = wards.find(w => String(w.code) === selectedWard)?.name || '';
        const composedAddress = [addressDetail.trim(), road.trim(), wardName.trim(), districtName.trim(), cityName.trim()].filter(Boolean).join(', ');

        try {
            const payload: any = {
                name: (formData.name || '').trim(),
                address: composedAddress,
                totalApartmentsAll: formData.totalApartmentsAll,
                totalApartmentsActive: formData.totalApartmentsActive,
                status: formData.status,
            };
            if (formData.numberOfFloors !== null && formData.numberOfFloors !== undefined) {
                payload.numberOfFloors = formData.numberOfFloors;
            }
            await editBuilding(buildingId, payload);
            show(t('updateBuildingSuccess'), 'success');
            router.push(`/base/building/buildingList`);
        } catch (submitError) {
            console.error(t('updateError'), submitError);
            show(t('updateBuildingError'), 'error');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center h-screen bg-slate-50 text-red-500">
                {t('error')}: {error.message}
            </div>
        );
    }

    if (!buildingData) {
        return (
            <div className="flex justify-center text-xl font-bold items-center h-screen bg-slate-50 text-slate-500">
                {t('noData')}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
            {/* Back Button */}
            <div className="mb-6 flex items-center justify-between">
                <button
                    onClick={handleBack}
                    className="group flex items-center gap-2 rounded-lg py-2 pl-2 pr-4 text-slate-500 transition-all hover:bg-white hover:text-emerald-700 hover:shadow-sm"
                >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 transition-colors group-hover:ring-emerald-200">
                        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                    </div>
                    <span className="font-semibold">{t('return')}</span>
                </button>
            </div>

            <div className="mx-auto max-w-5xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Main Form Card */}
                <div className="relative z-10 overflow-visible rounded-3xl border border-white/50 bg-white/80 shadow-xl shadow-slate-200/50 backdrop-blur-xl">
                    <div className="border-b border-slate-100 p-6 md:p-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100/50 text-emerald-600 ring-4 ring-emerald-50">
                                    <Building2 className="h-6 w-6" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                                        {t('editBuilding')}
                                    </h1>
                                    <p className="mt-1 text-sm text-slate-500">
                                        {t('editBuildingSubtitle') || 'Cập nhật thông tin tòa nhà'}
                                    </p>
                                </div>
                            </div>
                            <span
                                className={`px-3 py-1 rounded-full text-sm font-semibold border ${formData.status === 'INACTIVE'
                                        ? 'bg-slate-100 text-slate-600 border-slate-200'
                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    }`}
                            >
                                {formData.status === 'INACTIVE' ? t('inactive') : t('active')}
                            </span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
                        {/* Building Info Section */}
                        <div className="space-y-6">
                            <h3 className="flex items-center text-sm font-semibold uppercase tracking-wider text-slate-500">
                                <Building2 className="mr-2 h-4 w-4" />
                                {t('sections.buildingInfo') || 'Thông tin tòa nhà'}
                            </h3>

                            <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
                                <div className="group space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 transition-colors group-focus-within:text-emerald-600">
                                        <Hash className="h-4 w-4 text-emerald-500" />
                                        {t('buildingCode')}
                                    </label>
                                    <input
                                        type="text"
                                        value={buildingData?.code || ""}
                                        readOnly
                                        disabled
                                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-500 shadow-sm focus:outline-none cursor-not-allowed"
                                    />
                                </div>

                                <div className="group space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 transition-colors group-focus-within:text-emerald-600">
                                        <Building2 className="h-4 w-4 text-emerald-500" />
                                        {t('buildingName')}
                                        <span className="text-red-500 ml-1">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name ?? ''}
                                        onChange={handleChange}
                                        placeholder={t('buildingName')}
                                        className={`h-11 w-full rounded-xl border px-4 text-sm font-medium shadow-sm transition-all focus:outline-none focus:ring-2 ${errors.name
                                            ? 'border-red-300 bg-red-50 text-red-900 focus:border-red-500 focus:ring-red-100 placeholder:text-red-300'
                                            : 'border-slate-200 bg-white text-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20 hover:border-emerald-200'
                                            }`}
                                    />
                                    {errors.name && (
                                        <div className="flex items-center text-xs text-red-600 animate-in slide-in-from-left-1">
                                            <XCircle className="mr-1 h-3 w-3" />
                                            {errors.name}
                                        </div>
                                    )}
                                </div>

                                <div className="group space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 transition-colors group-focus-within:text-emerald-600">
                                        <Layers className="h-4 w-4 text-emerald-500" />
                                        {t('numberOfFloors')}
                                        <span className="text-red-500 ml-1">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        name="numberOfFloors"
                                        value={formData.numberOfFloors !== null && formData.numberOfFloors !== undefined ? String(formData.numberOfFloors) : ''}
                                        onChange={(e) => {
                                            const value = e.target.value ? parseInt(e.target.value) : null;
                                            setFormData(prev => ({ ...prev, numberOfFloors: value }));
                                            if (errors.numberOfFloors) {
                                                validateField('numberOfFloors', value ?? '');
                                            }
                                        }}
                                        placeholder={t('enterNumberOfFloors')}
                                        className={`h-11 w-full rounded-xl border px-4 text-sm font-medium shadow-sm transition-all focus:outline-none focus:ring-2 ${errors.numberOfFloors
                                            ? 'border-red-300 bg-red-50 text-red-900 focus:border-red-500 focus:ring-red-100 placeholder:text-red-300'
                                            : 'border-slate-200 bg-white text-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20 hover:border-emerald-200'
                                            }`}
                                    />
                                    {errors.numberOfFloors && (
                                        <div className="flex items-center text-xs text-red-600 animate-in slide-in-from-left-1">
                                            <XCircle className="mr-1 h-3 w-3" />
                                            {errors.numberOfFloors}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-slate-100" />

                        {/* Address Info Section */}
                        <div className="space-y-6">
                            <h3 className="flex items-center text-sm font-semibold uppercase tracking-wider text-slate-500">
                                <MapPin className="mr-2 h-4 w-4" />
                                {t('sections.addressInfo') || 'Địa chỉ'}
                            </h3>

                            <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
                                <div className="group space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 transition-colors group-focus-within:text-emerald-600">
                                        <MapPin className="h-4 w-4 text-emerald-500" />
                                        {t('city')}
                                        <span className="text-red-500 ml-1">*</span>
                                    </label>
                                    <Select<Province>
                                        options={cities}
                                        value={selectedCity}
                                        onSelect={(item) => { userInteractedRef.current = true; setSelectedCity(String((item as Province).code)); }}
                                        renderItem={(item) => (item as Province).name}
                                        getValue={(item) => String((item as Province).code)}
                                        placeholder={t('selectCity')}
                                        error={!!errors.city}
                                    />
                                    {errors.city && (
                                        <div className="flex items-center text-xs text-red-600 animate-in slide-in-from-left-1">
                                            <XCircle className="mr-1 h-3 w-3" />
                                            {errors.city}
                                        </div>
                                    )}
                                </div>

                                <div className="group space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 transition-colors group-focus-within:text-emerald-600">
                                        <MapPin className="h-4 w-4 text-emerald-500" />
                                        {t('district')}
                                        <span className="text-red-500 ml-1">*</span>
                                    </label>
                                    <Select<District>
                                        options={districts}
                                        value={selectedDistrict}
                                        onSelect={(item) => { userInteractedRef.current = true; setSelectedDistrict(String((item as District).code)); }}
                                        renderItem={(item) => (item as District).name}
                                        getValue={(item) => String((item as District).code)}
                                        placeholder={t('selectDistrict')}
                                        error={!!errors.district}
                                    />
                                    {errors.district && (
                                        <div className="flex items-center text-xs text-red-600 animate-in slide-in-from-left-1">
                                            <XCircle className="mr-1 h-3 w-3" />
                                            {errors.district}
                                        </div>
                                    )}
                                </div>

                                <div className="group space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 transition-colors group-focus-within:text-emerald-600">
                                        <MapPin className="h-4 w-4 text-emerald-500" />
                                        {t('ward')}
                                        <span className="text-red-500 ml-1">*</span>
                                    </label>
                                    <Select<Ward>
                                        options={wards}
                                        value={selectedWard}
                                        onSelect={(item) => { userInteractedRef.current = true; setSelectedWard(String((item as Ward).code)); }}
                                        renderItem={(item) => (item as Ward).name}
                                        getValue={(item) => String((item as Ward).code)}
                                        placeholder={t('selectWard')}
                                        error={!!errors.ward}
                                    />
                                    {errors.ward && (
                                        <div className="flex items-center text-xs text-red-600 animate-in slide-in-from-left-1">
                                            <XCircle className="mr-1 h-3 w-3" />
                                            {errors.ward}
                                        </div>
                                    )}
                                </div>

                                <div className="group space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 transition-colors group-focus-within:text-emerald-600">
                                        <Navigation className="h-4 w-4 text-emerald-500" />
                                        {t('roadVillage')}
                                    </label>
                                    <Select<{ name: string }>
                                        options={roads}
                                        value={road}
                                        onSelect={(item) => setRoad((item as { name: string }).name)}
                                        renderItem={(item) => (item as { name: string }).name}
                                        getValue={(item) => (item as { name: string }).name}
                                        placeholder={roads.length ? t('selectRoadVillage') : t('noRoadVillageData')}
                                        error={false}
                                    />
                                </div>

                                <div className="col-span-full group space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 transition-colors group-focus-within:text-emerald-600">
                                        <Home className="h-4 w-4 text-emerald-500" />
                                        {t('addressDetail')}
                                        <span className="text-red-500 ml-1">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={addressDetail}
                                        onChange={(e) => {
                                            setAddressDetail(e.target.value);
                                            if (errors.addressDetail) {
                                                validateField('addressDetail', e.target.value);
                                            }
                                        }}
                                        placeholder="Số nhà, toà, tầng..."
                                        className={`h-11 w-full rounded-xl border px-4 text-sm font-medium shadow-sm transition-all focus:outline-none focus:ring-2 ${errors.addressDetail ? 'border-red-300 bg-red-50 text-red-900 focus:border-red-500 focus:ring-red-100 placeholder:text-red-300'
                                                : 'border-slate-200 bg-white text-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20 hover:border-emerald-200'
                                            }`}
                                    />
                                    {errors.addressDetail && (
                                        <div className="flex items-center text-xs text-red-600 animate-in slide-in-from-left-1">
                                            <XCircle className="mr-1 h-3 w-3" />
                                            {errors.addressDetail}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-end border-t border-slate-100">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:ring-offset-2"
                                disabled={isSubmitting}
                            >
                                {t('cancel')}
                            </button>
                            <button
                                type="submit"
                                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition-all hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {t('saving')}
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        {t('save')}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
