"""Auto Clicker: clicks your mouse for you.

F6 starts and stops clicking (on a Mac laptop: fn + F6), and Esc always stops.
The big Start / Stop button in the window does the same with a trackpad or mouse.
"""
import contextlib
import queue
import sys
import threading
import time
import tkinter as tk
from tkinter import font as tkfont
from tkinter import ttk

MAC = sys.platform == "darwin"
MAX_PER_MINUTE = 6000  # 100 clicks a second
MAX_TOTAL = 1_000_000
START_DELAY = 3  # seconds to move the pointer off the Start button before clicking begins

BG, TEXT, MUTED = "#f8fafc", "#0f172a", "#475569"
GREY, ORANGE = "#64748b", "#c2410c"
GREEN, GREEN_DARK, RED, RED_DARK = "#15803d", "#166534", "#dc2626", "#b91c1c"


def whole_number(text, low, high):
    """`text` as a whole number from `low` to `high`, or None if it isn't one."""
    try:
        number = int(text.replace(",", "").strip())
    except ValueError:
        return None
    return number if low <= number <= high else None


def speed_hint(per_minute):
    if per_minute is None:
        return f"Type a whole number from 1 to {MAX_PER_MINUTE:,}."
    if per_minute >= 60:
        return f"That's {per_minute / 60:.3g} per second."
    return f"That's 1 every {60 / per_minute:.3g} seconds."


def clicks(n):
    return f"{n:,} click" + ("" if n == 1 else "s")


class Clicker:
    """Clicks on a background thread so the window stays responsive."""

    def __init__(self, click):
        self.click = click
        self.count = 0
        self._stop = threading.Event()
        self._thread = None

    @property
    def running(self):
        return self._thread is not None and self._thread.is_alive()

    def start(self, per_minute, total=None):
        """Click `per_minute` times a minute until stopped, or until `total` clicks if given."""
        self.stop()
        self.count = 0
        self._stop = threading.Event()
        self._thread = threading.Thread(target=self._run, args=(60 / per_minute, total, self._stop), daemon=True)
        self._thread.start()

    def stop(self):
        self._stop.set()
        if self._thread:
            self._thread.join()

    def _run(self, gap, total, stop):
        next_click = time.perf_counter()
        while not stop.is_set() and (total is None or self.count < total):
            self.click()
            self.count += 1
            # After a stall (say the laptop slept) carry on from now instead of bursting to catch up.
            next_click = max(next_click + gap, time.perf_counter())
            stop.wait(next_click - time.perf_counter())


