import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Check, Lock, Phone, ShoppingBag } from 'lucide-react'
import {
  findProduct,
  formatPrice,
  isSoldOut,
  productImage,
  SALE_LABEL,
  type Product,
} from '../data/catalog'
import { useCart } from '../cart/CartContext'
import { fadeUp, inView, stagger } from '../lib/motion'
import { business, notices } from '../data/site'
import { firearmCategories, gearCategories } from '../data/site'

function categoryName(slug: string) {
  return (
    firearmCategories.find((c) => c.slug === slug)?.name ??
    gearCategories.find((c) => c.slug === slug)?.name ??
    slug
  )
}

function categoryHref(slug: string) {
  return firearmCategories.some((c) => c.slug === slug)
    ? `/firearms/${slug}`
    : `/gear/${slug}`
}

export default function ProductDetail() {
  const { slug = '' } = useParams()
  const { add } = useCart()
  const [product, setProduct] = useState<Product | null | undefined>(undefined)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    let live = true
    setProduct(undefined)
    findProduct(slug).then((p) => {
      if (live) setProduct(p)
    })
    return () => {
      live = false
    }
  }, [slug])

  useEffect(() => {
    if (!added) return
    const t = setTimeout(() => setAdded(false), 2000)
    return () => clearTimeout(t)
  }, [added])

  if (product === undefined) {
    return (
      <div className="mx-auto max-w-7xl px-5 py-32 sm:px-8">
        <p className="font-mono text-sm tracking-widest text-steel-500 uppercase">
          Loading…
        </p>
      </div>
    )
  }

  if (product === null) {
    return (
      <div className="mx-auto max-w-7xl px-5 py-32 text-center sm:px-8">
        <h1 className="font-display text-3xl font-700 uppercase">
          Product not found
        </h1>
        <p className="mt-3 text-steel-400">
          It may have sold — stock moves quickly.
        </p>
        <Link to="/firearms" className="btn-ghost mt-8">
          Back to firearms
        </Link>
      </div>
    )
  }

  const isReserve = product.saleType === 'reserve'
  const isEnquire = product.saleType === 'enquire'
  const soldOut = isSoldOut(product)
  const low = product.stock != null && product.stock > 0 && product.stock <= 5

  return (
    <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
      <Link
        to={categoryHref(product.category)}
        className="inline-flex items-center gap-2 font-mono text-xs tracking-widest text-steel-400 uppercase transition-colors hover:text-brass-300"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {categoryName(product.category)}
      </Link>

      <motion.div
        variants={stagger}
        {...inView}
        className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-16"
      >
        <motion.div
          variants={fadeUp}
          className="relative overflow-hidden rounded-sm border border-steel-800 bg-steel-950"
        >
          <div aria-hidden="true" className="absolute inset-0 bg-engrave" />
          <div className="relative aspect-square">
            {product.image ? (
              <img
                src={productImage(product.image)!}
                alt={product.name}
                className="h-full w-full object-contain p-8"
              />
            ) : (
              <div className="grid h-full place-items-center">
                <span className="font-mono text-xs tracking-widest text-steel-600 uppercase">
                  No image available
                </span>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div variants={fadeUp}>
          {product.brand && <p className="text-eyebrow">{product.brand}</p>}
          <h1 className="mt-2 font-display text-3xl leading-tight font-700 tracking-tight uppercase sm:text-4xl">
            {product.name}
          </h1>

          <p className="mt-5 font-mono text-3xl text-brass-300">
            {formatPrice(product.price)}
          </p>
          {product.price == null && (
            <p className="mt-1 text-sm text-steel-500">
              Price on application — call the shop.
            </p>
          )}

          <dl className="mt-6 space-y-2 text-sm">
            <div className="flex gap-3">
              <dt className="w-28 shrink-0 text-steel-500">Availability</dt>
              <dd className={soldOut ? 'text-steel-400' : 'text-steel-200'}>
                {soldOut ? 'Sold out' : SALE_LABEL[product.saleType]}
                {low && (
                  <span className="ml-2 font-mono text-xs tracking-widest text-amber-400/90 uppercase">
                    only {product.stock} left
                  </span>
                )}
              </dd>
            </div>
            {product.code && (
              <div className="flex gap-3">
                <dt className="w-28 shrink-0 text-steel-500">Code</dt>
                <dd className="font-mono text-steel-300">{product.code}</dd>
              </div>
            )}
            {product.subLabel && (
              <div className="flex gap-3">
                <dt className="w-28 shrink-0 text-steel-500">Department</dt>
                <dd className="text-steel-300">{product.subLabel}</dd>
              </div>
            )}
          </dl>

          <div className="mt-8 flex flex-wrap gap-3">
            {soldOut ? (
              <button type="button" disabled className="btn-primary">
                <Lock className="h-4 w-4" aria-hidden="true" />
                Sold out
              </button>
            ) : isEnquire ? (
              <a href={business.phoneHref} className="btn-primary">
                <Phone className="h-4 w-4" aria-hidden="true" />
                Call to order
              </a>
            ) : (
              <button
                type="button"
                onClick={() => {
                  add(product)
                  setAdded(true)
                }}
                className="btn-primary"
              >
                {added ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : isReserve ? (
                  <Lock className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                )}
                {added ? 'Added' : isReserve ? 'Reserve in store' : 'Add to cart'}
              </button>
            )}
            <a href={business.phoneHref} className="btn-ghost">
              {business.phone}
            </a>
          </div>

          {isReserve && (
            <p className="mt-5 rounded-sm border border-steel-800 bg-steel-900/50 p-4 text-sm leading-relaxed text-steel-400">
              {notices.reserve}
            </p>
          )}

          {product.description && (
            <div className="mt-8 border-t border-steel-800 pt-8">
              <h2 className="text-eyebrow">Description</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-steel-300">
                {product.description}
              </p>
            </div>
          )}

          <p className="mt-8 text-xs leading-relaxed text-steel-600">
            {notices.pricing} {notices.licence}
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}
