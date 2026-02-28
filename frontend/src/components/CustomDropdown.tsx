import {useState, useRef, useEffect} from 'react';
import {ChevronDown} from 'lucide-react';

interface DropdownOption {
  value: string;
  label: string;
}

interface CustomDropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function CustomDropdown({
  value,
  options,
  onChange,
  label,
  placeholder = 'Select...',
  disabled = false,
  className = '',
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({top: 0, left: 0, width: 0});

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 180),
      });
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayText = selectedOption ? selectedOption.label : placeholder;

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type='button'
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          inline-flex items-center justify-between gap-2 px-2.5
          rounded-sm border text-sm min-w-[120px] w-full ${className}
          ${label ? 'py-1' : 'py-1.5'}
          ${disabled ? 'opacity-50 cursor-not-allowed border-transparent bg-muted' : 'border-transparent hover:border-border hover:bg-muted text-muted-foreground'}
          ${value ? 'text-foreground' : ''}
        `}>
        <span className='truncate flex flex-col items-start'>
          {label && (
            <span className='text-[10px] font-medium text-muted-foreground uppercase tracking-wide leading-none mb-0.5'>
              {label}
            </span>
          )}
          <span className={value ? 'text-foreground' : 'text-muted-foreground'}>
            {displayText}
          </span>
        </span>
        <ChevronDown
          size={14}
          className={`flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && !disabled && (
        <div
          ref={dropdownRef}
          className='fixed bg-popover border border-border rounded-sm shadow-md z-[9999] max-h-60 overflow-y-auto'
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
          }}>
          {options.length === 0 ? (
            <div className='px-3 py-2 text-sm text-muted-foreground'>
              No options available
            </div>
          ) : (
            options.map((option) => (
              <button
                key={option.value}
                type='button'
                onClick={() => handleSelect(option.value)}
                className={`
                  w-full text-left px-3 py-1.5 text-sm !rounded-none hover:bg-muted transition-colors
                  ${value === option.value ? 'bg-muted font-medium' : ''}
                `}>
                {option.label}
              </button>
            ))
          )}
        </div>
      )}
    </>
  );
}
