'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import {
  ArrowLeft,
  Check,
  X,
  Building2,
  Home,
  FileText,
  Calendar,
  User,
  Mail,
  Phone,
  CreditCard,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Save
} from 'lucide-react';
import {
  AccountCreationRequest,
  approveAccountRequest,
  fetchPendingAccountRequests,
  provisionPrimaryResident,
  PrimaryResidentProvisionRequest,
  PrimaryResidentProvisionResponse,
} from '@/src/services/base/residentAccountService';
import {
  createHousehold,
  fetchCurrentHouseholdByUnit,
  HouseholdDto,
} from '@/src/services/base/householdService';
import {
  ContractSummary,
  fetchActiveContractsByUnit,
  ContractDetail,
  fetchContractDetail,
} from '@/src/services/base/contractService';
import { getUnit, getUnitsByBuilding, Unit } from '@/src/services/base/unitService';
import { getBuildings, type Building } from '@/src/services/base/buildingService';
import { checkNationalIdExists, checkPhoneExists, checkResidentEmailExists } from '@/src/services/base/residentService';
import Select from '@/src/components/customer-interaction/Select';
import DateBox from '@/src/components/customer-interaction/DateBox';
import CCCDUpload from '@/src/components/account/CCCDUpload';
import { CCCDInfo } from '@/src/utils/cccdOCR';

type ManualFormState = {
  householdId: string;
  fullName: string;
  email: string;
  phone: string;
  nationalId: string;
  dob: string;
  username: string;
  relation: string;
};

type ManualFieldErrors = Partial<Record<keyof ManualFormState, string>>;

type RequestActionState = Record<string, boolean>;



