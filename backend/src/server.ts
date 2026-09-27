import http from 'http';
import { execSync } from 'child_process';
import app from './app';
import { initializeSocketIO } from './socket/socket.handler';
import { whatsappService } from './services/whatsapp.service';

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Attach Socket.io
initializeSocketIO(server);

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`[WePlay Backend] Port ${PORT} is currently in use. Attempting graceful recovery...`);
    try {
      if (process.platform === 'win32') {
        const findPidCmd = `netstat -ano | findstr :${PORT} | findstr LISTENING`;
        const output = execSync(findPidCmd, { encoding: 'utf-8' });
        const lines = output.trim().split('\n');
        for (const line of lines) {
          try {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && pid !== '0' && pid !== process.pid.toString()) {
              console.log(`[WePlay Backend] Auto-terminating stale process on port ${PORT} (PID: ${pid})...`);
              execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
            }
          } catch (_) {}
        }
        setTimeout(() => {
          server.listen(PORT, () => {
            console.log(`[WePlay Backend] Server successfully recovered and listening on ${PORT}`);
          });
        }, 1200);
        return;
      }
    } catch (recoveryErr) {
      console.warn(`[WePlay Backend] Graceful port recovery note:`, recoveryErr);
    }
    console.error(`[WePlay Backend] Fatal: Port ${PORT} could not be bound.`);
    process.exit(1);
  } else {
    console.error('[WePlay Backend] Server runtime error:', err);
  }
});

server.listen(PORT, () => {
  console.log(`[WePlay Backend] Server listening on ${PORT}`);
  whatsappService.validateMetaTokenOnStartup().catch(() => {});
});


export default server;
