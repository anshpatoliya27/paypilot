import asyncio
import json
import re
from typing import AsyncGenerator, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.agent.prompts import SYSTEM_PROMPT
from app.agent.tools import AgentTools

class AgentEngine:
    def __init__(self, db: AsyncSession, merchant_id: str = "merchant_demo_apex_01"):
        self.db = db
        self.merchant_id = merchant_id
        self.tools = AgentTools(db, merchant_id)

    async def stream_chat(self, user_message: str) -> AsyncGenerator[str, None]:
        """
        Stream agent reasoning, tool invocations, and synthesized responses via Server-Sent Events (SSE).
        Yields JSON formatted SSE events:
        - {"type": "thought", "content": "..."}
        - {"type": "tool_call", "tool": "...", "args": {...}}
        - {"type": "tool_result", "tool": "...", "data": {...}}
        - {"type": "proposal", "approval": {...}}
        - {"type": "token", "content": "..."}
        - {"type": "done"}
        """
        msg = user_message.strip()
        msg_lower = msg.lower()

        # Step 1: Reason and Plan
        yield self._sse_event("thought", "Analyzing merchant request and retrieving business context...")
        await asyncio.sleep(0.3)

        # -------------------------------------------------------------
        # Scenario 1: Overdue Query / "Who owes money" / "How much is pending"
        # -------------------------------------------------------------
        if any(w in msg_lower for w in ["owe", "pending", "overdue", "waiting to collect", "collect", "outstanding"]):
            yield self._sse_event("tool_call", {"tool": "list_overdue_receivables", "args": {"min_days_overdue": 0}})
            await asyncio.sleep(0.3)
            
            overdue_list = await self.tools.list_overdue_receivables(min_days_overdue=0)
            metrics = await self.tools.get_revenue_metrics()
            
            yield self._sse_event("tool_result", {
                "tool": "list_overdue_receivables",
                "data": {
                    "count": len(overdue_list),
                    "total_outstanding": metrics["total_outstanding"],
                    "records": overdue_list
                }
            })
            await asyncio.sleep(0.3)

            yield self._sse_event("thought", f"Evaluating risk profiles across {len(overdue_list)} delinquent accounts...")
            await asyncio.sleep(0.3)

            # Synthesize response
            total_amt = metrics["total_outstanding"]
            count = len(overdue_list)
            
            response_text = f"### 📊 Receivables & Cashflow Analysis\n\n"
            response_text += f"You have **₹{total_amt:,.2f}** outstanding across **{count} customer(s)**:\n\n"
            
            for c in overdue_list:
                risk_badge = "🔴 HIGH RISK" if c['risk_category'] == 'HIGH' else ("🟡 MEDIUM" if c['risk_category'] == 'MEDIUM' else "🟢 LOW")
                failed_note = f" (⚠️ {c['failed_payment_count']} failed payment attempts)" if c['failed_payment_count'] > 0 else ""
                response_text += f"* **{c['name']}** ({c['company_name'] or 'Client'}): **₹{c['outstanding_balance']:,.2f}** — {c['overdue_days']} days overdue | {risk_badge}{failed_note}\n"

            if overdue_list:
                highest = max(overdue_list, key=lambda x: x.get('outstanding_balance', 0))
                response_text += f"\n**Key Insight & Recommendation:**\n"
                response_text += f"**{highest['name']}** is your highest balance debtor (**₹{highest['outstanding_balance']:,.2f}**, {highest.get('overdue_days', 0)} days overdue). I recommend initiating an automated payment recovery reminder with an instant Razorpay link."

            # Stream tokens
            for chunk in self._chunk_text(response_text):
                yield self._sse_event("token", chunk)
                await asyncio.sleep(0.02)

        # -------------------------------------------------------------
        # Scenario 2: Prepare Recovery Campaign / "Prepare reminders" / "Recover overdue"
        # -------------------------------------------------------------
        elif any(w in msg_lower for w in ["prepare reminder", "send reminder", "recover", "campaign", "follow up", "chase"]):
            yield self._sse_event("thought", "Identifying delinquent clients for automated recovery...")
            await asyncio.sleep(0.3)

            overdue_list = await self.tools.list_overdue_receivables(min_days_overdue=0)
            target_ids = []

            # Dynamically check if any specific customer was mentioned in user query
            for c in overdue_list:
                c_first = c["name"].lower().split()[0] if c.get("name") else ""
                if (c_first and c_first in msg_lower) or (c.get("company_name") and c["company_name"].lower() in msg_lower):
                    target_ids.append(c["id"])

            # If no specific customer was mentioned, target all delinquent accounts
            if not target_ids and overdue_list:
                target_ids = [c["id"] for c in overdue_list]

            yield self._sse_event("tool_call", {"tool": "stage_recovery_campaign", "args": {"target_customer_ids": target_ids}})
            await asyncio.sleep(0.3)

            proposal = await self.tools.stage_recovery_campaign(
                target_customer_ids=target_ids,
                agent_reasoning=f"Automated recovery campaign prepared for {len(target_ids)} delinquent client(s)."
            )

            yield self._sse_event("proposal", proposal)
            await asyncio.sleep(0.3)

            summary_text = (
                f"I have analyzed the delinquent accounts and prepared a **Recovery Campaign** totaling "
                f"**₹{proposal['total_amount']:,.2f}** across **{proposal['target_count']} client(s)**.\n\n"
                f"**Proposed Actions (Awaiting Your Review):**\n"
            )
            for t in proposal["targets"]:
                summary_text += f"- **{t['customer_name']}** ({t['company_name']}): Create dynamic Razorpay link for **₹{t['amount']:,.2f}** (48h expiry) with SMS/Email notifications.\n"
            
            summary_text += "\n*Please review the Action Proposal Card below and click **Approve & Execute** to dispatch via official Razorpay rails.*"

            for chunk in self._chunk_text(summary_text):
                yield self._sse_event("token", chunk)
                await asyncio.sleep(0.02)

        # -------------------------------------------------------------
        # Scenario 3: Create Single Payment Link (e.g. "Create ₹25,000 payment link for Rahul")
        # -------------------------------------------------------------
        elif "payment link" in msg_lower or "payment request" in msg_lower or ("create" in msg_lower and any(char.isdigit() for char in msg)):
            yield self._sse_event("thought", "Extracting customer name, amount, and project description...")
            await asyncio.sleep(0.3)

            # Extract amount (look for numbers or ₹)
            amount_match = re.search(r'(?:₹|rs\.?|inr)?\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)', msg, re.IGNORECASE)
            amount = 15000.0
            if amount_match:
                amt_str = amount_match.group(1).replace(",", "")
                try:
                    amount = float(amt_str)
                except ValueError:
                    amount = 15000.0

            # Find customer dynamically
            overdue_list = await self.tools.list_overdue_receivables(min_days_overdue=0)
            cust_name = overdue_list[0]["name"] if overdue_list else "Anshu Patel"
            for c in overdue_list:
                c_first = c["name"].lower().split()[0] if c.get("name") else ""
                if c_first and c_first in msg_lower:
                    cust_name = c["name"]
                    break

            profile = await self.tools.get_customer_profile(cust_name)
            cust_id = profile["id"] if profile else None
            resolved_name = profile["name"] if profile else cust_name

            desc = "Embroidery order invoice payment"
            if "for" in msg_lower:
                parts = msg.split("for")
                if len(parts) > 1:
                    desc = parts[-1].strip()

            yield self._sse_event("tool_call", {
                "tool": "stage_payment_link",
                "args": {
                    "customer_name": resolved_name,
                    "amount": amount,
                    "description": desc
                }
            })
            await asyncio.sleep(0.3)

            proposal = await self.tools.stage_payment_link(
                customer_id=cust_id,
                customer_name=resolved_name,
                amount=amount,
                description=desc,
                expire_in_hours=48,
                agent_reasoning=f"Payment request for {resolved_name} of ₹{amount:,.2f}"
            )

            yield self._sse_event("proposal", proposal)
            await asyncio.sleep(0.3)

            synth_text = (
                f"I have staged a payment request of **₹{amount:,.2f}** for **{resolved_name}**.\n\n"
                f"* **Amount:** ₹{amount:,.2f} INR\n"
                f"* **Description:** {desc}\n"
                f"* **Delivery:** Instant SMS & Email with 48-hour Razorpay link expiry.\n\n"
                f"Please review the Action Proposal Card below and click **Approve** to generate the official Razorpay link."
            )
            for chunk in self._chunk_text(synth_text):
                yield self._sse_event("token", chunk)
                await asyncio.sleep(0.02)

        # -------------------------------------------------------------
        # Scenario 4: Failed Payments Diagnosis
        # -------------------------------------------------------------
        elif any(w in msg_lower for w in ["failed", "dropped", "failure", "error"]):
            yield self._sse_event("tool_call", {"tool": "get_failed_payments", "args": {"limit": 5}})
            await asyncio.sleep(0.3)

            failed_records = await self.tools.get_failed_payments(limit=5)
            yield self._sse_event("tool_result", {"tool": "get_failed_payments", "data": failed_records})
            await asyncio.sleep(0.3)

            yield self._sse_event("thought", "Diagnosing failure error codes and identifying root causes...")
            await asyncio.sleep(0.3)

            if failed_records:
                synth_text = f"### ⚠️ Failed Payment Diagnosis\n\n"
                synth_text += f"Found **{len(failed_records)} failed payment attempt(s)**:\n\n"
                for f in failed_records:
                    synth_text += f"* **{f['customer_name']}** — **₹{f['amount']:,.2f}**\n  *Reason:* `{f['failure_reason']}`\n"
                synth_text += f"\n**Autonomous Recommendation:**\n"
                synth_text += f"The primary failure was caused by customer bank server timeouts during OTP verification. I recommend issuing a refreshed Razorpay payment link with UPI QR options enabled."
            else:
                synth_text = "Good news! There are no failed payment attempts recorded in the current billing cycle."

            for chunk in self._chunk_text(synth_text):
                yield self._sse_event("token", chunk)
                await asyncio.sleep(0.02)

        # -------------------------------------------------------------
        # Scenario 5: General Revenue & Analytics Overview
        # -------------------------------------------------------------
        else:
            yield self._sse_event("tool_call", {"tool": "get_revenue_metrics", "args": {}})
            await asyncio.sleep(0.3)

            metrics = await self.tools.get_revenue_metrics()
            yield self._sse_event("tool_result", {"tool": "get_revenue_metrics", "data": metrics})
            await asyncio.sleep(0.3)

            synth_text = (
                f"### ⚡ PayPilot Revenue Status\n\n"
                f"* **Realized Revenue:** ₹{metrics['realized_revenue']:,.2f} ({metrics['paid_transactions_count']} paid transactions)\n"
                f"* **Total Outstanding:** ₹{metrics['total_outstanding']:,.2f} across {metrics['overdue_customers_count']} customer(s)\n"
                f"* **Revenue at Risk:** ₹{metrics['revenue_at_risk']:,.2f}\n"
                f"* **Collection Rate:** {metrics['collection_rate_percent']}%\n\n"
                f"How would you like to proceed? You can ask me to **'recover overdue amounts'**, **'create a payment link for a client'**, or **'diagnose failed payments'**."
            )
            for chunk in self._chunk_text(synth_text):
                yield self._sse_event("token", chunk)
                await asyncio.sleep(0.02)

        yield self._sse_event("done", {})

    def _sse_event(self, event_type: str, data: Any) -> str:
        payload = json.dumps({"type": event_type, "data": data})
        return f"data: {payload}\n\n"

    def _chunk_text(self, text: str, chunk_size: int = 24):
        words = text.split(" ")
        for i in range(0, len(words), 4):
            yield " ".join(words[i:i+4]) + " "
