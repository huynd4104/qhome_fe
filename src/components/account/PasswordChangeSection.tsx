'use client';

import { ChangeEvent, useState } from "react";
import { useTranslations } from 'next-intl';

type PasswordChangeSectionProps = {
  newPassword: string;
  confirmPassword: string;
  onChangeNewPassword: (value: string) => void;
  onChangeConfirmPassword: (value: string) => void;
};

export function PasswordChangeSection({
  newPassword,
  confirmPassword,
  onChangeNewPassword,
  onChangeConfirmPassword,
}: PasswordChangeSectionProps) {
  const t = useTranslations('PasswordChangeSection');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleNewPasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChangeNewPassword(event.target.value);
  };

  const handleConfirmPasswordChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    onChangeConfirmPassword(event.target.value);
  };

  return (
    <>
        <style jsx>{`
            input[type="password"]::-ms-reveal,
            input[type="password"]::-ms-clear,
            input[type="password"]::-webkit-textfield-decoration-container {
            display: none;
            }
        `}</style>
                  <div className="border-t-4 border-green-600 p-4">
            <h2 className="text-sm font-semibold text-slate-700">
              {t('title')}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {t('description')}
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="relative">
                <label className="text-xs font-medium uppercase text-slate-500">
                  {t('fields.newPassword')}
                </label>
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={handleNewPasswordChange}
                  minLength={8}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  placeholder={t('placeholders.newPassword')}
                  autoComplete="new-password"
                />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute right-3 top-[42px] text-xs font-medium text-emerald-600 hover:text-emerald-700"
                  >
                    {showNewPassword ? 
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" id="Eye-Close-Fill--Streamline-Mingcute-Fill" height="24" width="24">
                            <g fill="none" fillRule="evenodd">
                                <path d="M24 0v24H0V0h24ZM12.593 23.258l-0.011 0.002 -0.071 0.035 -0.02 0.004 -0.014 -0.004 -0.071 -0.035c-0.01 -0.004 -0.019 -0.001 -0.024 0.005l-0.004 0.01 -0.017 0.428 0.005 0.02 0.01 0.013 0.104 0.074 0.015 0.004 0.012 -0.004 0.104 -0.074 0.012 -0.016 0.004 -0.017 -0.017 -0.427c-0.002 -0.01 -0.009 -0.017 -0.017 -0.018Zm0.265 -0.113 -0.013 0.002 -0.185 0.093 -0.01 0.01 -0.003 0.011 0.018 0.43 0.005 0.012 0.008 0.007 0.201 0.093c0.012 0.004 0.023 0 0.029 -0.008l0.004 -0.014 -0.034 -0.614c-0.003 -0.012 -0.01 -0.02 -0.02 -0.022Zm-0.715 0.002a0.023 0.023 0 0 0 -0.027 0.006l-0.006 0.014 -0.034 0.614c0 0.012 0.007 0.02 0.017 0.024l0.015 -0.002 0.201 -0.093 0.01 -0.008 0.004 -0.011 0.017 -0.43 -0.003 -0.012 -0.01 -0.01 -0.184 -0.092Z" strokeWidth="1"></path>
                                <path fill="currentColor" d="M2.5 9a1.5 1.5 0 0 1 2.945 -0.404c1.947 6.502 11.158 6.503 13.109 0.005a1.5 1.5 0 1 1 2.877 0.85 10.104 10.104 0 0 1 -1.623 3.236l0.96 0.96a1.5 1.5 0 1 1 -2.122 2.12l-1.01 -1.01a9.616 9.616 0 0 1 -1.67 0.915l0.243 0.906a1.5 1.5 0 0 1 -2.897 0.776l-0.251 -0.935c-0.705 0.073 -1.417 0.073 -2.122 0l-0.25 0.935a1.5 1.5 0 0 1 -2.898 -0.776l0.242 -0.907a9.61 9.61 0 0 1 -1.669 -0.914l-1.01 1.01a1.5 1.5 0 1 1 -2.122 -2.12l0.96 -0.96a10.102 10.102 0 0 1 -1.62 -3.23A1.5 1.5 0 0 1 2.5 9Z" strokeWidth="1"></path>
                            </g>
                        </svg>
                        : 
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" id="Eye-2-Fill--Streamline-Mingcute-Fill" height="24" width="24">
                            <g fill="none" fillRule="nonzero">
                            <path d="M24 0v24H0V0h24ZM12.593 23.258l-0.011 0.002 -0.071 0.035 -0.02 0.004 -0.014 -0.004 -0.071 -0.035c-0.01 -0.004 -0.019 -0.001 -0.024 0.005l-0.004 0.01 -0.017 0.428 0.005 0.02 0.01 0.013 0.104 0.074 0.015 0.004 0.012 -0.004 0.104 -0.074 0.012 -0.016 0.004 -0.017 -0.017 -0.427c-0.002 -0.01 -0.009 -0.017 -0.017 -0.018Zm0.265 -0.113 -0.013 0.002 -0.185 0.093 -0.01 0.01 -0.003 0.011 0.018 0.43 0.005 0.012 0.008 0.007 0.201 0.093c0.012 0.004 0.023 0 0.029 -0.008l0.004 -0.014 -0.034 -0.614c-0.003 -0.012 -0.01 -0.02 -0.02 -0.022Zm-0.715 0.002a0.023 0.023 0 0 0 -0.027 0.006l-0.006 0.014 -0.034 0.614c0 0.012 0.007 0.02 0.017 0.024l0.015 -0.002 0.201 -0.093 0.01 -0.008 0.004 -0.011 0.017 -0.43 -0.003 -0.012 -0.01 -0.01 -0.184 -0.092Z" strokeWidth="1"></path>
                            <path fill="currentColor" d="M12 5c3.679 0 8.162 2.417 9.73 5.901 0.146 0.328 0.27 0.71 0.27 1.099 0 0.388 -0.123 0.771 -0.27 1.099C20.161 16.583 15.678 19 12 19c-3.679 0 -8.162 -2.417 -9.73 -5.901C2.124 12.77 2 12.389 2 12c0 -0.388 0.123 -0.771 0.27 -1.099C3.839 7.417 8.322 5 12 5Zm0 3a4 4 0 1 0 0 8 4 4 0 0 0 0 -8Zm0 2a2 2 0 1 1 0 4 2 2 0 0 1 0 -4Z" strokeWidth="1"></path>
                            </g>
                        </svg>    
                    }
                  </button>
              </div>
              <div className="relative">
                <label className="text-xs font-medium uppercase text-slate-500">
                  {t('fields.confirmPassword')}
                </label>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  minLength={8}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-emerald-400 focus:outline-none"
                  placeholder={t('placeholders.confirmPassword')}
                  autoComplete="new-password"
                />
                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword((prev) => !prev)
                    }
                    className="absolute right-3 top-[42px] text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:cursor-pointer"
                  >
                    {showConfirmPassword ? 
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" id="Eye-Close-Fill--Streamline-Mingcute-Fill" height="24" width="24">
                        <g fill="none" fillRule="evenodd">
                            <path d="M24 0v24H0V0h24ZM12.593 23.258l-0.011 0.002 -0.071 0.035 -0.02 0.004 -0.014 -0.004 -0.071 -0.035c-0.01 -0.004 -0.019 -0.001 -0.024 0.005l-0.004 0.01 -0.017 0.428 0.005 0.02 0.01 0.013 0.104 0.074 0.015 0.004 0.012 -0.004 0.104 -0.074 0.012 -0.016 0.004 -0.017 -0.017 -0.427c-0.002 -0.01 -0.009 -0.017 -0.017 -0.018Zm0.265 -0.113 -0.013 0.002 -0.185 0.093 -0.01 0.01 -0.003 0.011 0.018 0.43 0.005 0.012 0.008 0.007 0.201 0.093c0.012 0.004 0.023 0 0.029 -0.008l0.004 -0.014 -0.034 -0.614c-0.003 -0.012 -0.01 -0.02 -0.02 -0.022Zm-0.715 0.002a0.023 0.023 0 0 0 -0.027 0.006l-0.006 0.014 -0.034 0.614c0 0.012 0.007 0.02 0.017 0.024l0.015 -0.002 0.201 -0.093 0.01 -0.008 0.004 -0.011 0.017 -0.43 -0.003 -0.012 -0.01 -0.01 -0.184 -0.092Z" strokeWidth="1"></path>
                            <path fill="currentColor" d="M2.5 9a1.5 1.5 0 0 1 2.945 -0.404c1.947 6.502 11.158 6.503 13.109 0.005a1.5 1.5 0 1 1 2.877 0.85 10.104 10.104 0 0 1 -1.623 3.236l0.96 0.96a1.5 1.5 0 1 1 -2.122 2.12l-1.01 -1.01a9.616 9.616 0 0 1 -1.67 0.915l0.243 0.906a1.5 1.5 0 0 1 -2.897 0.776l-0.251 -0.935c-0.705 0.073 -1.417 0.073 -2.122 0l-0.25 0.935a1.5 1.5 0 0 1 -2.898 -0.776l0.242 -0.907a9.61 9.61 0 0 1 -1.669 -0.914l-1.01 1.01a1.5 1.5 0 1 1 -2.122 -2.12l0.96 -0.96a10.102 10.102 0 0 1 -1.62 -3.23A1.5 1.5 0 0 1 2.5 9Z" strokeWidth="1"></path>
                        </g>
                    </svg>
                    : 
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" id="Eye-2-Fill--Streamline-Mingcute-Fill" height="24" width="24">
                        <g fill="none" fillRule="nonzero">
                        <path d="M24 0v24H0V0h24ZM12.593 23.258l-0.011 0.002 -0.071 0.035 -0.02 0.004 -0.014 -0.004 -0.071 -0.035c-0.01 -0.004 -0.019 -0.001 -0.024 0.005l-0.004 0.01 -0.017 0.428 0.005 0.02 0.01 0.013 0.104 0.074 0.015 0.004 0.012 -0.004 0.104 -0.074 0.012 -0.016 0.004 -0.017 -0.017 -0.427c-0.002 -0.01 -0.009 -0.017 -0.017 -0.018Zm0.265 -0.113 -0.013 0.002 -0.185 0.093 -0.01 0.01 -0.003 0.011 0.018 0.43 0.005 0.012 0.008 0.007 0.201 0.093c0.012 0.004 0.023 0 0.029 -0.008l0.004 -0.014 -0.034 -0.614c-0.003 -0.012 -0.01 -0.02 -0.02 -0.022Zm-0.715 0.002a0.023 0.023 0 0 0 -0.027 0.006l-0.006 0.014 -0.034 0.614c0 0.012 0.007 0.02 0.017 0.024l0.015 -0.002 0.201 -0.093 0.01 -0.008 0.004 -0.011 0.017 -0.43 -0.003 -0.012 -0.01 -0.01 -0.184 -0.092Z" strokeWidth="1"></path>
                        <path fill="currentColor" d="M12 5c3.679 0 8.162 2.417 9.73 5.901 0.146 0.328 0.27 0.71 0.27 1.099 0 0.388 -0.123 0.771 -0.27 1.099C20.161 16.583 15.678 19 12 19c-3.679 0 -8.162 -2.417 -9.73 -5.901C2.124 12.77 2 12.389 2 12c0 -0.388 0.123 -0.771 0.27 -1.099C3.839 7.417 8.322 5 12 5Zm0 3a4 4 0 1 0 0 8 4 4 0 0 0 0 -8Zm0 2a2 2 0 1 1 0 4 2 2 0 0 1 0 -4Z" strokeWidth="1"></path>
                        </g>
                    </svg>    
                    }
                  </button>
              </div>
            </div>
          </div>
    </>
  );
}

export default PasswordChangeSection;

