# TaskGlitch 🧩

TaskGlitch is a React + TypeScript task management dashboard built to analyze productivity, revenue, and task efficiency.

This project was enhanced by identifying and fixing multiple real-world bugs related to task duplication, deletion, undo logic, and incorrect ROI calculations.

---

## 🚀 Features
- Add, edit, delete tasks
- Undo delete using Snackbar
- Automatic ROI calculation
- Priority-based task sorting
- Performance metrics dashboard

---

## 🐞 Bugs Fixed
- Fixed duplicate task issue by normalizing task IDs
- Fixed delete bug where multiple tasks appeared after undo
- Fixed Snackbar undo logic (single undo only)
- Prevented NaN / Infinity in ROI calculation
- Improved task sorting stability

---

## 🛠 Tech Stack
- React 18
- TypeScript
- Vite
- Material UI
- Custom React Hooks

---

## 📂 Project Structure
- `useTasks.ts` – Central task state management
- `logic.ts` – Business logic and calculations
- `TaskTable.tsx` – Task UI and actions

---

## 🧠 What I Learned
- Handling edge cases in state management
- Writing safe utility functions
- Debugging real-world React bugs
- Maintaining clean Git commit history

---

## 📌 Note
This project was used as a debugging and code-quality improvement task.
