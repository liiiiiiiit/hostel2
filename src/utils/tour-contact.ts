/** Accept local keyboard digits as well as international phone notation. */
export function isTourPhone(value: string): boolean {
  const digits = value.replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x0660));
  return /^\+?[\d\s().-]+$/.test(digits) && /^\d{6,15}$/.test(digits.replace(/\D/g, ''));
}
