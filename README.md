# 🌍👑 World Power Climb

A premium, high-end endless climbing arcade game featuring world leaders, chaotic memes, and dynamic physics! Ascend to the top of the global stage using custom currencies, avoiding political pitfalls, and listening to iconic quotes.

## 💎 Features

*   **Premium Gold & Burgundy UI:** A sleek, expensive "billion-dollar" aesthetic with beautiful gradients, glassmorphism, and responsive CSS animations.
*   **Unique Politicians & Currencies:** Play as Modi, Trump, Putin, Zelensky, Xi, or Kim. Each character collects their respective currency (₹, $, ₽, ₴, ¥, ₩) accompanied by unique colors and custom character sprites.
*   **Pre-recorded Audio Quotes:** Includes real `.mp3` voiceovers and legendary quotes ("Mitron!", "TREMENDOUS!", "Bear mode activated!") that play dynamically as you climb.
*   **Meme Soundboard:** In-game synthesized meme sound effects (Vine boom, Metal pipe, Emotional Damage, Roblox Oof) integrated right into the jumps, falls, and combos!
*   **Jet Boosters & Coins:** Collect custom currency to boost your score, and grab rocket boosters for massive leaps with a glorious fire particle trail!
*   **Advanced Platform Physics:** Normal, Breaking, Moving, Disappearing, and "Fake" platforms that test your reaction time.
*   **Mobile Touch Controls:** Seamless fluid split-screen tap zones designed specifically for mobile play.

## 🎮 How to Play

### ⚠️ Important: Run with a Local Server
Due to browser CORS and security rules restricting the loading of local `json` and `mp3` files, **you cannot just double-click `index.html`**. 

**Option 1: VS Code Live Server (Recommended)**
1. Install the **Live Server** extension in VS Code.
2. Right-click `index.html` -> "Open with Live Server".

**Option 2: Node.js / npx**
1. Open your terminal in the project folder.
2. Run: `npx -y serve .`

### Controls

| Action | Desktop | Mobile / Touch |
| :--- | :--- | :--- |
| **Move Left** | `A` or `←` Arrow | Tap/Hold Left Half of Screen |
| **Move Right** | `D` or `→` Arrow | Tap/Hold Right Half of Screen |
| **Start / Restart** | `Spacebar` / Click | Tap "Play" Button |

## 🏗️ Platform Types

| Platform | Appearance | Behavior |
| :--- | :--- | :--- |
| 🟢 **Normal** | Grass Green | Stable and safe. |
| 🔴 **Breaking** | Cracked Red | Crumbles as soon as you jump off! |
| 🔵 **Moving** | Glowing Blue | Slides left and right. |
| 🟣 **Disappearing**| Pulsing Purple | Fades away shortly after being touched. |
| ❓ **Fake** | Faint Green | Don't trust it! You will fall right through. |

## 🌪️ Difficulty Zones

As you climb higher, the political climate gets spicier:
1.  **Beginner Zone** (0–500m) – Easy platforms, gentle start.
2.  **Mid Zone** (500–1500m) – Slippery! Breaking & moving platforms begin to appear.
3.  **Hard Zone** (1500–3000m) – CRISIS MODE! Faster pacing, fake platforms, and disappearing platforms.
4.  **CHAOS Zone** (3000m+) – Total world chaos and maximum meme overload!

## 📁 Project Structure

```text
MyGame/
├── index.html           # Main Game UI & Structure
├── style.css            # Animations, Layout, and Premium Theming
├── script.js            # Core Game Engine (Canvas, physics, state)
├── README.md            # You are here!
├── assets/
│   ├── images/          # Politician portraits and sprites
│   └── audio/           # MP3 files for character quotes
└── data/
    ├── levels.json      # Dynamic logic handling game progression zones
    └── texts.json       # Configured quotes and meme pop-up text pools
```

## 🛠️ Tech Stack

*   **HTML5 Canvas API:** Custom 2D rendering and particle physics.
*   **Vanilla JavaScript:** Zero external JS frameworks. Fully built from scratch.
*   **Web Audio API & HTMLAudioElement:** Combining real `.mp3` playbacks with in-browser oscillators for rich SFX without bloated audio assets.
*   **Vanilla CSS3:** Utilizing variables, transforms, drop-shadows, and transitions.

## 🤝 Contribution
Made for fun, meme dominance, and political satire! 🌍💥
