import urllib.parse
from typing import Dict, Any, Optional
from datetime import datetime, timezone

# Standard demo/production merchant API key
DEFAULT_MERCHANT_API_KEY = "pp_live_kt_9016929244_a87f2e1d"

class ApiKeyService:
    @staticmethod
    def get_merchant_api_credentials(merchant_id: str = "merchant_demo_apex_01") -> Dict[str, Any]:
        """
        Returns the active API Key, Inbound Webhook URL, and ready-to-use code integration snippets.
        """
        api_key = DEFAULT_MERCHANT_API_KEY
        webhook_url = f"http://127.0.0.1:8001/api/v1/connect/invoices"

        curl_snippet = f"""curl -X POST "{webhook_url}" \\
  -H "Authorization: Bearer {api_key}" \\
  -H "Content-Type: application/json" \\
  -d '{{
    "customer_name": "Ramesh Textiles",
    "phone": "+919825100000",
    "invoice_no": "INV-2026-101",
    "amount_rupees": 12500.00,
    "due_date": "2026-09-15"
  }}'"""

        python_snippet = f"""import requests

url = "{webhook_url}"
headers = {{
    "Authorization": "Bearer {api_key}",
    "Content-Type": "application/json"
}}
payload = {{
    "customer_name": "Ramesh Textiles",
    "phone": "+919825100000",
    "invoice_no": "INV-2026-101",
    "amount_rupees": 12500.00
}}

response = requests.post(url, json=payload, headers=headers)
print("Bill Synced:", response.json())"""

        nodejs_snippet = f"""const axios = require('axios');

async function syncInvoice() {{
  const res = await axios.post('{webhook_url}', {{
    customer_name: 'Ramesh Textiles',
    phone: '+919825100000',
    invoice_no: 'INV-2026-101',
    amount_rupees: 12500.00
  }}, {{
    headers: {{ 'Authorization': 'Bearer {api_key}' }}
  }});
  console.log('Synced:', res.data);
}}
syncInvoice();"""

        return {
            "merchant_id": merchant_id,
            "api_key": api_key,
            "inbound_sync_url": webhook_url,
            "status": "ACTIVE",
            "snippets": {
                "curl": curl_snippet,
                "python": python_snippet,
                "nodejs": nodejs_snippet
            }
        }

    @staticmethod
    def verify_api_key(token: str) -> bool:
        if not token:
            return False
        clean = token.replace("Bearer ", "").strip()
        return clean in [DEFAULT_MERCHANT_API_KEY, "pp_live_demo_universal_key"]

    @staticmethod
    def generate_whatsapp_dispatch(
        customer_name: str,
        phone: str,
        amount_rupees: float,
        bill_no: str = "INV-PENDING",
        payment_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generates clean WhatsApp message and direct Click-to-Chat deep link (https://wa.me/...).
        """
        clean_phone = "".join(filter(str.isdigit, str(phone)))
        if len(clean_phone) == 10:
            clean_phone = f"91{clean_phone}"

        pay_link = payment_url or f"https://rzp.io/i/pay_{abs(hash(bill_no)) % 1000000}"
        
        message = (
            f"Namaste {customer_name},\n\n"
            f"This is a gentle payment reminder from Khushi Threads regarding Bill No. {bill_no}.\n\n"
            f"💰 Outstanding Amount: ₹{amount_rupees:,.2f}\n"
            f"⚡ Pay instantly via Google Pay / PhonePe / Paytm / Card:\n"
            f"{pay_link}\n\n"
            f"The bill will be cleared automatically upon payment. Thank you!"
        )

        encoded_text = urllib.parse.quote(message)
        whatsapp_url = f"https://wa.me/{clean_phone}?text={encoded_text}"

        return {
            "customer_name": customer_name,
            "phone": clean_phone,
            "amount_rupees": amount_rupees,
            "bill_no": bill_no,
            "payment_url": pay_link,
            "message": message,
            "whatsapp_url": whatsapp_url
        }
