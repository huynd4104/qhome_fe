import Select from '@/src/components/customer-interaction/Select';

export type BooleanOption = {
  label: string;
  value: boolean;
};

export type BaseFormProps = {
  serviceId: string;
  editId?: string;
  onSuccess: () => void;
  onCancel: () => void;
  t: (key: string) => string;
  show: (message: string, tone?: 'success' | 'error' | 'info') => void;
};

type ActiveStatusSelectProps = {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  options: BooleanOption[];
  placeholder?: string;
};

export function ActiveStatusSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
}: ActiveStatusSelectProps) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      <span className="font-medium text-[#02542D]">{label}</span>
      <Select<BooleanOption>
        options={options}
        value={String(value)}
        onSelect={(option) => onChange(option.value)}
        renderItem={(option) => option.label}
        getValue={(option) => String(option.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

type RequiredSelectProps = {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  options: BooleanOption[];
  placeholder?: string;
};

export function RequiredSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
}: RequiredSelectProps) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      <span className="font-medium text-[#02542D]">{label}</span>
      <Select<BooleanOption>
        options={options}
        value={String(value)}
        onSelect={(option) => onChange(option.value)}
        renderItem={(option) => option.label}
        getValue={(option) => String(option.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

type FormActionsProps = {
  submitting: boolean;
  onCancel: () => void;
  cancelLabel: string;
  submitLabel: string;
};

export function FormActions({
  submitting,
  onCancel,
  cancelLabel,
  submitLabel,
}: FormActionsProps) {
  return (
    <div className="flex justify-center mt-8 space-x-4">
      <button
        type="button"
        className="px-6 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 transition"
        onClick={onCancel}
        disabled={submitting}
      >
        {cancelLabel}
      </button>
      <button
        type="submit"
        className={`px-6 py-2 rounded-lg bg-[#02542D] text-white transition ${
          submitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-opacity-80'
        }`}
        disabled={submitting}
      >
        {submitLabel}
      </button>
    </div>
  );
}



