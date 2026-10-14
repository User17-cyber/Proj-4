# Sprinkle Town Tycoon

A bright, cartoony idle tycoon game that runs in any modern browser. Start with one lemonade stand, open ten shops, hire animal managers to run them for you, and grow Sprinkle Town into a coin empire.

## Play

Open `index.html` in a browser. There is no build step and nothing to install.

To serve it locally instead (handy on a phone on the same network):

```sh
npx http-server .
# or
python3 -m http.server
```

It also works as-is on GitHub Pages: enable Pages for this branch and open the site.

## How to play

- **Watch your shops work.** Every shop has its own little street: customers line up, get served when a batch finishes, and walk off with their lemonade, ice cream, donut and so on, while coins fly up into your coin counter.
- **Tap a shop's street** to start a batch. When the bar fills, the customer at the front is served and you get paid.
- **Buy more** of a shop to earn more per batch, and its line of customers grows. Owning 10, 25, 50, 100… of a shop makes it **twice as fast** each time and opens a new branch building behind it. Busy shops get delivery vans.
- **Open new shops**: Lemonade Stand → Ice Cream Cart → Donut Shop → Pizza Parlor → Toy Store → Candy Factory → Bouncy Park → Cartoon Studio → Rocket Diner → Moon Mall.
- **Hire managers** (Managers tab). They stand outside their shop, wave, and keep it running without taps, even while the game is closed (up to 8 hours of pay).
- **Buy upgrades** (Upgrades tab) to triple a shop's profit, or every shop's. Each one adds a gold star to the shop's rating.
- **Pop lucky balloons** when they float by for a coin shower or a 30-second Sugar Rush (triple profit).
- **Hold a Grand Reopening** (Sprinkles tab) to start over with golden sprinkles. Each sprinkle adds +2% profit forever.
- **Collect trophies** for +1% profit each.

Use the ×1 / ×10 / ×100 / Max switch to buy in bulk. The game saves itself in your browser every few seconds; the Trophies tab has a save code you can copy to move your town to another browser.

## Project layout

| File | What it holds |
| --- | --- |
| `index.html` | Page structure: header, five menu tabs, bottom tab bar |
| `css/style.css` | All styling: colors, chunky cartoon buttons and cards, animations |
| `js/core.js` | Game rules and numbers: shops, prices, managers, upgrades, trophies, saving. No page code, so it also runs in Node |
| `js/art.js` | Cartoon drawings as inline SVG: shops, the treats customers buy, animal managers, icons |
| `js/scene.js` | The animated street drawn on a canvas in each shop card: customers, managers, coins, branches, vans |
| `js/game.js` | Everything on screen: menus, taps, game clock, sounds, balloons, saving |
| `tools/simulate.js` | A bot that plays the game quickly to check the pacing after changing numbers |

To check pacing after tweaking numbers in `js/core.js`:

```sh
node tools/simulate.js 45        # 45 minutes of play from a fresh start
node tools/simulate.js 45 100    # the same, starting with 100 golden sprinkles
```
