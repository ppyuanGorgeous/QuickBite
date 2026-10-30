import { Link, Route, Routes } from 'react-router-dom'
 import { Layout } from '@/components/layout'
 import { EmptyState } from '@/components/feedback'
 import { Button } from '@/components/ui/button'
 import { DiscoverPage } from '@/pages/discover'
 import { RestaurantPage } from '@/pages/restaurant'
 import { AuthPage } from '@/pages/auth'
 import { CartPage, ConfirmationPage } from '@/pages/cart'

 export default function App() {
   return (
 	<Routes>
   	<Route element={<Layout />}>
     	<Route index element={<DiscoverPage />} />
     	<Route path="saved" element={<DiscoverPage savedOnly />} />
     	<Route path="restaurants/:id" element={<RestaurantPage />} />
     	<Route path="login" element={<AuthPage key="login" />} />
     	<Route path="signup" element={<AuthPage signup key="signup" />} />
     	<Route path="cart" element={<CartPage key="cart" />} />
     	<Route path="checkout" element={<CartPage checkout key="checkout" />} />
     	<Route path="order-confirmation" element={<ConfirmationPage />} />
     	<Route
       	path="*"
       	element={
         	<div className="page-content">
           	<EmptyState
             	title="This page went out for a bite"
             	description="Let’s get you back to something delicious."
             	action={
               	<Button asChild>
                 	<Link to="/">Back to discovering</Link>
               	</Button>
             	}
           	/>
         	</div>
       	}
     	/>
   	</Route>
 	</Routes>
   )
 }
