/**
 * Every value here is taken from the existing fisherfirearms.com.au site.
 * Nothing is invented — if the old site didn't state it, it isn't here.
 */

export const business = {
  name: 'Fisher Firearms',
  tagline: 'The largest gun shop in Adelaide.',
  phone: '(08) 8362 8977',
  phoneHref: 'tel:+61883628977',
  street: '20 Magill Road',
  suburb: 'Norwood',
  state: 'SA',
  mapUrl:
    'https://www.openstreetmap.org/search?query=20%20Magill%20Road%20Norwood%20SA',
  directionsUrl:
    'https://www.google.com/maps/dir/?api=1&destination=20+Magill+Road+Norwood+SA',
  facebook: 'https://www.facebook.com/fisherfirearms',
  legacyUrl: 'https://www.fisherfirearms.com.au/',
} as const

export type HoursRow = {
  days: string
  /** Null on both open and close means closed that day. */
  open: string | null
  close: string | null
  /** Marks the one late-trading night. */
  late?: boolean
}

export const hours: HoursRow[] = [
  { days: 'Monday – Wednesday', open: '9:00am', close: '5:30pm' },
  { days: 'Thursday', open: '9:00am', close: '8:00pm', late: true },
  { days: 'Friday', open: '9:00am', close: '5:30pm' },
  { days: 'Saturday', open: '9:00am', close: '12:00pm' },
  { days: 'Sunday & Public Holidays', open: null, close: null },
]

export type FirearmCategory = {
  slug: string
  name: string
  blurb: string
  brands: string[]
}

export const firearmCategories: FirearmCategory[] = [
  {
    slug: 'centrefire',
    name: 'Centrefire Rifles',
    blurb:
      'Hunting and target centrefire rifles across the full calibre range, from walk-and-stalk lightweights to heavy-barrel target rigs.',
    brands: [
      'CZ',
      'Tikka T3',
      'Browning',
      'Howa',
      'Remington',
      'Ruger',
      'Sako',
      'Weatherby',
      'Winchester',
      'Marlin',
      'SCSA',
    ],
  },
  {
    slug: 'rimfire',
    name: 'Rimfire Rifles',
    blurb:
      '.22LR, .22WMR and .17HMR rifles for rabbits, foxes, club target shooting and teaching new shooters the fundamentals.',
    brands: [
      'Anschutz',
      'Browning',
      'CZ',
      'Marlin',
      'Remington',
      'Savage Arms',
      'Taurus',
      'Weihrauch',
      'Ruger',
    ],
  },
  {
    slug: 'shotguns',
    name: 'Shotguns',
    blurb:
      'Over-and-unders, side-by-sides, pumps and semi-autos for clay target, field, waterfowl and general farm work.',
    brands: [
      'Adler',
      'Akkar',
      'ATA Arms',
      'Browning',
      'CZ',
      'Lanber',
      'Miroku',
      'Beretta',
    ],
  },
  {
    slug: 'air-rifles',
    name: 'Air Rifles',
    blurb:
      'Spring, gas-ram and PCP air rifles in .177 and .22 — backyard pest control, small game and low-cost practice.',
    brands: ['Crosman', 'Diana', 'Gamo', 'Weihrauch'],
  },
  {
    slug: 'handguns',
    name: 'Handguns',
    blurb:
      'Pistols and revolvers for licensed club target shooters, including service match, ISSF and metallic silhouette disciplines.',
    brands: ['Beretta', 'Canik', 'CZ', 'Ruger', 'Walther'],
  },
  {
    slug: 'used',
    name: 'Used Firearms',
    blurb:
      'A constantly changing second-hand rack — centrefire, rimfire, shotguns, air rifles, handguns, military and service rifles, plus restricted Category C & D.',
    brands: [
      'Military & Service',
      'Centrefire',
      'Rimfire',
      'Shotgun',
      'Air Rifle',
      'Handgun',
      'Category C & D',
    ],
  },
]

export type GearCategory = {
  slug: string
  name: string
  icon: string
  blurb: string
  items: string[]
}

