'use client'
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Arrow from '@/src/assets/Arrow.svg';
import DetailField from '@/src/components/base-service/DetailField';
import Select from '@/src/components/customer-interaction/Select';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/src/contexts/AuthContext';
import { Unit } from '@/src/types/unit';
import { useUnitAdd } from '@/src/hooks/useUnitAdd';
import { getBuilding, getBuildings } from '@/src/services/base/buildingService';
import { checkUnitCodeExists } from '@/src/services/base/unitService';
import { useNotifications } from '@/src/hooks/useNotifications';
import { Building } from '@/src/types/building';

export default function UnitAdd () {

    const { user, hasRole } = useAuth();
    const t = useTranslations('Unit');
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isSubmit, setIsSubmit] = useState(false);
    const { show } = useNotifications();

    // Get buildingId from URL params
    const buildingIdFromParams = searchParams.get('buildingId') || '';
    const [selectedBuildingId, setSelectedBuildingId] = useState<string>(buildingIdFromParams);
    const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
    const [buildings, setBuildings] = useState<Building[]>([]);
    const [loadingBuildings, setLoadingBuildings] = useState(false);
    const [buildingCode, setBuildingCode] = useState<string>('');
    const [codeError, setCodeError] = useState<string>('');
    const [errors, setErrors] = useState<{
        name?: string;
        floor?: string;
        bedrooms?: string;
        area?: string;
        building?: string;
    }>({});

    const { addUnit, loading, error, isSubmitting } = useUnitAdd();

    const [formData, setFormData] = useState<Partial<Unit> & { 
        floorStr: string; 
        areaStr: string; 
        bedroomsStr: string;
        status: string 
    }>({
        code: '',
        name: '',
        floor: 0,
        areaM2: 0,
        bedrooms: 0,
        floorStr: '0',
        areaStr: '0',
        bedroomsStr: '0',
        status: 'ACTIVE',
        ownerName: '',
        ownerContact: '',
    });

    // Fetch buildings list
    useEffect(() => {
        const fetchBuildings = async () => {
            setLoadingBuildings(true);
            try {
                if (buildingIdFromParams) {
                    // If buildingId is in params, fetch that specific building and add to list
                    const building = await getBuilding(buildingIdFromParams);
                    setBuildings([building]);
                    setSelectedBuilding(building);
                } else {
                    // Otherwise, fetch all buildings
                    const buildingsList = await getBuildings();
                    setBuildings(buildingsList);
                }
            } catch (err) {
                console.error('Failed to fetch buildings:', err);
                show(t('error') || 'Failed to fetch buildings', 'error');
            } finally {
                setLoadingBuildings(false);
            }
        };
        fetchBuildings();
    }, [buildingIdFromParams]);

    // Fetch building code when selectedBuildingId changes
    useEffect(() => {
        const fetchBuildingCode = async () => {
            if (!selectedBuildingId) {
                setBuildingCode('');
                setSelectedBuilding(null);
                return;
            }
            try {
                const building = await getBuilding(selectedBuildingId);
                console.log("building", building);
                setBuildingCode(building.code);
                setSelectedBuilding(building);
            } catch (err) {
                console.error('Failed to fetch building:', err);
                setBuildingCode('');
                setSelectedBuilding(null);
            }
        };
        fetchBuildingCode();
    }, [selectedBuildingId]);

    // Check code khi code hoặc selectedBuildingId thay đổi
    useEffect(() => {
        const checkCode = async () => {
            if (!formData.code || !selectedBuildingId) {
                setCodeError('');
                return;
            }
            
            const exists = await checkUnitCodeExists(formData.code, selectedBuildingId);
            if (exists) {
                setCodeError(t('codeError'));
            } else {
                setCodeError('');
            }
        };

        const timeoutId = setTimeout(checkCode, 500); // Debounce 500ms
        return () => clearTimeout(timeoutId);
    }, [formData.code, selectedBuildingId]);
    
    const handleBack = () => {
        router.back(); 
    }

    const handleCancel = () => {
        router.back(); 
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        if (isSubmitting) return;

        // Validate all fields first before making any API calls
        const isValid = validateAllFields();

        if (!selectedBuildingId) {
            setErrors(prev => ({ ...prev, building: t('buildingRequired') || 'Building is required' }));
            show(t('buildingRequired') || 'Please select a building', 'error');
            return;
        }

        if (codeError) {
            show(codeError, 'error');
            return;
        }

        if (!isValid) {
            show(t('error'), 'error');
            return;
        }

        setIsSubmit(true);
        try {
            const { floorStr, areaStr, bedroomsStr, ...unitData } = formData;
            const completeData = {
                ...unitData,
                buildingId: selectedBuildingId,
            };
            console.log('Dữ liệu gửi đi:', completeData);
            await addUnit(completeData);
            router.push(`/base/building/buildingDetail/${selectedBuildingId}`);
        } catch (error) {
            console.error('Lỗi khi tạo unit:', error);
            show(t('errorUnit'), 'error');
        } finally {
            setIsSubmit(false);
        }
    };

    // Generate unit code from building code + floor + bedrooms
    const generateUnitCode = (floor: number, bedrooms: number): string => {
        if (!buildingCode) return '';
        return `${buildingCode}${floor}${bedrooms}`;
    };

    const validateField = (fieldName: string, value: string | number) => {
        const newErrors = { ...errors };
        
        switch (fieldName) {
            case 'name': {
                const v = String(value ?? '').trim();
                const nameRegex = /^[a-zA-ZÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐđ0-9\s'-]+$/;
                if (!v) newErrors.name = t('nameError');
                else if (v.length > 40) newErrors.name = t('unitNew.nameMaxError');
                else if (!nameRegex.test(v)) newErrors.name = t('unitNew.nameSpecialCharError');
                else delete newErrors.name;
                break;
            }
            case 'floor': {
                const floor = typeof value === 'number' ? value : parseInt(String(value));
                if (!floor || floor <= 0) {
                    newErrors.floor = t('floorError');
                } else if (selectedBuilding && floor > selectedBuilding.floorsMax) {
                    newErrors.floor = t('unitNew.floorMaxError', { floorsMax: selectedBuilding.floorsMax });
                } else {
                    delete newErrors.floor;
                }
                break;
            }
            case 'bedrooms': {
                const bedrooms = typeof value === 'number' ? value : parseInt(String(value));
                if (!bedrooms || bedrooms <= 0 || bedrooms >= 10) newErrors.bedrooms = t('unitNew.bedroomsErrorRange');
                else delete newErrors.bedrooms;
                break;
            }
            case 'area': {
                const area = typeof value === 'number' ? value : parseFloat(String(value));
                if (!area || area <= 0 || area >= 150) newErrors.area = t('unitNew.areaErrorRange');
                else delete newErrors.area;
                break;
            }
        }
        
        setErrors(newErrors);
    };

    const validateAllFields = () => {
        const newErrors: {
            name?: string;
            floor?: string;
            bedrooms?: string;
            area?: string;
            building?: string;
        } = {};
        
        // Validate building
        if (!selectedBuildingId) {
            newErrors.building = t('buildingRequired') || 'Building is required';
        }
        
        // Validate name (if name field is required, uncomment this)
        // const nameValue = String(formData.name ?? '').trim();
        // const nameRegex = /^[a-zA-ZÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐđ0-9\s'-]+$/;
        // if (!nameValue) {
        //     newErrors.name = t('nameError');
        // } else if (nameValue.length > 40) {
        //     newErrors.name = t('unitNew.nameMaxError');
        // } else if (!nameRegex.test(nameValue)) {
        //     newErrors.name = t('unitNew.nameSpecialCharError');
        // }
        
        // Validate floor
        if (formData.floor === undefined || formData.floor <= 0) {
            newErrors.floor = t('floorError');
        } else if (selectedBuilding && formData.floor > selectedBuilding.floorsMax) {
            newErrors.floor = t('unitNew.floorMaxError', { floorsMax: selectedBuilding.floorsMax });
        }
        
        // Validate bedrooms
        if (formData.bedrooms === undefined || formData.bedrooms <= 0 || formData.bedrooms >= 10) {
            newErrors.bedrooms = t('unitNew.bedroomsErrorRange');
        }
        
        // Validate area
        if (formData.areaM2 === undefined || formData.areaM2 <= 0 || formData.areaM2 >= 150) {
            newErrors.area = t('unitNew.areaErrorRange');
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === 'floor') {
            const floorNum = parseInt(value) || 0;
            const newCode = generateUnitCode(floorNum, formData.bedrooms || 0);
            setFormData(prev => ({
                ...prev,
                floorStr: value,
                floor: floorNum,
                code: newCode,
            }));
            validateField('floor', floorNum);
        } else if (name === 'bedrooms') {
            const bedroomsNum = parseInt(value) || 0;
            const newCode = generateUnitCode(formData.floor || 0, bedroomsNum);
            setFormData(prev => ({
                ...prev,
                bedroomsStr: value,
                bedrooms: bedroomsNum,
                code: newCode,
            }));
            validateField('bedrooms', bedroomsNum);
        } else if (name === 'area') {
            const areaNum = parseFloat(value) || 0;
            setFormData(prev => ({
                ...prev,
                areaStr: value,
                areaM2: areaNum,
            }));
            validateField('area', areaNum);
        } else if (name === 'name') {
            setFormData(prev => ({
                ...prev,
                [name]: value,
            }));
            validateField('name', value);
        } else {
            setFormData(prev => ({
                ...prev,
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

    const handleBuildingChange = (building: Building) => {
        setSelectedBuildingId(building.id);
        setSelectedBuilding(building);
        setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors.building;
            // Re-validate floor if building changed
            if (formData.floor && building.floorsMax && formData.floor > building.floorsMax) {
                newErrors.floor = t('unitNew.floorMaxError', { floorsMax: building.floorsMax });
            } else if (newErrors.floor && formData.floor && building.floorsMax && formData.floor <= building.floorsMax) {
                delete newErrors.floor;
            }
            return newErrors;
        });
    };

    return (
        <div className={`min-h-screen  p-4 sm:p-8 font-sans`}>
            <div
                className="max-w-4xl mx-auto mb-6 flex items-center cursor-pointer"
                onClick={handleBack}
            >
                <Image 
                    src={Arrow} 
                    alt={t('altText.back')} 
                    width={20} 
                    height={20}
                    className="w-5 h-5 mr-2" 
                />
                <span className={`text-[#02542D] font-bold text-2xl hover:text-opacity-80 transition duration-150 `}>
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
                            {t('unitNew.title')}
                        </h1>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                    
                    <div className={`flex flex-col mb-4 col-span-full`}>
                        <label className="text-md font-bold text-[#02542D] mb-1">
                            {t('building') || 'Building'} <span className="text-red-500">*</span>
                        </label>
                        <Select
                            options={buildings}
                            value={selectedBuildingId}
                            onSelect={handleBuildingChange}
                            renderItem={(item) => `${item.code} - ${item.name}`}
                            getValue={(item) => item.id}
                            placeholder={loadingBuildings ? (t('load')) : (t('selectBuilding'))}
                            disable={loadingBuildings || !!buildingIdFromParams}
                            error={!!errors.building}
                        />
                        {errors.building && (
                            <p className="text-red-500 text-sm mt-1">{errors.building}</p>
                        )}
                    </div>

                    {/* <DetailField 
                        label="Mã căn hộ"
                        value={formData.code || ""}
                        name="code"
                        placeholder="Mã căn hộ"
                        readonly={true}
                        error={codeError}
                    /> */}

                    {/* <div className={`flex flex-col mb-4 col-span-1`}>
                        <label className="text-md font-bold text-[#02542D] mb-1">
                            {t('status')}
                        </label>
                        <Select
                            options={[
                                { name: t('inactive'), value: 'INACTIVE' },
                                { name: t('active'), value: 'ACTIVE' },
                            ]}
                            value={formData.status}
                            onSelect={handleStatusChange}
                            renderItem={(item) => item.name}
                            getValue={(item) => item.value}
                            placeholder={t('status')}
                        />
                    </div> */}

                    {/* <DetailField 
                        label={t('unitName')}
                        value={formData.name ?? ""}
                        onChange={handleChange}
                        name="name"
                        placeholder={t('unitName')}
                        readonly={false}
                        error={errors.name}
                    /> */}

                    <DetailField 
                        label={t('floor')}
                        value={formData.floorStr ?? "0"}
                        onChange={handleChange}
                        name="floor"
                        placeholder={t('floor')}
                        readonly={false}
                        error={errors.floor}
                        inputType="number"
                    />

                    <DetailField 
                        label={t('bedrooms')}
                        value={formData.bedroomsStr ?? "0"}
                        onChange={handleChange}
                        name="bedrooms"
                        placeholder={t('bedrooms')}
                        readonly={false}
                        error={errors.bedrooms}
                        inputType="number"
                    />

                    <DetailField 
                        label={t('areaM2')}
                        value={formData.areaStr ?? "0"}
                        onChange={handleChange}
                        name="area"
                        placeholder={t('areaM2')}
                        readonly={false}
                        error={errors.area}
                        inputType="number"
                    />

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
                            className="px-6 py-2 bg-[#14AE5C] text-white font-semibold rounded-lg hover:bg-[#0c793f] transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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

