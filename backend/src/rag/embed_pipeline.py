"""Embedding pipeline - populates ChromaDB with email chunks."""

import json
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[3] / ".env")

from src.parser.email_parser import parse_all_emails
from src.parser.enron_extractor import DEFAULT_OUTPUT
from src.rag.embedder import embed_emails

OUTPUT_DIR = Path(__file__).resolve().parents[2] / "output"


def main():
    print("Loading parsed emails...")
    emails = parse_all_emails(DEFAULT_OUTPUT)

    # load communities if available (for metadata)
    comms = None
    comms_path = OUTPUT_DIR / "communities.json"

    if comms_path.exists():
        with open(comms_path) as f:
            comms = json.load(f)

        # convert to partition dict if needed
        if "communities" in comms and "partition" not in comms:
            part = {}
            for c in comms["communities"]:
                for m in c["members"]:
                    part[m] = c["id"]
            comms["partition"] = part

    print("Starting embedding pipeline...")
    embed_emails(emails, communities=comms)
    print("Done!")


if __name__ == "__main__":
    main()
