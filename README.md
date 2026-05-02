# 🧠 Calm Before the Portfolio

A zero-gravity 3D landing page built for HR professionals visiting my portfolio.

The idea: before diving into my work, give them a moment to breathe — and a way to physically release the stress of their day by knocking around all the things that overwhelm them: emails, deadlines, calendars, resumes.

**Move your cursor. Hit something. Feel better.**

---

## ✨ What It Does

A physics-driven 3D scene where 10 HR-relevant objects float in zero gravity around the screen. A white tracking circle follows your cursor. When it touches any object — it flies away with realistic momentum, spin, and a satisfying soft collision sound.

Objects drift back to their home positions over time. The loop is intentional: it always resets, just like tomorrow.

---

## 🎯 Objects & Why They're There

| Object | Why |
|---|---|
| 📄 Resume stack | The thing HRs read all day |
| 📅 Calendar | Back-to-back interview slots |
| 📧 Email (99+) | The inbox that never empties |
| ☕ Coffee cup | Caffeine-powered survival |
| 💻 Laptop | Their primary battlefield |
| 📱 iPhone 16 Pro | Slack pings at 11pm |
| 💼 Briefcase | Work itself |
| 🕐 Clock | Deadline pressure |
| `</>` Code window | They hire developers — this is who I am |
| 🪪 ID Badge | Onboarding new hires |
| 🔮 Gradient sphere | A moment of calm in the chaos |

---

## 🛠 Tech Stack

- **React** + **@react-three/fiber** (Three.js wrapper)
- **Custom physics engine** — no Cannon.js, no Rapier. ~80 lines of Verlet integration with:
  - Mouse-circle repulsion (impulse-based)
  - Brownian drift (organic floating)
  - Soft spring return to home
  - Sphere-sphere collision
  - Rotational inertia + angular damping
- **Custom GLSL shader** — gradient sphere uses fresnel + vertical color gradient
- **Web Audio API** — collision sound generated programmatically (no audio files)
- **Blender 5.1** — all 3D models built via Python scripting through BlenderMCP

---

## 🚀 Getting Started

```bash
# Clone
git clone https://github.com/abhinavmittal33/calm-before-portfolio.git
cd calm-before-portfolio

# Install
npm install

# Run
npm run dev
```

Open `http://localhost:5173` and move your mouse.

---

## 📁 Project Structure

```
├── public/
│   └── models/          # 10 GLB files (built in Blender)
│       ├── resume.glb
│       ├── calendar.glb
│       ├── email_99.glb
│       ├── coffee_cup.glb
│       ├── laptop.glb
│       ├── phone.glb
│       ├── briefcase.glb
│       ├── clock.glb
│       ├── code_window.glb
│       └── id_badge.glb
├── src/
│   ├── ZeroGravityLanding.jsx   # Everything — physics, models, shaders
│   ├── App.jsx
│   └── main.jsx
├── index.html
└── vite.config.js
```

---

## 🎨 Physics Tuning

Inside `ZeroGravityLanding.jsx`, in the `Body.update()` method:

```js
const PUSH   = 58    // How hard objects fly on circle contact
const SPRING = 0.055 // How fast they drift back home (lower = lazier)
const DAMP   = 0.977 // Velocity decay per frame (higher = floatier)
```

---

## 💡 Inspiration

Most portfolio landing pages say "Hi, I'm X, I do Y."  
This one says: *take a breath first.*

The psychological principle: giving someone agency — even something as small as knocking virtual objects around — lowers cortisol and creates positive emotional priming before they evaluate your work.

---

## 👤 Built By

**Abhinav Mittal**  
BTech CSE @ Parul University  
[abhinavmittal33@gmail.com](mailto:abhinavmittal33@gmail.com)

---

*Built entirely with Claude + Blender MCP. Every model scripted in Python, every physics interaction written from scratch.*
