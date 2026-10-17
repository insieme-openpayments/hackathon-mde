import ReactDOM from 'react-dom/client'
import { App } from './app/index.tsx'
import './main.css'
import { API_BASE_URL, CURRENCY, setCurrencyConfig } from '@/lib/constants'

// Prices are charged in the asset of the shop wallet; ask the backend which
// one before rendering so the UI never shows a different currency.
async function loadShopCurrency() {
  try {
    const response = await fetch(API_BASE_URL + '/config')
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const { result } = await response.json()
    if (result?.assetCode) {
      setCurrencyConfig(result.assetCode, result.assetScale ?? 2)
    }
  } catch (err) {
    console.warn(
      `Insieme: could not load shop currency (${err}), falling back to ${CURRENCY}`
    )
  }
}

loadShopCurrency().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
})
