import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
 import { Link, useLocation, useNavigate } from 'react-router-dom'
 import { Button } from '@/components/ui/button'
 import { EmptyState } from '@/components/feedback'
 import { money } from '@/lib/presentation'
 import { sampleCart } from '@/lib/sample-data'
 import type { Cart } from '@/lib/types'

 function CartLines({ cart, compact = false }: { cart: Cart; compact?: boolean }) {
   return (
 	<ul className={compact ? 'cart-lines compact' : 'cart-lines'}>
   	{cart.order_items.map((item, index) => (
     	<li key={item.id ?? (item.menu_item_name + '-' + index)}>
       	<span className="cart-item-quantity" aria-label={`Quantity ${item.quantity ?? 1}`}>
         	{item.quantity ?? 1}
       	</span>
       	<div>
             <h3>{item.menu_item_name}</h3>
       	</div>
           <strong>{money(item.price)}</strong>
     	</li>
   	))}
 	</ul>
   )
 }
 export function CartPage({ checkout = false }: { checkout?: boolean }) {
   const navigate = useNavigate()
   const data = sampleCart
   function placeOrder() {
 	// Lesson 22 sends POST /cart/checkout before showing the confirmation.
 	navigate('/order-confirmation', {
   	replace: true,
   	state: { receipt: data, placedAt: new Date().toISOString() },
 	})
   }
   if (!data.order_items.length)
 	return (
   	<div className="page-content">
     	<div className="page-intro">
       	<div>
         	<h1>{checkout ? 'Checkout' : 'Your cart'}</h1>
       	</div>
     	</div>
     	<EmptyState
       	cart
       	title="Your cart is empty"
       	description="Browse a restaurant menu and add items to get started."
       	action={
         	<Button asChild size="lg">
           	<Link to="/">
             	Browse restaurants <ArrowRight size={17} />
           	</Link>
         	</Button>
       	}
     	/>
   	</div>
 	)
   const count = data.order_items.reduce((sum, item) => sum + (item.quantity ?? 1), 0)
   return (
 	<div className="page-content cart-page">
   	<Link to={checkout ? '/cart' : '/'} className="back-link">
     	<ArrowLeft size={16} />
     	{checkout ? 'Back to your cart' : 'Browse restaurants'}
   	</Link>
   	<div className="page-intro">
     	<div>
       	<h1>{checkout ? 'Checkout' : 'Your cart'}</h1>
       	{checkout && <p>Review your items before placing the order.</p>}
     	</div>
   	</div>
   	<div className="checkout-layout">
     	<section className="cart-panel">
       	<div className="cart-panel-heading">
         	<h2>{checkout ? 'Order details' : 'Items'}</h2>
         	<span>
           	{count} {count === 1 ? 'item' : 'items'}
         	</span>
       	</div>
       	<CartLines cart={data} />
       	<p className="cart-support-note">
         	To change an item already in your cart, contact the restaurant.
       	</p>
     	</section>
     	<aside className="order-summary">
       	<h2>Order summary</h2>
       	<div className="summary-total">
             <span>Total</span>
             <strong>{money(data.total_price)}</strong>
       	</div>
       	<p className="summary-caption">Total provided by the restaurant.</p>
       	{checkout ? (
         	<Button size="lg" className="w-full" onClick={placeOrder}>
           	Place order
         	</Button>
       	) : (
         	<Button asChild size="lg" className="w-full">
           	<Link to="/checkout">
             	Checkout <ArrowRight size={17} />
           	</Link>
         	</Button>
       	)}
       	{checkout && (
         	<p className="checkout-disclosure">
           	QuickBite submits your order. No payment details are collected here.
         	</p>
       	)}
     	</aside>
   	</div>
 	</div>
   )
 }
 export function ConfirmationPage() {
   const location = useLocation()
   const state = location.state as { receipt?: Cart; placedAt?: string } | null
   if (!state?.receipt)
 	return (
   	<div className="page-content">
     	<EmptyState
       	title="Order confirmation unavailable"
       	description="Place an order to view its confirmation."
       	action={
         	<Button asChild>
           	<Link to="/">Browse restaurants</Link>
         	</Button>
       	}
     	/>
   	</div>
 	)
   return (
 	<div className="page-content confirmation-page">
   	<div className="confirmation-mark">
     	<Check size={24} />
   	</div>
   	<h1>Order confirmed!</h1>
   	<p>Your order has been submitted.</p>
   	<section className="receipt">
     	<div className="cart-panel-heading">
       	<h2>Order details</h2>
     	</div>
     	<CartLines cart={state.receipt} compact />
     	<div className="summary-total">
       	<span>Order total</span>
           <strong>{money(state.receipt.total_price)}</strong>
     	</div>
     	<p className="receipt-note">
       	{state.placedAt &&
         	new Date(state.placedAt).toLocaleString(undefined, {
           	dateStyle: 'medium',
           	timeStyle: 'short',
         	})}
     	</p>
   	</section>
   	<Button asChild size="lg">
     	<Link to="/">
       	Browse restaurants <ArrowRight size={17} />
     	</Link>
   	</Button>
 	</div>
   )
 }
