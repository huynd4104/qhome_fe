import Image from "next/image";
import CalendarIcon from '@/src/assets/CalendarIcon.svg';
import { useRef } from 'react';
import { useLocale } from 'next-intl';

interface MonthYearPickerProps {
    value: string; // Format: YYYY-MM-DD (will auto set to last day of month)
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholderText?: string;
    min?: string; // Format: YYYY-MM-DD
};

/**
 * Component to select month and year, automatically sets to last day of selected month
 */
const MonthYearPicker = ({ value, onChange, placeholderText, min }: MonthYearPickerProps) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const locale = useLocale(); // Get current locale from next-intl

    const handleIconClick = () => {
        inputRef.current?.showPicker();
    };

    const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!onChange) return;

        const monthYearValue = e.target.value; // Format: YYYY-MM
        if (!monthYearValue) {
            // If cleared, call onChange with empty value
            const emptyEvent = {
                ...e,
                target: {
                    ...e.target,
                    value: '',
                },
            } as React.ChangeEvent<HTMLInputElement>;
            onChange(emptyEvent);
            return;
        }

        // Calculate last day of the selected month
        // Input format: YYYY-MM (month is 1-12)
        // JavaScript Date uses month 0-11 (0 = January, 11 = December)
        const [year, month] = monthYearValue.split('-').map(Number);
        // new Date(year, month, 0) gets the last day of (month - 1) in JS Date
        // Since month from input is 1-12, we use month directly (month 1 = February in JS = correct)
        const lastDay = new Date(year, month, 0).getDate(); // Day 0 = last day of previous month
        
        // Create date string with last day: YYYY-MM-DD
        // Use the original month value (1-12) from input
        const lastDayOfMonth = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        
        // Create synthetic event with the last day value
        const syntheticEvent = {
            ...e,
            target: {
                ...e.target,
                value: lastDayOfMonth,
            },
        } as React.ChangeEvent<HTMLInputElement>;
        
        onChange(syntheticEvent);
    };

    // Convert YYYY-MM-DD to YYYY-MM for month input
    const monthValue = value ? value.substring(0, 7) : '';
    
    // Convert min date to YYYY-MM format
    const monthMin = min ? min.substring(0, 7) : undefined;

    // Map locale to HTML lang attribute format
    const langAttribute = locale === 'vi' ? 'vi-VN' : 'en-US';

    return (
        <div className="relative flex items-center border border-[#38A169] rounded-lg h-10 w-full">
            <input
                ref={inputRef}
                type="month"
                lang={langAttribute}
                className="text-[#38A169] w-full flex-grow h-full bg-transparent hide-date-icon focus:ring-0 focus:outline-none pl-3 pr-2" 
                value={monthValue}
                onChange={handleMonthChange}
                data-placeholder={placeholderText}
                min={monthMin}
            />
            <Image
                src={CalendarIcon}
                alt="CalendarIcon"
                width={20}
                height={20}
                onClick={handleIconClick}
                className="text-[#38A169] shrink-0 mr-3 cursor-pointer"
            />
        </div>
    );
};

export default MonthYearPicker;

