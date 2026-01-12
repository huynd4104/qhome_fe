import Image from "next/image";
import CalendarIcon from '@/src/assets/CalendarIcon.svg';
import { useRef } from 'react';

interface DateBoxProps {
    value: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholderText?: string;
    min?: string;
    disabled?: boolean;
};

const DateBox = ({ value, onChange, placeholderText, min, disabled } : DateBoxProps) => { 
    const inputRef = useRef<HTMLInputElement>(null);

    const handleIconClick = () => {
        if (!disabled) {
            inputRef.current?.showPicker();
        }
    };

    return (
        <div className={`relative flex items-center border border-[#38A169] rounded-lg h-10 w-full ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
            <input
                ref={inputRef}
                type="date"
                className="text-[#38A169] w-full flex-grow h-full bg-transparent hide-date-icon focus:ring-0 focus:outline-none pl-3 pr-2" 
                value={value}
                onChange={onChange}
                data-placeholder={placeholderText}
                min={min}
                disabled={disabled}
            />
            <Image
                src={CalendarIcon}
                alt="CalendarIcon"
                width={20}
                height={20}
                onClick={handleIconClick}
                className={`text-[#38A169] shrink-0 mr-3 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            />
        </div>
    );
};

export default DateBox;
