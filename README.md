<div align="center">

# 🌌 Zero Gravity Landing Page

**A physics-driven 3D landing page built for HR professionals visiting my portfolio.**

*Before they see my work — give them a moment to breathe.*

[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Three.js](https://img.shields.io/badge/Three.js-r167-black?style=for-the-badge&logo=three.js)](https://threejs.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

</div>

---

## The Idea

Most portfolio landing pages say *"Hi, I'm X, I do Y."*

This one says: **take a breath first.**

HR professionals spend their day buried in resumes, back-to-back interviews, Slack pings, and calendar hell. Before they evaluate my work, I give them something different — a zero-gravity room where they can knock all of it around.

> Move your cursor. Hit something. Feel better.

The psychological principle: giving someone agency — even something as small as knocking virtual objects — lowers cortisol and creates positive emotional priming before they evaluate your work.

---

## What It Does

A physics-driven 3D scene where **10 HR-relevant objects** float in zero gravity across the screen. A glowing white tracking circle follows your cursor. When it touches any object — it flies away with realistic momentum, spin, and a soft collision sound.

Objects drift back to their home positions over time. The loop is intentional: it always resets, just like tomorrow.

---

## Objects & Why They're There

| Object | Represents |
|--------|-----------|
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

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | React 18 + Vite | Fast HMR, no config overhead |
| 3D | @react-three/fiber + Three.js | Declarative scene graph in JSX |
| Physics | **Custom — ~80 lines** | No Cannon.js, no Rapier. Built from scratch |
| Audio | Web Audio API | Collision sounds generated programmatically — zero audio files |
| Shaders | Custom GLSL | Fresnel + vertical gradient on the sphere |
| Models | Blender 5.1 via Python | Every GLB scripted through BlenderMCP |

### Physics Engine (from scratch)

No physics library. Built with Verlet integration directly in `ZeroGravityLanding.jsx`:

- **Mouse-circle repulsion** — impulse-based, proportional to overlap depth
- **Brownian drift** — organic floating, no two frames identical
- **Soft spring return** — objects lazily drift back home after collision
- **Sphere-sphere collision** — momentum transfer between all 11 bodies
- **Rotational inertia + angular damping** — realistic tumbling

```js
// Physics constants — tune to feel
const PUSH   = 58    // How hard objects fly on circle contact
const SPRING = 0.055 // How fast they drift back home (lower = lazier)
const DAMP   = 0.977 // Velocity decay per frame (higher = floatier)
```

---

## Getting Started

```bash
# Clone
git clone https://github.com/abhinav-mittal33/zero-gravity-landing-page.git
cd zero-gravity-landing-page

# Install
npm install

# Run
npm run dev
```

Open `http://localhost:5173` — then move your mouse.

---

## Project Structure

```
zero-gravity-landing-page/
├── public/
│   └── models/             # 10 GLB files — each built in Blender via Python
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
│   ├── ZeroGravityLanding.jsx   # Everything — physics engine, models, shaders, audio
│   ├── App.jsx
│   └── main.jsx
├── index.html
└── vite.config.js
```

---

## Built By

**Abhinav Mittal** — BTech CSE @ Parul University

[abhinavmittal33@gmail.com](mailto:abhinavmittal33@gmail.com) · [GitHub](https://github.com/abhinav-mittal33)

---

*Every 3D model scripted in Python through BlenderMCP. Every physics interaction written from scratch. Built entirely with Claude + Blender MCP.*
