import Image from 'next/image';
import React from 'react';
import CheckboxUnchecked from '@/src/assets/Checkbox.svg';
import CheckboxChecked from '@/src/assets/CheckboxChecked.svg';

interface CheckboxProps {
    checked: boolean;
    onClick: () => void;
}

const Checkbox = ({ checked, onClick } : CheckboxProps) => {
    return (
        <div onClick={onClick} className="cursor-pointer">
            <Image
                src={checked ? CheckboxChecked : CheckboxUnchecked}
                alt={checked ? "Checked" : "Unchecked"}
                width={20}
                height={20}
            />
        </div>
    );
};

export default Checkbox;
