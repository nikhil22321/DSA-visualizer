# AlgoViz Pro — Product Requirements Document

## 1) Original Problem Statement (verbatim summary)
Build a startup-level interactive Data Structures and Algorithms Visualizer platform with modern SaaS UX, smooth animations, educational clarity, analytics, debugger tools, comparison mode, replay/recording, AI tutor, export features, and multi-module coverage (sorting, graph, tree, linked list, stack, queue, pathfinding, maze).

## 2) User Choices (explicit)
- Fully polished modules: **Sorting + Graph + Pathfinding + Maze**
- Follow-up request: **also fully implement Tree, Linked List, Stack, Queue modules**
- AI Tutor model: **OpenAI GPT-5.2**
- Key choice: **Emergent universal key**
- Theme system: **Light + Dark + Hacker**
- Unspecified state choice resolved with default: **Zustand**

## 3) Architecture Decisions
- Frontend: React (existing CRA stack), TailwindCSS, Framer Motion, Zustand, Recharts, D3, React Flow
- Backend: FastAPI + MongoDB (Motor)
- AI integration: `emergentintegrations.llm.chat` with provider/model `openai/gpt-5.2`
- URL strategy: frontend uses `REACT_APP_BACKEND_URL`; backend uses `MONGO_URL`
- Data persistence:
  - `algorithm_runs` collection for replay/share history
  - `tutor_chats` collection for AI tutor history
- Replay architecture: step-based simulation objects (`action`, `stats`, `internalState`) + timeline playback hook

## 4) User Personas
- CS student preparing DSA fundamentals and interviews
- Interview candidate building portfolio-ready demonstrable projects
- Educator needing visual classroom explanations
- Recruiter assessing implementation quality and product thinking

## 5) Core Requirements (static)
- Multi-page DSA learning platform with sidebar + top controls
- Global playback controls: play/pause/step/reset/speed
- Timeline slider + execution statistics
- Algorithm explanation and complexity display
- Comparison + benchmarking visuals
- AI tutor panel that explains current step context
- Save/share replay runs via backend
- Triple theme support (Light, Dark, Hacker)

## 6) What Has Been Implemented (2026-03-26)
- Full SaaS shell: responsive sidebar navigation, sticky top control bar, theme switcher, learning/expert mode toggles
- Home dashboard: hero, module cards, complexity simulator (D3), recommendation block, practice question preview, React Flow block builder
- Sorting module:
  - 9 algorithms (bubble/selection/insertion/merge/quick/heap/counting/radix/shell)
  - Dataset presets + custom input
  - Playback + timeline + stats + complexity + code panel
  - Side-by-side comparison mode and benchmark chart
  - Save/share run, PNG/GIF/video export, AI tutor integration
- Graph module:
  - Graph generation + algorithms (BFS/DFS/Dijkstra/Bellman/Prim/Kruskal/Topo/Cycle/Bipartite/Components/Union-Find)
  - Debugger watch window with internal state and distance map
  - Playback/timeline/stats + save/export + AI tutor
- Pathfinding module:
  - A*/Dijkstra/BFS/DFS/Greedy on interactive grid
  - Wall editing, playback, timeline, stats, debugger, save/export + AI tutor
- Maze module:
  - Recursive Backtracking, Prim, Kruskal, Recursive Division
  - Playback timeline, stats, save/export + AI tutor
- Tree module:
  - Binary Tree, BST, AVL, Trie, Segment Tree modes
  - Insert/Delete/Search controls, traversals (pre/in/post/level), and segment query/update flows
  - Visual timeline playback, stats panel, and AI tutor integration
- Linked List module:
  - Singly, Doubly, Circular linked list modes
  - Insert/Delete/Search/Reverse/Cycle Detection operations
  - Node strip visualization with timeline playback and operation output panel
- Stack module:
  - Push/Pop/Peek controls
  - Applications: Balanced Parentheses, Infix→Postfix, Postfix Evaluation
  - Reliability fix: multi-digit infix tokenization + strict postfix validation/error handling
- Queue module:
  - Queue, Circular Queue, Deque, Priority Queue modes
  - Enqueue/Dequeue/Peek with front/rear variants and circular capacity reset
  - Timeline playback and operation status output panel
- Backend APIs delivered:
  - `/api/health`
  - `/api/ai/tutor`
  - `/api/runs` (POST/LIST/GET)
  - `/api/runs/share/{token}`
  - `/api/recommendation`
  - `/api/practice/questions`
  - `/api/tutor/history/{session_id}`
- Determinism/reliability fixes:
  - Normalized recommendation input types (`nearly`, `few-unique`, etc.)
  - Seeded RNG support for graph and maze generators

## 7) Verification Notes
- Frontend and backend lint checks passed
- API smoke tests passed for health, run save/share, recommendation, AI tutor
- Browser flow checks passed for dashboard, sorting, graph, pathfinding, maze, tree, linked list, stack, queue
- Added backend regression tests under `/app/backend/tests/` (core endpoint coverage)

## 8) Prioritized Backlog
### P0 (next)
- Implement share-link load support uniformly across Graph/Pathfinding/Maze/Tree/LinkedList/Stack/Queue
- Add richer keyboard shortcuts map overlay and per-module shortcut hints
- Add deterministic seed input controls in UI for Graph/Maze reproducible classroom demos

### P1
- Deepen Story Mode with per-step narrated lesson cards and objective prompts
- Add stronger Practice Mode (multi-question session, score tracking, topic filters)
- Improve export pipeline robustness and explicit format labels in UI

### P2
- Add stress-test batch runs and comparative memory chart visualizations
- Add richer accessibility pass (focus rings, narration hints, contrast audit)

## 9) Next Tasks Checklist
- [ ] Unify replay sharing UX on non-sorting modules
- [ ] Ship deterministic seed controls to visualizer headers
- [ ] Add advanced quiz session + progress tracking
- [ ] Add share + saved run loaders for the newly completed Tree/List/Stack/Queue modules
- [ ] Add richer recruiter-facing “project highlights” section on dashboard

