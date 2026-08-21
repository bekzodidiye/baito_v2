# Import all the models, so that Base has them before being
# imported by Alembic
from app.db.base_class import Base
from app.models.user import User
from app.models.job import Job
from app.models.application import Application
from app.models.transaction import Transaction
from app.models.chat import Chat, Message
from app.models.bookmark import Bookmark
from app.models.notification import Notification
from app.models.payment_card import PaymentCard
from app.models.session import ActiveSession
from app.models.support_ticket import SupportTicket, TicketMessage

