import pytest
from decimal import Decimal
from app.core.money import rupees_to_paise, paise_to_rupees, format_inr

def test_rupees_to_paise_conversion():
    assert rupees_to_paise(25000) == 2500000
    assert rupees_to_paise(25000.50) == 2500050
    assert rupees_to_paise("25,000.00") == 2500000
    assert rupees_to_paise("₹42,000") == 4200000
    assert rupees_to_paise(Decimal("8500.75")) == 850075
    assert rupees_to_paise(0) == 0

def test_rupees_to_paise_negative_fails():
    with pytest.raises(ValueError, match="cannot be negative"):
        rupees_to_paise(-100)

def test_paise_to_rupees_conversion():
    assert paise_to_rupees(2500000) == Decimal("25000.00")
    assert paise_to_rupees(2500050) == Decimal("25000.50")
    assert paise_to_rupees(850075) == Decimal("8500.75")
    assert paise_to_rupees(0) == Decimal("0.00")

def test_paise_to_rupees_negative_fails():
    with pytest.raises(ValueError, match="cannot be negative"):
        paise_to_rupees(-500)

def test_format_inr():
    assert format_inr(7550000) == "₹75,500.00"
    assert format_inr(4200000) == "₹42,000.00"
    assert format_inr(0) == "₹0.00"
