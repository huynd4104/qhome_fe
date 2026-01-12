"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from 'next-intl';
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/contexts/AuthContext";
import PasswordChangeSection from "@/src/components/account/PasswordChangeSection";
import {
  fetchUserAccount,
  fetchUserProfile,
  updateUserPassword,
  updateUserProfile,
  UpdateUserPasswordPayload,
  UpdateUserProfilePayload,
  UserAccountInfo,
  UserProfileInfo,
} from "@/src/services/iam/userService";

type FormState = {
  username: string;
  email: string;
  active: boolean;
  newPassword: string;
  confirmPassword: string;
};

const initialFormState: FormState = {
  username: "",
  email: "",
  active: true,
  newPassword: "",
  confirmPassword: "",
};

export default function ProfileEditPage() {
  const router = useRouter();
  const { user, setUser, isLoading } = useAuth();
  const t = useTranslations('ProfileEdit');
  const [form, setForm] = useState<FormState>(initialFormState);
  const [profile, setProfile] = useState<UserProfileInfo | null>(null);
  const [account, setAccount] = useState<UserAccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const handlePasswordFieldChange =
    (field: "newPassword" | "confirmPassword") => (value: string) => {
      setForm((prev) => ({
        ...prev,
        [field]: value,
      }));
    };

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      if (!user?.userId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [profileRes, accountRes] = await Promise.all([
          fetchUserProfile(user.userId),
          fetchUserAccount(user.userId),
        ]);

        if (!active) return;

        setProfile(profileRes);
        setAccount(accountRes);

        setForm({
          username: accountRes?.username || profileRes.username || "",
          email: accountRes?.email || profileRes.email || "",
          active: accountRes?.active ?? true,
          newPassword: "",
          confirmPassword: "",
        });
      } catch (err: any) {
        console.error("Failed to load profile for editing", err);
        if (!active) return;
        const message =
          err?.response?.data?.message ||
          err?.message ||
          t('messages.loadError');
        setError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [user?.userId]);

  const handleChange =
    (field: keyof FormState) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value =
        field === "active" ? event.target.checked : event.target.value;
      setForm((prev) => ({
        ...prev,
        [field]: value,
      }));
    };

  const validatePassword = (password: string): string | null => {
    if (!password) {
      return null;
    }

    if (password.length < 8) {
      return t('validation.password.minLength');
    }

    // Chỉ cho phép chữ cái Latinh không dấu (a-z, A-Z), số (0-9), và ký tự đặc biệt (@ $ ! % * ? &)
    const allowedCharsPattern = /^[A-Za-z\d@$!%*?&]+$/;
    if (!allowedCharsPattern.test(password)) {
      return t('validation.password.invalidCharacters');
    }

    if (!/[a-zA-Z]/.test(password)) {
      return t('validation.password.missingLetter');
    }

    if (!/\d/.test(password)) {
      return t('validation.password.missingDigit');
    }

    if (!/[@$!%*?&]/.test(password)) {
      return t('validation.password.missingSpecialChar');
    }

    return null;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user?.userId) {
      setError(t('validation.userNotIdentified'));
      return;
    }

    if (form.newPassword) {
      const passwordError = validatePassword(form.newPassword);
      if (passwordError) {
        setError(passwordError);
        return;
      }

      if (form.newPassword !== form.confirmPassword) {
        setError(t('validation.password.mismatch'));
        return;
      }
    }

    const trimmedUsername = form.username.trim();
    const trimmedEmail = form.email.trim();

    const profilePayload: UpdateUserProfilePayload = {
      username: trimmedUsername || undefined,
      email: trimmedEmail || undefined,
      active: form.active,
    };

    const accountUsername = account?.username ?? "";
    const accountEmail = account?.email ?? "";
    const accountActive = account?.active ?? true;

    const hasProfileChanges =
      account === null ||
      (profilePayload.username !== undefined && profilePayload.username !== accountUsername) ||
      (profilePayload.email !== undefined && profilePayload.email !== accountEmail) ||
      profilePayload.active !== accountActive;

    const passwordPayload: UpdateUserPasswordPayload | undefined = form.newPassword
      ? { newPassword: form.newPassword }
      : undefined;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      let updatedAccount: UserAccountInfo | null = null;
      if (hasProfileChanges) {
        updatedAccount = await updateUserProfile(user.userId, profilePayload);
        setAccount(updatedAccount);
        setUser({
          ...(user ?? {
            userId: updatedAccount.userId,
            roles: [],
            permissions: [],
            tenantId: "",
            username: "",
            email: "",
          }),
          userId: updatedAccount.userId,
          username: updatedAccount.username,
          email: updatedAccount.email,
        });
      }

      if (passwordPayload) {
        await updateUserPassword(user.userId, passwordPayload);
      }

      if (!passwordPayload && !updatedAccount) {
        setSuccess(t('messages.noChanges'));
      } else if (passwordPayload && updatedAccount) {
        setSuccess(t('messages.updateProfileAndPasswordSuccess'));
      } else if (passwordPayload) {
        setSuccess(t('messages.changePasswordSuccess'));
      } else {
        setSuccess(t('messages.updateProfileSuccess'));
      }

      setForm((prev) => ({
        ...prev,
        username: updatedAccount ? updatedAccount.username : prev.username,
        email: updatedAccount ? updatedAccount.email : prev.email,
        active: updatedAccount ? updatedAccount.active : prev.active,
        newPassword: "",
        confirmPassword: "",
      }));
    } catch (err: any) {
      console.error("Failed to update profile", err);
      const message =
        err?.response?.data?.message ||
        err?.message ||
        t('messages.updateError');
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sm text-slate-600">
          {t('loading')}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white shadow rounded-xl p-6 text-center space-y-3">
          <h1 className="text-lg font-semibold text-slate-800">
            {t('loginPrompt.title')}
          </h1>
          <p className="text-sm text-slate-500">
            {t('loginPrompt.message')}
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition"
          >
            {t('loginPrompt.button')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-emerald-600 uppercase tracking-wide">
              {t('title')}
            </p>
            <h1 className="text-2xl font-bold text-slate-800">
              {profile?.username || user.username || t('common.editProfile')}
            </h1>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-6"
        >
          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            {user?.roles?.find(role => role === "Resident") && (
            <div>
                <div className="sm:col-span-2">
                <label className="text-sm font-medium text-slate-700">
                    {t('fields.username')}
                </label>
                <input
                    type="text"
                    value={form.username}
                    onChange={handleChange("username")}
                    required
                    minLength={3}
                    maxLength={50}
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    placeholder={t('placeholders.username')}
                />
                </div>

                <div className="sm:col-span-2">
                <label className="text-sm font-medium text-slate-700">
                    {t('fields.email')}
                </label>
                <input
                    type="email"
                    value={form.email}
                    onChange={handleChange("email")}
                    required
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    placeholder={t('placeholders.email')}
                />
                </div>
            </div>
            )}
          </div>

          <PasswordChangeSection
            newPassword={form.newPassword}
            confirmPassword={form.confirmPassword}
            onChangeNewPassword={handlePasswordFieldChange("newPassword")}
            onChangeConfirmPassword={handlePasswordFieldChange("confirmPassword")}
          />

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Link
              href="/profileView"
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition"
            >
              {t('buttons.cancel')}
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? t('buttons.saving') : t('buttons.save')}
            </button>
          </div>
        </form>
      </div>
      </div>
    </>
  );
}

