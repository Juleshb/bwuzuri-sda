Copy-Item .env.example .env -ErrorAction SilentlyContinue
npm install
npm run db:generate
Write-Host 'Edit .env, create PostgreSQL database, then run: npm run db:migrate'
