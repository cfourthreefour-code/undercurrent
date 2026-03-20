"""Email parser tests."""

from pathlib import Path

from src.parser.email_parser import (
    ParsedEmail,
    normalize_email,
    parse_email_file,
    parse_recipients,
)


class TestNormalizeEmail:
    def test_plain(self):
        assert normalize_email("john@enron.com") == "john@enron.com"

    def test_uppercase(self):
        assert normalize_email("John.Smith@Enron.COM") == "john.smith@enron.com"

    def test_angle_brackets(self):
        assert normalize_email("John Smith <john.smith@enron.com>") == "john.smith@enron.com"

    def test_quoted(self):
        assert normalize_email('"Smith, John" <john.smith@enron.com>') == "john.smith@enron.com"

    def test_whitespace(self):
        assert normalize_email("  john@enron.com  ") == "john@enron.com"


class TestParseRecipients:
    def test_one(self):
        assert parse_recipients("john@enron.com") == ["john@enron.com"]

    def test_multiple(self):
        result = parse_recipients("john@enron.com, jane@enron.com")
        assert len(result) == 2
        assert "john@enron.com" in result
        assert "jane@enron.com" in result

    def test_with_display_names(self):
        result = parse_recipients("John Smith <john@enron.com>, Jane Doe <jane@enron.com>")
        assert result == ["john@enron.com", "jane@enron.com"]

    def test_none_input(self):
        assert parse_recipients(None) == []

    def test_empty_string(self):
        assert parse_recipients("") == []


class TestParseEmailFile:
    def test_basic(self, fixtures_dir):
        msg = parse_email_file(fixtures_dir / "email_01.txt", folder="smith-j/sent")
        assert msg is not None
        assert msg.sender == "john.smith@enron.com"
        assert "jane.doe@enron.com" in msg.recipients_to
        assert "bob.jones@enron.com" in msg.recipients_to
        assert "alice.wong@enron.com" in msg.recipients_cc
        assert msg.subject == "Q3 Budget Review"
        assert "Q3 budget numbers" in msg.body
        assert msg.date is not None
        assert msg.message_id == "<test001@enron.com>"

    def test_reply(self, fixtures_dir):
        msg = parse_email_file(fixtures_dir / "email_02.txt")
        assert msg is not None
        assert msg.sender == "jane.doe@enron.com"
        assert msg.recipients_to == ["john.smith@enron.com"]
        assert "Re:" in msg.subject

    def test_broadcast(self, fixtures_dir):
        msg = parse_email_file(fixtures_dir / "email_03.txt")
        assert msg is not None
        assert len(msg.recipients_to) == 6

    def test_bcc(self, fixtures_dir):
        msg = parse_email_file(fixtures_dir / "email_04.txt")
        assert msg is not None
        assert "hr.department@enron.com" in msg.recipients_bcc

    def test_external_recipient(self, fixtures_dir):
        msg = parse_email_file(fixtures_dir / "email_05.txt")
        assert msg is not None
        assert "external.partner@gmail.com" in msg.recipients_to

    def test_system_email_skipped(self, fixtures_dir):
        msg = parse_email_file(fixtures_dir / "email_06_system.txt")
        assert msg is None, "system/calendar emails should be filtered"

    def test_empty_body_skipped(self, fixtures_dir):
        msg = parse_email_file(fixtures_dir / "email_07_empty.txt")
        assert msg is None, "empty body emails should be filtered"

    def test_from_with_name(self, fixtures_dir):
        msg = parse_email_file(fixtures_dir / "email_08.txt")
        assert msg is not None
        assert msg.sender == "sara.lee@enron.com"
        assert msg.recipients_to == ["bob.jones@enron.com"]

    def test_cc_list(self, fixtures_dir):
        msg = parse_email_file(fixtures_dir / "email_09.txt")
        assert msg is not None
        assert len(msg.recipients_cc) == 2
        assert "bob.jones@enron.com" in msg.recipients_cc
        assert "alice.wong@enron.com" in msg.recipients_cc

    def test_all_valid_fixtures_parse(self, fixtures_dir):
        """every non-system non-empty fixture should parse"""
        valid = [f for f in fixtures_dir.glob("email_*.txt")
                 if "system" not in f.name and "empty" not in f.name]
        for fp in valid:
            result = parse_email_file(fp)
            assert result is not None, "failed to parse %s" % fp.name
            assert result.sender
            assert result.body
            assert result.message_id
