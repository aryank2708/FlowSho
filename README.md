# FlowSho

[![Live Demo](https://img.shields.io/badge/Live%20Demo-flowsho.vercel.app-6366f1?style=for-the-badge&logo=vercel)](https://flowsho.vercel.app)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

**Turn your n8n workflow into a live, animated demo — in seconds.**

FlowSho takes any n8n workflow JSON and transforms it into a beautiful, interactive flowchart with a step-by-step animated demo. Built for founders, operators, and automation builders who want to show clients exactly how their automations work — without the technical noise.

---

![FlowSho Home](docs/home.png)

---

## Features

- **Instant Visualisation** — Paste your n8n JSON and get a fully rendered flowchart immediately
- **Live Demo Mode** — Animate through every node step by step, with human-readable output at each stage
- **Multi-Workflow Support** — Upload interconnected workflows and watch them trigger each other in real time
- **Demo Summary** — After each run, a summary modal shows exactly what happened at every step
- **Cross-Workflow Trigger Detection** — Automatically detects HTTP calls between workflows and animates the handoff
- **Share Links** — Generate a shareable URL that loads your workflow instantly for anyone
- **No signup. No backend. No data leaves your browser.**

---

## Screenshots

### Home — Upload or try an example
![Home Screen](docs/home.png)

### Single Workflow — Live animated demo
![Single Workflow Demo](docs/demo.png)

### Multi-Workflow — Interconnected system running end to end
![Multi Workflow](docs/multi.png)

### Summary — What happened in this demo
![Summary Modal](docs/summary.png)

---

## How It Works

1. Export your workflow from n8n as JSON
2. Upload the file or paste the JSON into FlowSho
3. Hit **Run Demo** and watch every node animate in execution order
4. Share the link with your client

For multi-workflow systems, FlowSho detects which HTTP Request nodes call other webhook-triggered workflows and animates the cross-workflow handoff automatically.

---

## Getting Started

```bash
git clone https://github.com/aryank2708/FlowSho.git
cd FlowSho
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Flow Rendering | React Flow (v11) |
| Styling | Inline CSS (no external UI lib) |
| AI Summary | OpenAI GPT-4o-mini (optional) |
| Deployment | Vercel |

---

## Project Structure

```
src/
  App.js          # Entire application — components, logic, demo engine
public/
  index.html      # HTML shell with OG meta tags
docs/
  *.png           # Screenshots used in this README
```

---

## Roadmap

- [ ] Figma-style export (PNG / SVG)
- [ ] Embeddable iframe mode
- [ ] Custom node branding / colours
- [ ] Execution speed control
- [ ] Support for other automation platforms (Make, Zapier)

---

## License

MIT — free to use, fork, and build on.

---

Built by [@aryank2708](https://github.com/aryank2708) · [flowsho.vercel.app](https://flowsho.vercel.app)
