import React from 'react';
import CalendarIcon from '@/src/assets/CalendarIcon.svg';
import Image from 'next/image';

interface DetailFieldProps {
  label: string;
  value: string;
  name?: string;
  inputType?: string;
  placeholder?: string;
  isFullWidth?: boolean;
  type?: 'input' | 'textarea' | 'date';
  readonly: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void; 
  required?: boolean;
  error?: string;
}

const DetailField: React.FC<DetailFieldProps> = ({ label, name, value, placeholder, isFullWidth = false, type = 'input', readonly, onChange, required = false, error, inputType }) => {
    const activeClass = !readonly 
        ? `${error ? 'border-red-500' : 'border-[#739559]'} focus:ring-1 ${error ? 'focus:ring-red-500' : 'focus:ring-[#739559]'} bg-white cursor-text` 
        : 'bg-[#E3E3E3] border-[#739559] cursor-default';

    return (
        <div className={`flex flex-col mb-4 ${isFullWidth ? 'col-span-full' : 'col-span-1'}`}>
            <label className="text-md font-bold text-[#02542D] mb-1">
                {label} 
            </label>
            {type === 'input' && (
                <>
                    <input
                        type={inputType == "number"? "number" : "text"}
                        name={name} 
                        value={value}
                        readOnly={readonly}
                        onChange={onChange}
                        required={required && !readonly}
                        placeholder={placeholder}
                        className={`p-2 border rounded-md text-[#34674F] focus:outline-none shadow-inner transition duration-150 ${activeClass}`}
                    />
                    {error && (
                        <span className="text-red-500 text-xs mt-1">{error}</span>
                    )}
                </>
            )}
            {type === 'textarea' && (
                <>
                    <textarea
                        name={name}
                        value={value}
                        readOnly={readonly}
                        onChange={onChange as (e: React.ChangeEvent<HTMLTextAreaElement>) => void}
                        rows={5}
                        required={required && !readonly}
                        placeholder={placeholder}
                        className={`p-2 border rounded-md text-[#34674F] focus:outline-none resize-none shadow-inner transition duration-150 ${activeClass}`}
                    />
                    {error && (
                        <span className="text-red-500 text-xs mt-1">{error}</span>
                    )}
                </>
            )}
            {type === 'date' && (
                <>
                    <div className={`relative flex items-center border border-[#38A169] rounded-lg h-10 w-full ${activeClass}`}>
                        <Image
                            src={CalendarIcon}
                            alt="CalendarIcon"
                            width={20}
                            height={20}
                            className="text-[#34674F] shrink-0 ml-3 cursor-pointer"
                        />
                        <input
                            className="text-[#34674F] w-full flex-grow h-full bg-transparent hide-date-icon focus:ring-0 focus:outline-none pl-3 pr-2 z-10" 
                            value={value}
                            readOnly
                        />
                    </div>
                    {error && (
                        <span className="text-red-500 text-xs mt-1">{error}</span>
                    )}
                </>
            )}
        </div>
    );
};

export default DetailField;
