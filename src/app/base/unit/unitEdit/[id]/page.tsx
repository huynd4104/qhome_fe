'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Arrow from '@/src/assets/Arrow.svg';
import DetailField from '@/src/components/base-service/DetailField';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Select from '@/src/components/customer-interaction/Select';
import { useUnitDetailPage } from '@/src/hooks/useUnitDetailPage';
import { Unit } from '@/src/types/unit';
import { useAuth } from '@/src/contexts/AuthContext';
import { getBuilding } from '@/src/services/base/buildingService';
import { useNotifications } from '@/src/hooks/useNotifications';

export default function UnitEdit() {
    const { user, hasRole } = useAuth();
    const t = useTranslations('Unit');
    const tProject = useTranslations('Project');
    const router = useRouter();
    const params = useParams();
    const unitId = params.id as string;
    const { show } = useNotifications();

    const { unitData, loading, error, isSubmitting, editUnit } = useUnitDetailPage(unitId);

    const [formData, setFormData] = useState<Partial<Unit> & { 
        floorStr: string; 
        areaStr: string; 
        bedroomsStr: string;
        status: string 
    }>({
        name: '',
        floor: 0,
        areaM2: 0,
        bedrooms: 0,
        ownerName: '',
        ownerContact: '',
        floorStr: '0',
        areaStr: '0',
        bedroomsStr: '0',
        status: 'ACTIVE',
    });

    const [buildingName, setBuildingName] = useState<string>('');
    const [buildingCode, setBuildingCode] = useState<string>('');
    const [loadingBuilding, setLoadingBuilding] = useState(false);
    const [errors, setErrors] = useState<{
        name?: string;
        floor?: string;
        bedrooms?: string;
        area?: string;
    }>({});

    useEffect(() => {
        if (unitData) {
            setFormData({
                name: unitData.name ?? '',
                floor: unitData.floor ?? 0,
                areaM2: unitData.areaM2 ?? 0,
                bedrooms: unitData.bedrooms ?? 0,
                ownerName: unitData.ownerName ?? '',
                ownerContact: unitData.ownerContact ?? '',
                floorStr: unitData.floor?.toString() ?? '0',
                areaStr: unitData.areaM2?.toString() ?? '0',
                bedroomsStr: unitData.bedrooms?.toString() ?? '0',
                status: unitData.status ?? 'INACTIVE',
            });
        }
    }, [unitData]);

    useEffect(() => {
        const loadBuildingInfo = async () => {
            if (!unitData?.buildingId) return;
            
            try {
                setLoadingBuilding(true);
                const building = await getBuilding(unitData.buildingId);
                setBuildingName(building.name);
                setBuildingCode(building.code);
            } catch (err: any) {
                console.error('Failed to load building:', err);
                setBuildingName(t('fallbacks.notAvailable'));
            } finally {
                setLoadingBuilding(false);
            }
        };

        loadBuildingInfo();
    }, [unitData?.buildingId]);

    const handleBack = () => {
        router.back();
    };

    // Generate unit code from building code + floor + bedrooms
    const generateUnitCode = (floor: number, bedrooms: number): string => {
        if (!buildingCode) return unitData?.code || '';
        return `${buildingCode}${floor}${bedrooms}`;
    };

    const validateField = (fieldName: string, value: string | number) => {
        const newErrors = { ...errors };
        
        switch (fieldName) {
            case 'name':
                {
                    const v = String(value ?? '').trim();
                    const nameRegex = /^[a-zA-ZÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐđ0-9\s'-]+$/;
                    if (!v) newErrors.name = t('nameError');
                    else if (v.length > 40) newErrors.name = t('unitNew.nameMaxError');
                    else if (!nameRegex.test(v)) newErrors.name = t('unitNew.nameSpecialCharError');
                    else delete newErrors.name;
                }
                break;
            case 'floor':
                {
                    const floor = typeof value === 'number' ? value : parseInt(String(value));
                    if (!floor || floor <= 0) newErrors.floor = t('floorError');
                    else delete newErrors.floor;
                }
                break;
            case 'bedrooms':
                {
                    const bedrooms = typeof value === 'number' ? value : parseInt(String(value));
                    if (!bedrooms || bedrooms <= 0 || bedrooms >= 10) newErrors.bedrooms = t('unitNew.bedroomsErrorRange');
                    else delete newErrors.bedrooms;
                }
                break;
            case 'area':
                {
                    const area = typeof value === 'number' ? value : parseFloat(String(value));
                    if (!area || area <= 0 || area >= 150) newErrors.area = t('unitNew.areaErrorRange');
                    else delete newErrors.area;
                }
                break;
        }
        
        setErrors(newErrors);
    };

    const validateAllFields = () => {
        const newErrors: {
            name?: string;
            floor?: string;
            bedrooms?: string;
            area?: string;
        } = {};
        
        // Validate name
        // {
        //     const v = String(formData.name ?? '').trim();
        //     const nameRegex = /^[a-zA-ZÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐđ0-9\s'-]+$/;
        //     if (!v) newErrors.name = t('nameError');
        //     else if (v.length > 40) newErrors.name = t('nameMaxError') || 'Tên căn hộ không được vượt quá 40 ký tự';
        //     else if (!nameRegex.test(v)) newErrors.name = t('nameSpecialCharError') || 'Tên căn hộ không được chứa ký tự đặc biệt';
        // }
        
        // Validate floor
        if (formData.floor === undefined || formData.floor <= 0) {
            newErrors.floor = t('floorError');
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
            setFormData(prev => ({
                ...prev,
                floorStr: value,
                floor: floorNum,
            }));
            validateField('floor', floorNum);
        } else if (name === 'bedrooms') {
            const bedroomsNum = parseInt(value) || 0;
            setFormData(prev => ({
                ...prev,
                bedroomsStr: value,
                bedrooms: bedroomsNum,
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
            setFormData(prevData => ({
                ...prevData,
                [name]: value,
            }));
            validateField('name', value);
        } else {
            setFormData(prevData => ({
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

        const isValid = validateAllFields();

        if (!isValid) {
            show(t('error'), 'error');
            return;
        }

        try {
            const { floorStr, areaStr, bedroomsStr, ...unitUpdateData } = formData;
            // Generate new code based on floor and bedrooms
            const newCode = generateUnitCode(formData.floor || 0, formData.bedrooms || 0);
            const dataToSubmit = {
                ...unitUpdateData,
                code: newCode,
            };
            console.log(t('saving'), dataToSubmit);
            await editUnit(unitId, dataToSubmit);
            router.push(`/base/unit/unitDetail/${unitId}`);
        } catch (submitError) {
            console.error(t('updateUnitError'), submitError);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen">{t('load')}</div>;
    }

    if (error) {
        return <div className="flex justify-center items-center h-screen text-red-500">{t('error')}: {error.message}</div>;
    }

    if (!unitData) {
        return <div className="flex justify-center text-xl font-bold items-center h-screen">{t('noData')}</div>;
    }

    return (
        <div className={`min-h-screen  p-4 sm:p-8 font-sans`}>
            <div className="max-w-4xl mx-auto mb-6 flex items-center cursor-pointer" onClick={handleBack}>
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
                            {t('unitEdit')}
                        </h1>
                        <span
                            className={`text-sm font-semibold px-3 py-1 rounded-full ${
                                formData.status === 'INACTIVE'
                                    ? 'bg-[#EEEEEE] text-[#02542D]'
                                    : 'bg-[#739559] text-white'
                            }`}
                        >
                            {formData.status ? t(formData.status.toLowerCase() ?? '') : ''}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                    <DetailField
                        label={t('unitCode')}
                        value={generateUnitCode(formData.floor || 0, formData.bedrooms || 0) || unitData?.code || ""}
                        readonly={true}
                        placeholder={t('unitCode')}
                    />

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
                    <DetailField
                        label={t('buildingName')}
                        value={loadingBuilding ? t('loading.building') : buildingName || ""}
                        readonly={true}
                        placeholder={t('buildingName')}
                    />

                    {/* <DetailField
                        label={t('unitName')}
                        value={formData?.name || ""}
                        readonly={false}
                        placeholder={t('unitName')}
                        name="name"
                        onChange={handleChange}
                        error={errors.name}
                    /> */}
                    

                    <DetailField
                        label={t('floor')}
                        value={formData.floorStr || "0"}
                        readonly={false}
                        placeholder={t('floor')}
                        name="floor"
                        onChange={handleChange}
                        error={errors.floor}
                    />

                    <DetailField
                        label={t('bedrooms')}
                        value={formData.bedroomsStr || "0"}
                        readonly={false}
                        placeholder={t('bedrooms')}
                        name="bedrooms"
                        onChange={handleChange}
                        error={errors.bedrooms}
                    />

                    <DetailField
                        label={t('areaM2')}
                        value={formData.areaStr || "0"}
                        readonly={false}
                        placeholder={t('areaM2')}
                        name="area"
                        onChange={handleChange}
                        error={errors.area}
                    />

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
                        className={`px-6 py-2 rounded-lg bg-[#14AE5C] text-white font-semibold hover:bg-[#0c793f] transition shadow-sm ${
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

