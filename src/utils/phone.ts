/**
 * Normalizes common Ghanaian phone-number formats to E.164.
 * This is input validation only; it does not verify ownership of a number.
 */
export function normalizeGhanaPhone(input: string): string {
  const trimmed = input.trim();
  if (!trimmed || !/^[+()\d\s-]+$/.test(trimmed)) {
    throw new Error('Enter a valid Ghanaian phone number, such as +233 24 123 4567.');
  }
  let digits = trimmed.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  let nationalNumber: string;

  if (digits.startsWith('233')) {
    nationalNumber = digits.slice(3);
  } else if (digits.startsWith('0')) {
    nationalNumber = digits.slice(1);
  } else {
    nationalNumber = digits;
  }

  // Ghana's national numbering plan assigns mobile services to the 02x and 05x ranges.
  // This validates number shape only; it cannot prove that the number is assigned or owned by the user.
  if (!/^(?:2[0-9]|5[0-9])\d{7}$/.test(nationalNumber)) {
    throw new Error('Enter a valid Ghanaian mobile number, such as +233 24 123 4567.');
  }

  return `+233${nationalNumber}`;
}
