"use client";
import DropdownArrow from '@/src/assets/DropdownArrow.svg';
import clsx from "clsx";
import { useTranslations } from 'next-intl';
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
 
interface SelectProp<T> {
  options: T[];
  value?: string;
  onSelect?: (item: T) => void;
  renderItem: (item: T) => string;
  getValue: (item: T) => string;
  placeholder?: string;
  disable?: boolean;
  error?: boolean;
}

const Select = <T,>({ options, value, onSelect, renderItem, getValue, placeholder, disable = false, error = false }: SelectProp<T>) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [keyword, setKeyword] = useState<string>("");
  const t = useTranslations('customer-interaction.Request');
 
  const selectItem = useMemo(() => {
    return options.find(option => getValue(option) === value);
  }, [options, value, getValue]);

 
  const onOpen = () => setIsOpen(true);
  const onClose = () => setIsOpen(false);
 
  const filteredOptions = options.filter(
        (item) => renderItem(item).toLowerCase().includes(keyword.toLowerCase())
  );
 
  const onSelectItem = (item: T) => () => {
    if (typeof onSelect === "function") {
      onSelect(item);
    }
    setKeyword("");
    onClose();
  };
 
  const divRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (divRef.current && !divRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [divRef]);
 
  return (
    <div className="relative w-full" ref={divRef}>
      <div
        className={`h-10 w-full rounded-md border-[1px] px-3 py-2.5 cursor-pointer flex flex-row items-center justify-between gap-x-3 ${
          error ? "border-red-300" : "border-[#739559]"
        } ${disable ? "bg-gray-300" : "bg-white"}`}
        onClick={isOpen ? onClose : onOpen}
      >
        <div
          className={clsx(
            "font-normal text-sm",
            selectItem ? "text-primary-2" : "text-[#81a996]"
          )}
        >
          {selectItem ? renderItem(selectItem) : placeholder}
        </div>
        <Image
          src={DropdownArrow}
          alt="DropdownArrow"
          width={16}
          height={16}
          className={isOpen && !disable ? "rotate-180" : "rotate-0"}
        />
      </div>
      {isOpen && !disable && (
        <div className="absolute z-10 top-[50px] right-0 left-0 max-h-[300px] bg-white border-[1px] border-[#E7E7E7] p-1 rounded-md flex flex-col shadow-[0_4px_6px_1px_rgba(0,0,0,0.1)]">
          <input
            type="text"
            placeholder={placeholder}
            className="w-full h-10 min-h-10 flex-none rounded-md border-[1px] border-[#E7E7E7] bg-white font-normal text-sm placeholder-[#81A996] text-primary-2 px-3 whitespace-nowrap"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <div className="overflow-y-auto flex-1">
            {filteredOptions.map((item, index) => {
              return (
                <div
                  key={getValue(item) || index}
                  className="mx-1 px-2 py-1.5 font-semibold text-sm text-[#02542D] cursor-pointer hover:bg-gray-100 rounded-sm"
                  onClick={onSelectItem(item)}
                >
                  {renderItem(item)}
                </div>
              );
            })}
             {filteredOptions.length === 0 && (
                 <div className="mx-1 px-2 py-1.5 text-sm text-gray-500 italic">{t("noData")}</div>
             )}
          </div>
        </div>
      )}
    </div>
  );
};
 
export default Select;
