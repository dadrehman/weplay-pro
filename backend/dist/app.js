"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const room_routes_1 = __importDefault(require("./routes/room.routes"));
const message_routes_1 = __importDefault(require("./routes/message.routes"));
const friend_routes_1 = __importDefault(require("./routes/friend.routes"));
const ranking_routes_1 = __importDefault(require("./routes/ranking.routes"));
const task_routes_1 = __importDefault(require("./routes/task.routes"));
const event_routes_1 = __importDefault(require("./routes/event.routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
// Middlewares
app.use((0, cors_1.default)({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express_1.default.json());
// Health check endpoints
app.get(['/', '/api'], (req, res) => {
    res.status(200).json({ status: 'ok', message: 'WePlay Backend is running' });
});
app.get(['/health', '/api/health'], (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
// API Routes (matching both /api/... and /... for reverse proxies)
app.use(['/api/auth', '/auth'], auth_routes_1.default);
app.use(['/api/admin', '/admin'], admin_routes_1.default);
app.use(['/api/users', '/users'], user_routes_1.default);
app.use(['/api/user', '/user'], user_routes_1.default);
app.use(['/api/rooms', '/rooms'], room_routes_1.default);
app.use(['/api/messages', '/messages'], message_routes_1.default);
app.use(['/api/friends', '/friends'], friend_routes_1.default);
app.use(['/api/rankings', '/rankings'], ranking_routes_1.default);
app.use(['/api/tasks', '/tasks'], task_routes_1.default);
app.use(['/api/events', '/events'], event_routes_1.default);
// 404 Handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});
// Global Error Handler
app.use((err, req, res, next) => {
    console.error('[Unhandled Server Error]:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
});
exports.default = app;
