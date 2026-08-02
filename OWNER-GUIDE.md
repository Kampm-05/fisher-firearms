# Running the Fisher Firearms website

This is everything you need to run the shop's website day to day. You don't
need to know anything technical. If something isn't in here, it probably isn't
something you need to do.

**Your shop manager:** https://kampm-05.github.io/fisher-firearms/admin

Sign in with the shop password. It remembers you on that device for a week.

---

## The four screens

Along the top you'll see **My stock**, **Add an item**, **Orders** and
**Messages**. That's the whole thing.

### My stock — the one you'll use most

Every product in the shop, with a search box at the top and department buttons
underneath. Find something, and you get three controls:

- **− and +** — how many you have. Tap as many times as you like; it saves a
  moment after you stop tapping and shows a tick.
- **Sold out** — puts a "Sold out" badge on the website and stops people
  buying it. Use this rather than deleting.
- **Hide from website** — takes it off the site completely. Nothing is lost;
  turn it back on whenever you like.

If you've never touched an item, it shows **not counted**. That's fine and it's
the normal state — it just means the website doesn't claim a number. Only start
counting the things you actually want to track.

**Prices** save when you tap out of the box, not while you're typing — so a
half-typed price never reaches the website.

### Add an item

One question per screen: photo, name, price, which department, whether it can
be posted, description. Then it shows you what the customer will see before you
publish it.

For anything in Firearms, Used or Ammunition the "post it" option is switched
off and can't be turned on. That's deliberate — see *The rule that can't be
broken* below.

### Orders

Everything customers have ordered, newest first.

- **Paid online** — the money is already in the Stripe account. Post these out.
  The delivery address is on the order.
- **To collect** — reserved, nothing charged. Put it aside. Check their licence
  and permit at handover, then take payment in the shop as usual.

### Messages

Enquiries from the contact page and gift-certificate requests. Tap the phone
number to call, or the email to reply.

---

## The rule that can't be broken

**Firearms and ammunition are never posted and never paid for online.**

Customers can reserve them, which tells you to put one aside. Payment and
handover happen in the shop once you've sighted the licence and, where it's
needed, the permit to acquire.

This isn't a setting — the website enforces it in three places at once, and it
will refuse the sale even if something is set up wrongly. It also checks every
product's own description: if the description mentions a category or says
"dealer only", the item is automatically reserve-only, even if it lives in the
Parts department.

You can't accidentally break this, and neither can anyone who gets hold of your
password.

---

## Back up your shop, once a month

Stock counts, orders and messages live on the website's system, not on your
computer.

In the shop manager, press **Download a backup**. It saves one file. Put it in
the shop's Dropbox or OneDrive, or email it to yourself. That's it.

Do it on the first of the month and you'll never lose more than a month of
counting.

---

## If something looks wrong

Work down this list. Nothing here can lose your data.

1. **Pull down to refresh the page**, or close the tab and open it again.
   This fixes most things.
2. **It says "Your session has ended"** — normal after a week. Sign in again.
3. **A change didn't stick** — the screen tells you when a save fails and
   offers a **Try again** button. If you missed it, just make the change again.
4. **The website is showing an old price or count** — changes take up to about
   thirty seconds to appear for customers. Wait a minute and check again.
5. **A customer says they paid but the order says unpaid** — wait five minutes
   and refresh; the payment system sometimes reports back late. If it still
   says unpaid after that, ask them for their Stripe receipt email and check
   the Stripe dashboard before sending anything.
6. **Two people bought the last one** — possible if they checked out within a
   second of each other. Refund one in Stripe and let them know. Rare, but it
   can happen.
7. **The whole site looks broken** — you'll get a page with the shop's phone
   number and a **Try again** button rather than a blank screen. Try that
   first, then reload.

The customer side of the website keeps working even if the shop manager is
down. It falls back to the prices and products from the last publish; only live
stock counts stop updating.

---

## Changing the password

Anyone with the password can see customers' licence numbers, so treat it like a
key to the shop. Change it if a staff member leaves.

It takes one command on the computer that manages the site:

```bash
cd fisher-firearms/worker && npx wrangler secret put ADMIN_PASSWORD
```

Signing out on a device revokes that device immediately.

---

## What the website will not do

Being straight with you about the limits:

- It **doesn't email customers** — no order confirmations from the shop, no
  gift certificates by email. Stripe emails its own receipt for card payments.
  Everything else is you picking up the phone.
- It **doesn't do accounting or GST reporting**. Prices are shown the way you
  gave them.
- It **doesn't charge postage** unless that gets switched on. Right now posted
  orders are free postage.
- Reserving **doesn't hold stock**. Two people can reserve the last one.
