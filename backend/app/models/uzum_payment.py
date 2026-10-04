from sqlalchemy import Column, String, Integer, BigInteger, DateTime, ForeignKey
from sqlalchemy.sql import func

from app.db.base_class import Base
from app.models.user import generate_uuid


class PaymentOrder(Base):
    """An amount a person can pay for, addressed by a number they can type.

    The Merchant API flow starts with the customer entering an order number in
    the Uzum app, so the identifier has to be short and numeric. Everything else
    in this system is keyed by UUID, which nobody is going to type off a screen
    — hence a table of its own rather than reusing ``transactions.id``.

    One order, at most one successful payment. The order is what /check looks
    up and what /create's amount is compared against.
    """

    __tablename__ = "payment_orders"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)

    # 16 digits, matching the length Uzum's own examples use. Random rather
    # than sequential: the number is typed into a public app, and a sequence
    # would let anyone enumerate other people's orders through /check.
    orderNumber = Column(String(16), unique=True, nullable=False, index=True)

    userId = Column(String, ForeignKey("users.id"), nullable=False, index=True)

    # 'deposit' — top up the employer's balance.
    # 'job'     — top up in order to fund a particular posting; the
    #             itself is still taken at hire time, from the balance.
    purpose = Column(String, nullable=False, default="deposit")
    jobId = Column(String, ForeignKey("jobs.id"), nullable=True, index=True)

    # Tiyin, because that is what Uzum sends and comparing in the same unit is
    # the whole of the amount check. 1 UZS = 100 tiyin.
    amount = Column(Integer, nullable=False)

    # 'new' | 'paid' | 'cancelled'
    status = Column(String, nullable=False, default="new", index=True)

    createdAt = Column(DateTime(timezone=True), server_default=func.now())


class UzumTransaction(Base):
    """Uzum's side of a payment, keyed by the identifier Uzum gives it.

    Kept separate from ``PaymentOrder`` because the two have different
    lifetimes: an order can be attempted, reversed and attempted again, and
    each attempt is a transaction of its own. /confirm, /reverse and /status
    all address this row and nothing else.
    """

    __tablename__ = "uzum_transactions"

    # Uzum's transId. Its own primary key, which is what makes a repeated
    # /create with the same transId answer 10010 instead of creating a second.
    transId = Column(String, primary_key=True, index=True)

    orderId = Column(String, ForeignKey("payment_orders.id"), nullable=False, index=True)
    amount = Column(Integer, nullable=False)

    # 'CREATED' | 'CONFIRMED' | 'REVERSED' | 'FAILED'. FAILED is ours: the spec
    # says a transaction not confirmed within 30 minutes is unsuccessful.
    status = Column(String, nullable=False, default="CREATED", index=True)

    # Unix milliseconds, as the spec sends and expects them back.
    transTime = Column(BigInteger, nullable=False)
    confirmTime = Column(BigInteger, nullable=True)
    reverseTime = Column(BigInteger, nullable=True)

    # Recorded from /confirm. Not used to decide anything — kept because when a
    # customer disputes a payment, the card type and reference number are what
    # the conversation with the bank is about.
    paymentSource = Column(String, nullable=True)
    processingReferenceNumber = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    cardType = Column(Integer, nullable=True)

    createdAt = Column(DateTime(timezone=True), server_default=func.now())
