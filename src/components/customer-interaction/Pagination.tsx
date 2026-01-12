'use client';

import React from 'react';
import clsx from 'clsx';
import { usePagination, DOTS } from '@/src/hooks/usePagination';
import Image from 'next/image';
import DropdownArrow from '@/src/assets/DropdownArrow.svg';

interface PaginationProps {
  onPageChange: (page: number) => void;
  totalPages: number;
  currentPage: number; 
  siblingCount?: number;
}

const Pagination = ({
  onPageChange,
  totalPages,
  currentPage,
  siblingCount = 1,
}: PaginationProps) => {

  const paginationRange = usePagination({
    currentPage,
    totalPages,
    siblingCount,
  });

  if (currentPage < 1 || paginationRange.length < 2) {
    return null;
  }

  const onNext = () => {
    onPageChange(currentPage + 1);
  };

  const onPrevious = () => {
    onPageChange(currentPage - 1);
  };

  const lastPage = paginationRange[paginationRange.length - 1];

  return (
    <nav className="flex justify-center items-center py-4">
      <ul className="inline-flex items-center -space-x-px">
        {/* Previous */}
        <li>
          <button
            onClick={onPrevious}
            disabled={currentPage === 1}
            className="flex items-center justify-center w-9 h-9 ms-0 leading-tight text-gray-500 bg-white rounded-s-lg hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Image
                src={DropdownArrow}
                alt="DropdownArrow"
                width={16}
                height={16}
                className="rotate-90"
            />
          </button>
        </li>

        {/* Total pages */}
        {paginationRange.map((pageNumber, index) => {
          if (pageNumber === DOTS) {
            return (
              <li key={`dots-${index}`} className="flex items-center justify-center w-9 h-9 leading-tight text-gray-500">
                &#8230;
              </li>
            );
          }

          // Convert pageNumber (1-indexed) to 0-indexed for comparison
          const isCurrent = currentPage === (pageNumber as number);

          return (
            <li key={pageNumber}>
              <button
                onClick={() => onPageChange((pageNumber as number))}
                className={clsx(
                  'flex items-center justify-center w-9 h-9 leading-tight transition-colors duration-150',
                  {
                    'bg-green-500 text-white font-bold rounded-md z-10': isCurrent,
                    'text-gray-500 bg-white hover:bg-gray-100 hover:text-gray-700': !isCurrent,
                  }
                )}
              >
                {pageNumber}
              </button>
            </li>
          );
        })}

        {/* Next */}
        <li>
          <button
            onClick={onNext}
            disabled={currentPage === (lastPage as number)}
            className="flex items-center justify-center w-9 h-9 leading-tight text-gray-500 bg-white rounded-e-lg hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Image
                src={DropdownArrow}
                alt="DropdownArrow"
                width={16}
                height={16}
                className="rotate-270"
            />
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Pagination;
