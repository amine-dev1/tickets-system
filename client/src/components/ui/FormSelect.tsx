import { useState, useEffect } from 'react';
import { Dropdown } from './Dropdown';

interface FormSelectOption {
  value: string;
  label: string;
}

interface FormSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: FormSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  name?: string;
}

export function FormSelect({
  id,
  value,
  onChange,
  options,
  placeholder = 'Select an option...',
  disabled = false,
  name,
}: FormSelectProps) {
  return (
    <Dropdown
      id={id}
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      disabled={disabled}
      className="cursor-pointer"
    />
  );
}
