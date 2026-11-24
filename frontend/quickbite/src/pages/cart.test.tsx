import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProtectedRoute } from '@/components/protected-route'
import { api, ApiError } from '@/lib/api'
import { queryKeys } from '@/lib/queries'
import type { Cart } from '@/lib/types'
import { CartPage, ConfirmationPage } from './cart'

vi.mock('@/lib/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...original,
    api: { ...original.api, getCart: vi.fn(), checkout: vi.fn() },
  }
})

vi.mock('@/lib/session', async () => {
  const { useQuery } = await import('@tanstack/react-query')
  return {
    useSession() {
      const { data } = useQuery<{ username: string; sessionId: string } | null>({
        queryKey: ['session'],
        queryFn: async () => null,
        enabled: false,
      })
      return {
        isAuthenticated: Boolean(data),
        isLoading: false,
        isSigningOut: false,
        username: data?.username ?? null,
        sessionId: data?.sessionId ?? null,
        error: null,
      }
    },
  }
})

const cart: Cart = {
  total_price: 31.25,
  order_items: [
    { menu_item_name: 'Sesame noodles', price: 12.5, quantity: 2 },
    { menu_item_name: 'Cucumber salad', price: 6.25, quantity: 1 },
  ],
}
const emptyCart: Cart = { total_price: 0, order_items: [] }
const clients: QueryClient[] = []

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((accept, fail) => {
    resolve = accept
    reject = fail
  })
  return { promise, resolve, reject }
}

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="current-path">{location.pathname}</output>
}

function renderApp(path = '/checkout', state?: unknown) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  })
  clients.push(client)
  client.setQueryData(queryKeys.session, {
    username: 'first@example.com',
    sessionId: 'session-a',
  })
  const result = render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[{ pathname: path, state }]}>
        <LocationProbe />
        <Routes>
          <Route path="/cart" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
          <Route path="/checkout" element={<ProtectedRoute><CartPage checkout /></ProtectedRoute>} />
          <Route path="/order-confirmation" element={<ProtectedRoute><ConfirmationPage /></ProtectedRoute>} />
          <Route path="/login" element={<h1>Sign in</h1>} />
          <Route path="/" element={<h1>Restaurants</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { ...result, client }
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(api.getCart).mockResolvedValue(cart)
  vi.mocked(api.checkout).mockResolvedValue(undefined)
})

afterEach(() => {
  cleanup()
  clients.splice(0).forEach((client) => client.clear())
})

