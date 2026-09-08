# BUG-018 — "Jonli chat" answers the user itself; the message never leaves the browser

- **Severity:** S2
- **Component:** frontend / support (`SupportChatScreen.tsx`)
- **Found:** 2026-09-03, round-3 per-control click sweep
- **Status:** **Fixed** — see commit `d119f4b`; verified live (POST /support/messages fires, a ticket is created and appears in the admin queue)
- **Evidence:** `qa/evidence/BUG-018-support-chat-fake-send.png`

## What happens

**Yordam → "Jonli chat / Operatorlar bilan suhbat"** opens `/support-chat`. The user types
a message and sends it. It appears in the thread, and a second later an operator appears
to answer:

> "Xabaringizni qabul qildik. Operatorlarimiz tez orada sizga javob qaytarishadi.
> Iltimos, kuting."
> *(We have received your message. Our operators will reply to you shortly. Please wait.)*

No operator saw anything. The message never left the page, and the reply is a string
literal in the component. The user is told to wait for an answer that cannot come.

## Reproduction (live, on the disposable QA stack)

Worker `+998900003001`:

1. `/help` → click **Jonli chat** → lands on `/support-chat`
2. Type `Pulim yechilmadi, yordam bering` and send

```
URL: /support-chat
MY MESSAGE SHOWN:  true
AUTO REPLY SHOWN:  true
API CALLS:         []
```

Server state afterwards — this worker had **no** support ticket. Sending the same text
straight to the real endpoint does create one:

```
supporttickets for +998900003001 after using the screen : 0 rows
POST /api/v1/support/messages                            : 200
supporttickets for +998900003001 after the API call      : 1 row
```

## Root cause

`frontend/src/components/settings/SupportChatScreen.tsx:39`

```js
const handleSendMessage = (e: React.FormEvent) => {
  e.preventDefault();
  if (!inputValue.trim()) return;
  setMessages([...messages, newMessage]);   // local state only
  setInputValue('');
  // Simulate support reply
  setTimeout(() => { ...canned text... }, N);
};
```

The comment `// Simulate support reply` is accurate: the whole screen is a simulation.

## This is not a missing feature

The support pipeline exists and works end to end:

- `POST /support/messages` and `GET /support/conversation` (`backend/.../support.py`)
- `frontend/src/api/queries.ts` — `sendSupportMessageApi`, `fetchSupportConversationApi`
- `frontend/src/context/useChatsData.ts:209` — the **Xabarlar** screen posts to it
  correctly, invalidates the query and polls for replies
- the admin panel reads the resulting queue at `/admin/support-tickets`

So a message sent from the Messages screen reaches the admin queue, and the identical
message sent from the screen advertised as "live chat with operators" does not.

## Impact

This is the screen a stuck user is steered to from the Help page. Anyone who reports a
problem here — including a worker chasing money that BUG-017 silently failed to withdraw —
is told support has their message, and waits. The support queue stays empty, so nobody
knows to answer. Both the user and the operator are misled at once.

## Fix direction

Point the screen at the conversation that already works: read from
`fetchSupportConversationApi`, send through `sendSupportMessageApi`, and drop the canned
reply and its timer. `useChatsData.ts`'s support branch is the shape to copy. If the
screen is redundant with the Messages support thread, the alternative fix is to route the
Help page's "Jonli chat" button there instead and delete this component — but it must not
keep answering on the operators' behalf.
