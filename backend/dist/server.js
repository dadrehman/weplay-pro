"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const child_process_1 = require("child_process");
const app_1 = __importDefault(require("./app"));
const socket_handler_1 = require("./socket/socket.handler");
const whatsapp_service_1 = require("./services/whatsapp.service");
const PORT = process.env.PORT || 5000;
const server = http_1.default.createServer(app_1.default);
// Attach Socket.io
(0, socket_handler_1.initializeSocketIO)(server);
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.warn(`[WePlay Backend] Port ${PORT} is currently in use. Attempting graceful recovery...`);
        try {
            if (process.platform === 'win32') {
                const findPidCmd = `netstat -ano | findstr :${PORT} | findstr LISTENING`;
                const output = (0, child_process_1.execSync)(findPidCmd, { encoding: 'utf-8' });
                const lines = output.trim().split('\n');
                for (const line of lines) {
                    try {
                        const parts = line.trim().split(/\s+/);
                        const pid = parts[parts.length - 1];
                        if (pid && pid !== '0' && pid !== process.pid.toString()) {
                            console.log(`[WePlay Backend] Auto-terminating stale process on port ${PORT} (PID: ${pid})...`);
                            (0, child_process_1.execSync)(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
                        }
                    }
                    catch (_) { }
                }
                setTimeout(() => {
                    server.listen(PORT, () => {
                        console.log(`[WePlay Backend] Server successfully recovered and listening on ${PORT}`);
                    });
                }, 1200);
                return;
            }
        }
        catch (recoveryErr) {
            console.warn(`[WePlay Backend] Graceful port recovery note:`, recoveryErr);
        }
        console.error(`[WePlay Backend] Fatal: Port ${PORT} could not be bound.`);
        process.exit(1);
    }
    else {
        console.error('[WePlay Backend] Server runtime error:', err);
    }
});
server.listen(PORT, () => {
    console.log(`[WePlay Backend] Server listening on ${PORT}`);
    whatsapp_service_1.whatsappService.validateMetaTokenOnStartup().catch(() => { });
});
exports.default = server;