describe('live shopping cart', () => {
  it('shows a loading state instead of sample items while the cart request is pending', () => {
    vi.mocked(api.getCart).mockReturnValue(deferred<Cart>().promise)
    renderApp()

    expect(screen.getByRole('status', { name: 'Loading your cart' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Complete checkout' })).toBeNull()
    expect(screen.queryByText('Sesame noodles')).toBeNull()
    expect(api.checkout).not.toHaveBeenCalled()
  })

  it('lets a failed cart request be retried and renders the API response', async () => {
    vi.mocked(api.getCart)
      .mockRejectedValueOnce(new ApiError('Cart service is temporarily unavailable.', 503))
      .mockResolvedValueOnce(cart)
    renderApp('/cart')

    await screen.findByRole('alert')
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    await screen.findByRole('heading', { name: 'Sesame noodles' })
    expect(api.getCart).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('displays quantities, line totals, and the server-provided cart total', async () => {
    renderApp('/cart')

    await screen.findByRole('heading', { name: 'Sesame noodles' })
    expect(screen.getByText('3 items')).toBeTruthy()
    expect(screen.getByLabelText('Quantity 2').textContent).toBe('2')
    expect(screen.getByText('$25.00')).toBeTruthy()
    expect(screen.getByText('$31.25')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Checkout' }))
    expect(screen.getByTestId('current-path').textContent).toBe('/checkout')
  })

  it('does not allow an empty cart to be checked out', async () => {
    vi.mocked(api.getCart).mockResolvedValue(emptyCart)
    renderApp()

    await screen.findByRole('heading', { name: 'Your cart is empty' })
    expect(screen.queryByRole('button', { name: 'Complete checkout' })).toBeNull()
    expect(api.checkout).not.toHaveBeenCalled()
  })
})

describe('live checkout', () => {
  it('submits only once, waits for success, then clears the cart and preserves the receipt', async () => {
    const submission = deferred<void>()
    let serverCart = cart
    vi.mocked(api.getCart).mockImplementation(async () => serverCart)
    vi.mocked(api.checkout).mockImplementation(async () => {
      await submission.promise
      serverCart = emptyCart
    })
    const { client } = renderApp()
    const button = await screen.findByRole('button', { name: 'Complete checkout' })

    fireEvent.click(button)
    fireEvent.click(button)
    await waitFor(() => expect(api.checkout).toHaveBeenCalledTimes(1))
    expect(screen.getByTestId('current-path').textContent).toBe('/checkout')
    expect((screen.getByRole('button', { name: /Completing checkout/ }) as HTMLButtonElement).disabled).toBe(true)

    await act(async () => submission.resolve(undefined))

    await screen.findByRole('heading', { name: 'Checkout complete' })
    expect(screen.getByTestId('current-path').textContent).toBe('/order-confirmation')
    expect(screen.getByRole('heading', { name: 'Sesame noodles' })).toBeTruthy()
    expect(screen.getByText('$25.00')).toBeTruthy()
    expect(screen.getByText('$31.25')).toBeTruthy()
    expect(client.getQueryData<Cart>(queryKeys.cart)?.order_items).toEqual([])
    expect(client.getQueryData<Cart>(queryKeys.cart)?.total_price).toBe(0)
  })

  it('keeps the cart and stays on checkout when submission fails', async () => {
    vi.mocked(api.checkout).mockRejectedValue(new ApiError('Checkout is temporarily unavailable.', 503))
    const { client } = renderApp()
    fireEvent.click(await screen.findByRole('button', { name: 'Complete checkout' }))

    await screen.findByText('Checkout is temporarily unavailable.')
    expect(screen.getByTestId('current-path').textContent).toBe('/checkout')
    expect(screen.queryByRole('heading', { name: 'Checkout complete' })).toBeNull()
    expect(screen.getByRole('heading', { name: 'Sesame noodles' })).toBeTruthy()
    expect(client.getQueryData<Cart>(queryKeys.cart)).toEqual(cart)
    expect((screen.getByRole('button', { name: 'Complete checkout' }) as HTMLButtonElement).disabled).toBe(false)
    expect(api.checkout).toHaveBeenCalledTimes(1)
  })

  it('redirects an expired session to sign in instead of showing a receipt', async () => {
    vi.mocked(api.checkout).mockRejectedValue(new ApiError('Please sign in to continue.', 401))
    const { client } = renderApp()
    fireEvent.click(await screen.findByRole('button', { name: 'Complete checkout' }))

    await screen.findByRole('heading', { name: 'Sign in' })
    expect(client.getQueryData(queryKeys.session)).toBeNull()
    expect(client.getQueryData(queryKeys.cart)).toBeUndefined()
    expect(screen.queryByRole('heading', { name: 'Checkout complete' })).toBeNull()
    expect(api.checkout).toHaveBeenCalledTimes(1)
  })

  it('does not clear a new account cart or show the previous account receipt after a session change', async () => {
    const submission = deferred<void>()
    const secondCart: Cart = {
      total_price: 4,
      order_items: [{ menu_item_name: 'Bagel', price: 4, quantity: 1 }],
    }
    let serverCart = cart
    vi.mocked(api.getCart).mockImplementation(async () => serverCart)
    vi.mocked(api.checkout).mockReturnValue(submission.promise)
    const { client } = renderApp()
    fireEvent.click(await screen.findByRole('button', { name: 'Complete checkout' }))
    await waitFor(() => expect(api.checkout).toHaveBeenCalledTimes(1))

    serverCart = secondCart
    act(() => {
      client.setQueryData(queryKeys.session, { username: 'second@example.com', sessionId: 'session-b' })
      client.setQueryData(queryKeys.cart, secondCart)
    })
    await act(async () => submission.resolve(undefined))

    await waitFor(() => expect(client.getQueryData<Cart>(queryKeys.cart)).toEqual(secondCart))
    expect(screen.getByTestId('current-path').textContent).toBe('/checkout')
    expect(screen.queryByRole('heading', { name: 'Checkout complete' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Sesame noodles' })).toBeNull()
    expect(await screen.findByRole('heading', { name: 'Bagel' })).toBeTruthy()
  })

  it('only shows a confirmation when a receipt belongs to the current signed-in session', async () => {
    const missing = renderApp('/order-confirmation')
    expect(screen.getByRole('heading', { name: 'Checkout confirmation unavailable' })).toBeTruthy()
    missing.unmount()

    const { client } = renderApp('/order-confirmation', {
      receipt: cart,
      completedAt: '2026-11-24T21:00:00.000Z',
      sessionId: 'session-a',
    })
    expect(screen.getByRole('heading', { name: 'Checkout complete' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Sesame noodles' })).toBeTruthy()

    act(() => {
      client.setQueryData(queryKeys.session, { username: 'second@example.com', sessionId: 'session-b' })
    })

    await screen.findByRole('heading', { name: 'Checkout confirmation unavailable' })
    expect(screen.queryByRole('heading', { name: 'Sesame noodles' })).toBeNull()
  })
})
