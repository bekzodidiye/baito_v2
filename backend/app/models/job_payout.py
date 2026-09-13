from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.sql import func

from app.db.base_class import Base
from .user import generate_uuid


class PayoutStatus:
    """Where a payout is in the two-sided settlement.

    Completing a job credits the worker's in-app balance. That is a promise,
    not a transfer — the real money leaves a bank account by hand, the next
    day. These are the states of squaring that up.
    """

    PAID = "paid"            # money sent to the worker, receipt on file
    INVOICED = "invoiced"    # and the company has been billed for it
    # The company opened the invoice and pressed pay. That is the payer's word,
    # not a bank statement: it is recorded as a separate state precisely so
    # nobody reads it as the money having arrived.
    DECLARED = "payment_declared"


class JobPayout(Base):
    """One hand-made payment to a worker, and the invoice that recovers it.

    Kept apart from ``Transaction`` on purpose. A transaction records movement
    inside the platform; this records movement outside it — a bank transfer a
    person made, evidenced by a receipt someone can be asked to produce later.
    Mixing the two would make "has this worker actually been paid?" a question
    about transaction ``type`` strings rather than about a row existing.
    """

    __tablename__ = "job_payouts"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    jobId = Column(String, ForeignKey("jobs.id"), nullable=False, index=True)
    workerId = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    employerId = Column(String, ForeignKey("users.id"), nullable=False, index=True)

    # UZS, matching users.balance and audit_ledgers.amountDelta. Transaction
    # amounts are tiyin; these deliberately are not, because this number is
    # what an administrator typed and what the receipt shows.
    amount = Column(Integer, nullable=False)

    # The proof. An upload URL from POST /upload (images and PDF), which serves
    # through the authenticated /media route rather than the bucket.
    receiptUrl = Column(String, nullable=False)

    status = Column(String, nullable=False, default=PayoutStatus.PAID, index=True)
    note = Column(Text, nullable=True)

    paidAt = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    paidByAdminId = Column(String, ForeignKey("users.id"), nullable=False)

    # The company side. Billed separately and possibly for more than the worker
    # was paid — a longer shift than the posting assumed is settled here, so
    # the two amounts are recorded independently rather than derived.
    invoiceNumber = Column(String, nullable=True, unique=True, index=True)
    invoiceAmount = Column(Integer, nullable=True)
    invoiceSentTo = Column(String, nullable=True)
    invoiceSentAt = Column(DateTime(timezone=True), nullable=True)
    invoiceSentByAdminId = Column(String, ForeignKey("users.id"), nullable=True)

    # What the company said when it paid, from the link in the invoice email.
    # Kept apart from the columns above because those are what we did and these
    # are what they told us; reconciling the two is a person's job.
    invoicePaidMethod = Column(String, nullable=True)       # bank_transfer, card
    invoicePaidReference = Column(String, nullable=True)    # their payment order no.
    invoicePaidDeclaredAt = Column(DateTime(timezone=True), nullable=True)
