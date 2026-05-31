# API test collection (Bruno)

## Run all requests (CLI)

1. Start backend: `cd back-end && npm run dev` (wait for `MongoDB connected`)
2. From this folder:

```bash
npx @usebruno/cli run . --env local
```

Or use the PowerShell runner from `back-end`:

```powershell
.\scripts\run-api-tests.ps1
```

## Variables (`environments/local.yml`)

| Variable  | Set after |
|-----------|-----------|
| `token`   | Login or Register response → `token` field |
| `habitId` | Create Habit response → `_id` field |

## Folder layout

```text
aihabittracker/
├── health.yml
├── auth/
│   ├── register.yml
│   ├── login.yml
│   ├── me.yml
│   └── profile-update.yml
├── habits/
│   ├── habits-list.yml
│   ├── habits-create.yml
│   ├── habits-update.yml
│   ├── habits-archive.yml
│   ├── habits-reorder.yml
│   └── habits-delete.yml
├── logs/
│   ├── logs-mark-complete.yml
│   ├── logs-today.yml
│   ├── logs-unmark.yml
│   ├── logs-range.yml
│   ├── logs-heatmap.yml
│   ├── logs-stats-all.yml
│   └── logs-stats-habit.yml
└── ai/
	├── morning.yml
	├── weekly-report.yml
	├── suggest-habits.yml
	├── recovery-plan.yml
	└── chat.yml
```

## Request order (23 total)

| # | Folder | File | Method | Endpoint |
|---|--------|------|--------|----------|
| 1 | root | health.yml | GET | /api/health |
| 2 | auth | register.yml | POST | /api/auth/register |
| 3 | auth | login.yml | POST | /api/auth/login |
| 4 | auth | me.yml | GET | /api/auth/me |
| 5 | auth | profile-update.yml | PUT | /api/auth/profile |
| 6 | habits | habits-list.yml | GET | /api/habits |
| 7 | habits | habits-create.yml | POST | /api/habits |
| 8 | habits | habits-update.yml | PUT | /api/habits/:id |
| 9 | habits | habits-archive.yml | PUT | /api/habits/:id/archive |
| 10 | habits | habits-reorder.yml | PUT | /api/habits/reorder |
| 11 | logs | logs-mark-complete.yml | POST | /api/logs |
| 12 | logs | logs-today.yml | GET | /api/logs/today |
| 13 | logs | logs-unmark.yml | DELETE | /api/logs |
| 14 | logs | logs-range.yml | GET | /api/logs/range |
| 15 | logs | logs-heatmap.yml | GET | /api/logs/heatmap |
| 16 | logs | logs-stats-all.yml | GET | /api/logs/stats |
| 17 | logs | logs-stats-habit.yml | GET | /api/logs/stats/:habitId |
| 18 | habits | habits-delete.yml | DELETE | /api/habits/:id |
| 19 | ai | morning.yml | GET | /api/ai/morning |
| 20 | ai | weekly-report.yml | POST | /api/ai/weekly-report |
| 21 | ai | suggest-habits.yml | POST | /api/ai/suggest-habits |
| 22 | ai | recovery-plan.yml | POST | /api/ai/recovery-plan |
| 23 | ai | chat.yml | POST | /api/ai/chat |
