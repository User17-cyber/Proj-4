# Auto Clicker

A small desktop app that clicks your mouse for you, wherever your pointer is.

## Open it

You need Python 3 from [python.org](https://www.python.org/downloads/) (free). The first launch takes about a minute to set itself up; after that it opens straight away.

- **Mac:** double-click `Start Auto Clicker (Mac).command`. If your Mac says it can't open it, right-click it, choose **Open**, then **Open** again.
  The first time, your Mac also has to let it control the mouse: open **System Settings → Privacy & Security**, turn on **Terminal** under both **Accessibility** and **Input Monitoring**, then close the Auto Clicker and open it again. The app shows a yellow note until you've done this.
- **Windows:** double-click `Start Auto Clicker (Windows).bat`.
- **Linux:** `python3 -m venv .venv && .venv/bin/pip install -r requirements.txt && .venv/bin/python autoclicker.py`

## Use it

1. **How fast?** Type how many clicks you want per minute (1 to 6,000). The line underneath says what that means, for example "That's 10 per second".
2. **How many?** Pick **Keep clicking until I stop it**, or **Stop after** and type a number of clicks.
3. **Turn it on and off** either way:
   - **Keyboard:** press **F6** to start or stop clicking right where your pointer is. On a Mac laptop press **fn + F6**. **Esc** always stops it.
   - **Trackpad or mouse:** click the big green **Start** button. You get 3 seconds to move your pointer to the spot you want clicked, then it starts. Click the red **Stop** button to turn it off.

The window stays on top of your other windows so you can always reach the Stop button. The bar at the top shows **OFF**, **Starting in 3…** or **ON – clicking**, with a count of the clicks so far.

## Files

| File | What it is |
| --- | --- |
| `autoclicker.py` | The app |
| `test_autoclicker.py` | Checks for the click timing and settings: `python3 -m unittest test_autoclicker.py` |
| `Start Auto Clicker (Mac).command`, `Start Auto Clicker (Windows).bat` | Double-click launchers that set things up on the first run |
| `requirements.txt` | The one extra library it uses, [pynput](https://pypi.org/project/pynput/), for clicking and the F6 / Esc keys |
