# Rule 20: Frontend Architecture & UI Standards

**Activation:** Always On

## 1. Design System & Styling
- Tech stack: React 18+, TypeScript, Vite, Tailwind CSS, Radix UI primitives, Lucide React icons.
- Palette: Dark-first clinical-technical aesthetic with sleek glassmorphism, vibrant subtle accents, and light-mode support.
- Fonts: Inter for UI body, monospaced font for medical measurements and numerical metrics.

## 2. Layout & Banner Requirements
- Global Persistent Header Banner: `"Research prototype — not for clinical use."`
- Global Sidebar Navigation: Dashboard, Projects, Datasets, Viewer, Annotations, Models, Experiments, Benchmarks, Optimization, Cardiac Profile, Deployments, Settings.
- Empty states, loading skeletons, error boundaries, and toast notifications for async background operations.

## 3. Medical Image Viewer & Drawing Layer
- Primary Viewer Engine: `@niivue/niivue` WebGL2 NIfTI rendering engine.
- Annotation Drawing Tools: Brush, Eraser, Polygon, Flood fill, Undo, Redo, Opacity slider, Class selector with consistent anatomical colors (RV: Blue, MYO: Green, LV: Red).