export const gearCategories: GearCategory[] = [
  {
    slug: 'ammunition',
    name: 'Ammunition',
    icon: 'ammo',
    blurb:
      'Factory ammunition in centrefire, rimfire, shotgun, air rifle and handgun calibres.',
    items: ['Centrefire', 'Rimfire', 'Shotgun', 'Air Rifle', 'Handgun'],
  },
  {
    slug: 'optics',
    name: 'Optics',
    icon: 'scope',
    blurb:
      'Glass for every distance, fitted and bore-sighted in store on request.',
    items: [
      'Thermal Scopes',
      'Rifle Scopes',
      'Red Dots & Lasers',
      'Spotting Scopes',
      'Binoculars',
      'Rangefinders',
      'Rings & Mounts',
    ],
  },
  {
    slug: 'reloading',
    name: 'Reloading',
    icon: 'reload',
    blurb:
      'Presses, dies, brass, projectiles, powder and everything needed to roll your own.',
    items: ['Presses', 'Dies', 'Brass & Projectiles', 'Powder & Primers', 'Tools & Scales'],
  },
  {
    slug: 'storage',
    name: 'Storage & Safes',
    icon: 'safe',
    blurb:
      'Safes and cabinets to meet South Australian firearm storage requirements.',
    items: ['Gun Safes', 'Ammunition Safes', 'Cabinets', 'Trigger Locks'],
  },
  {
    slug: 'hunting',
    name: 'Hunting',
    icon: 'hunt',
    blurb: 'Field gear for the walk in and the carry out.',
    items: ['Game Calls', 'Knives', 'Packs & Slings', 'Clothing', 'Shooting Rests'],
  },
  {
    slug: 'gun-care',
    name: 'Gun Care',
    icon: 'care',
    blurb: 'Keep it clean, keep it shooting.',
    items: ['Cleaning Kits', 'Solvents & Oils', 'Rods & Brushes', 'Bore Snakes'],
  },
  {
    slug: 'targets',
    name: 'Targets',
    icon: 'target',
    blurb: 'Paper, steel and reactive targets for range and paddock.',
    items: ['Paper Targets', 'Steel Plates', 'Reactive Targets', 'Clay Throwers'],
  },
  {
    slug: 'lighting',
    name: 'Lighting',
    icon: 'light',
    blurb: 'Spotlights, torches and scope-mounted lamps for after dark.',
    items: ['Spotlights', 'Head Torches', 'Gun Lights', 'Filters'],
  },
  {
    slug: 'parts',
    name: 'Parts & Accessories',
    icon: 'parts',
    blurb: 'Magazines, stocks, triggers, slings and the small stuff.',
    items: ['Magazines', 'Stocks & Chassis', 'Triggers', 'Slings & Bipods', 'Muzzle Devices'],
  },
]

/** Marquee list — the headline brands named on the original site. */
export const brands: string[] = [
  'CZ',
  'Tikka T3',
  'Browning',
  'Howa',
  'Remington',
  'Ruger',
  'Sako',
  'Weatherby',
  'Winchester',
  'Marlin',
  'Anschutz',
  'Beretta',
  'Akkar',
  'ATA Arms',
  'Crosman',
  'Diana',
  'Gamo',
  'Weihrauch',
  'Canik',
  'Walther',
  'Savage Arms',
  'Miroku',
  'Adler',
  'Lanber',
  'Taurus',
]

/** Verbatim caveats carried across from the original site. */
export const notices = {
  ammunition:
    'Ammunition is listed for reference only and cannot be shipped. It must be purchased in store by a licence holder.',
  pricing: 'Prices shown on our website are subject to change without notice.',
  licence:
    'Firearms, ammunition and regulated accessories are supplied only to holders of a current South Australian firearms licence, in accordance with the Firearms Act 2015 (SA). These items can be reserved online but are never posted — they are handed over in store, or transferred to your nearest dealer, once your licence and permit to acquire have been sighted.',
  reserve:
    'Reserving online holds the item and sends your details to the shop. Nothing is charged until staff have confirmed your licence, the permit to acquire where one is required, and the final price.',
} as const

/**
 * The existing site publishes no email address — only the phone number and a
 * contact form. So this is deliberately empty until the shop confirms one;
 * set VITE_CONTACT_EMAIL to switch on the mailto fallbacks. Until then forms
 * post to Formspree and every fallback points at the phone instead.
 */
export const contactEmail: string = import.meta.env.VITE_CONTACT_EMAIL ?? ''
