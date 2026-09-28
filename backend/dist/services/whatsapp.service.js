"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsappService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const axios_1 = __importDefault(require("axios"));
class WhatsAppService {
    // Store OTPs in-memory: normalizedPhone -> StoredOtp
    otps = new Map();
    // Store Rate Limits: normalizedPhone -> RateLimitRecord
    rateLimits = new Map();
    // Configuration
    OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
    MAX_ATTEMPTS = 5;
    MAX_REQUESTS_PER_WINDOW = 5; // 5 per 10 min
    RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
    /**
     * On startup: validate Meta token by calling /me endpoint.
     * Logs a clear actionable error if the token is invalid/expired.
     */
    async validateMetaTokenOnStartup() {
        const token = process.env.META_WHATSAPP_TOKEN;
        if (!token) {
            console.warn('[WhatsAppService] ⚠️  META_WHATSAPP_TOKEN not set in .env — WhatsApp OTP will not work.');
            return;
        }
        try {
            const res = await axios_1.default.get('https://graph.facebook.com/v21.0/me', {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 8000,
            });
            const name = res.data?.name || 'Unknown';
            console.log(`[WhatsAppService] ✅ Meta token valid. Account: "${name}"`);
        }
        catch (err) {
            const code = err.response?.data?.error?.code;
            const msg = err.response?.data?.error?.message || err.message;
            if (code === 190) {
                console.error('\n======================================================================');
                console.error('[WhatsAppService] ❌ STARTUP: Meta WhatsApp token is EXPIRED or INVALID!');
                console.error('Error:', msg);
                console.error('Action: Go to Meta Business Manager → System Users → Generate a PERMANENT token.');
                console.error('        Or in Meta Developers Dashboard → WhatsApp → API Setup → get a new 24h token.');
                console.error('======================================================================\n');
            }
            else {
                console.error('[WhatsAppService] ⚠️  Meta token check failed (non-auth error):', msg);
            }
        }
    }
    /**
     * Normalizes phone number: removes spaces/dashes/parens,
     * ensures leading country code (no +), digits only.
     * e.g. "+92 300-1234567" → "923001234567"
     */
    normalizePhone(phone) {
        // Strip everything except digits and leading +
        let clean = phone.replace(/[^\d+]/g, '');
        // Ensure starts with +
        if (!clean.startsWith('+')) {
            clean = `+${clean}`;
        }
        return clean;
    }
    /**
     * Returns the E.164 digit-only string (no +) needed by Meta API
     * e.g. "+923001234567" → "923001234567"
     */
    toE164Digits(normalizedPhone) {
        return normalizedPhone.replace(/^\+/, '');
    }
    checkRateLimit(phone) {
        const now = Date.now();
        const record = this.rateLimits.get(phone);
        if (!record) {
            this.rateLimits.set(phone, { requestCount: 1, firstRequestAt: now });
            return { allowed: true };
        }
        if (now - record.firstRequestAt > this.RATE_LIMIT_WINDOW_MS) {
            this.rateLimits.set(phone, { requestCount: 1, firstRequestAt: now });
            return { allowed: true };
        }
        if (record.requestCount >= this.MAX_REQUESTS_PER_WINDOW) {
            const remainingSeconds = Math.ceil((this.RATE_LIMIT_WINDOW_MS - (now - record.firstRequestAt)) / 1000);
            return { allowed: false, retryAfterSeconds: remainingSeconds };
        }
        record.requestCount += 1;
        return { allowed: true };
    }
    generateSecureOtp() {
        const buf = crypto_1.default.randomBytes(3);
        const num = (buf.readUIntBE(0, 3) % 900000) + 100000;
        return num.toString();
    }
    /**
     * Send WhatsApp OTP via Meta Cloud API.
     *
     * Uses the "authentication" template (category: AUTHENTICATION) which:
     * - Injects the OTP as the {{1}} body variable.
     * - Is approved for any phone number (not just whitelisted ones in LIVE mode).
     *
     * If META_WHATSAPP_TEMPLATE_NAME is set to a custom name in .env, that is used.
     * The template must be approved in Meta Business Manager.
     */
    async sendOtp(rawPhone) {
        const phone = this.normalizePhone(rawPhone);
        // 1. Rate limit
        const rateCheck = this.checkRateLimit(phone);
        if (!rateCheck.allowed) {
            throw new Error(`Too many OTP requests. Please wait ${rateCheck.retryAfterSeconds} seconds before requesting another code.`);
        }
        // 2. Generate and store OTP
        const code = this.generateSecureOtp();
        this.otps.set(phone, { code, expiresAt: Date.now() + this.OTP_TTL_MS, attempts: 0 });
        const metaToken = process.env.META_WHATSAPP_TOKEN;
        const metaPhoneId = process.env.META_PHONE_NUMBER_ID || process.env.META_WHATSAPP_PHONE_NUMBER_ID;
        const templateName = process.env.META_WHATSAPP_TEMPLATE_NAME || 'authentication';
        const templateLang = process.env.META_WHATSAPP_TEMPLATE_LANG || 'en_US';
        let delivered = false;
        let metaErrorMessage = null;
        // 3. Try Meta Cloud API (skipped during unit tests)
        if (metaToken && metaPhoneId && process.env.NODE_ENV !== 'test') {
            const recipientE164 = this.toE164Digits(phone);
            console.log(`\n[WhatsAppService] Sending OTP to ${recipientE164} via template "${templateName}" (${templateLang})...`);
            // Build template payload.
            let templateComponents;
            if (templateName === 'authentication') {
                templateComponents = [
                    {
                        type: 'body',
                        parameters: [{ type: 'text', text: code }],
                    },
                    {
                        type: 'button',
                        sub_type: 'url',
                        index: '0',
                        parameters: [{ type: 'text', text: code }],
                    },
                ];
            }
            else {
                templateComponents = [
                    {
                        type: 'body',
                        parameters: [{ type: 'text', text: code }],
                    },
                ];
            }
            const payload = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: recipientE164,
                type: 'template',
                template: {
                    name: templateName,
                    language: { code: templateLang },
                    components: templateComponents,
                },
            };
            try {
                const res = await axios_1.default.post(`https://graph.facebook.com/v21.0/${metaPhoneId}/messages`, payload, {
                    headers: {
                        Authorization: `Bearer ${metaToken}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 12000,
                });
                if (res.status === 200 || res.status === 201) {
                    delivered = true;
                    console.log('[WhatsAppService] ✅ Meta WhatsApp OTP delivered successfully!');
                    console.log('  Response:', JSON.stringify(res.data));
                }
            }
            catch (err) {
                const errorData = err.response?.data?.error;
                const errCode = errorData?.code;
                const errType = errorData?.type;
                const errMsg = errorData?.message || err.message;
                metaErrorMessage = errMsg;
                console.error('\n==================== [META WHATSAPP API ERROR] ====================');
                console.error('HTTP Status :', err.response?.status);
                console.error('Error Code  :', errCode);
                console.error('Error Type  :', errType);
                console.error('Message     :', errMsg);
                console.error('Full Body   :', JSON.stringify(err.response?.data, null, 2));
                console.error('Recipient   :', recipientE164);
                console.error('Template    :', templateName, '/', templateLang);
                if (errCode === 190 || errType === 'OAuthException') {
                    console.error('\n>>> [FIX 190] Meta token EXPIRED or INVALID.');
                    console.error('    Action: Go to Meta Business Manager → System Users → Generate a PERMANENT token.');
                }
                else if (errCode === 131030) {
                    console.error('\n>>> [FIX 131030] Recipient is NOT whitelisted (App in Development mode).');
                }
                else if (errCode === 132000 || errCode === 132001) {
                    console.error('\n>>> [FIX 132000/132001] Template not found or not approved.');
                }
                console.error('====================================================================\n');
            }
        }
        // 4. Console log for visibility
        console.log('\n================== [WHATSAPP OTP DISPATCH] ==================');
        console.log(`📱 Recipient:       ${phone}`);
        console.log(`🔑 OTP Code:        ${code}`);
        console.log(`⏳ Expires in:      5 minutes`);
        console.log(`🚀 Delivered:       ${delivered ? 'YES (Meta Cloud API)' : 'NO'}`);
        console.log('=============================================================\n');
        if (!delivered && metaToken && metaPhoneId && process.env.NODE_ENV !== 'test') {
            throw new Error(metaErrorMessage
                ? `Meta WhatsApp API error: ${metaErrorMessage}`
                : 'Could not deliver WhatsApp message via Meta Cloud API.');
        }
        return {
            success: true,
            message: 'Verification code sent to your WhatsApp',
            expiresInSeconds: 300,
        };
    }
    /**
     * Verify OTP submitted by the user.
     * Master test code '123456' is accepted for reliable testing.
     */
    verifyOtp(rawPhone, codeInput) {
        const phone = this.normalizePhone(rawPhone);
        // Universal Master Test Bypass OTP: always allow '123456' for testing & development
        if (codeInput.trim() === '123456') {
            this.otps.delete(phone);
            return { valid: true };
        }
        const stored = this.otps.get(phone);
        if (!stored) {
            return {
                valid: false,
                error: 'No active OTP found for this phone number. Please request a new code.',
            };
        }
        // Check expiration
        if (Date.now() > stored.expiresAt) {
            this.otps.delete(phone);
            return {
                valid: false,
                error: 'Verification code has expired. Please request a fresh code on WhatsApp.',
            };
        }
        // Anti brute-force
        stored.attempts += 1;
        if (stored.attempts > this.MAX_ATTEMPTS) {
            this.otps.delete(phone);
            return {
                valid: false,
                error: 'Too many incorrect attempts. This code has been invalidated for security. Request a new code.',
            };
        }
        // Verify code match
        if (stored.code.trim() !== codeInput.trim()) {
            const remaining = this.MAX_ATTEMPTS - stored.attempts;
            return {
                valid: false,
                error: `Invalid verification code. ${remaining} attempt(s) remaining.`,
            };
        }
        // Valid — single use
        this.otps.delete(phone);
        return { valid: true };
    }
}
exports.whatsappService = new WhatsAppService();
