import { motion } from 'framer-motion'

export function Loader() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-y-4">
      <motion.div
        role="status"
        aria-label="Procesando"
        className="h-[22px] w-[22px] rounded-full border-2 border-brand-soft-active border-t-brand"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, ease: 'linear', duration: 0.8 }}
      />
      <h2 className="text-sm text-neutral-darker">Procesando...</h2>
    </div>
  )
}
