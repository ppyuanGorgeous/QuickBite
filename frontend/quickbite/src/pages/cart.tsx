import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, Check, LoaderCircle } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState } from '@/components/feedback'
import { Skeleton } from '@/components/ui/skeleton'
import { errorMessage, money } from '@/lib/presentation'
import { queryKeys, useCart, useCheckout } from '@/lib/queries'
import { useSession } from '@/lib/session'
import type { Cart } from '@/lib/types'

interface CheckoutReceipt {
  receipt: Cart
  completedAt: string
  sessionId: string
}

function CartLines({ cart, compact = false }: { cart: Cart; compact?: boolean }) {
  return (
    <ul className={compact ? 'cart-lines compact' : 'cart-lines'}>
      {cart.order_items.map((item, index) => (
        <li key={item.order_item_id ?? item.id ?? `${item.menu_item_name}-${index}`}>
          <span className="cart-item-quantity" aria-label={`Quantity ${item.quantity ?? 1}`}>
            {item.quantity ?? 1}
          </span>
          <div><h3>{item.menu_item_name}</h3></div>
          <strong>{money(item.price * (item.quantity ?? 1))}</strong>
        </li>
      ))}
    </ul>
  )
}

export function CartPage({ checkout = false }: { checkout?: boolean }) {
  const navigate = useNavigate()
  const client = useQueryClient()
  const { isAuthenticated, isSigningOut, sessionId } = useSession()
  const cart = useCart(isAuthenticated && !isSigningOut)
  const checkoutMutation = useCheckout()
  const submitting = useRef(false)
  const submittedCart = useRef<{ cart: Cart; sessionId: string } | null>(null)
  const [submitError, setSubmitError] = useState<unknown>(null)
  const data = checkoutMutation.isPending && submittedCart.current?.sessionId === sessionId
    ? submittedCart.current.cart
    : cart.data

  async function completeCheckout() {
    if (
      submitting.current || checkoutMutation.isPending || isSigningOut || cart.isFetching ||
      !sessionId || !data?.order_items.length
    ) return

    submitting.current = true
    setSubmitError(null)
    const requestSessionId = sessionId
    const receipt = structuredClone(data)
    submittedCart.current = { cart: receipt, sessionId: requestSessionId }
    const isCurrentSession = () =>
      client.getQueryData<{ sessionId: string }>(queryKeys.session)?.sessionId === requestSessionId

    try {
      await checkoutMutation.mutateAsync()
      if (!isCurrentSession()) return
      navigate('/order-confirmation', {
        replace: true,
        state: {
          receipt,
          completedAt: new Date().toISOString(),
          sessionId: requestSessionId,
        } satisfies CheckoutReceipt,
      })
    } catch (error) {
      if (isCurrentSession()) setSubmitError(error)
    } finally {
      submitting.current = false
      submittedCart.current = null
    }
  }

  if (cart.isError && !checkoutMutation.isPending) {
    return (
      <div className="page-content">
        <ErrorState error={cart.error} retry={() => { void cart.refetch() }} />
      </div>
    )
  }
  if (!data) {
    return (
      <div className="page-content" role="status" aria-label="Loading your cart">
        <Skeleton className="mb-5 h-12 w-60" />
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    )
  }
  if (!data.order_items.length) {
    return (
      <div className="page-content">
        <div className="page-intro"><h1>{checkout ? 'Checkout' : 'Your cart'}</h1></div>
        <EmptyState
          cart
          title="Your cart is empty"
          description="Browse a restaurant menu and add items to get started."
          action={
            <Button asChild size="lg">
              <Link to="/">Browse restaurants <ArrowRight size={17} /></Link>
            </Button>
          }
        />
      </div>
    )
  }

  const count = data.order_items.reduce((sum, item) => sum + (item.quantity ?? 1), 0)
  const busy = checkoutMutation.isPending || isSigningOut || cart.isFetching
  return (
    <div className="page-content cart-page">
      <Link to={checkout ? '/cart' : '/'} className="back-link">
        <ArrowLeft size={16} />{checkout ? 'Back to your cart' : 'Browse restaurants'}
      </Link>
      <div className="page-intro">
        <div>
          <h1>{checkout ? 'Checkout' : 'Your cart'}</h1>
          {checkout && <p>Review your items and total before completing checkout.</p>}
        </div>
      </div>
      <div className="checkout-layout">
        <section className="cart-panel">
          <div className="cart-panel-heading">
            <h2>{checkout ? 'Checkout details' : 'Items'}</h2>
            <span>{count} {count === 1 ? 'item' : 'items'}</span>
          </div>
          <CartLines cart={data} />
          <p className="cart-support-note">Return to the restaurant menu to add more items.</p>
        </section>
        <aside className="order-summary">
          <h2>Cart summary</h2>
          <div className="summary-total"><span>Total</span><strong>{money(data.total_price)}</strong></div>
          <p className="summary-caption">Total provided by the restaurant.</p>
          {submitError !== null && <p className="form-error" role="alert">{errorMessage(submitError)}</p>}
          {checkout ? (
            <Button
              size="lg" className="w-full" disabled={busy} aria-busy={checkoutMutation.isPending}
              onClick={() => { void completeCheckout() }}
            >
              {checkoutMutation.isPending && <LoaderCircle size={17} className="animate-spin" />}
              {checkoutMutation.isPending ? 'Completing checkout...' : 'Complete checkout'}
            </Button>
          ) : (
            <Button size="lg" className="w-full" disabled={busy} onClick={() => navigate('/checkout')}>
              Checkout <ArrowRight size={17} />
            </Button>
          )}
          {cart.isFetching && !checkoutMutation.isPending && <p role="status">Updating your cart...</p>}
          {checkout && (
            <p className="checkout-disclosure">This demo checkout clears your cart. No payment is collected.</p>
          )}
        </aside>
      </div>
    </div>
  )
}

export function ConfirmationPage() {
  const location = useLocation()
  const { sessionId } = useSession()
  const state = location.state as CheckoutReceipt | null
  if (!state?.receipt || !sessionId || state.sessionId !== sessionId) {
    return (
      <div className="page-content">
        <EmptyState
          title="Checkout confirmation unavailable"
          description="Complete checkout to view its summary."
          action={<Button asChild><Link to="/">Browse restaurants</Link></Button>}
        />
      </div>
    )
  }
  return (
    <div className="page-content confirmation-page">
      <div className="confirmation-mark"><Check size={24} /></div>
      <h1>Checkout complete</h1>
      <p>Your cart has been cleared. No payment was collected.</p>
      <section className="receipt">
        <div className="cart-panel-heading"><h2>Checkout summary</h2></div>
        <CartLines cart={state.receipt} compact />
        <div className="summary-total"><span>Total</span><strong>{money(state.receipt.total_price)}</strong></div>
        <p className="receipt-note">
          {new Date(state.completedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      </section>
      <Button asChild size="lg"><Link to="/">Browse restaurants <ArrowRight size={17} /></Link></Button>
    </div>
  )
}
