"""Extracts the Enron email dataset from tar.gz."""

import tarfile
from pathlib import Path


DEFAULT_ARCHIVE = Path(__file__).resolve().parents[3] / "data" / "enron_mail_20150507.tar.gz"
DEFAULT_OUTPUT = Path(__file__).resolve().parents[3] / "data" / "maildir"


def extract_enron(
    archive: Path = DEFAULT_ARCHIVE,
    out_dir: Path | None = None,
) -> Path:
    """Unpack the enron tar.gz into data/maildir/.

    Returns path to the extracted maildir. Skips if already there.
    """
    if out_dir is None:
        out_dir = archive.parent

    maildir = out_dir / "maildir"

    # already got it? skip extraction
    if maildir.exists() and any(maildir.iterdir()):
        print(f"Maildir exists at {maildir}, skipping.")
        return maildir

    print(f"Extracting {archive.name}...")
    with tarfile.open(archive, "r:gz") as tar:
        tar.extractall(path=out_dir, filter="data")

    # sometimes archives nest under a different name, rename if needed
    if not maildir.exists():
        candidates = [p for p in out_dir.iterdir() if p.is_dir() and p.name != "maildir"]
        if candidates:
            candidates[0].rename(maildir)

    print(f"Done. Maildir at {maildir}")
    return maildir


if __name__ == "__main__":
    extract_enron()
