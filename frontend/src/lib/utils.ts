import { type CxOptions, cx } from 'class-variance-authority'
import { extendTailwindMerge } from 'tailwind-merge'
import { currencyConfig } from '@/lib/constants'

// Custom font sizes from tailwind.config.cjs: without this, twMerge treats
// `text-2xs`/`text-3xs` as colours and drops them next to `text-<colour>`.
const twMerge = extendTailwindMerge({
  extend: { classGroups: { 'font-size': [{ text: ['2xs', '3xs'] }] } }
})

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
