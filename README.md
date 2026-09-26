# WePlay-Pro | Social Party Game & Voice Platform MVP

An enterprise-grade, high-concurrency Social Party Game and Spatial Voice Platform inspired by WePlay.

---

## Architecture Overview

```
weplay-pro/
├── backend/               # Node.js (TypeScript) + Express + Prisma ORM + Socket.io + Jest
│   ├── prisma/            # Database schema & migrations
│   ├── src/
│   │   ├── controllers/   # Auth & Admin REST controllers
│   │   ├── db/            # Prisma client singleton (BigInt serializable)
│   │   ├── middleware/    # JWT Auth & Superadmin Role guards
│   │   ├── routes/        # Express route modules
│   │   ├── services/      # Transactional coin adjustments & audit logger
│   │   ├── socket/        # Socket.io real-time engine
│   │   ├── app.ts         # Express app configuration
│   │   └── server.ts      # Server bootstrap
│   └── tests/             # Automated Jest integration & unit test suite
├── admin-web/             # Next.js (App Router) + Tailwind CSS + Lucide Icons
│   ├── src/
│   │   ├── app/           # /login and /dashboard user management table
│   │   ├── components/    # AdjustCoinsModal & BanModal confirmation dialogs
│   │   └── lib/           # Typed API client
└── mobile/                # Flutter (Dart) Mobile App with Riverpod state management
    ├── lib/
    │   ├── core/          # Theme, colors, network client (with 401 & ban guards)
    │   ├── data/          # User model & AuthService
    │   ├── presentation/  # Riverpod AuthNotifier, Splash, Auth, and Home screens
    │   └── main.dart
    └── test/              # Widget validation & 0-overflow multi-resolution tests
```

---

## 1. Database & Backend Setup

### Prerequisites
- Node.js >= 18
- PostgreSQL instance (or Supabase project)

### Setup & Run
```bash
cd backend
npm install
cp .env.example .env
# Set DATABASE_URL in .env
npx prisma generate
npx prisma db push
npm test
npm run dev
```

### Key API Endpoints
- `POST /api/auth/register` - Create user account (receives 1000 welcome coins)
- `POST /api/auth/login` - Authenticate and receive JWT token
- `GET /api/auth/me` - Retrieve current user profile
- `GET /api/admin/users?page=1&limit=10&search=&status=` - Paginated user directory with search/filters (Superadmin only)
- `PATCH /api/admin/users/:id/coins` - Safely credit/debit coins with atomic rollback guarantee and audit log
- `PATCH /api/admin/users/:id/status` - Ban or unban user with real-time socket notification and audit log
- `GET /api/admin/logs` - Full audit trail of administrative modifications

---

## 2. Next.js Admin Panel Setup

```bash
cd admin-web
npm install
npm run dev
```
Open [http://localhost:3001](http://localhost:3001) in your browser.

---

## 3. Flutter Mobile App Setup

```bash
cd mobile
flutter pub get
flutter test
flutter run
```
