import { forwardRef, useState, useEffect } from 'react';
import { Dropdown } from './Dropdown';
import { cn } from '../../lib/utils';

interface FormSelectOption {
  value: string;
  label: string;
}

interface FormSelectProps extends React.InputHTMLAttributes<HTMLInputElement> {
  options: FormSelectOption[];
  placeholder?: string;
}

export const FormSelect = forwardRef<HTMLInputElement, FormSelectProps>(
  ({ id, options, placeholder = 'Select an option...', value = '', onChange, className, ...props }, ref) => {
    const [internalValue, setInternalValue] = useState(value as string);

    useEffect(() => {
      setInternalValue(value as string);
    }, [value]);

    const handleChange = (newValue: string) => {
      setInternalValue(newValue);
      if (onChange) {
        onChange({
          target: { value: newValue, name: props.name },
        } as any);
      }
    };

    return (
      <>
        <input
          ref={ref}
          id={id}
          type="hidden"
          value={internalValue}
          onChange={onChange}
          className={className}
          {...props}
        />
        <Dropdown
          id={`${id}-dropdown`}
          value={internalValue}
          onChange={handleChange}
          options={options}
          placeholder={placeholder}
          disabled={props.disabled}
          className={cn('cursor-pointer')}
        />
      </>
    );
  }
);

FormSelect.displayName = 'FormSelect';
