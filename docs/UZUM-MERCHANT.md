# Uzum Bank Merchant API

The webhooks Uzum calls on us when someone pays from the Uzum app. Written
against <https://developer.uzumbank.uz/merchant>.

This is **not** the integration in `payments.py`. There we send a customer to
Uzum's checkout page and Uzum calls back once. Here the direction is reversed:
the customer opens the Uzum app, types an order number, and the bank drives a
two-phase payment against us. Both exist; they are different products.

## Which host to give them

Checked on 2026-09-03, from outside the tailnet by forcing the public ingress:

| Host | Public DNS | Reachable |
|---|---|---|
| `baito.tail365b27.ts.net` | 185.40.234.37, .210, .172 (Tailscale Funnel) | **yes** |
| `baito.uz` | *no A record at all* | no |

So the address Uzum can actually call today is the Funnel one. `baito.uz` does
not resolve anywhere — not the app's fault and not something a deploy fixes; the
domain has no DNS pointing at anything. If Uzum is to be given `baito.uz`, that
has to be sorted first, and the URL agreed with them at onboarding is awkward to
change afterwards.

Verified live on both public ingress addresses:

```
GET  /api/health                  -> 200  database connected, redis connected
POST /api/v1/payments/uzum/check  -> 400  {"errorCode":"10001", ...}
```

The 10001 is the right answer to an unauthenticated call: the service fails
closed.

## What to give Uzum at onboarding

| | |
|---|---|
| Base URL | `https://baito.tail365b27.ts.net/api/v1/payments/uzum` |
| Endpoints | `POST /check`, `/create`, `/confirm`, `/reverse`, `/status` |
| Auth | HTTP Basic |
| Payment attribute | `order_id` (16 digits) |

## Configuration

Three variables. Until all three are set, every webhook answers `10001` rather
than half-working.

```
UZUM_MERCHANT_SERVICE_ID=783774
UZUM_MERCHANT_USERNAME=<login agreed with Uzum>
UZUM_MERCHANT_PASSWORD=<password agreed with Uzum>
```

They are passed through in `docker-compose.yml`, so `backend/.env` on the server
is where they go, followed by `docker compose up -d backend`. A variable that is
not listed in that file cannot reach the container no matter what `.env` says —
which is how this integration nearly shipped answering 10001 forever.

Generate the password with something like `openssl rand -hex 24` and put it in
the deployment environment only. It does not belong in a Postman collection, a
chat message or this repository — a collection file is exactly the thing people
commit and forward.

## How an order comes to exist

A customer cannot type a UUID off a screen, so orders have their own numeric
identifier.

```
POST /api/v1/payments/uzum/orders     (authenticated as the employer)
{ "amount": 50000, "jobId": null }    amount in SO'M

-> { "orderNumber": "2607300111477233", "amount": 50000, "purpose": "deposit" }
```

`jobId` is optional and must be the caller's own posting; with it the order is
marked `purpose: "job"` and the job title is what the customer sees in the Uzum
app. The escrow itself is still taken at hire time, from the balance — paying
against a job funds it, it does not hire for it.

## Units

**Amounts are in tiyin everywhere Uzum can see them.** 1 UZS = 100 tiyin, so
`1000000` is ten thousand so'm. Our `POST /orders` takes so'm, because every
other amount our own clients send is in so'm, and converts once. That single
line is the only place the two units meet.

## The flow

```
/check     is this order payable?          -> status OK
/create    hold it, transId + amount       -> status CREATED     no money moves
/confirm   money has left the customer     -> status CONFIRMED   balance credited
/reverse   undo                            -> status REVERSED
/status    what happened?                  -> whatever is true
```

A transaction not confirmed within 30 minutes is unsuccessful. A Celery beat
job (`expire_uzum_transactions`, every ten minutes) moves those to `FAILED`;
after that `/confirm` answers `10015`.

## Error codes

Every business failure is **HTTP 400 with a string `errorCode`**. Not 401, not
404 — to Uzum those mean the webhook itself failed, and it retries rather than
telling the customer why.

| Code | When |
|---|---|
| 10001 | bad or missing Basic auth, or the service is not configured |
| 10005 | required parameter missing |
| 10006 | serviceId is not ours |
| 10007 | no order with that number |
| 10008 | that order is already paid |
| 10009 | that order was cancelled |
| 10010 | this transId already exists |
| 10011 | amount does not match the order |
| 10014 | no transaction with that transId |
| 10015 | transaction is reversed or expired |
| 10016 | transaction is already confirmed |
| 10017 | cannot be reversed |
| 10018 | already reversed |

## Two decisions worth knowing about

**A refund of money already spent goes through, and the balance can go
negative.** By the time `/reverse` arrives after a `/confirm`, the bank has
already returned the money to the customer. Refusing would leave our books
disagreeing with theirs. The debit is taken, the negative balance is recorded
in the audit ledger and logged at error level. What to do about the shortfall
is a policy question, not a technical one, and it is not answered here.

**`timestamp` is recorded but not validated.** The spec does not ask for it and
gives no tolerance, so there is nothing to check against. If replay protection
is wanted, it needs a window agreed with Uzum first.
