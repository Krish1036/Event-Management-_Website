/**
 * Currency utilities for Indian Rupee (INR) formatting
 * All currency displays should use these utilities for consistency
 */

/**
 * Formats a number as Indian Rupee currency
 * @param amount - Amount in numbers
 * @returns Formatted INR string (e.g., "₹1,000", "₹50", "₹12,500")
 */
export function formatINR(amount: number): string {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '₹0';
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Formats a number as Indian Rupee with decimal places
 * @param amount - Amount in numbers
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted INR string with decimals (e.g., "₹1,000.50")
 */
export function formatINRWithDecimals(amount: number, decimals: number = 2): string {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return `₹0.${'0'.repeat(decimals)}`;
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(amount);
}

/**
 * Formats a number as Indian Rupee without currency symbol (for inputs)
 * @param amount - Amount in numbers
 * @returns Formatted number string (e.g., "1,000", "50", "12,500")
 */
export function formatINRPlain(amount: number): string {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '0';
  }

  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Parses a formatted INR string back to number
 * @param formattedAmount - Formatted INR string (e.g., "₹1,000" or "1,000")
 * @returns Parsed number
 */
export function parseINR(formattedAmount: string): number {
  if (!formattedAmount) return 0;
  
  // Remove currency symbol and commas
  const cleanAmount = formattedAmount.replace(/[₹,]/g, '');
  
  const parsed = parseFloat(cleanAmount);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Converts amount to paise (for Razorpay API)
 * Razorpay expects amount in paise (multiply by 100)
 * @param amount - Amount in rupees
 * @returns Amount in paise
 */
export function toPaise(amount: number): number {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return 0;
  }
  
  return Math.round(amount * 100);
}

/**
 * Converts paise to rupees (from Razorpay response)
 * @param paise - Amount in paise
 * @returns Amount in rupees
 */
export function fromPaise(paise: number): number {
  if (typeof paise !== 'number' || isNaN(paise)) {
    return 0;
  }
  
  return paise / 100;
}
