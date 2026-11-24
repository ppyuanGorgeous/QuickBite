import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { api } from './api'
import { queryKeys, useCart, useCheckout } from './queries'
import { SessionProvider, useSession } from './session'
import type { Cart } from './types'

vi.mock('./api', async (importOriginal) => {
  const original = await importOriginal<typeof import('./api')>()
  return {
    ...original,
    api: { ...original.api, getCart: vi.fn(), checkout: vi.fn() },
  }
})

const initialCart: Cart = {
  total_price: 25,
  order_items: [{ menu_item_name: 'Sesame noodles', price: 12.5, quantity: 2 }],
}
const emptyCart: Cart = { total_price: 0, order_items: [] }
const clients: QueryClient[] = []

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  const promise = new Promise<T>((accept) => { resolve = accept })
  return { promise, resolve }
}

function CheckoutHarness() {
  const session = useSession()
  const cart = useCart(session.isAuthenticated && !session.isSigningOut)
  const checkout = useCheckout()
  return (
    <>
      <p data-testid="authenticated">{String(session.isAuthenticated)}</p>
      <p data-testid="cart-total">{cart.data?.total_price ?? 'loading'}</p>
      <p data-testid="checkout-state">{checkout.status}</p>
      <button
        disabled={!session.isAuthenticated || checkout.isPending}
        onClick={() => checkout.mutate()}
      >Complete checkout</button>
    </>
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  sessionStorage.clear()
  localStorage.clear()
})

afterEach(() => {
  cleanup()
  clients.splice(0).forEach((client) => client.clear())
  sessionStorage.clear()
  localStorage.clear()
})

it('does not restore an old cart when a background session probe finishes after checkout', async () => {
  const oldSessionProbe = deferred<Cart>()
  vi.mocked(api.getCart)
    .mockResolvedValueOnce(initialCart)
    .mockReturnValueOnce(oldSessionProbe.promise)
    .mockResolvedValue(emptyCart)
  vi.mocked(api.checkout).mockResolvedValue(undefined)
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  })
  clients.push(client)
  render(
    <QueryClientProvider client={client}>
      <SessionProvider><CheckoutHarness /></SessionProvider>
    </QueryClientProvider>,
  )

  await waitFor(() => expect(screen.getByTestId('authenticated').textContent).toBe('true'))
  expect(screen.getByTestId('cart-total').textContent).toBe('25')

  // A background auth revalidation reads /cart independently of the cart query.
  let revalidation!: Promise<void>
  act(() => {
    revalidation = client.invalidateQueries({ queryKey: queryKeys.session })
  })
  await waitFor(() => expect(api.getCart).toHaveBeenCalledTimes(2))

  fireEvent.click(screen.getByRole('button', { name: 'Complete checkout' }))
  await waitFor(() => expect(screen.getByTestId('checkout-state').textContent).toBe('success'))
  expect(client.getQueryData<Cart>(queryKeys.cart)).toEqual(emptyCart)
  expect(screen.getByTestId('cart-total').textContent).toBe('0')

  // The HTTP read can still finish after cancellation; it must not publish its old snapshot.
  await act(async () => {
    oldSessionProbe.resolve(initialCart)
    await revalidation
    await Promise.resolve()
  })

  expect(client.getQueryData<Cart>(queryKeys.cart)).toEqual(emptyCart)
  expect(screen.getByTestId('cart-total').textContent).toBe('0')
  expect(screen.getByTestId('authenticated').textContent).toBe('true')
  expect(api.checkout).toHaveBeenCalledTimes(1)
})
