"""shared fixtures for tests"""

from pathlib import Path

import pytest

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture
def fixtures_dir():
    return FIXTURES


@pytest.fixture
def sample_email_paths(fixtures_dir):
    """all non-system, non-empty fixture emails"""
    return sorted(fixtures_dir.glob("email_*.txt"))
