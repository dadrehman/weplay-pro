const { RtcTokenBuilder, RtcRole } = require('agora-access-token');

export class AgoraService {
  private static appId = process.env.AGORA_APP_ID || 'test_agora_app_id_9999999999999999';
  private static appCertificate = process.env.AGORA_APP_CERTIFICATE || 'test_agora_cert_8888888888888888';

  /**
   * Generates a dynamic Agora RTC token for low-latency multi-seat voice communication.
   * @param channelName Agora channel / room ID
   * @param uid Numeric user ID or 0 for dynamic assignment
   * @param isPublisher True if user is a seat occupant (broadcaster), false if audience
   * @param expireTimeInSeconds Expiration TTL (default 24 hours)
   */
  static generateRtcToken(
    channelName: string,
    uid: number = 0,
    isPublisher: boolean = false,
    expireTimeInSeconds: number = 86400
  ): { token: string; channel: string; uid: number; expiresAt: number } {
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expireTimeInSeconds;
    const role = isPublisher ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

    try {
      const token = RtcTokenBuilder.buildTokenWithUid(
        this.appId,
        this.appCertificate,
        channelName,
        uid,
        role,
        privilegeExpiredTs
      );

      return {
        token,
        channel: channelName,
        uid,
        expiresAt: privilegeExpiredTs,
      };
    } catch (error) {
      console.warn('[AgoraService] Fallback token generation used:', error);
      return {
        token: `dev_token_${channelName}_${uid}_${role}_${privilegeExpiredTs}`,
        channel: channelName,
        uid,
        expiresAt: privilegeExpiredTs,
      };
    }
  }
}
