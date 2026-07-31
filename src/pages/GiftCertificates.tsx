import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Gift } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { useCart } from '../cart/CartContext'
import { formatPrice, type Product } from '../data/catalog'
import { fadeUp, inView, stagger } from '../lib/motion'
import { business } from '../data/site'

const DENOMINATIONS = [50, 100, 250, 500]

/** Gift certificates are plain shippable stock as far as the cart is concerned. */
function certificate(amount: number): Product {
  return {
    slug: `gift-certificate-${amount}`,
    name: `Fisher Firearms Gift Certificate — $${amount}`,
    price: amount,
    brand: 'Fisher Firearms',
    code: `GC${amount}`,
    image: null,
    description: `A $${amount} gift certificate redeemable in store at ${business.street}, ${business.suburb}.`,
    availability: 'In stock',
    subLabel: 'Gift Certificates',
    category: 'gift-certificates',
    categories: ['gift-certificates'],
    saleType: 'ship',
  }
}

/** Mirrors how the shop's existing voucher works: emailed once paid. */
const STEPS = [
  'Pick an amount and add it to your order.',
  "Complete checkout with your details and the recipient's name and email.",
  'Once payment clears, the certificate is emailed to the recipient.',
  'They redeem it in store against anything we stock.',
]

export default function GiftCertificates() {
  const { add } = useCart()
  const [addedAmount, setAddedAmount] = useState<number | null>(null)

  function handleAdd(amount: number) {
    add(certificate(amount))
    setAddedAmount(amount)
    setTimeout(() => setAddedAmount(null), 2000)
  }

  return (
    <>
      <PageHeader
        eyebrow="Gift Certificates"
        title="Let them choose"
        lead="Hard to buy for a shooter? A Fisher Firearms certificate covers anything on the floor — rifle, glass, ammunition or a new safe."
      />

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <motion.div
          variants={stagger}
          {...inView}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {DENOMINATIONS.map((amount) => (
            <motion.div
              key={amount}
              variants={fadeUp}
              className="group flex flex-col rounded-sm border border-steel-800 bg-steel-900/40 p-6 transition-colors duration-300 hover:border-brass-500/50"
            >
              <Gift className="h-7 w-7 text-brass-500" aria-hidden="true" />
              <p className="mt-5 font-display text-4xl font-700 tracking-tight text-steel-100">
                {formatPrice(amount)}
              </p>
              <p className="mt-2 text-sm text-steel-400">
                Redeemable in store on anything we stock.
              </p>
              <button
                type="button"
                onClick={() => handleAdd(amount)}
                className="btn-primary mt-6 w-full justify-center"
              >
                {addedAmount === amount ? (
                  <>
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Added
                  </>
                ) : (
                  'Add to order'
                )}
              </button>
            </motion.div>
          ))}
        </motion.div>

        <motion.div variants={stagger} {...inView} className="mt-20 grid gap-12 lg:grid-cols-2">
          <motion.div variants={fadeUp}>
            <h2 className="font-display text-3xl font-700 tracking-tight uppercase">
              How it works
            </h2>
            <ol className="mt-6 space-y-4">
              {STEPS.map((step, i) => (
                <li key={step} className="flex gap-4">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-brass-600/50 font-mono text-xs text-brass-400">
                    {i + 1}
                  </span>
                  <span className="text-steel-300">{step}</span>
                </li>
              ))}
            </ol>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="rounded-sm border border-steel-800 bg-steel-900/50 p-6"
          >
            <h2 className="text-eyebrow">The fine print</h2>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-steel-400">
              <li>
                Certificates carry no expiry and can be used across more than one
                visit.
              </li>
              <li>
                They are redeemable in store only, and are not exchangeable for
                cash.
              </li>
              <li>
                A certificate does not bypass licensing — firearms and ammunition
                still require a current SA firearms licence, and a permit to
                acquire where one applies.
              </li>
              <li>
                Need a different amount? Call the shop on{' '}
                <a
                  href={business.phoneHref}
                  className="text-brass-400 transition-colors hover:text-brass-300"
                >
                  {business.phone}
                </a>{' '}
                and we'll sort it out.
              </li>
            </ul>
          </motion.div>
        </motion.div>
      </section>
    </>
  )
}