class App:
    def __init__(self, root, clicker, requests, trusted=True):
        self.root, self.clicker, self.requests = root, clicker, requests
        self.countdown_job = None
        self.countdown_left = 0
        self.target = None
        self.shown = None

        root.title("Auto Clicker")
        root.configure(bg=BG)
        root.resizable(False, False)
        root.attributes("-topmost", True)  # stay reachable while clicks bring other windows to the front
        root.protocol("WM_DELETE_WINDOW", self.quit)

        family = tkfont.nametofont("TkDefaultFont").actual("family")
        style = ttk.Style(root)
        style.theme_use("clam")  # the native Mac theme ignores button colours
        style.configure(".", background=BG, foreground=TEXT, font=(family, 13))
        style.configure("Heading.TLabel", font=(family, 14, "bold"))
        style.configure("Muted.TLabel", foreground=MUTED, font=(family, 11))
        style.configure("Error.TLabel", foreground=RED, font=(family, 11))
        style.map("TRadiobutton", background=[("active", BG)])
        for name, color, dark in (("Start", GREEN, GREEN_DARK), ("Stop", RED, RED_DARK)):
            style.configure(f"{name}.TButton", font=(family, 18, "bold"), foreground="white", background=color,
                            bordercolor=color, lightcolor=color, darkcolor=color, focuscolor="white", padding=12)
            style.map(f"{name}.TButton", background=[("active", dark)],
                      lightcolor=[("active", dark)], darkcolor=[("active", dark)])

        page = ttk.Frame(root, padding=20)
        page.pack(fill="both")
        if not trusted:
            tk.Label(page, bg="#fef3c7", fg=TEXT, font=(family, 11), justify="left", wraplength=320, padx=10, pady=8,
                     text="Your Mac hasn't allowed this app to click or see key presses yet. Open System Settings "
                          "→ Privacy & Security, turn on Terminal under Accessibility and under Input Monitoring, "
                          "then close and reopen the Auto Clicker.").pack(fill="x", pady=(0, 12))

        self.status = tk.StringVar()
        self.status_label = tk.Label(page, textvariable=self.status, fg="white", font=(family, 20, "bold"), pady=10)
        self.status_label.pack(fill="x")
        self.detail = tk.StringVar()
        ttk.Label(page, textvariable=self.detail, style="Muted.TLabel").pack(pady=(6, 16))

        ttk.Label(page, text="How fast?", style="Heading.TLabel").pack(anchor="w")
        row = ttk.Frame(page)
        row.pack(anchor="w", pady=(4, 0))
        self.speed = tk.StringVar(value="600")
        speed_box = ttk.Spinbox(row, textvariable=self.speed, from_=1, to=MAX_PER_MINUTE, increment=10, width=7)
        speed_box.pack(side="left")
        ttk.Label(row, text="clicks per minute").pack(side="left", padx=(8, 0))
        hint = tk.StringVar(value=speed_hint(600))
        self.speed.trace_add("write", lambda *_: hint.set(speed_hint(whole_number(self.speed.get(), 1, MAX_PER_MINUTE))))
        ttk.Label(page, textvariable=hint, style="Muted.TLabel").pack(anchor="w", pady=(2, 16))

        ttk.Label(page, text="How many?", style="Heading.TLabel").pack(anchor="w")
        self.mode = tk.StringVar(value="forever")
        forever = ttk.Radiobutton(page, text="Keep clicking until I stop it", variable=self.mode, value="forever")
        forever.pack(anchor="w", pady=(4, 2))
        row = ttk.Frame(page)
        row.pack(anchor="w")
        limited = ttk.Radiobutton(row, text="Stop after", variable=self.mode, value="limit")
        limited.pack(side="left")
        self.total = tk.StringVar(value="100")
        total_box = ttk.Spinbox(row, textvariable=self.total, from_=1, to=MAX_TOTAL, increment=10, width=8)
        total_box.pack(side="left", padx=6)
        total_box.bind("<FocusIn>", lambda _: self.mode.set("limit"))  # typing a number means they want a limit
        ttk.Label(row, text="clicks").pack(side="left")

        self.error = tk.StringVar()
        ttk.Label(page, textvariable=self.error, style="Error.TLabel", wraplength=320).pack(anchor="w", pady=(8, 0))
        self.button = ttk.Button(page, command=lambda: self.toggle(START_DELAY), cursor="hand2")
        self.button.pack(fill="x", pady=(8, 16))

        key = "F6 (or fn + F6)" if MAC else "F6"
        ttk.Label(page, style="Muted.TLabel", justify="left", wraplength=320, text=(
            f"Keyboard: {key} starts or stops, Esc stops.\n"
            f"After you click Start you get {START_DELAY} seconds to move your pointer to the spot to click."
        )).pack(anchor="w")

        self.inputs = [speed_box, forever, limited, total_box]
        self.poll()

    def toggle(self, delay=0):
        if self.countdown_job or self.clicker.running:
            self.stop()
        else:
            self.start(delay)

    def start(self, delay):
        per_minute = whole_number(self.speed.get(), 1, MAX_PER_MINUTE)
        limited = self.mode.get() == "limit"
        total = whole_number(self.total.get(), 1, MAX_TOTAL) if limited else None
        if per_minute is None:
            self.error.set(f"Clicks per minute must be a whole number from 1 to {MAX_PER_MINUTE:,}.")
        elif limited and total is None:
            self.error.set(f"Number of clicks must be a whole number from 1 to {MAX_TOTAL:,}.")
        else:
            self.error.set("")
            self.target = total
            self.count_down(delay, per_minute, total)
        self.render()

    def count_down(self, left, per_minute, total):
        self.countdown_left = left
        if left:
            self.countdown_job = self.root.after(1000, self.count_down, left - 1, per_minute, total)
        else:
            self.countdown_job = None
            self.clicker.start(per_minute, total)
        self.render()

    def stop(self):
        if self.countdown_job:
            self.root.after_cancel(self.countdown_job)
            self.countdown_job = None
        self.clicker.stop()
        self.render()

    def poll(self):
        """Handle shortcut presses (they arrive from another thread) and refresh the counter."""
        while not self.requests.empty():
            if self.requests.get() == "toggle":
                self.toggle()
            else:
                self.stop()
        self.render()
        self.root.after(100, self.poll)

    def render(self):
        count = self.clicker.count
        if self.countdown_job:
            state = "countdown"
            self.status.set(f"Starting in {self.countdown_left}…")
            self.detail.set("Move your pointer to the spot to click.")
        elif self.clicker.running:
            state = "on"
            self.status.set("ON – clicking")
            self.detail.set(f"{count:,} of {clicks(self.target)}" if self.target else f"{clicks(count)} so far")
        else:
            state = "off"
            self.status.set("OFF")
            self.detail.set(f"Last run: {clicks(count)}" if count else "Ready when you are.")
        if state != self.shown:
            self.shown = state
            self.status_label.configure(bg={"off": GREY, "countdown": ORANGE, "on": GREEN}[state])
            self.button.configure(text={"off": "Start", "countdown": "Cancel", "on": "Stop"}[state],
                                  style="Start.TButton" if state == "off" else "Stop.TButton")
            for widget in self.inputs:
                widget.state(["!disabled" if state == "off" else "disabled"])

    def quit(self):
        self.clicker.stop()
        self.root.destroy()


def listen_for_shortcuts(requests):
    """Start the system-wide F6 / Esc listener and return it once it's running."""
    from pynput import keyboard

    if MAC:
        # shortcut: pynput reads the keyboard layout on its own thread, which newer macOS kills the app for.
        # F6 and Esc don't need the layout, so skip it. Remove once pynput reads it on the main thread.
        import pynput.keyboard._darwin as darwin
        darwin.keycode_context = lambda: contextlib.nullcontext((None, None))

    actions = {keyboard.Key.f6: "toggle", keyboard.Key.esc: "stop"}
    held = set()  # ignore key auto-repeat so holding F6 doesn't flip on and off

    def on_press(key):
        if key in actions and key not in held:
            held.add(key)
            requests.put(actions[key])

    def on_release(key):
        held.discard(key)

    listener = keyboard.Listener(on_press=on_press, on_release=on_release)
    listener.start()
    listener.wait()
    return listener


def main():
    requests = queue.SimpleQueue()
    listener = listen_for_shortcuts(requests)  # before Tk starts: pynput on macOS is touchy about the order
    from pynput import mouse

    pointer = mouse.Controller()
    root = tk.Tk()
    App(root, Clicker(lambda: pointer.click(mouse.Button.left)), requests,
        trusted=getattr(listener, "IS_TRUSTED", True))
    root.mainloop()


if __name__ == "__main__":
    main()
