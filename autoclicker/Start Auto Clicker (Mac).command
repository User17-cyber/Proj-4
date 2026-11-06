#!/bin/bash
# Double-click this file to open the Auto Clicker on a Mac.
cd "$(dirname "$0")" || exit 1

if ! .venv/bin/python -c "import pynput" 2>/dev/null; then
  # Apple's built-in Python has an old window toolkit that draws blank windows; python.org's works.
  if ! python3 -c "import sys, tkinter; sys.exit(tkinter.TkVersion < 8.6)" 2>/dev/null; then
    echo "Please install Python from https://www.python.org/downloads/ and then double-click this file again."
    read -r -p "Press Return to close this window."
    exit 1
  fi
  echo "First run: getting things ready (this takes a minute)..."
  rm -rf .venv
  if ! { python3 -m venv .venv && .venv/bin/pip install --quiet -r requirements.txt; }; then
    read -r -p "Setup failed (see above). Press Return to close this window."
    exit 1
  fi
fi

.venv/bin/python autoclicker.py
