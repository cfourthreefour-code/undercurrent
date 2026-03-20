"""Parse Enron maildir emails into structured records."""

import email
import re
from dataclasses import dataclass, field
from datetime import datetime
from email.utils import parseaddr, parsedate_to_datetime
from pathlib import Path


@dataclass
class ParsedEmail:
    message_id: str
    sender: str
    recipients_to: list[str] = field(default_factory=list)
    recipients_cc: list[str] = field(default_factory=list)
    recipients_bcc: list[str] = field(default_factory=list)
    subject: str = ""
    body: str = ""
    date: datetime | None = None
    folder: str = ""


# folder names that count as "sent" mail
SENT_FOLDERS = {"sent", "_sent_mail", "sent_items", "sent_mail"}

# skip system/calendar junk
SYSTEM_SUBJECTS = re.compile(
    r"(calendar|meeting|out of office|automatic reply|undeliverable|"
    r"delivery status|returned mail|postmaster)",
    re.IGNORECASE,
)


def normalize_email(raw: str) -> str:
    """Grab email from 'Name <addr>' format, lowercase, strip whitespace."""
    _, addr = parseaddr(raw)
    if addr:
        return addr.strip().lower()
    # fallback: just clean the raw string
    return raw.strip().lower().strip("<>")


def parse_recipients(hdr: str | None) -> list[str]:
    """Parse To/CC/BCC header into list of normalized emails."""
    if not hdr:
        return []

    # split on commas, but don't break quoted names
    parts = re.split(r",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)", hdr)
    addrs = []
    for p in parts:
        addr = normalize_email(p)
        if addr and "@" in addr:
            addrs.append(addr)
    return addrs


def parse_email_file(fpath: Path, folder: str = "") -> ParsedEmail | None:
    """Parse a single email file.

    Returns None if it should be skipped (missing sender, no body, system msg, etc).
    """
    try:
        data = fpath.read_bytes()
        msg = email.message_from_bytes(data)
    except Exception:
        return None  # can't read it, skip

    # get sender
    sender = normalize_email(msg.get("From", ""))
    if not sender or "@" not in sender:
        return None

    # get message id (or generate fallback)
    msg_id = msg.get("Message-ID", "").strip()
    if not msg_id:
        msg_id = f"<{fpath.name}@local>"

    # get subject
    subj = msg.get("Subject", "") or ""

    # filter system emails
    if SYSTEM_SUBJECTS.search(subj):
        return None

    # extract body text
    body = ""
    if msg.is_multipart():
        # walk parts looking for text/plain
        for part in msg.walk():
            if part.get_content_type() == "text/plain":
                payload = part.get_payload(decode=True)
                if payload:
                    body = payload.decode("utf-8", errors="replace")
                    break
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            body = payload.decode("utf-8", errors="replace")

    body = body.strip()
    if not body:
        return None  # no content, skip

    # parse date
    dt = None
    date_str = msg.get("Date", "")
    if date_str:
        try:
            dt = parsedate_to_datetime(date_str)
        except Exception:
            pass  # just leave it None if can't parse

    # get recipients
    to = parse_recipients(msg.get("To"))
    cc = parse_recipients(msg.get("Cc") or msg.get("CC"))
    bcc = parse_recipients(msg.get("Bcc") or msg.get("BCC"))

    return ParsedEmail(
        message_id=msg_id,
        sender=sender,
        recipients_to=to,
        recipients_cc=cc,
        recipients_bcc=bcc,
        subject=subj,
        body=body,
        date=dt,
        folder=folder,
    )


def iter_sent_folders(maildir: Path):
    """Yield (email_file, folder_name) for all emails in sent folders."""
    for user_dir in sorted(maildir.iterdir()):
        if not user_dir.is_dir():
            continue

        for folder_name in SENT_FOLDERS:
            sent_dir = user_dir / folder_name
            if not sent_dir.exists():
                continue

            for fpath in sent_dir.rglob("*"):
                if fpath.is_file() and not fpath.name.startswith("."):
                    yield fpath, f"{user_dir.name}/{folder_name}"


def parse_all_emails(maildir: Path, progress: bool = True) -> list[ParsedEmail]:
    """Parse all sent emails from Enron maildir.

    Returns list of ParsedEmail objects. Deduplicates by message_id.
    """
    emails = []
    seen_ids: set[str] = set()
    files_seen = 0
    filtered = 0

    for fpath, folder in iter_sent_folders(maildir):
        files_seen += 1
        email_obj = parse_email_file(fpath, folder=folder)

        if email_obj is None:
            filtered += 1
            continue

        # dedupe by msg id
        if email_obj.message_id in seen_ids:
            filtered += 1
            continue

        seen_ids.add(email_obj.message_id)
        emails.append(email_obj)

        if progress and len(emails) % 10000 == 0:
            print(f"  Parsed {len(emails)} emails ({files_seen} files scanned)")

    if progress:
        print(f"Done: {len(emails)} emails from {files_seen} files ({filtered} filtered)")

    return emails


if __name__ == "__main__":
    import random
    from .enron_extractor import DEFAULT_OUTPUT

    maildir = DEFAULT_OUTPUT
    if not maildir.exists():
        from .enron_extractor import extract_enron
        maildir = extract_enron()

    emails = parse_all_emails(maildir)
    print(f"\nTotal: {len(emails)} emails")
    print(f"\nRandom sample:")
    for e in random.sample(emails, min(5, len(emails))):
        print(f"  From: {e.sender}")
        print(f"  To: {', '.join(e.recipients_to[:3])}")
        print(f"  Subject: {e.subject[:80]}")
        print(f"  Date: {e.date}")
        print(f"  Body: {e.body[:100]}...")
        print()
