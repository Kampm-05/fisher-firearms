import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Lock, ShoppingBag, Clock } from 'lucide-react'
import { formatPrice, productImage, type Product } from '../data/catalog'
import { fadeUp } from '../lib/motion'

const BADGE = {
  ship: { icon: ShoppingBag, label: 'Ships', tone: 'text-brass-300 border-brass-600/40 bg-brass-500/10' },
  reserve: { icon: Lock, label: 'In store', tone: 'text-steel-300 border-steel-700 bg-steel-800/60' },
  enquire: { icon: Clock, label: 'Order in', tone: 'text-steel-400 border-steel-700 bg-steel-900/60' },
} as const

export default function ProductCard({ product }: { product: Product }) {
  const badge = BADGE[product.saleType]
  const Icon = badge.icon

  return (
    <motion.div variants={fadeUp}>
      <Link
        to={`/product/${product.slug}`}
        className="group flex h-full flex-col overflow-hidden rounded-sm border border-steel-800 bg-steel-900/40 transition-colors duration-300 hover:border-brass-500/50"
      >
        <div className="relative aspect-square overflow-hidden bg-steel-950">
          <div aria-hidden="true" className="absolute inset-0 bg-engrave opacity-60" />
          {product.image ? (
            <img
              src={productImage(product.image)!}
              alt=""
              loading="lazy"
              decoding="async"
              className="relative h-full w-full object-contain p-4 transition-transform duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="relative grid h-full place-items-center">
              <span className="font-mono text-[0.6rem] tracking-widest text-steel-600 uppercase">
                No image
              </span>
            </div>
          )}

          <span
            className={`absolute top-2.5 right-2.5 inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 font-mono text-[0.6rem] tracking-widest uppercase ${badge.tone}`}
          >
            <Icon className="h-3 w-3" aria-hidden="true" />
            {badge.label}
          </span>
        </div>

        <div className="flex flex-1 flex-col p-4">
          {product.brand && (
            <p className="text-eyebrow mb-1.5 truncate">{product.brand}</p>
          )}
          <h3 className="line-clamp-2 text-sm leading-snug font-500 text-steel-100 transition-colors group-hover:text-brass-200">
            {product.name}
          </h3>
          <p className="mt-auto pt-3 font-mono text-base text-brass-300">
            {formatPrice(product.price)}
          </p>
        </div>
      </Link>
    </motion.div>
  )
}
