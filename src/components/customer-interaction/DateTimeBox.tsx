import Image from "next/image";
import CalendarIcon from '@/src/assets/CalendarIcon.svg';
import { useRef } from 'react';

interface DateTimeBoxProps {
    value: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholderText?: string;
    min?: string;
    className?: string;
    id?: string;
};

const DateTimeBox = ({ value, onChange, placeholderText, min, className, id } : DateTimeBoxProps) => { 
    const inputRef = useRef<HTMLInputElement>(null);

    const handleIconClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.showPicker();
        }
    };

    const handleInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
        e.stopPropagation();
        e.preventDefault();
        // Chỉ mở picker khi click vào icon, không mở khi click vào input
        handleIconClick(e as any);
    };

    return (
        <div className={`relative flex items-center border rounded-lg h-10 w-full ${className || ''}`} onClick={(e) => e.stopPropagation()}>
            <input
                ref={inputRef}
                id={id}
                type="datetime-local"
                className="text-gray-700 w-full flex-grow h-full bg-transparent hide-date-icon focus:ring-0 focus:outline-none pl-3 pr-2 cursor-pointer" 
                value={value}
                onChange={onChange}
                data-placeholder={placeholderText}
                min={min}
                onClick={handleInputClick}
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

export default DateTimeBox;

