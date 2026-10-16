import { type CxOptions, cx } from 'class-variance-authority'
import { twMerge } from 'tailwind-merge'
import { currencyConfig } from '@/lib/constants'

export function cn(...inputs: CxOptions) {
  return twMerge(cx(inputs))
}

export function formatPrice(price: number): string {
  let currency = currencyConfig.code
  try {
    new Intl.NumberFormat('en-US', { style: 'currency', currency })
  } catch {
    currency = 'USD'
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    currencyDisplay: 'code',
    maximumFractionDigits: currencyConfig.scale,
    minimumFractionDigits: currencyConfig.scale
  }).format(price)
}

export const getObjectKeys = Object.keys as <T extends object>(
  obj: T
) => Array<keyof T>
