from decimal import Decimal, ROUND_HALF_UP
from typing import Union

def rupees_to_paise(amount_rupees: Union[int, float, Decimal, str]) -> int:
    """
    Deterministically convert a rupee amount to integer paise.
    Uses Decimal with ROUND_HALF_UP to avoid floating point precision inaccuracies.
    Example: 25000.50 -> 2500050
    """
    if isinstance(amount_rupees, str):
        # Remove currency symbols and commas if present
        clean_str = amount_rupees.replace("₹", "").replace(",", "").strip()
        dec_amount = Decimal(clean_str)
    elif isinstance(amount_rupees, (int, float)):
        dec_amount = Decimal(str(amount_rupees))
    elif isinstance(amount_rupees, Decimal):
        dec_amount = amount_rupees
    else:
        raise ValueError(f"Unsupported amount type: {type(amount_rupees)}")

    if dec_amount < Decimal("0"):
        raise ValueError("Financial amount cannot be negative")

    # Multiply by 100 to get paise and round to nearest integer
    paise = (dec_amount * Decimal("100")).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    return int(paise)


def paise_to_rupees(amount_paise: int) -> Decimal:
    """
    Deterministically convert integer paise to Decimal rupees with 2 decimal places.
    Example: 2500050 -> Decimal('25000.50')
    """
    if not isinstance(amount_paise, int):
        amount_paise = int(amount_paise)

    if amount_paise < 0:
        raise ValueError("Paise amount cannot be negative")

    dec_paise = Decimal(str(amount_paise))
    return (dec_paise / Decimal("100")).quantize(Decimal("0.01"))


def format_inr(amount_paise: int) -> str:
    """
    Format integer paise as Indian Rupee string.
    Example: 7550000 -> '₹75,500.00'
    """
    rupees = paise_to_rupees(amount_paise)
    # Format with Indian numbering format or standard standard currency representation
    return f"₹{rupees:,.2f}"
