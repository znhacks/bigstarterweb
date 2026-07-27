export type OtpChannel = "email" | "wa" | "sms";
export type OtpPurpose = "login" | "verify_email" | "verify_phone" | "password_reset" | string;

export const OTP_CONFIG = {
  codeLength: 6,

  expiryMinutes: 10,

  resendCooldownSec: 60,

  maxAttempts: 5,

  hourlySendCap: 5,

  channels: {
    email: true,
    wa: false,
    sms: false
  } as Record<OtpChannel, boolean>
} as const;

export function isOtpChannelEnabled(channel: string): channel is OtpChannel {
  return (
    (channel === "email" || channel === "wa" || channel === "sms") && OTP_CONFIG.channels[channel]
  );
}
