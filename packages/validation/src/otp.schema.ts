import { z } from 'zod';

// Send OTP schema (for both signup and login)
export const sendOTPSchema = z.object({
  email: z.string().email('Invalid email format'),
});

// Verify Signup OTP schema
export const verifySignupOTPSchema = z.object({
  email: z.string().email('Invalid email format'),
  otp: z.string()
    .length(6, 'OTP must be exactly 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain only digits'),
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .optional(),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must not exceed 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .optional(),
});

// Verify Login OTP schema
export const verifyLoginOTPSchema = z.object({
  email: z.string().email('Invalid email format'),
  otp: z.string()
    .length(6, 'OTP must be exactly 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain only digits'),
});

// Resend OTP schema
export const resendOTPSchema = z.object({
  email: z.string().email('Invalid email format'),
  type: z.enum(['signup', 'login'], {
    errorMap: () => ({ message: 'Type must be either "signup" or "login"' }),
  }),
});

// TypeScript types
export type SendOTPInput = z.infer<typeof sendOTPSchema>;
export type VerifySignupOTPInput = z.infer<typeof verifySignupOTPSchema>;
export type VerifyLoginOTPInput = z.infer<typeof verifyLoginOTPSchema>;
export type ResendOTPInput = z.infer<typeof resendOTPSchema>;
