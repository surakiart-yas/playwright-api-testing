/**
 * In-process mock backend for the template — a REAL Hono HTTP server, started by
 * Playwright's `webServer` (see playwright.config.ts + docs/decisions.md §10/§15).
 * `pnpm test` runs fully offline against it: no secrets, no network.
 *
 * Domain: `products` (full state machine) + `orders` (depends on products).
 * Envelope: success `{ code: 'OK', message, data, requestId }`,
 *           error   `{ code, error, message, errorData? }`.
 *
 * ── SEEDED BUGS (deliberate — do NOT fix) ───────────────────────────────────
 * The RED-by-design lessons (LEARNING-PATH.md lesson 7, docs/exercises.md) need a
 * contract violation to catch. Tests assert the DOCUMENTED-correct behavior and stay
 * visibly red — never weaken an assertion to match these:
 *
 *   BUG #1  POST /products accepts a MISSING `price` and creates the product with
 *           price 0 — the contract says 400 VALIDATION_FAILED with
 *           errorData [{ field: 'price', tag: 'body', reason: 'required' }].
 *
 *   BUG #2  GET /products (list) leaks the internal `costPrice` field on every item.
 *           The contract projects it away everywhere (get-by-id correctly omits it).
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { randomUUID } from 'node:crypto'

// --- envelope helpers ---------------------------------------------------------

interface ErrorDataEntry {
  field: string
  reason?: string
  tag?: string
}

function ok(c: Context, data: unknown, status: ContentfulStatusCode = 200) {
  return c.json({ code: 'OK', message: 'success', requestId: randomUUID(), data }, status)
}

function err(
  c: Context,
  status: ContentfulStatusCode,
  code: string,
  message: string,
  errorData?: ErrorDataEntry[],
) {
  return c.json(
    {
      code,
      error: code.toLowerCase(),
      message,
      requestId: randomUUID(),
      ...(errorData ? { errorData } : {}),
    },
    status,
  )
}

// --- in-memory state ------------------------------------------------------------

type ProductStatus = 'draft' | 'published' | 'archived'

interface Product {
  id: string
  name: string
  sku: string
  price: number
  stock: number
  status: ProductStatus
  costPrice: number // INTERNAL — must never appear in a response (see BUG #2)
  createdAt: string
  updatedAt: string
}

interface Order {
  id: string
  productId: string
  quantity: number
  total: number
  status: 'placed' | 'cancelled'
  createdAt: string
}

const products = new Map<string, Product>()
const orders = new Map<string, Order>()

// `draft → published → archived`; archived is terminal.
const ALLOWED_TRANSITIONS: Record<ProductStatus, ProductStatus[]> = {
  draft: ['published'],
  published: ['archived'],
  archived: [],
}

function publicProduct(p: Product): Omit<Product, 'costPrice'> {
  const { costPrice: _costPrice, ...rest } = p
  return rest
}

// --- validation helpers ---------------------------------------------------------

function requiredFields(body: Record<string, unknown>, fields: string[]): ErrorDataEntry[] {
  return fields
    .filter((f) => body[f] === undefined || body[f] === null || body[f] === '')
    .map((f) => ({ field: f, tag: 'body', reason: 'required' }))
}

async function jsonBody(c: Context): Promise<Record<string, unknown> | null> {
  try {
    return (await c.req.json()) as Record<string, unknown>
  } catch {
    return null
  }
}

// --- app --------------------------------------------------------------------------

const app = new Hono()

app.get('/health', (c) => c.json({ status: 'ok' }))

// POST /products — create
app.post('/products', async (c) => {
  const body = await jsonBody(c)
  if (!body) {
    return err(c, 400, 'VALIDATION_FAILED', 'Request body must be valid JSON.')
  }

  // SEEDED BUG #1: `price` is missing from the required-field list. The contract requires
  // it (400 VALIDATION_FAILED, errorData [{field:'price',tag:'body',reason:'required'}]) —
  // a missing price falls through and defaults to 0 below. Do NOT fix; do NOT weaken the
  // RED spec that catches this (tests/products/create.spec.ts).
  const missing = requiredFields(body, ['name', 'sku'])
  if (missing.length > 0) {
    return err(c, 400, 'VALIDATION_FAILED', 'Required field(s) missing.', missing)
  }

  const invalid: ErrorDataEntry[] = []
  if (typeof body.name !== 'string' || (body.name as string).length > 100) {
    invalid.push({ field: 'name', tag: 'invalid' })
  }
  if (typeof body.sku !== 'string' || !/^[A-Za-z0-9-]{3,40}$/.test(body.sku as string)) {
    invalid.push({ field: 'sku', tag: 'invalid' })
  }
  if (body.price !== undefined && (typeof body.price !== 'number' || (body.price as number) < 0)) {
    invalid.push({ field: 'price', tag: 'invalid' })
  }
  if (
    body.stock !== undefined &&
    (typeof body.stock !== 'number' || !Number.isInteger(body.stock) || (body.stock as number) < 0)
  ) {
    invalid.push({ field: 'stock', tag: 'invalid' })
  }
  if (invalid.length > 0) {
    return err(c, 400, 'INVALID_DATA', 'Invalid field value(s).', invalid)
  }

  const sku = body.sku as string
  if ([...products.values()].some((p) => p.sku === sku)) {
    return err(c, 409, 'DUPLICATE', `A product with sku '${sku}' already exists.`, [
      { field: 'sku', tag: 'duplicate' },
    ])
  }

  const now = new Date().toISOString()
  const price = (body.price as number | undefined) ?? 0
  const product: Product = {
    id: randomUUID(),
    name: body.name as string,
    sku,
    price,
    stock: (body.stock as number | undefined) ?? 0,
    status: 'draft',
    costPrice: Math.round(price * 0.6 * 100) / 100,
    createdAt: now,
    updatedAt: now,
  }
  products.set(product.id, product)
  return ok(c, publicProduct(product), 201)
})

// GET /products — list (q = name prefix filter; page/pageSize 1-based)
app.get('/products', (c) => {
  const q = c.req.query('q')
  const status = c.req.query('status')
  const page = Math.max(1, parseInt(c.req.query('page') ?? '1', 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(c.req.query('pageSize') ?? '20', 10) || 20))

  let items = [...products.values()]
  if (q) items = items.filter((p) => p.name.startsWith(q))
  if (status) items = items.filter((p) => p.status === status)
  items.sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  const total = items.length
  const slice = items.slice((page - 1) * pageSize, page * pageSize)

  // SEEDED BUG #2: list items are returned RAW — the internal `costPrice` field leaks.
  // The contract projects internal fields away on every read (get-by-id below does it
  // correctly via publicProduct). Do NOT fix; the absence assertion in
  // tests/products/list.spec.ts must stay RED until "the backend" fixes the projection.
  return ok(c, { items: slice, total, page, pageSize })
})

// GET /products/:id
app.get('/products/:id', (c) => {
  const product = products.get(c.req.param('id'))
  if (!product) return err(c, 404, 'NOT_FOUND', 'Product not found.')
  return ok(c, publicProduct(product))
})

// PATCH /products/:id — partial update (name / price / stock)
app.patch('/products/:id', async (c) => {
  const product = products.get(c.req.param('id'))
  if (!product) return err(c, 404, 'NOT_FOUND', 'Product not found.')

  const body = await jsonBody(c)
  if (!body) return err(c, 400, 'VALIDATION_FAILED', 'Request body must be valid JSON.')

  const invalid: ErrorDataEntry[] = []
  if (body.name !== undefined && (typeof body.name !== 'string' || body.name === '')) {
    invalid.push({ field: 'name', tag: 'invalid' })
  }
  if (body.price !== undefined && (typeof body.price !== 'number' || (body.price as number) < 0)) {
    invalid.push({ field: 'price', tag: 'invalid' })
  }
  if (
    body.stock !== undefined &&
    (typeof body.stock !== 'number' || !Number.isInteger(body.stock) || (body.stock as number) < 0)
  ) {
    invalid.push({ field: 'stock', tag: 'invalid' })
  }
  if (invalid.length > 0) {
    return err(c, 400, 'INVALID_DATA', 'Invalid field value(s).', invalid)
  }

  if (typeof body.name === 'string') product.name = body.name
  if (typeof body.price === 'number') product.price = body.price
  if (typeof body.stock === 'number') product.stock = body.stock
  product.updatedAt = new Date().toISOString()
  return ok(c, publicProduct(product))
})

// PATCH /products/:id/status — state machine (draft → published → archived; archived terminal).
// NOTE: implemented in the mock but NOT yet covered by the AOM layer — adding the client
// method + validator + schema + spec for it is docs/exercises.md exercise 1.
app.patch('/products/:id/status', async (c) => {
  const product = products.get(c.req.param('id'))
  if (!product) return err(c, 404, 'NOT_FOUND', 'Product not found.')

  const body = await jsonBody(c)
  const next = body?.status as ProductStatus | undefined
  if (!next || !['draft', 'published', 'archived'].includes(next)) {
    return err(c, 400, 'INVALID_DATA', 'Invalid status value.', [
      { field: 'status', tag: 'invalid' },
    ])
  }
  if (!ALLOWED_TRANSITIONS[product.status].includes(next)) {
    return err(
      c,
      422,
      'INVALID_TRANSITION',
      `Cannot transition from '${product.status}' to '${next}'.`,
      [{ field: 'status', tag: 'invalid' }],
    )
  }
  product.status = next
  product.updatedAt = new Date().toISOString()
  return ok(c, publicProduct(product))
})

// DELETE /products/:id — hard delete (the provisioner's cleanup path)
app.delete('/products/:id', (c) => {
  const id = c.req.param('id')
  if (!products.has(id)) return err(c, 404, 'NOT_FOUND', 'Product not found.')
  products.delete(id)
  return ok(c, {})
})

// POST /orders — place an order against a product (cross-service dependency)
app.post('/orders', async (c) => {
  const body = await jsonBody(c)
  if (!body) return err(c, 400, 'VALIDATION_FAILED', 'Request body must be valid JSON.')

  const missing = requiredFields(body, ['productId', 'quantity'])
  if (missing.length > 0) {
    return err(c, 400, 'VALIDATION_FAILED', 'Required field(s) missing.', missing)
  }
  if (
    typeof body.quantity !== 'number' ||
    !Number.isInteger(body.quantity) ||
    (body.quantity as number) < 1
  ) {
    return err(c, 400, 'INVALID_DATA', 'Invalid field value(s).', [
      { field: 'quantity', tag: 'invalid' },
    ])
  }

  const product = products.get(String(body.productId))
  if (!product) {
    return err(c, 422, 'INVALID_DATA', 'productId does not reference an existing product.', [
      { field: 'productId', tag: 'invalid' },
    ])
  }
  const quantity = body.quantity as number
  if (quantity > product.stock) {
    return err(c, 422, 'INVALID_DATA', 'Quantity exceeds available stock.', [
      { field: 'quantity', tag: 'invalid', reason: 'insufficient_stock' },
    ])
  }

  product.stock -= quantity
  product.updatedAt = new Date().toISOString()

  const order: Order = {
    id: randomUUID(),
    productId: product.id,
    quantity,
    total: Math.round(product.price * quantity * 100) / 100,
    status: 'placed',
    createdAt: new Date().toISOString(),
  }
  orders.set(order.id, order)
  return ok(c, order, 201)
})

// GET /orders/:id
app.get('/orders/:id', (c) => {
  const order = orders.get(c.req.param('id'))
  if (!order) return err(c, 404, 'NOT_FOUND', 'Order not found.')
  return ok(c, order)
})

// DELETE /orders/:id — cancel + remove (cleanup path; stock is NOT restocked)
app.delete('/orders/:id', (c) => {
  const id = c.req.param('id')
  if (!orders.has(id)) return err(c, 404, 'NOT_FOUND', 'Order not found.')
  orders.delete(id)
  return ok(c, {})
})

const port = Number(process.env.MOCK_PORT ?? 8787)
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[mock] listening on http://localhost:${info.port}`)
})
