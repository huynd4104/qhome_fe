'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Arrow from '@/src/assets/Arrow.svg';
import DetailField from '@/src/components/base-service/DetailField';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Select from '@/src/components/customer-interaction/Select';
import { useBuildingDetailPage } from '@/src/hooks/useBuildingDetailPage';
import { Building } from '@/src/types/building';
import { useAuth } from '@/src/contexts/AuthContext';
import { useNotifications } from '@/src/hooks/useNotifications';

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
    const normalizeText = (s: string) => (s||'').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
    const stripVNPrefixes = (s: string) => {
        let x = normalizeText(s);
        x = x.replace(/^(tinh|thanh pho|tp)\s+/g,'')
             .replace(/^(quan|huyen|thi xa|tp)\s+/g,'')
             .replace(/^(phuong|xa|thi tran)\s+/g,'');
        return x.trim();
    };
    const findProvinceByName = (name: string) => {
        const target = stripVNPrefixes(name);
        return cities.find(p => {
            const pn = stripVNPrefixes(p.name);
            return pn===target || pn.includes(target) || target.includes(pn);
        });
    };
    const findDistrictByName = (list: District[], name: string) => {
        const target = stripVNPrefixes(name);
        return list.find(d => {
            const dn = stripVNPrefixes(d.name);
            return dn===target || dn.includes(target) || target.includes(dn);
        });
    };
    const findWardByName = (list: Ward[], name: string) => {
        const target = stripVNPrefixes(name);
        return list.find(w => {
            const wn = stripVNPrefixes(w.name);
            return wn===target || wn.includes(target) || target.includes(wn);
        });
    };
    const fetchDistrictsOfCity = async (code: string): Promise<District[]> => {
        try { const res = await fetch(`https://provinces.open-api.vn/api/p/${code}?depth=2`); const data = await res.json(); return Array.isArray(data?.districts)? data.districts.map((d:any)=>({code:d.code,name:d.name})) : []; } catch { return []; }
    };
    const fetchWardsOfDistrict = async (code: string): Promise<Ward[]> => {
        try { const res = await fetch(`https://provinces.open-api.vn/api/d/${code}?depth=2`); const data = await res.json(); return Array.isArray(data?.wards)? data.wards.map((w:any)=>({code:w.code,name:w.name})) : []; } catch { return []; }
    };

    // Load cities on mount
    useEffect(() => {
        const loadCities = async () => {
            try { const res = await fetch('https://provinces.open-api.vn/api/?depth=1'); const data: Province[] = await res.json(); setCities(Array.isArray(data)? data: []);} catch { setCities([]);} 
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
                return Array.from(names).sort((a,b)=>a.localeCompare(b));
            } catch {
                return [] as string[];
            }
        };

        const load = async () => {
            setRoads([]);
            setRoad('');
            if (!selectedWard || !selectedDistrict || !selectedCity) return;
            const cityName = cities.find(c=>String(c.code)===selectedCity)?.name || '';
            const districtName = districts.find(d=>String(d.code)===selectedDistrict)?.name || '';
            const wardName = wards.find(w=>String(w.code)===selectedWard)?.name || '';
            let names = await loadNearbyRoads(`${wardName}, ${districtName}, ${cityName}`);
            if (names.length===0) names = await loadNearbyRoads(`${districtName}, ${cityName}`);
            if (names.length===0) names = await loadNearbyRoads(`${cityName}`);
            setRoads(names.map(n=>({ name:n })));
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
            const parts = (buildingData.address || '').split(',').map(s=>s.trim()).filter(Boolean);
            const cityName = parts.length > 0 ? parts[parts.length - 1] : '';
            const districtName = parts.length > 1 ? parts[parts.length - 2] : '';
            const wardName = parts.length > 2 ? parts[parts.length - 3] : '';
            const detail = parts.length > 3 ? parts.slice(0, parts.length - 3).join(', ') : (parts[0] || '');
            setAddressDetail(detail);
            // Do not set road from address; user may choose later

            // Map names to codes sequentially
            const prefill = async () => {
                // wait until cities loaded
                let tries = 0; while (cities.length===0 && tries<10){ await new Promise(r=>setTimeout(r,100)); tries++; }
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
            };
            void prefill();
        }
    }, [buildingData, cities]);

    const handleBack = () => {
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
                const trimmed = String(value||'').trim();
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
            const limited = value.slice(0,40);
            setFormData(prev => ({...prev, name: limited }));
            validateField('name', limited);
        } else {
            setFormData((prevData) => ({
                ...prevData,
                [name]: value,
            }));
        }
    };

    const handleStatusChange = (item: { name: string; value: string }) => {
        setFormData((prevData) => ({
            ...prevData,
            status: item.value,
        }));
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
        const cityName = cities.find(c=>String(c.code)===selectedCity)?.name || '';
        const districtName = districts.find(d=>String(d.code)===selectedDistrict)?.name || '';
        const wardName = wards.find(w=>String(w.code)===selectedWard)?.name || '';
        const composedAddress = [addressDetail.trim(), road.trim(), wardName.trim(), districtName.trim(), cityName.trim()].filter(Boolean).join(', ');

        try {
            const payload: any = {
                name: (formData.name||'').trim(),
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
            router.push(`/base/building/buildingDetail/${buildingId}`);
        } catch (submitError) {
            console.error(t('updateError'), submitError);
            show(t('updateBuildingError'), 'error');
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen">{t('loading')}</div>;
    }

    if (error) {
        return <div className="flex justify-center items-center h-screen text-red-500">{t('error')}: {error.message}</div>;
    }

    if (!buildingData) {
        return <div className="flex justify-center text-xl font-bold items-center h-screen">{t('noData')}</div>;
    }

    return (
        <div className={`min-h-screen  p-4 sm:p-8 font-sans`}>
            <div className="max-w-4xl mx-auto mb-6 flex items-center cursor-pointer" onClick={handleBack}>
                <Image
                    src={Arrow}
                    alt="Back"
                    width={20}
                    height={20}
                    className="w-5 h-5 mr-2"
                />
                <span className={`text-[#02542D] font-bold text-2xl hover:text-opacity-80 transition duration-150 `}>
                    {t('returnBuildingDetail')}
                </span>
            </div>

            <form
                className="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-md border border-gray-200"
                onSubmit={handleSubmit}
            >
                <div className="flex justify-between items-start border-b pb-4 mb-6">
                    <div className="flex items-center">
                        <h1 className={`text-2xl font-semibold text-[#02542D] mr-3`}>
                            {t('editBuilding')}
                        </h1>
                        <span
                            className={`text-sm font-semibold px-3 py-1 rounded-full ${
                                formData.status === 'INACTIVE'
                                    ? 'bg-[#EEEEEE] text-[#02542D]'
                                    : 'bg-[#739559] text-white'
                            }`}
                        >
                            {formData.status === 'INACTIVE' ? t('inactive') : t('active')}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                    <DetailField
                        label={t('buildingCode')}
                        value={buildingData?.code || ""}
                        readonly={true}
                        placeholder={t('buildingCode')}
                    />

                    {/* <div className={`flex flex-col mb-4 col-span-1`}>
                        <label className="text-md font-bold text-[#02542D] mb-1">
                            {tProject('status')}
                        </label>
                        <Select
                            options={[
                                { name: tProject('inactive'), value: 'INACTIVE' },
                                { name: tProject('active'), value: 'ACTIVE' },
                            ]}
                            value={formData.status}
                            onSelect={handleStatusChange}
                            renderItem={(item) => item.name}
                            getValue={(item) => item.value}
                            placeholder={tProject('status')}
                        />
                    </div> */}

                    <DetailField
                        label={t('buildingName')}
                        value={formData?.name || ""}
                        readonly={false}
                        placeholder={t('buildingName')}
                        name="name"
                        onChange={handleChange}
                        error={errors.name}
                    />

                    <DetailField 
                        label={t('numberOfFloors')}
                        value={formData.numberOfFloors !== null && formData.numberOfFloors !== undefined ? String(formData.numberOfFloors) : ''}
                        onChange={(e) => {
                            const value = e.target.value ? parseInt(e.target.value) : null;
                            setFormData(prev => ({ ...prev, numberOfFloors: value }));
                            if (errors.numberOfFloors) {
                                validateField('numberOfFloors', value ?? '');
                            }
                        }}
                        name="numberOfFloors"
                        inputType="number"
                        placeholder={t('enterNumberOfFloors')}
                        readonly={false}
                        error={errors.numberOfFloors}
                    />
                    
                    {/* Address structured selectors */}
                    <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col">
                            <label className="text-md font-bold text-[#02542D] mb-1">{t('city')}</label>
                            <Select<Province>
                                options={cities}
                                value={selectedCity}
                                onSelect={(item) => { userInteractedRef.current = true; setSelectedCity(String((item as Province).code)); }}
                                renderItem={(item) => (item as Province).name}
                                getValue={(item) => String((item as Province).code)}
                                placeholder={t('placeholders.selectCity')}
                                error={!!errors.city}
                            />
                            {errors.city && <span className="text-xs text-red-500 mt-1">{errors.city}</span>}
                        </div>
                        <div className="flex flex-col">
                            <label className="text-md font-bold text-[#02542D] mb-1">{t('district')}</label>
                            <Select<District>
                                options={districts}
                                value={selectedDistrict}
                                onSelect={(item) => { userInteractedRef.current = true; setSelectedDistrict(String((item as District).code)); }}
                                renderItem={(item) => (item as District).name}
                                getValue={(item) => String((item as District).code)}
                                placeholder={t('placeholders.selectDistrict')}
                                error={!!errors.district}
                            />
                            {errors.district && <span className="text-xs text-red-500 mt-1">{errors.district}</span>}
                        </div>
                        <div className="flex flex-col">
                            <label className="text-md font-bold text-[#02542D] mb-1">{t('ward')}</label>
                            <Select<Ward>
                                options={wards}
                                value={selectedWard}
                                onSelect={(item) => { userInteractedRef.current = true; setSelectedWard(String((item as Ward).code)); }}
                                renderItem={(item) => (item as Ward).name}
                                getValue={(item) => String((item as Ward).code)}
                                placeholder={t('placeholders.selectWard')}
                                error={!!errors.ward}
                            />
                            {errors.ward && <span className="text-xs text-red-500 mt-1">{errors.ward}</span>}
                        </div>
                        <div className="flex flex-col">
                            <label className="text-md font-bold text-[#02542D] mb-1">{t('roadOptional')}</label>
                            <Select<{ name: string }>
                                options={roads}
                                value={road}
                                onSelect={(item) => setRoad((item as { name: string }).name)}
                                renderItem={(item) => (item as { name: string }).name}
                                getValue={(item) => (item as { name: string }).name}
                                placeholder={roads.length ? t('placeholders.selectRoadOptional') : t('placeholders.noRoadData')}
                                error={false}
                            />
                            <span className="text-xs text-slate-500 mt-1">{t('roadHelper')}</span>
                        </div>
                        <div className="flex flex-col md:col-span-2">
                            <label className="text-md font-bold text-[#02542D] mb-1">{t('addressDetail')}</label>
                            <input
                                type="text"
                                value={addressDetail}
                                onChange={(e) => {
                                    setAddressDetail(e.target.value);
                                    if (errors.addressDetail) {
                                        validateField('addressDetail', e.target.value);
                                    }
                                }}
                                placeholder={t('placeholders.addressDetail')}
                                className={`rounded-lg border px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 ${
                                    errors.addressDetail ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-100'
                                }`}
                            />
                            {errors.addressDetail && <span className="text-xs text-red-500 mt-1">{errors.addressDetail}</span>}
                        </div>
                    </div>

                </div>

                <div className="flex justify-center mt-8 space-x-4">
                    <button
                        type="button"
                        className="px-6 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 transition"
                        onClick={handleBack}
                        disabled={isSubmitting}
                    >
                        {t('cancel')}
                    </button>
                    <button
                        type="submit"
                        className={`px-6 py-2 rounded-lg bg-[#02542D] text-white hover:bg-opacity-80 transition ${
                            isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? t('saving') : t('save')}
                    </button>
                </div>
            </form>
        </div>
    );
}

