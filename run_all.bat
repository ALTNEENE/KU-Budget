@echo off
start cmd /k "cd backend && npx nodemon server.js"
start cmd /k "cd frontend && npm run dev"
echo Both servers started!