export default function AccountNewResidentPage() {
  const router = useRouter();
  const t = useTranslations('AccountNewRe');

  const [activeTab, setActiveTab] = useState<'manual' | 'requests'>('manual');

  const [manualForm, setManualForm] = useState<ManualFormState>({
    householdId: '',
    fullName: '',
    email: '',
    phone: '',
    nationalId: '',
    dob: '',
    username: '',
    relation: t('manualForm.placeholders.relation'),
  });

  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualSuccess, setManualSuccess] = useState<string | null>(null);
  const [provisionResponse, setProvisionResponse] = useState<PrimaryResidentProvisionResponse | null>(null);
  const [lastSubmittedEmail, setLastSubmittedEmail] = useState<string>('');
  const [manualFieldErrors, setManualFieldErrors] = useState<ManualFieldErrors>({});
  const [householdInfo, setHouseholdInfo] = useState<HouseholdDto | null>(null);
  const [unitInfo, setUnitInfo] = useState<Unit | null>(null);
  const [householdLoading, setHouseholdLoading] = useState(false);
  const [householdError, setHouseholdError] = useState<string | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingsLoading, setBuildingsLoading] = useState(false);
  const [buildingsError, setBuildingsError] = useState<string | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [unitsError, setUnitsError] = useState<string | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [buildingSelectionError, setBuildingSelectionError] = useState<string | null>(null);
  const [unitSelectionError, setUnitSelectionError] = useState<string | null>(null);
  const [contractInfo, setContractInfo] = useState<ContractSummary | null>(null);
  const [contractError, setContractError] = useState<string | null>(null);
  const [isContractModalOpen, setContractModalOpen] = useState(false);
  const [contractDetailState, setContractDetailState] = useState<{
    data: ContractDetail | null;
    loading: boolean;
    error: string | null;
  }>({
    data: null,
    loading: false,
    error: null,
  });

  const [pendingRequests, setPendingRequests] = useState<AccountCreationRequest[]>([]);
  const [initialLoad, setInitialLoad] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestActionState, setRequestActionState] = useState<RequestActionState>({});

  const buildingSelectOptions = useMemo<(Building | null)[]>(() => [null, ...buildings], [buildings]);
  const unitSelectOptions = useMemo<(Unit | null)[]>(() => [null, ...units], [units]);
  const unitPlaceholder = selectedBuildingId ? t('manualForm.placeholders.selectUnit') : t('manualForm.placeholders.selectBuildingFirst');

  const handleBack = () => {
    router.back();
  };

  const handleTabChange = (tab: 'manual' | 'requests') => {
    setActiveTab(tab);
  };

  useEffect(() => {
    const loadBuildings = async () => {
      setBuildingsLoading(true);
      setBuildingsError(null);
      try {
        const data = await getBuildings();
        // Sort buildings by code alphabetically
        const sortedData = [...data].sort((a, b) =>
          (a.code || '').localeCompare(b.code || '', 'vi', { sensitivity: 'base' })
        );
        setBuildings(sortedData);
      } catch (err: any) {
        const message =
          err?.response?.data?.message || err?.message || t('errors.loadBuildingsFailed');
        setBuildingsError(message);
      } finally {
        setBuildingsLoading(false);
      }
    };

    void loadBuildings();
  }, []);

  const handleBuildingChange = async (buildingId: string) => {
    setSelectedBuildingId(buildingId);
    setSelectedUnitId('');
    setUnits([]);
    setUnitsError(null);
    setUnitInfo(null);
    setHouseholdInfo(null);
    setHouseholdError(null);
    setContractInfo(null);
    setContractError(null);
    setManualForm((prev) => ({ ...prev, householdId: '' }));
    setBuildingSelectionError(null);
    setUnitSelectionError(null);

    if (!buildingId) {
      return;
    }

    setUnitsLoading(true);
    try {
      const data = await getUnitsByBuilding(buildingId);
      setUnits(data);
    } catch (err: any) {
      const message =
        err?.response?.data?.message || err?.message || t('errors.loadUnitsFailed');
      setUnitsError(message);
    } finally {
      setUnitsLoading(false);
    }
  };

  const handleUnitChange = async (unitId: string) => {
    setSelectedUnitId(unitId);
    setUnitSelectionError(null);
    setManualForm((prev) => ({ ...prev, householdId: '' }));
    setHouseholdInfo(null);
    setUnitInfo(null);
    setHouseholdError(null);
    setContractInfo(null);
    setContractError(null);

    if (!unitId) {
      return;
    }

    await loadHouseholdForUnit(unitId);
  };

  // Validate email format - must end with .com and have exactly one @
  const validateEmailFormat = (email: string): string => {
    // Ensure email contains exactly one @
    const atCount = (email.match(/@/g) || []).length;
    if (atCount === 0) {
      return t('validation.email.missingAt');
    }
    if (atCount > 1) {
      return t('validation.email.multipleAt');
    }

    // Split email into local part and domain
    const parts = email.split('@');
    if (parts.length !== 2) {
      return t('validation.email.invalidFormat');
    }

    const localPart = parts[0];
    const domain = parts[1];

    // Check if email ends with .com
    if (!domain.toLowerCase().endsWith('.com')) {
      return t('validation.email.mustEndWithCom');
    }

    // Validate local part: only allow a-zA-Z0-9._%+-
    const localPartPattern = /^[a-zA-Z0-9._%+-]+$/;
    if (!localPartPattern.test(localPart)) {
      return t('validation.email.invalidLocalPart');
    }

    // Validate domain part (before .com): only allow a-zA-Z0-9.-
    const domainWithoutCom = domain.substring(0, domain.length - 4);
    const domainPattern = /^[a-zA-Z0-9.-]+$/;
    if (!domainPattern.test(domainWithoutCom)) {
      return t('validation.email.invalidDomain');
    }

    // Final pattern check
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.com$/i;
    if (!emailPattern.test(email)) {
      return t('validation.email.invalidFormat');
    }
    return "";
  };

  // Validate phone number (Vietnam format)
  const validatePhone = (phone: string): string | null => {
    if (!phone.trim()) {
      return t('validation.phone.required');
    }
    // Remove spaces and special characters for validation
    const cleaned = phone.replace(/\s+/g, '');

    // Check if contains only digits
    if (!/^\d+$/.test(cleaned)) {
      return t('validation.phone.specialChars');
    }

    // Check if starts with 0
    if (!cleaned.startsWith('0')) {
      return t('validation.phone.mustStartWithZero');
    }

    // Check length (10 digits)
    if (cleaned.length !== 10) {
      return t('validation.phone.mustBe10Digits');
    }

    return null;
  };

  // Validate full name
  const validateFullName = (fullName: string): string | null => {
    if (!fullName.trim()) {
      return t('validation.fullName.required');
    }
    const trimmed = fullName.trim();
    // Minimum length: at least 2 characters
    if (trimmed.length < 2) {
      return t('validation.fullName.minLength') || 'Họ và tên phải có ít nhất 2 ký tự';
    }
    // Maximum length: 40 characters
    if (trimmed.length > 40) {
      return t('validation.fullName.maxLength');
    }
    // Check for special characters (allow Vietnamese characters, spaces, and apostrophes)
    if (!/^[a-zA-ZÀÁẢÃẠẦẤẨẪẬÈÉẺẼẸỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌỒỐỔỖỘỜỚỞỠỢÙÚỦŨỤỪỨỬỮỰỲÝỶỸỴĐàáảãạầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵđ\s'-]+$/.test(trimmed)) {
      return t('validation.fullName.specialChars');
    }
    // Check for consecutive spaces
    if (/\s{2,}/.test(trimmed)) {
      return t('validation.fullName.consecutiveSpaces') || 'Họ và tên không được có nhiều khoảng trắng liên tiếp';
    }
    return null;
  };

  // Validate national ID (CCCD)
  const validateNationalId = (nationalId: string): string | null => {
    if (!nationalId || !nationalId.trim()) {
      return t('validation.nationalId.required');
    }
    const cleaned = nationalId.replace(/\s+/g, '');

    // Check if contains only digits
    if (!/^\d+$/.test(cleaned)) {
      return t('validation.nationalId.specialChars');
    }

    // Check length: CCCD must be exactly 12 digits
    if (cleaned.length !== 12) {
      return t('validation.nationalId.mustBe12Digits') || 'Số căn cước công dân phải có đúng 12 số';
    }

    return null;
  };

  // Validate username format: only letters (no accents), numbers, and @, _, -, .
  const validateUsernameFormat = (username: string): boolean => {
    // Only allow: a-z, A-Z, 0-9, @, _, -, .
    const usernameRegex = /^[a-zA-Z0-9@_\-\.]+$/;
    return usernameRegex.test(username);
  };

  // Validate username
  const validateUsername = (username: string): string | null => {
    if (username.trim()) {
      if (/\s/.test(username)) {
        return t('validation.username.noWhitespace');
      }
      if (!validateUsernameFormat(username)) {
        return t('validation.username.invalidFormat');
      }
      if (username.length > 40) {
        return t('validation.username.maxLength');
      }
    }
    return null;
  };

  // Validate date of birth
  const validateDateOfBirth = (dob: string): string | null => {
    if (!dob || !dob.trim()) {
      return t('validation.dob.required');
    }

    const birthDate = new Date(dob);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    birthDate.setHours(0, 0, 0, 0);

    if (isNaN(birthDate.getTime())) {
      return t('validation.dob.invalid');
    }

    // Check if date is in the future
    if (birthDate > today) {
      return t('validation.dob.futureDate') || 'Ngày sinh không thể là ngày trong tương lai';
    }

    // Calculate age more accurately
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    // Must be at least 18 years old
    if (age < 18) {
      return t('validation.dob.ageMin');
    }
    // Must be less than 120 years old (reasonable maximum)
    if (age >= 120) {
      return t('validation.dob.ageMax') || 'Tuổi không hợp lệ. Vui lòng kiểm tra lại ngày sinh.';
    }

    return null;
  };

  // Helper function to validate email (format + exists check)
  const validateEmailWithExists = async (email: string): Promise<string | null> => {
    if (!email.trim()) {
      return t('validation.email.required');
    }
    if (/\s/.test(email)) {
      return t('validation.email.noWhitespace');
    }
    if (email.length > 40) {
      return t('validation.email.maxLength');
    }
    const formatError = validateEmailFormat(email);
    if (formatError) {
      return formatError;
    }
    // Check exists
    try {
      const exists = await checkResidentEmailExists(email.trim());
      if (exists) {
        return t('validation.email.exists');
      }
    } catch (err: any) {
      console.error('Error checking email:', err);
      // Don't block on network errors, but log them
    }
    return null;
  };

  // Helper function to validate phone (format + exists check)
  const validatePhoneWithExists = async (phone: string): Promise<string | null> => {
    const formatError = validatePhone(phone);
    if (formatError) {
      return formatError;
    }
    if (phone && phone.trim()) {
      try {
        const cleanedPhone = phone.trim().replace(/\s+/g, '');
        const exists = await checkPhoneExists(cleanedPhone);
        if (exists) {
          return t('validation.phone.exists') || 'Số điện thoại đã tồn tại trong hệ thống';
        }
      } catch (err) {
        console.error('Error checking phone:', err);
        return t('validation.phone.checkError') || 'Không thể kiểm tra số điện thoại. Vui lòng thử lại.';
      }
    }
    return null;
  };

  // Helper function to validate national ID (format + exists check)
  const validateNationalIdWithExists = async (nationalId: string): Promise<string | null> => {
    const formatError = validateNationalId(nationalId);
    if (formatError) {
      return formatError;
    }
    if (nationalId && nationalId.trim()) {
      try {
        const cleanedId = nationalId.trim().replace(/\s+/g, '');
        const exists = await checkNationalIdExists(cleanedId);
        if (exists) {
          return t('validation.nationalId.exists') || 'Số căn cước công dân đã tồn tại trong hệ thống';
        }
      } catch (err) {
        console.error('Error checking national ID:', err);
        return t('validation.nationalId.checkError') || 'Không thể kiểm tra số căn cước công dân. Vui lòng thử lại.';
      }
    }
    return null;
  };

  const handleManualChange =
    (field: keyof ManualFormState) =>
      (event: ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setManualForm((prev) => ({ ...prev, [field]: value }));

        // Real-time validation for email
        if (field === 'email') {
          setManualFieldErrors((prev) => {
            const next = { ...prev };

            // Clear error if field is empty
            if (!value.trim()) {
              delete next.email;
              return next;
            }

            // Quick format validation (synchronous)
            if (/\s/.test(value)) {
              next.email = t('validation.email.noWhitespace');
              return next;
            }
            if (value.length > 40) {
              next.email = t('validation.email.maxLength');
              return next;
            }
            const emailFormatError = validateEmailFormat(value);
            if (emailFormatError) {
              next.email = emailFormatError;
              return next;
            }

            // Clear format error temporarily, will be updated by async check
            delete next.email;

            // Async check for exists (don't block UI)
            validateEmailWithExists(value).then((error) => {
              if (error) {
                setManualFieldErrors((prev) => ({
                  ...prev,
                  email: error,
                }));
              } else {
                // Only clear if value hasn't changed and format is still valid
                setManualFieldErrors((prev) => {
                  const currentValue = manualForm.email;
                  if (currentValue === value) {
                    const formatCheck = validateEmailFormat(value);
                    if (!formatCheck && !/\s/.test(value) && value.length <= 40) {
                      const updated = { ...prev };
                      delete updated.email;
                      return updated;
                    }
                  }
                  return prev;
                });
              }
            }).catch((err) => {
              console.error('Error validating email:', err);
            });

            return next;
          });
        } else if (field === 'phone') {
          // Real-time validation for phone
          const currentPhoneValue = value.trim().replace(/\s+/g, '');

          setManualFieldErrors((prev) => {
            const next = { ...prev };

            // Clear error if field is empty
            if (!value.trim()) {
              delete next.phone;
              return next;
            }

            // Quick format validation (synchronous)
            const phoneFormatError = validatePhone(value);
            if (phoneFormatError) {
              next.phone = phoneFormatError;
              return next;
            }

            // Format is valid, clear format errors temporarily
            delete next.phone;

            // Async check for exists (don't block UI)
            validatePhoneWithExists(value).then((error) => {
              if (error) {
                setManualFieldErrors((prevErrors) => {
                  const latestPhoneValue = manualForm.phone.trim().replace(/\s+/g, '');
                  // Only update if value hasn't changed
                  if (latestPhoneValue === currentPhoneValue) {
                    return { ...prevErrors, phone: error };
                  }
                  return prevErrors;
                });
              } else {
                // Only clear if value hasn't changed and format is still valid
                setManualFieldErrors((prevErrors) => {
                  const latestPhoneValue = manualForm.phone.trim().replace(/\s+/g, '');
                  if (latestPhoneValue === currentPhoneValue) {
                    const formatCheck = validatePhone(manualForm.phone);
                    if (!formatCheck) {
                      const updated = { ...prevErrors };
                      delete updated.phone;
                      return updated;
                    }
                  }
                  return prevErrors;
                });
              }
            }).catch((err) => {
              console.error('Error validating phone:', err);
            });

            return next;
          });
        } else if (field === 'username') {
          // Real-time validation for username
          setManualFieldErrors((prev) => {
            const next = { ...prev };

            // Clear error if field is empty (username is optional)
            if (!value.trim()) {
              delete next.username;
              return next;
            }

            // Validate username format
            const usernameError = validateUsername(value);
            if (usernameError) {
              next.username = usernameError;
              return next;
            }

            // If all validations pass, clear error
            delete next.username;
            return next;
          });
        } else if (field === 'nationalId') {
          // Real-time validation for national ID
          const currentNationalIdValue = value.trim().replace(/\s+/g, '');

          setManualFieldErrors((prev) => {
            const next = { ...prev };

            // Clear error if field is empty
            if (!value.trim()) {
              delete next.nationalId;
              return next;
            }

            // Quick format validation (synchronous)
            const nationalIdFormatError = validateNationalId(value);
            if (nationalIdFormatError) {
              next.nationalId = nationalIdFormatError;
              return next;
            }

            // Format is valid, clear format errors temporarily
            delete next.nationalId;

            // Async check for exists (don't block UI)
            validateNationalIdWithExists(value).then((error) => {
              if (error) {
                setManualFieldErrors((prevErrors) => {
                  const latestNationalIdValue = manualForm.nationalId.trim().replace(/\s+/g, '');
                  // Only update if value hasn't changed
                  if (latestNationalIdValue === currentNationalIdValue) {
                    return { ...prevErrors, nationalId: error };
                  }
                  return prevErrors;
                });
              } else {
                // Only clear if value hasn't changed and format is still valid
                setManualFieldErrors((prevErrors) => {
                  const latestNationalIdValue = manualForm.nationalId.trim().replace(/\s+/g, '');
                  if (latestNationalIdValue === currentNationalIdValue) {
                    const formatCheck = validateNationalId(manualForm.nationalId);
                    if (!formatCheck) {
                      const updated = { ...prevErrors };
                      delete updated.nationalId;
                      return updated;
                    }
                  }
                  return prevErrors;
                });
              }
            }).catch((err) => {
              console.error('Error validating national ID:', err);
            });

            return next;
          });
        } else if (field === 'fullName') {
          // Real-time validation for full name
          setManualFieldErrors((prev) => {
            const next = { ...prev };

            // Clear error if field is empty
            if (!value.trim()) {
              delete next.fullName;
              return next;
            }

            // Validate full name format
            const fullNameError = validateFullName(value);
            if (fullNameError) {
              next.fullName = fullNameError;
              return next;
            }

            // If all validations pass, clear error
            delete next.fullName;
            return next;
          });
        } else if (field === 'dob') {
          // Real-time validation for date of birth
          setManualFieldErrors((prev) => {
            const next = { ...prev };

            // Clear error if field is empty
            if (!value.trim()) {
              delete next.dob;
              return next;
            }

            // Validate date of birth format
            const dobError = validateDateOfBirth(value);
            if (dobError) {
              next.dob = dobError;
              return next;
            }

            // If all validations pass, clear error
            delete next.dob;
            return next;
          });
        } else {
          // For other fields, just clear error on change
          setManualFieldErrors((prev) => {
            if (!prev[field]) return prev;
            const next = { ...prev };
            delete next[field];
            return next;
          });
        }
      };

  const handleCCCDExtract = (info: CCCDInfo) => {
    // Auto-fill form fields from OCR results
    if (info.fullName) {
      setManualForm((prev) => ({ ...prev, fullName: info.fullName! }));
      setManualFieldErrors((prev) => {
        const next = { ...prev };
        delete next.fullName;
        return next;
      });
    }

    if (info.nationalId) {
      setManualForm((prev) => ({ ...prev, nationalId: info.nationalId! }));
      setManualFieldErrors((prev) => {
        const next = { ...prev };
        delete next.nationalId;
        return next;
      });
    }

    if (info.dob) {
      setManualForm((prev) => ({ ...prev, dob: info.dob! }));
      setManualFieldErrors((prev) => {
        const next = { ...prev };
        delete next.dob;
        return next;
      });
    }

    // Show success message
    setManualSuccess(t('success.cccdReadSuccess'));
  };

  const resetManualMessages = () => {
    setManualError(null);
    setManualSuccess(null);
    setProvisionResponse(null);
    setManualFieldErrors({});
    setBuildingSelectionError(null);
    setUnitSelectionError(null);
  };

  const handleOpenContractDetail = async () => {
    if (!contractInfo) {
      return;
    }
    setContractModalOpen(true);
    setContractDetailState({ data: null, loading: true, error: null });
    try {
      const detail = await fetchContractDetail(contractInfo.id);
      if (!detail) {
        setContractDetailState({
          data: null,
          loading: false,
          error: t('errors.loadContractNotFound'),
        });
        return;
      }
      setContractDetailState({ data: detail, loading: false, error: null });
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.message || t('errors.loadContractDetailFailed');
      setContractDetailState({ data: null, loading: false, error: message });
    }
  };

  const handleCloseContractDetail = () => {
    setContractModalOpen(false);
  };

  const validateManualForm = async () => {
    const errors: ManualFieldErrors = {};
    let isValid = true;

    if (!selectedBuildingId) {
      setBuildingSelectionError(t('validation.building.required'));
      isValid = false;
    } else {
      setBuildingSelectionError(null);
    }

    if (!selectedUnitId) {
      setUnitSelectionError(t('validation.unit.required'));
      isValid = false;
    } else if (!manualForm.householdId.trim()) {
      setUnitSelectionError(t('validation.unit.noHousehold'));
      isValid = false;
    } else if (!householdInfo || householdInfo.id !== manualForm.householdId.trim()) {
      setUnitSelectionError(t('validation.unit.householdInvalid'));
      isValid = false;
    } else if (householdInfo.primaryResidentId) {
      setUnitSelectionError(t('validation.unit.hasOwner'));
      isValid = false;
    } else {
      setUnitSelectionError(null);
    }

    if (!contractInfo) {
      setUnitSelectionError(t('validation.unit.noContract'));
      isValid = false;
    }

    // Validate full name
    const fullNameError = validateFullName(manualForm.fullName);
    if (fullNameError) {
      errors.fullName = fullNameError;
      isValid = false;
    }

    // Validate email - reuse helper function
    const emailError = await validateEmailWithExists(manualForm.email);
    if (emailError) {
      errors.email = emailError;
      isValid = false;
    }

    // Validate phone - reuse helper function
    const phoneError = await validatePhoneWithExists(manualForm.phone);
    if (phoneError) {
      errors.phone = phoneError;
      isValid = false;
    }

    // Validate date of birth
    const dobError = validateDateOfBirth(manualForm.dob);
    if (dobError) {
      errors.dob = dobError;
      isValid = false;
    }

    // Validate national ID - reuse helper function
    const nationalIdError = await validateNationalIdWithExists(manualForm.nationalId);
    if (nationalIdError) {
      errors.nationalId = nationalIdError;
      isValid = false;
    }

    // Validate username (optional field)
    if (manualForm.username.trim()) {
      const usernameError = validateUsername(manualForm.username);
      if (usernameError) {
        errors.username = usernameError;
        isValid = false;
      }
    }

    setManualFieldErrors(errors);
    return isValid;
  };

  const loadHouseholdForUnit = async (unitId: string) => {
    setManualForm((prev) => ({ ...prev, householdId: '' }));
    setHouseholdError(null);
    setHouseholdInfo(null);
    setUnitInfo(null);
    setManualFieldErrors((prev) => {
      const next = { ...prev };
      delete next.householdId;
      return next;
    });
    setUnitSelectionError(null);
    setContractInfo(null);
    setContractError(null);

    if (!unitId) {
      return;
    }

    setHouseholdLoading(true);

    try {
      try {
        const unit = await getUnit(unitId);
        setUnitInfo(unit);
      } catch (unitErr: any) {
        console.error('Không thể tải thông tin căn hộ', unitErr);
      }

      let activeContract: ContractSummary | null = null;
      try {
        const contracts = await fetchActiveContractsByUnit(unitId);
        activeContract = selectPrimaryContract(contracts);
        if (!activeContract) {
          setContractInfo(null);
          setUnitSelectionError(t('validation.unit.noContract'));
          return;
        }
        setContractInfo(activeContract);
      } catch (contractErr: any) {
        console.error('Không thể tải hợp đồng của căn hộ:', contractErr);
        const message =
          contractErr?.response?.data?.message ||
          contractErr?.message ||
          t('errors.loadContractByUnitFailed');
        setContractError(message);
        setUnitSelectionError(t('errors.loadContractInfoFailed'));
        return;
      }

      const household = await fetchCurrentHouseholdByUnit(unitId);
      if (household) {
        applyHouseholdInfo(household, activeContract);
        return;
      }

      if (activeContract) {
        await attemptCreateHousehold(unitId, activeContract);
      }
    } catch (err: any) {
      console.error('Không thể tải thông tin hộ gia đình theo căn hộ:', err);
      setHouseholdError(
        err?.response?.data?.message || err?.message || t('errors.loadHouseholdFailed'),
      );
    } finally {
      setHouseholdLoading(false);
    }
  };

  const applyHouseholdInfo = (household: HouseholdDto | null, fallbackContract?: ContractSummary | null) => {
    if (!household || !household.id) {
      setHouseholdInfo(null);
      setManualForm((prev) => ({ ...prev, householdId: '' }));
      return;
    }
    setHouseholdInfo(household);
    setManualForm((prev) => ({ ...prev, householdId: household.id }));
    if (household.primaryResidentId) {
      setUnitSelectionError(t('validation.unit.hasOwner'));
    } else {
      setUnitSelectionError(null);
    }

    if (household.contractId) {
      setContractInfo({
        id: household.contractId,
        unitId: household.unitId ?? fallbackContract?.unitId ?? '',
        contractNumber: household.contractNumber ?? fallbackContract?.contractNumber ?? null,
        contractType: fallbackContract?.contractType ?? null,
        startDate: household.contractStartDate ?? fallbackContract?.startDate ?? null,
        endDate: household.contractEndDate ?? fallbackContract?.endDate ?? null,
        status: household.contractStatus ?? fallbackContract?.status ?? null,
      });
    } else if (fallbackContract) {
      setContractInfo(fallbackContract);
    }
  };

  const attemptCreateHousehold = async (unitId: string, contract: ContractSummary) => {
    try {
      const startDate =
        contract.startDate ??
        (() => {
          const today = new Date();
          return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
            today.getDate(),
          ).padStart(2, '0')}`;
        })();

      const created = await createHousehold({
        unitId,
        kind: 'OWNER',
        contractId: contract.id,
        startDate,
        endDate: contract.endDate ?? undefined,
      });
      applyHouseholdInfo(created, contract);
      setManualSuccess(t('messages.createHouseholdSuccess'));
    } catch (createErr: any) {
      console.error('Không thể tự động tạo hộ gia đình:', createErr);
      const message =
        createErr?.response?.data?.message ||
        createErr?.message ||
        t('errors.createHouseholdFailed');
      setUnitSelectionError(message);
    }
  };

  const handleManualSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetManualMessages();
    if (!manualForm.householdId.trim() && selectedUnitId) {
      await loadHouseholdForUnit(selectedUnitId);
    }
    const isValid = await validateManualForm();
    if (!isValid) {
      return;
    }

    const targetUnitId = selectedUnitId.trim();
    const hasCustomUsername = manualForm.username.trim().length > 0;

    const payload: PrimaryResidentProvisionRequest = {
      resident: {
        fullName: manualForm.fullName.trim(),
        phone: manualForm.phone.trim() || undefined,
        email: manualForm.email.trim(),
        nationalId: manualForm.nationalId.trim() || undefined,
        dob: manualForm.dob || undefined,
      },
      account: {
        // If user provided username, use it and disable auto-generate
        // Otherwise, let backend auto-generate username
        ...(hasCustomUsername ? { username: manualForm.username.trim() } : {}),
        autoGenerate: !hasCustomUsername,
      },
      relation: manualForm.relation.trim() || undefined,
    };

    try {
      setManualSubmitting(true);
      const fallbackEmail = manualForm.email.trim();
      const response = await provisionPrimaryResident(targetUnitId, payload);
      setProvisionResponse(response);
      setLastSubmittedEmail(fallbackEmail);
      setManualSuccess(t('success.createAccountSuccess'));
      setManualForm({
        householdId: '',
        fullName: '',
        email: '',
        phone: '',
        nationalId: '',
        dob: '',
        username: '',
        relation: t('manualForm.placeholders.relation'),
      });
      setManualFieldErrors({});
      setHouseholdInfo(null);
      setUnitInfo(null);
      setHouseholdError(null);
    } catch (err: any) {
      const fieldErrors: ManualFieldErrors = {};
      let generalMessage = '';

      if (err?.response?.data) {
        const errorData = err.response.data;

        // Parse field-specific errors từ backend
        // Format 1: errors array với field và message
        if (Array.isArray(errorData.errors)) {
          errorData.errors.forEach((error: any) => {
            if (typeof error === 'string') {
              // Nếu là string, check keywords
              const lowerError = error.toLowerCase();
              if (lowerError.includes('username')) {
                fieldErrors.username = error;
              } else if (lowerError.includes('email') || lowerError.includes('e-mail')) {
                fieldErrors.email = error;
              } else if (lowerError.includes('phone') || lowerError.includes('số điện thoại')) {
                fieldErrors.phone = error;
              } else if (lowerError.includes('national') || lowerError.includes('cccd') || lowerError.includes('căn cước')) {
                fieldErrors.nationalId = error;
              }
            } else if (error.field && error.message) {
              // Format: { field: "email", message: "..." }
              const fieldName = error.field.toLowerCase();
              if (fieldName.includes('username')) {
                fieldErrors.username = error.message;
              } else if (fieldName.includes('email')) {
                fieldErrors.email = error.message;
              } else if (fieldName.includes('phone')) {
                fieldErrors.phone = error.message;
              } else if (fieldName.includes('national') || fieldName.includes('cccd')) {
                fieldErrors.nationalId = error.message;
              }
            }
          });
        }

        // Format 2: errors object với field names
        if (errorData.errors && typeof errorData.errors === 'object' && !Array.isArray(errorData.errors)) {
          Object.keys(errorData.errors).forEach(key => {
            const lowerKey = key.toLowerCase();
            const errorValue = Array.isArray(errorData.errors[key])
              ? errorData.errors[key][0]
              : errorData.errors[key];

            if (lowerKey.includes('username')) {
              fieldErrors.username = errorValue;
            } else if (lowerKey.includes('email')) {
              fieldErrors.email = errorValue;
            } else if (lowerKey.includes('phone')) {
              fieldErrors.phone = errorValue;
            } else if (lowerKey.includes('national') || lowerKey.includes('cccd')) {
              fieldErrors.nationalId = errorValue;
            }
          });
        }

        // Format 3: Parse từ message string - Check username first (higher priority)
        const message = errorData.message || errorData.error || '';
        if (message) {
          const lowerMessage = message.toLowerCase();
          // Check for username errors first (validation, format, duplicate, required)
          // This should have higher priority than other field errors
          if (lowerMessage.includes('username')) {
            // Always assign to username field if message contains 'username'
            fieldErrors.username = message;
          } else if (lowerMessage.includes('email') && (lowerMessage.includes('exists') || lowerMessage.includes('tồn tại') || lowerMessage.includes('đã có') || lowerMessage.includes('already'))) {
            if (!fieldErrors.email) {
              fieldErrors.email = message;
            }
          } else if (lowerMessage.includes('phone') && (lowerMessage.includes('exists') || lowerMessage.includes('tồn tại') || lowerMessage.includes('đã có') || lowerMessage.includes('already'))) {
            if (!fieldErrors.phone) {
              fieldErrors.phone = message;
            }
          } else if ((lowerMessage.includes('national') || lowerMessage.includes('cccd') || lowerMessage.includes('căn cước')) && (lowerMessage.includes('exists') || lowerMessage.includes('tồn tại') || lowerMessage.includes('đã có') || lowerMessage.includes('already'))) {
            if (!fieldErrors.nationalId) {
              fieldErrors.nationalId = message;
            }
          } else if (Object.keys(fieldErrors).length === 0) {
            // Only set as general message if no field errors found yet
            generalMessage = message;
          }
        }
      } else if (err?.message) {
        generalMessage = err.message;
      }

      // Set field errors nếu có
      if (Object.keys(fieldErrors).length > 0) {
        setManualFieldErrors(fieldErrors);
      }

      // Set general error nếu không có field-specific errors
      if (generalMessage || Object.keys(fieldErrors).length === 0) {
        setManualError(generalMessage || t('messages.createAccountError'));
      } else {
        setManualError(''); // Clear general error nếu có field errors
      }
    } finally {
      setManualSubmitting(false);
    }
  };

  const refreshPendingRequests = async () => {
    try {
      setLoadingRequests(true);
      setRequestError(null);
      const data = await fetchPendingAccountRequests();
      setPendingRequests(data);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        t('requestsTab.rejectError');
      setRequestError(message);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    if (initialLoad) {
      void refreshPendingRequests().finally(() => setInitialLoad(false));
      return;
    }

    if (activeTab === 'requests' && pendingRequests.length === 0) {
      void refreshPendingRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, initialLoad]);

  const formatDate = (value?: string | null) => {
    if (!value) return t('common.notUpdated');
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleDateString('vi-VN');
  };

  const selectPrimaryContract = (contracts: ContractSummary[]): ContractSummary | null => {
    if (!contracts || contracts.length === 0) {
      return null;
    }
    return [...contracts].sort((a, b) => {
      const aTime = a.startDate ? new Date(a.startDate).getTime() : 0;
      const bTime = b.startDate ? new Date(b.startDate).getTime() : 0;
      return bTime - aTime;
    })[0];
  };

  const formatDateTime = (value: string | null) => {
    if (!value) return t('common.notUpdated');
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString('vi-VN');
  };

  const processingRequests = useMemo(
    () => new Set(Object.entries(requestActionState).filter(([, v]) => v).map(([key]) => key)),
    [requestActionState],
  );

  const handleRequestAction = async (requestId: string, approve: boolean) => {
    let rejectionReason: string | undefined;

    if (!approve) {
      const defaultReason = t('common.defaultRejectionReason');
      // eslint-disable-next-line no-alert
      const reason =
        window.prompt(t('requestsTab.rejectPrompt'), defaultReason) ??
        defaultReason;
      const trimmed = reason.trim();
      if (!trimmed) {
        return;
      }
      rejectionReason = trimmed;
    }

    try {
      setRequestActionState((prev) => ({ ...prev, [requestId]: true }));
      await approveAccountRequest(requestId, {
        approve,
        rejectionReason,
      });
      setPendingRequests((prev) => prev.filter((item) => item.id !== requestId));
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        t('errors.processRequestFailed');
      setRequestError(message);
    } finally {
      setRequestActionState((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="group mb-6 flex items-center gap-2 rounded-lg py-2 pl-2 pr-4 text-slate-500 transition-all hover:bg-white hover:text-emerald-700 hover:shadow-sm"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 transition-colors group-hover:ring-emerald-200">
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          </div>
          <span className="font-semibold">{t('back')}</span>
        </button>

        <div className="flex flex-col gap-6 space-y-6">
          {/* Header Card */}
          <div className="overflow-hidden rounded-3xl border border-white/50 bg-white/80 p-6 shadow-xl shadow-slate-200/50 backdrop-blur-xl md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  {t('title')}
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  {t('subtitle')}
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 pl-3 pr-4 py-1.5 text-xs font-semibold text-amber-700 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                {t('pendingRequestsBadge', { count: pendingRequests.length })}
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-8 flex gap-2 overflow-x-auto pb-2 md:pb-0">
              <div className="inline-flex items-center rounded-xl bg-slate-100/80 p-1">
                <button
                  type="button"
                  onClick={() => handleTabChange('manual')}
                  className={`rounded-lg px-6 py-2.5 text-sm font-semibold transition-all ${activeTab === 'manual'
                    ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-black/5'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                    }`}
                >
                  {t('tabs.manual')}
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange('requests')}
                  className={`rounded-lg px-6 py-2.5 text-sm font-semibold transition-all ${activeTab === 'requests'
                    ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-black/5'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                    }`}
                >
                  {t('tabs.requests')}
                </button>
              </div>
            </div>
          </div>

          {activeTab === 'manual' && (
            <div className="mt-2 rounded-3xl border border-white/50 bg-white/80 p-6 shadow-xl shadow-slate-200/50 backdrop-blur-xl md:p-8">
              <h2 className="text-lg font-semibold text-slate-800">{t('manualForm.title')}</h2>

              {(manualSuccess || manualError) && (
                <div className="mt-4 space-y-3">
                  {manualSuccess && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      <p>{manualSuccess}</p>
                      {provisionResponse?.account && (
                        <div className="mt-2 space-y-1 text-xs text-emerald-800">
                          <p>
                            {t('success.accountInfo.username')}{' '}
                            <span className="font-semibold">
                              {provisionResponse.account.username || t('success.accountInfo.autoGenerated')}
                            </span>
                          </p>
                          <p>
                            {t('success.accountInfo.email')}{' '}
                            <span className="font-semibold">
                              {provisionResponse.account.email || lastSubmittedEmail}
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  {manualError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                      {manualError}
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleManualSubmit} className="mt-6 space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-emerald-500" />
                      {t('manualForm.fields.building')}
                    </label>
                    <Select<Building | null>
                      options={buildingSelectOptions}
                      value={selectedBuildingId}
                      onSelect={(item) => handleBuildingChange(item?.id ?? '')}
                      renderItem={(item) =>
                        item
                          ? `${item.code ? `${item.code} - ` : ''}${item.name ?? ''}`
                          : t('manualForm.placeholders.selectBuilding')
                      }
                      getValue={(item) => item?.id ?? ''}
                      placeholder={t('manualForm.placeholders.selectBuilding')}
                      disable={buildingsLoading}
                    />
                    {buildingsLoading && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        {t('manualForm.loading.buildings')}
                      </span>
                    )}
                    {buildingsError && (
                      <span className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {buildingsError}
                      </span>
                    )}
                    {buildingSelectionError && (
                      <span className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {buildingSelectionError}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Home className="w-4 h-4 text-emerald-500" />
                      {t('manualForm.fields.unit')}
                    </label>
                    <Select<Unit | null>
                      options={unitSelectOptions}
                      value={selectedUnitId}
                      onSelect={(item) => handleUnitChange(item?.id ?? '')}
                      renderItem={(item) =>
                        item
                          ? `${item.code ?? ''}${item.floor !== undefined ? t('manualForm.floorFormat', { floor: item.floor }) : ''
                          }`
                          : unitPlaceholder
                      }
                      getValue={(item) => item?.id ?? ''}
                      placeholder={unitPlaceholder}
                      disable={!selectedBuildingId || unitsLoading}
                    />
                    {unitsLoading && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        {t('manualForm.loading.units')}
                      </span>
                    )}
                    {unitsError && <span className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{unitsError}</span>}
                    {unitSelectionError && (
                      <span className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{unitSelectionError}</span>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-6">
                  <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2 mb-4">
                    <FileText className="w-4 h-4" />
                    {t('manualForm.contractInfo.title')}
                  </h3>
                  {contractInfo ? (
                    <div className="grid gap-y-4 gap-x-8 text-sm text-blue-900 sm:grid-cols-2">
                      <div className="space-y-1">
                        <span className="font-semibold text-blue-700 block">{t('manualForm.contractInfo.contractNumber')}</span>
                        <span className="font-medium">{contractInfo.contractNumber ?? t('common.notUpdated')}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="font-semibold text-blue-700 block">{t('manualForm.contractInfo.status')}</span>
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                          {contractInfo.status ?? t('contractModal.values.unknown')}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="font-semibold text-blue-700 block">{t('manualForm.contractInfo.effectiveFrom')}</span>
                        <span className="font-medium">{formatDate(contractInfo.startDate)}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="font-semibold text-blue-700 block">{t('manualForm.contractInfo.effectiveTo')}</span>
                        <span className="font-medium">{contractInfo.endDate ? formatDate(contractInfo.endDate) : t('manualForm.contractInfo.unlimited')}</span>
                      </div>
                    </div>
                  ) : selectedUnitId ? (
                    <div className="rounded-xl bg-blue-100/50 p-4 text-sm text-blue-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {t('manualForm.contractInfo.noContract')}
                    </div>
                  ) : (
                    <div className="rounded-xl bg-blue-100/50 p-4 text-sm text-blue-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {t('manualForm.contractInfo.selectFirst')}
                    </div>
                  )}
                  {contractInfo && (
                    <button
                      type="button"
                      onClick={handleOpenContractDetail}
                      className="mt-6 inline-flex items-center justify-center rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition-all hover:bg-blue-50 hover:border-blue-300"
                    >
                      <Search className="w-4 h-4 mr-2" />
                      {t('manualForm.contractInfo.viewDetail')}
                    </button>
                  )}
                  {contractError && (
                    <p className="mt-3 text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {contractError}
                    </p>
                  )}
                </div>

                {householdError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600">
                    {householdError}
                  </div>
                )}

                {householdLoading && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                    {t('manualForm.loading.household')}
                  </div>
                )}

                {householdInfo && !householdLoading && !unitSelectionError && (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm text-emerald-900 shadow-inner">
                    <h3 className="mb-2 text-base font-semibold text-emerald-800">{t('manualForm.householdInfo.title')}</h3>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <p>
                        <span className="font-medium">{t('manualForm.householdInfo.kind')}</span> {householdInfo.kind ?? '---'}
                      </p>
                      <p>
                        <span className="font-medium">{t('manualForm.householdInfo.startDate')}</span>{' '}
                        {new Date(householdInfo.startDate).toLocaleDateString('vi-VN')}
                      </p>
                      <p>
                        <span className="font-medium">{t('manualForm.householdInfo.endDate')}</span>{' '}
                        {householdInfo.endDate
                          ? new Date(householdInfo.endDate).toLocaleDateString('vi-VN')
                          : t('manualForm.householdInfo.notSet')}
                      </p>
                      {unitInfo && (
                        <>
                          <p>
                            <span className="font-medium">{t('manualForm.householdInfo.unit')}</span> {unitInfo.code}
                          </p>
                          <p>
                            <span className="font-medium">{t('manualForm.householdInfo.building')}</span>{' '}
                            {unitInfo.buildingId
                              ? (() => {
                                const building = buildings.find((b) => b.id === unitInfo.buildingId);
                                return building?.name ?? unitInfo.buildingId;
                              })()
                              : '—'}
                          </p>
                          <p>
                            <span className="font-medium">{t('manualForm.householdInfo.floor')}</span> {unitInfo.floor ?? '---'}
                          </p>
                          <p>
                            <span className="font-medium">{t('manualForm.householdInfo.area')}</span>{' '}
                            {unitInfo.areaM2 ? `${unitInfo.areaM2} m²` : '---'}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <CCCDUpload
                  onExtract={handleCCCDExtract}
                  disabled={manualSubmitting}
                />

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-500" />
                      {t('manualForm.fields.fullName')}
                    </label>
                    <input
                      type="text"
                      value={manualForm.fullName}
                      onChange={handleManualChange('fullName')}
                      placeholder={t('manualForm.placeholders.fullName')}
                      maxLength={40}
                      className={`h-11 w-full rounded-xl border px-4 text-sm font-medium shadow-sm transition-all focus:outline-none focus:ring-2 ${manualFieldErrors.fullName
                        ? 'border-red-300 bg-red-50 text-red-900 focus:border-red-500 focus:ring-red-100 placeholder:text-red-300'
                        : 'border-slate-200 bg-white text-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20 hover:border-emerald-200'
                        }`}
                    />
                    {manualFieldErrors.fullName && (
                      <span className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{manualFieldErrors.fullName}</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-emerald-500" />
                      {t('manualForm.fields.email')}
                    </label>
                    <input
                      type="email"
                      value={manualForm.email}
                      onChange={handleManualChange('email')}
                      placeholder={t('manualForm.placeholders.email')}
                      maxLength={40}
                      className={`h-11 w-full rounded-xl border px-4 text-sm font-medium shadow-sm transition-all focus:outline-none focus:ring-2 ${manualFieldErrors.email
                        ? 'border-red-300 bg-red-50 text-red-900 focus:border-red-500 focus:ring-red-100 placeholder:text-red-300'
                        : 'border-slate-200 bg-white text-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20 hover:border-emerald-200'
                        }`}
                    />
                    {manualFieldErrors.email && (
                      <span className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{manualFieldErrors.email}</span>
                    )}
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-emerald-500" />
                      {t('manualForm.fields.phone')}
                    </label>
                    <input
                      type="tel"
                      value={manualForm.phone}
                      onChange={handleManualChange('phone')}
                      placeholder={t('manualForm.placeholders.phone')}
                      maxLength={10}
                      inputMode="tel"
                      pattern="[0-9]*"
                      className={`h-11 w-full rounded-xl border px-4 text-sm font-medium shadow-sm transition-all focus:outline-none focus:ring-2 ${manualFieldErrors.phone
                        ? 'border-red-300 bg-red-50 text-red-900 focus:border-red-500 focus:ring-red-100 placeholder:text-red-300'
                        : 'border-slate-200 bg-white text-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20 hover:border-emerald-200'
                        }`}
                    />
                    {manualFieldErrors.phone && (
                      <span className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{manualFieldErrors.phone}</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-500" />
                      {t('manualForm.fields.dob')}
                    </label>
                    <DateBox
                      value={manualForm.dob}
                      onChange={handleManualChange('dob')}
                      placeholderText={t('manualForm.placeholders.dob')}
                    />
                    {manualFieldErrors.dob && (
                      <span className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{manualFieldErrors.dob}</span>
                    )}
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-emerald-500" />
                      {t('manualForm.fields.nationalId')}
                    </label>
                    <input
                      type="text"
                      value={manualForm.nationalId}
                      onChange={handleManualChange('nationalId')}
                      placeholder={t('manualForm.placeholders.nationalId')}
                      maxLength={12}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className={`h-11 w-full rounded-xl border px-4 text-sm font-medium shadow-sm transition-all focus:outline-none focus:ring-2 ${manualFieldErrors.nationalId
                        ? 'border-red-300 bg-red-50 text-red-900 focus:border-red-500 focus:ring-red-100 placeholder:text-red-300'
                        : 'border-slate-200 bg-white text-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20 hover:border-emerald-200'
                        }`}
                    />
                    {manualFieldErrors.nationalId && (
                      <span className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{manualFieldErrors.nationalId}</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <User className="w-4 h-4 text-emerald-500" />
                      {t('manualForm.fields.username')}
                    </label>
                    <input
                      type="text"
                      value={manualForm.username}
                      onChange={handleManualChange('username')}
                      placeholder={t('manualForm.placeholders.username')}
                      maxLength={40}
                      className={`h-11 w-full rounded-xl border px-4 text-sm font-medium shadow-sm transition-all focus:outline-none focus:ring-2 ${manualFieldErrors.username
                        ? 'border-red-300 bg-red-50 text-red-900 focus:border-red-500 focus:ring-red-100 placeholder:text-red-300'
                        : 'border-slate-200 bg-white text-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20 hover:border-emerald-200'
                        }`}
                    />
                    {manualFieldErrors.username && (
                      <span className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{manualFieldErrors.username}</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-500" />
                    {t('manualForm.fields.relation')}
                  </label>
                  <input
                    type="text"
                    value={manualForm.relation}
                    readOnly
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-600 shadow-sm cursor-not-allowed"
                  />
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {t('manualForm.relationNote')}
                  </span>
                </div>

                <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-sm text-slate-500 flex gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 text-slate-400" />
                  <p>{t('manualForm.passwordNote')}</p>
                </div>

                <div className="flex flex-col gap-3 pt-6 border-t border-slate-100 sm:flex-row sm:items-center sm:justify-end">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm"
                  >
                    {t('manualForm.buttons.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={manualSubmitting || !contractInfo}
                    className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:from-emerald-600 hover:to-teal-700 hover:shadow-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {manualSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('manualForm.buttons.creating')}
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        {t('manualForm.buttons.create')}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {isContractModalOpen && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 px-4 py-8">
              <div className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">{t('contractModal.title')}</h3>
                    {contractInfo?.contractNumber && (
                      <p className="text-sm text-slate-500">{t('contractModal.contractNumber')} {contractInfo.contractNumber}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseContractDetail}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100"
                  >
                    ×
                  </button>
                </div>
                <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
                  {contractDetailState.loading && (
                    <p className="text-sm text-slate-500">{t('contractModal.loading')}</p>
                  )}
                  {contractDetailState.error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                      {contractDetailState.error}
                    </div>
                  )}
                  {!contractDetailState.loading &&
                    !contractDetailState.error &&
                    contractDetailState.data && (
                      <div className="space-y-5 text-sm text-slate-700">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <p>
                            <span className="font-medium text-slate-900">{t('contractModal.fields.contractType')}</span>{' '}
                            {contractDetailState.data.contractType ?? t('contractModal.values.unknown')}
                          </p>
                          <p>
                            <span className="font-medium text-slate-900">{t('contractModal.fields.status')}</span>{' '}
                            {contractDetailState.data.status ?? t('contractModal.values.unknown')}
                          </p>
                          <p>
                            <span className="font-medium text-slate-900">{t('contractModal.fields.startDate')}</span>{' '}
                            {formatDate(contractDetailState.data.startDate)}
                          </p>
                          <p>
                            <span className="font-medium text-slate-900">{t('contractModal.fields.endDate')}</span>{' '}
                            {contractDetailState.data.endDate
                              ? formatDate(contractDetailState.data.endDate)
                              : t('contractModal.values.unlimited')}
                          </p>
                          {contractDetailState.data.monthlyRent != null && (
                            <p>
                              <span className="font-medium text-slate-900">{t('contractModal.fields.monthlyRent')}</span>{' '}
                              {contractDetailState.data.monthlyRent.toLocaleString('vi-VN')} đ
                            </p>
                          )}
                          {contractDetailState.data.purchasePrice != null && (
                            <p>
                              <span className="font-medium text-slate-900">{t('contractModal.fields.purchasePrice')}</span>{' '}
                              {contractDetailState.data.purchasePrice.toLocaleString('vi-VN')} đ
                            </p>
                          )}
                          {contractDetailState.data.purchaseDate && (
                            <p>
                              <span className="font-medium text-slate-900">{t('contractModal.fields.purchaseDate')}</span>{' '}
                              {formatDate(contractDetailState.data.purchaseDate)}
                            </p>
                          )}
                          {contractDetailState.data.paymentMethod && (
                            <p>
                              <span className="font-medium text-slate-900">{t('contractModal.fields.paymentMethod')}</span>{' '}
                              {contractDetailState.data.paymentMethod}
                            </p>
                          )}
                        </div>
                        {contractDetailState.data.notes && (
                          <div>
                            <p className="font-medium text-slate-900">{t('contractModal.fields.notes')}</p>
                            <p className="mt-1 whitespace-pre-line text-slate-600">
                              {contractDetailState.data.notes}
                            </p>
                          </div>
                        )}
                        {contractDetailState.data.files && contractDetailState.data.files.length > 0 && (
                          <div>
                            <p className="font-medium text-slate-900">{t('contractModal.fields.attachments')}</p>
                            <ul className="mt-2 space-y-2 text-sm">
                              {contractDetailState.data.files.map((file) => (
                                <li
                                  key={file.id}
                                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                                >
                                  <div>
                                    <p className="font-medium text-slate-800">
                                      {file.originalFileName ?? file.fileName ?? t('contractModal.values.unnamedFile')}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      {file.contentType ?? t('contractModal.values.unknownFormat')} •{' '}
                                      {file.fileSize ? `${(file.fileSize / 1024).toFixed(1)} KB` : t('contractModal.values.unknownSize')}
                                    </p>
                                    {file.isPrimary && (
                                      <span className="mt-1 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                        {t('contractModal.values.primaryFile')}
                                      </span>
                                    )}
                                  </div>
                                  {file.fileUrl && (
                                    <a
                                      href={file.fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center rounded-md border border-blue-300 px-3 py-1 text-sm text-blue-600 transition hover:bg-blue-50"
                                    >
                                      {t('contractModal.values.viewDownload')}
                                    </a>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                </div>
                <div className="flex items-center justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">
                  <button
                    type="button"
                    onClick={handleCloseContractDetail}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-white"
                  >
                    {t('contractModal.close')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">
                  {t('requestsTab.title')}
                </h2>
                <button
                  type="button"
                  onClick={() => refreshPendingRequests()}
                  className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  {t('requestsTab.refresh')}
                </button>
              </div>

              {requestError && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {requestError}
                </div>
              )}

              <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-600">
                        {t('requestsTab.table.resident')}
                      </th>
                      <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-600">
                        {t('requestsTab.table.contact')}
                      </th>
                      <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-600">
                        {t('requestsTab.table.proposedAccount')}
                      </th>
                      <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-600">
                        {t('requestsTab.table.options')}
                      </th>
                      <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-600">
                        {t('requestsTab.table.time')}
                      </th>
                      <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide text-slate-600">
                        {t('requestsTab.table.action')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingRequests ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                          {t('requestsTab.loading')}
                        </td>
                      </tr>
                    ) : pendingRequests.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                          {t('requestsTab.empty')}
                        </td>
                      </tr>
                    ) : (
                      pendingRequests.map((request) => {
                        const isProcessing = processingRequests.has(request.id);
                        return (
                          <tr key={request.id} className="hover:bg-emerald-50/40">
                            <td className="px-4 py-3 font-medium text-slate-800">
                              <div className="flex flex-col">
                                <span>{request.residentName || t('requestsTab.columns.notProvided')}</span>
                                <span className="text-xs text-slate-500">
                                  {t('requestsTab.columns.requestId')} {request.id}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              <div className="flex flex-col">
                                <span>{request.residentPhone || t('requestsTab.columns.notProvided')}</span>
                                <span className="text-xs text-slate-500">
                                  {request.residentEmail || t('requestsTab.columns.notProvided')}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              <div className="flex flex-col">
                                <span>
                                  <strong>{t('requestsTab.columns.username')}</strong> {request.username || t('requestsTab.columns.noData')}
                                </span>
                                <span>
                                  <strong>{t('requestsTab.columns.email')}</strong> {request.email || t('requestsTab.columns.noData')}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              <div className="flex flex-col gap-1">
                                <span>
                                  <strong>{t('requestsTab.columns.relation')}</strong> {request.relation || t('requestsTab.columns.unknown')}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {formatDateTime(request.createdAt)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleRequestAction(request.id, true)}
                                  disabled={isProcessing}
                                  className="group relative inline-flex items-center justify-center rounded-xl bg-emerald-100 p-2 text-emerald-700 transition-all hover:bg-emerald-200 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                                  title={t('requestsTab.actions.approve')}
                                >
                                  <Check className="w-5 h-5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRequestAction(request.id, false)}
                                  disabled={isProcessing}
                                  className="group relative inline-flex items-center justify-center rounded-xl bg-red-100 p-2 text-red-700 transition-all hover:bg-red-200 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                                  title={t('requestsTab.actions.reject')}
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

