import { simulateBill, simulateInvoiceDetails } from '@/bill/simulate'

describe('simulateBill', (): void => {
  it('is deterministic for the same (slug, ref1)', (): void => {
    expect(simulateBill('vanti', '123456')).toBe(
      simulateBill('vanti', '123456')
    )
  })

  it('matches the prototype formula', (): void => {
    // Reference value computed with billFor() from customer-frontend
    const s = 'vanti' + '123456'
    let h = 7
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100003
    expect(simulateBill('vanti', '123456')).toBe(18000 + (h % 260) * 900)
  })

  it('stays within 18.000 - 251.100 in steps of 900', (): void => {
    for (let i = 100000; i < 100200; i++) {
      const amount = simulateBill('enel', String(i)) as number
      expect(amount).toBeGreaterThanOrEqual(18000)
      expect(amount).toBeLessThanOrEqual(251100)
      expect((amount - 18000) % 900).toBe(0)
    }
  })

  it('returns null for references made only of zeros', (): void => {
    expect(simulateBill('vanti', '000000')).toBeNull()
    expect(simulateBill('vanti', '00000000000')).toBeNull()
  })

  it('lets a fixed amount win over the hash', (): void => {
    expect(simulateBill('gas-natural-cundi', '123456', 10000)).toBe(10000)
  })
})

describe('simulateInvoiceDetails', (): void => {
  it('is stable for the same inputs', (): void => {
    expect(simulateInvoiceDetails('vanti', '123456')).toEqual(
      simulateInvoiceDetails('vanti', '123456')
    )
  })

  it('returns a holder, a concept and an ISO due date in November 2026', (): void => {
    const d = simulateInvoiceDetails('afinia', '987654321')
    expect(d.holder.length).toBeGreaterThan(5)
    expect(d.concept.length).toBeGreaterThan(5)
    expect(d.dueDate).toMatch(/^2026-1[12]-\d{2}$/)
    const day = new Date(d.dueDate + 'T00:00:00Z').getTime()
    const base = Date.UTC(2026, 10, 1)
    expect(day).toBeGreaterThanOrEqual(base)
    expect(day).toBeLessThan(base + 30 * 24 * 60 * 60 * 1000)
  })

  it('varies with the reference', (): void => {
    const seen = new Set<string>()
    for (let i = 100000; i < 100040; i++) {
      seen.add(simulateInvoiceDetails('vanti', String(i)).holder)
    }
    expect(seen.size).toBeGreaterThan(3)
  })
})
