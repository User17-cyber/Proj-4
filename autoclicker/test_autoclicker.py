"""Checks for the click timing and input rules. Run: python3 -m unittest test_autoclicker.py"""
import time
import unittest

from autoclicker import Clicker, speed_hint, whole_number


class ClickerTest(unittest.TestCase):
    def test_stops_after_total(self):
        done = []
        clicker = Clicker(lambda: done.append(1))
        clicker.start(6000, total=5)
        clicker._thread.join(2)
        self.assertEqual((len(done), clicker.count, clicker.running), (5, 5, False))

    def test_clicks_per_minute(self):
        clicker = Clicker(lambda: None)
        clicker.start(600)  # 10 a second: clicks at 0, 0.1, 0.2, 0.3 s
        time.sleep(0.35)
        clicker.stop()
        self.assertIn(clicker.count, (3, 4, 5))

    def test_stop_is_immediate_even_when_slow(self):
        clicker = Clicker(lambda: None)
        clicker.start(1)  # one click a minute
        began = time.perf_counter()
        clicker.stop()
        self.assertLess(time.perf_counter() - began, 0.5)
        self.assertEqual((clicker.count, clicker.running), (1, False))


class InputTest(unittest.TestCase):
    def test_whole_number(self):
        self.assertEqual(whole_number(" 1,000 ", 1, 6000), 1000)
        for bad in ("", "abc", "0", "6001", "2.5", "-3"):
            self.assertIsNone(whole_number(bad, 1, 6000), bad)

    def test_speed_hint(self):
        self.assertEqual(speed_hint(600), "That's 10 per second.")
        self.assertEqual(speed_hint(30), "That's 1 every 2 seconds.")


if __name__ == "__main__":
    unittest.main()
