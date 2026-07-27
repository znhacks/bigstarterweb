export const AUTH_FEATURES = {
  enablePassword: true,
  enablePasswordlessOtp: true,
  enableMagicLink: true,
  enableGoogle: true,
  enableGithub: false,
  enablePasskey: true,
  enablePasswordReset: true,
  enableSignup: false
};

export const hasSocialAuth =
  AUTH_FEATURES.enableGoogle || AUTH_FEATURES.enableGithub || AUTH_FEATURES.enablePasskey;
