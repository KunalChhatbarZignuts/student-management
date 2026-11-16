"""Dedicated Razorpay Payment Gateway Service."""

import logging
from typing import Any
import razorpay
from razorpay.errors import SignatureVerificationError

from app.core.config import settings

logger = logging.getLogger(__name__)


class RazorpayService:
    def __init__(
        self,
        key_id: str | None = None,
        key_secret: str | None = None,
        webhook_secret: str | None = None,
    ):
        self.key_id = key_id or settings.RAZORPAY_KEY_ID
        self.key_secret = key_secret or settings.RAZORPAY_KEY_SECRET
        self.webhook_secret = webhook_secret or settings.RAZORPAY_WEBHOOK_SECRET
        self._client: razorpay.Client | None = None

    @property
    def client(self) -> razorpay.Client:
        if self._client is None:
            self._client = razorpay.Client(auth=(self.key_id, self.key_secret))
        return self._client

    def create_order(
        self,
        amount_paise: int,
        currency: str = "INR",
        receipt: str | None = None,
        notes: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Create a Razorpay order.

        amount_paise must be an integer in paise (e.g. 50000 paise = ₹500.00).
        """
        payload: dict[str, Any] = {
            "amount": int(amount_paise),
            "currency": currency,
            "payment_capture": 1,  # Auto-capture
        }
        if receipt:
            payload["receipt"] = receipt[:40]  # Razorpay receipt max length is 40
        if notes:
            payload["notes"] = notes

        try:
            order = self.client.order.create(data=payload)
            return order
        except Exception as e:
            logger.error("Razorpay order creation failed: %s", e, exc_info=True)
            raise

    def verify_payment_signature(
        self,
        razorpay_order_id: str,
        razorpay_payment_id: str,
        razorpay_signature: str,
    ) -> bool:
        """Verify client-side payment signature returned by Razorpay Checkout."""
        params = {
            "razorpay_order_id": razorpay_order_id,
            "razorpay_payment_id": razorpay_payment_id,
            "razorpay_signature": razorpay_signature,
        }
        try:
            self.client.utility.verify_payment_signature(params)
            return True
        except SignatureVerificationError:
            logger.warning("Razorpay payment signature mismatch for order %s", razorpay_order_id)
            return False
        except Exception as e:
            logger.error("Unexpected error verifying payment signature: %s", e)
            return False

    def verify_webhook_signature(
        self,
        body: bytes | str,
        signature: str,
        secret: str | None = None,
    ) -> bool:
        """Verify the raw body of an incoming webhook against X-Razorpay-Signature."""
        webhook_sec = secret or self.webhook_secret
        if not webhook_sec:
            logger.error("Razorpay webhook secret is not configured.")
            return False

        body_str = body.decode("utf-8") if isinstance(body, bytes) else body
        try:
            self.client.utility.verify_webhook_signature(body_str, signature, webhook_sec)
            return True
        except SignatureVerificationError:
            logger.warning("Razorpay webhook signature verification failed.")
            return False
        except Exception as e:
            logger.error("Unexpected error verifying webhook signature: %s", e)
            return False

    def fetch_payment(self, payment_id: str) -> dict[str, Any]:
        """Retrieve payment details from Razorpay."""
        try:
            return self.client.payment.fetch(payment_id)
        except Exception as e:
            logger.error("Failed to fetch Razorpay payment %s: %s", payment_id, e)
            raise

    def fetch_order(self, order_id: str) -> dict[str, Any]:
        """Retrieve order details from Razorpay."""
        try:
            return self.client.order.fetch(order_id)
        except Exception as e:
            logger.error("Failed to fetch Razorpay order %s: %s", order_id, e)
            raise


# Global singleton instance
razorpay_service = RazorpayService()
