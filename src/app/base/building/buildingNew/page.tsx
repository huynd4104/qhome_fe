'use client'
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Arrow from '@/src/assets/Arrow.svg';
import DetailField from '@/src/components/base-service/DetailField';
import Select from '@/src/components/customer-interaction/Select';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/src/contexts/AuthContext';
import { Building } from '@/src/types/building';
import { useBuildingAdd } from '@/src/hooks/useBuildingAdd';
import { Project } from '@/src/types/project';
import { useNotifications } from '@/src/hooks/useNotifications';
import { checkBuildingCodeExists } from '@/src/services/base/buildingService';

// Minimal types for provinces API
type Province = { code: number; name: string };
type District = { code: number; name: string };
type Ward = { code: number; name: string };

export default function BuildingAdd () {

    const { user, hasRole } = useAuth();
    const t = useTranslations('Building');
    const tProject = useTranslations('Project');
    const router = useRouter();
    const [isSubmit, setIsSubmit] = useState(false);
    const [loadingProjects, setLoadingProjects] = useState(true);
    const { show } = useNotifications();
    const [codeError, setCodeError] = useState<string>('');
    const [errors, setErrors] = useState<{
        name?: string;
        address?: string;
        city?: string;
        district?: string;
        ward?: string;
        addressDetail?: string;
        numberOfFloors?: string;
    }>({});

    const { addBuilding, loading, error, isSubmitting } = useBuildingAdd();

    const [formData, setFormData] = useState<Partial<Building> & { totalApartmentsAllStr: string; status: string; numberOfFloors: number | null }>({
        code: '',
        name: '',
        address: '',
        totalApartmentsAll: 0,
        totalApartmentsActive: 0,
        totalApartmentsAllStr: '0',
        status: 'ACTIVE',
        numberOfFloors: null,
    });

    // Address pieces
    const [cities, setCities] = useState<Province[]>([]);
    const [districts, setDistricts] = useState<District[]>([]);
    const [wards, setWards] = useState<Ward[]>([]);

    const [selectedCity, setSelectedCity] = useState<string>('');
    const [selectedDistrict, setSelectedDistrict] = useState<string>('');
    const [selectedWard, setSelectedWard] = useState<string>('');
    // Roads (street/thôn) options loaded dynamically (optional)
    const [roads, setRoads] = useState<{ name: string }[]>([]);
    const [road, setRoad] = useState<string>(''); // optional
    const [addressDetail, setAddressDetail] = useState<string>(''); // required

    // Helper string normalization for robust matching
    const normalizeText = (s: string) =>
        (s || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/\p{Diacritic}/gu, '')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

    const stripVNPrefixes = (s: string) => {
        let x = normalizeText(s);
        x = x.replace(/^(tinh|thanh pho|tp)\s+/g, '')
             .replace(/^(quan|huyen|thi xa|tp)\s+/g, '')
             .replace(/^(phuong|xa|thi tran)\s+/g, '');
        return x.trim();
    };

    const findProvinceByName = (name: string): Province | undefined => {
        const target = stripVNPrefixes(name);
        return cities.find(p => {
            const pn = stripVNPrefixes(p.name);
            return pn === target || pn.includes(target) || target.includes(pn);
        });
    };

    const findDistrictByName = (list: District[], name: string): District | undefined => {
        const target = stripVNPrefixes(name);
        return list.find(d => {
            const dn = stripVNPrefixes(d.name);
            return dn === target || dn.includes(target) || target.includes(dn);
        });
    };

    const findWardByName = (list: Ward[], name: string): Ward | undefined => {
        const target = stripVNPrefixes(name);
        return list.find(w => {
            const wn = stripVNPrefixes(w.name);
            return wn === target || wn.includes(target) || target.includes(wn);
        });
    };

    const fetchDistrictsOfCity = async (cityCode: string): Promise<District[]> => {
        try {
            const res = await fetch(`https://provinces.open-api.vn/api/p/${cityCode}?depth=2`);
            const data = await res.json();
            return Array.isArray(data?.districts) ? data.districts.map((d: any) => ({ code: d.code, name: d.name })) : [];
        } catch {
            return [];
        }
    };

    const fetchWardsOfDistrict = async (districtCode: string): Promise<Ward[]> => {
        try {
            const res = await fetch(`https://provinces.open-api.vn/api/d/${districtCode}?depth=2`);
            const data = await res.json();
            return Array.isArray(data?.wards) ? data.wards.map((w: any) => ({ code: w.code, name: w.name })) : [];
        } catch {
            return [];
        }
    };

    const geocodeAndFillFromDetail = async (raw: string) => {
        const q = (raw || '').trim();
        if (!q) return;
        try {
            // 1) Geocode search
            const searchRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + ', Vietnam')}&format=json&addressdetails=1&limit=1`, {
                headers: { 'Accept': 'application/json' },
            });
            if (!searchRes.ok) return;
            const arr = await searchRes.json();
            console.log("searchRes", searchRes);
            if (!Array.isArray(arr) || arr.length === 0) return;
            const item = arr[0];
            const addr = item?.address || {};

            // Extract components
            const provinceName = addr.state || addr.province || '';
            const districtName = addr.county || addr.city_district || addr.district || '';
            const wardName = addr.suburb || addr.town || addr.village || addr.hamlet || addr.neighbourhood || '';
            const roadName = addr.road || addr.pedestrian || addr.path || '';

            // 2) Map to our lists
            const province = findProvinceByName(provinceName);
            if (!province) return; // cannot map reliably
            const provinceCode = String(province.code);

            const distList = await fetchDistrictsOfCity(provinceCode);
            const district = findDistrictByName(distList, districtName);
            const districtCode = district ? String(district.code) : '';

            let wardList: Ward[] = [];
            let ward: Ward | undefined;
            if (districtCode) {
                wardList = await fetchWardsOfDistrict(districtCode);
                ward = findWardByName(wardList, wardName);
            }

            // 3) Update states in one go
            setSelectedCity(provinceCode);
            setDistricts(distList);
            if (districtCode) setSelectedDistrict(districtCode);
            if (wardList.length) setWards(wardList);
            if (ward) setSelectedWard(String(ward.code));

            // 4) Populate road options if we have a road candidate
            if (roadName) {
                const rn = roadName.trim();
                if (rn) {
                    setRoads(prev => {
                        const exists = prev.some(r => normalizeText(r.name) === normalizeText(rn));
                        return exists ? prev : [{ name: rn }, ...prev];
                    });
                    setRoad(rn);
                }
            }
        } catch {
            // ignore failures
        }
    };

    // Helper: validate building name (required, max 40, no special chars)
    const validateBuildingName = (value: string): string | undefined => {
        const trimmed = (value ?? '').trim();
        if (!trimmed) return t('nameError');
        if (trimmed.length > 40) return t('nameMaxError') || 'Tên tòa nhà không được vượt quá 40 ký tự';
        // Allow letters (including Vietnamese), digits and spaces only
        const nameRegex = /^[a-zA-ZÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶàáảãạâầấẩẫậăằắẳẵặÈÉẺẼẸÊỀẾỂỄỆèéẻẽẹêềếểễệÌÍỈĨỊìíỉĩịÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢòóỏõọôồốổỗộơờớởỡợÙÚỦŨỤƯỪỨỬỮỰùúủũụưừứửữựỲÝỶỸỴỳýỷỹỵĐđ0-9\s]+$/;
        if (!nameRegex.test(trimmed)) return t('nameSpecialCharError') || 'Tên tòa nhà không được chứa ký tự đặc biệt';
        return undefined;
    };

    // Load cities on mount
    useEffect(() => {
        const loadCities = async () => {
            try {
                const res = await fetch('https://provinces.open-api.vn/api/?depth=1');
                const data: Province[] = await res.json();
                setCities(Array.isArray(data) ? data : []);
            } catch (_e) {
                setCities([]);
            }
        };
        loadCities();
    }, []);

    // Load districts when city changes
    useEffect(() => {
        const loadDistricts = async () => {
            setDistricts([]);
            setWards([]);
            setSelectedDistrict('');
            setSelectedWard('');
            if (!selectedCity) return;
            try {
                const res = await fetch(`https://provinces.open-api.vn/api/p/${selectedCity}?depth=2`);
                const data = await res.json();
                const list: District[] = Array.isArray(data?.districts) ? data.districts.map((d: any) => ({ code: d.code, name: d.name })) : [];
                setDistricts(list);
            } catch (_e) {
                setDistricts([]);
            }
        };
        void loadDistricts();
    }, [selectedCity]);

    // Load wards when district changes
    useEffect(() => {
        const loadWards = async () => {
            setWards([]);
            setSelectedWard('');
            if (!selectedDistrict) return;
            try {
                const res = await fetch(`https://provinces.open-api.vn/api/d/${selectedDistrict}?depth=2`);
                const data = await res.json();
                const list: Ward[] = Array.isArray(data?.wards) ? data.wards.map((w: any) => ({ code: w.code, name: w.name })) : [];
                setWards(list);
            } catch (_e) {
                setWards([]);
            }
        };
        void loadWards();
    }, [selectedDistrict]);

    // Load roads when ward changes (best-effort via Overpass API)
    useEffect(() => {
        const loadNearbyRoads = async (queryPlace: string) => {
            try {
                // 1) Geocode center point with Nominatim
                const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(queryPlace)}&format=json&limit=1`, {
                    headers: { 'Accept': 'application/json' }
                });
                if (!geoRes.ok) return [] as string[];
                const geo = await geoRes.json();
                if (!Array.isArray(geo) || geo.length === 0) return [] as string[];
                const lat = parseFloat(geo[0].lat);
                const lon = parseFloat(geo[0].lon);
                if (!isFinite(lat) || !isFinite(lon)) return [] as string[];

                // 2) Query Overpass for nearby named features within 3km
                const overpassQuery = `
                    [out:json][timeout:30];
                    (
                      way(around:3000,${lat},${lon})["highway"]["name"];     
                      way(around:3000,${lat},${lon})["place"]["name"];       
                      node(around:3000,${lat},${lon})["place"]["name"];      
                    );
                    out tags;`;
                const overRes = await fetch('https://overpass-api.de/api/interpreter', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
                    body: `data=${encodeURIComponent(overpassQuery)}`,
                });
                if (!overRes.ok) return [] as string[];
                const overJson = await overRes.json();
                const names = new Set<string>();
                if (Array.isArray(overJson?.elements)) {
                    for (const el of overJson.elements) {
                        const n = el?.tags?.name;
                        if (typeof n === 'string') {
                            const trimmed = n.trim();
                            if (trimmed) names.add(trimmed);
                        }
                    }
                }
                return Array.from(names).sort((a,b)=>a.localeCompare(b));
            } catch (_e) {
                return [] as string[];
            }
        };

        const loadRoads = async () => {
            setRoads([]);
            setRoad('');
            if (!selectedWard || !selectedDistrict || !selectedCity) return;

            const cityName = cities.find(c => String(c.code) === selectedCity)?.name || '';
            const districtName = districts.find(d => String(d.code) === selectedDistrict)?.name || '';
            const wardName = wards.find(w => String(w.code) === selectedWard)?.name || '';

            // Try ward center first
            let names = await loadNearbyRoads(`${wardName}, ${districtName}, ${cityName}`);
            // Fallback to district center if empty
            if (names.length === 0) {
                names = await loadNearbyRoads(`${districtName}, ${cityName}`);
            }
            // Fallback to city center if still empty
            if (names.length === 0) {
                names = await loadNearbyRoads(`${cityName}`);
            }

            setRoads(names.map(n => ({ name: n })));
        };

        void loadRoads();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedWard]);

    useEffect(() => {
        const checkCode = async () => {
            if (!formData.code ) {
                setCodeError('');
                return;
            }
            const exists = await checkBuildingCodeExists(formData.code);
            if (exists) {
                setCodeError(t('codeError'));
            } else {
                setCodeError('');
            }
        };

        const timeoutId = setTimeout(checkCode, 500); // Debounce 500ms
        return () => clearTimeout(timeoutId);
    }, [formData.code, t]);
    
    const handleBack = () => {
        router.back(); 
    }

    const handleCancel = () => {
        router.back(); 
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isSubmitting) return;

        // Compose address from parts before validate
        const cityName = cities.find(c => String(c.code) === selectedCity)?.name || '';
        const districtName = districts.find(d => String(d.code) === selectedDistrict)?.name || '';
        const wardName = wards.find(w => String(w.code) === selectedWard)?.name || '';
        const composed = [
            (addressDetail || '').trim(),
            (road || '').trim(),
            wardName.trim(),
            districtName.trim(),
            cityName.trim(),
        ].filter(Boolean).join(', ');

        setFormData(prev => ({ ...prev, address: composed }));

        // Validate all fields at once
        const isValid = validateAllFields();
        
        if (!isValid) {
            show(t('error'), 'error');
            return;
        }
        
        if (codeError) {
            show(codeError, 'error');
            return;
        }

        setIsSubmit(true);
        try {
            const { totalApartmentsAllStr, ...buildingData } = formData;
            // Ensure composed address used
            const payload: any = { ...buildingData, address: composed };
            if (payload.numberOfFloors !== null && payload.numberOfFloors !== undefined) {
                payload.numberOfFloors = payload.numberOfFloors;
            }
            await addBuilding(payload);
            show(t('success'), 'success');
            router.push(`/base/building/buildingList`);
        } catch (error) {
            console.error(t('createBuildingError'), error);
            show(t('errorBuilding'), 'error');
        } finally {
            setIsSubmit(false);
        }
    };

    const generateCodeFromName = (name: string): string => {
        if (!name) return '';
        return name
            .split(' ')
            .filter(word => word.length > 0)
            .map(word => {
                if (/^[a-zA-Z]/.test(word)) {
                    return word[0];
                }
                return word;
            })
            .join('')
            .toUpperCase();
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
                const trimmed = String(value ?? '').trim();
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
        const newErrors: {
            name?: string;
            address?: string;
            city?: string;
            district?: string;
            ward?: string;
            addressDetail?: string;
            numberOfFloors?: string;
        } = {};
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === 'name') {
            // enforce max length 40 on name input
            const limited = value.slice(0, 40);
            // const newCode = generateCodeFromName(limited);
            setFormData(prevData => ({
                ...prevData,
                name: limited,
                // code: newCode,
            }));
            // validateField('name', limited);
        }
    };

    const handleStatusChange = (item: { name: string; value: string }) => {
        setFormData((prevData) => ({
            ...prevData,
            status: item.value,
        }));
    };

    return (
        <div className={`min-h-screen  p-4 sm:p-8 font-sans`}>
            <div
                className="max-w-4xl mx-auto mb-6 flex items-center cursor-pointer"
                onClick={handleBack}
            >
                <Image 
                    src={Arrow} 
                    alt="Back" 
                    width={20} 
                    height={20}
                    className="w-5 h-5 mr-2" 
                />
                <span className={`text-[#02542D] font-bold text-2xl hover:text-opacity-80 transition duration-150`}>
                    {t('return')}
                </span>
            </div>

            <form
                className="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-md border border-gray-200"
                onSubmit={handleSubmit}
            >
                <div className="flex justify-between items-start border-b pb-4 mb-6">
                    <div className="flex items-center">
                        <h1 className={`text-2xl font-semibold text-[#02542D] mr-3`}>
                            {t('addBuilding')}
                        </h1>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                    <DetailField 
                        label={t('buildingName')}
                        value={formData.name ?? ''}
                        onChange={handleChange}
                        name="name"
                        placeholder={t('buildingName')}
                        readonly={false}
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

                    {/* Address structured selectors */}
                    <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col">
                            <label className="text-md font-bold text-[#02542D] mb-1">{t('city')}</label>
                            <Select<Province>
                                options={cities}
                                value={selectedCity}
                                onSelect={(item) => setSelectedCity(String((item as Province).code))}
                                renderItem={(item) => (item as Province).name}
                                getValue={(item) => String((item as Province).code)}
                                placeholder={t('selectCity')}
                                error={!!errors.city}
                            />
                            {errors.city && <span className="text-xs text-red-500 mt-1">{errors.city}</span>}
                        </div>
                        <div className="flex flex-col">
                            <label className="text-md font-bold text-[#02542D] mb-1">{t('district')}</label>
                            <Select<District>
                                options={districts}
                                value={selectedDistrict}
                                onSelect={(item) => setSelectedDistrict(String((item as District).code))}
                                renderItem={(item) => (item as District).name}
                                getValue={(item) => String((item as District).code)}
                                placeholder={t('selectDistrict')}
                                error={!!errors.district}
                            />
                            {errors.district && <span className="text-xs text-red-500 mt-1">{errors.district}</span>}
                        </div>
                        <div className="flex flex-col">
                            <label className="text-md font-bold text-[#02542D] mb-1">{t('ward')}</label>
                            <Select<Ward>
                                options={wards}
                                value={selectedWard}
                                onSelect={(item) => setSelectedWard(String((item as Ward).code))}
                                renderItem={(item) => (item as Ward).name}
                                getValue={(item) => String((item as Ward).code)}
                                placeholder={t('selectWard')}
                                error={!!errors.ward}
                            />
                            {errors.ward && <span className="text-xs text-red-500 mt-1">{errors.ward}</span>}
                        </div>
                        <div className="flex flex-col">
                            <label className="text-md font-bold text-[#02542D] mb-1">{t('roadVillage')}</label>
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
                        <div className="flex flex-col md:col-span-2">
                            <label className="text-md font-bold text-[#02542D] mb-1">Địa chỉ chi tiết</label>
                            <input
                                type="text"
                                value={addressDetail}
                                onChange={(e) => {
                                    setAddressDetail(e.target.value);
                                    if (errors.addressDetail) {
                                        validateField('addressDetail', e.target.value);
                                    }
                                }}
                                onPaste={(e) => {
                                    // Allow paste to update value first
                                    setTimeout(() => {
                                        const pasted = (e.target as HTMLInputElement).value;
                                        void geocodeAndFillFromDetail(pasted);
                                    }, 0);
                                }}
                                onBlur={(e) => {
                                    const v = (e.target as HTMLInputElement).value;
                                    void geocodeAndFillFromDetail(v);
                                }}
                                placeholder="Số nhà, toà, tầng..."
                                className={`rounded-lg border px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 ${
                                    errors.addressDetail ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-100'
                                }`}
                            />
                            {errors.addressDetail && <span className="text-xs text-red-500 mt-1">{errors.addressDetail}</span>}
                        </div>
                    </div>

                    <div className="col-span-full flex justify-center space-x-3 mt-8">
                        <button 
                            type="button"
                            onClick={handleCancel}
                            className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
                            disabled={isSubmitting}
                        >
                            {t('cancel')}
                        </button>
                        <button 
                            type="submit"
                            className="px-6 py-2 bg-[#02542D] text-white rounded-lg hover:bg-opacity-80 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? t('saving') : t('save')}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};
