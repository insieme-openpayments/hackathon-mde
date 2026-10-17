// Insieme design-system barrel (P1 implements, contracts in ./types.ts).
// DECISION: Receipt, Pasarela, StatusTracker and BankBlock live HERE
// (components/insieme/display.tsx), not in components/payment. Only the
// payment-flow components that touch API/stores (ConfirmPanel,
// OneClickSetupDialog) live in components/payment.
export type * from './types.ts'
export {
  Logo,
  ByPuntored,
  BackButton,
  StepTitle,
  Screen,
  TitleBox,
  Actions,
  DialogCard
} from './layout.tsx'
export { Tip } from './tip.tsx'
export { FloatingInput, MoneyInput, SearchInput } from './inputs.tsx'
export {
  CategoryGrid,
  CategoryCard,
  CompanyList,
  CompanyRow,
  CompanyLogo,
  SortSelect
} from './catalog.tsx'
export {
  KvRows,
  ProcessedBy,
  BankBlock,
  Receipt,
  Pasarela,
  StatusTracker,
  TRACKER_STEPS
} from './display.tsx'
