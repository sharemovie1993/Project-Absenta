import { useForm } from 'react-hook-form';
import type { FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { academicSchemas } from '../lib/validations/academic';

interface UseFormValidationProps {
  schema: z.ZodSchema<any>;
  defaultValues?: any;
  mode?: 'onChange' | 'onBlur' | 'onSubmit' | 'onTouched' | 'all';
}

export function useFormValidation({
  schema,
  defaultValues,
  mode = 'onChange'
}: UseFormValidationProps) {
  const form = useForm({
    resolver: zodResolver(schema as any),
    defaultValues,
    mode
  });

  const {
    formState: { isValid, isDirty, isSubmitting, errors }
  } = form;

  return {
    register: form.register,
    handleSubmit: form.handleSubmit,
    formState: form.formState,
    reset: form.reset,
    watch: form.watch,
    setValue: form.setValue,
    getValues: form.getValues,
    isValid,
    isDirty,
    isSubmitting,
    errors
  };
}

// Specific hooks for academic entities
export const useGuruForm = (defaultValues?: any) => {
  return useFormValidation({
    schema: academicSchemas.guru.create,
    defaultValues,
    mode: 'onChange'
  });
};

export const useSiswaForm = (defaultValues?: any) => {
  return useFormValidation({
    schema: academicSchemas.siswa.create,
    defaultValues,
    mode: 'onChange'
  });
};

export const useKelasForm = (defaultValues?: any) => {
  return useFormValidation({
    schema: academicSchemas.kelas.create,
    defaultValues,
    mode: 'onChange'
  });
};

export const useMapelForm = (defaultValues?: any) => {
  return useFormValidation({
    schema: academicSchemas.mapel.create,
    defaultValues,
    mode: 'onChange'
  });
};

export const useTahunPelajaranForm = (defaultValues?: any) => {
  return useFormValidation({
    schema: academicSchemas.tahunPelajaran.create,
    defaultValues,
    mode: 'onChange'
  });
};

export const useSemesterForm = (defaultValues?: any) => {
  return useFormValidation({
    schema: academicSchemas.semester.create,
    defaultValues,
    mode: 'onChange'
  });
};