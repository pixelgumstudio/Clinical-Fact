"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resendOTPSchema = exports.verifyLoginOTPSchema = exports.verifySignupOTPSchema = exports.sendOTPSchema = void 0;
const zod_1 = require("zod");
// Send OTP schema (for both signup and login)
exports.sendOTPSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
});
// Verify Signup OTP schema
exports.verifySignupOTPSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    otp: zod_1.z.string()
        .length(6, 'OTP must be exactly 6 digits')
        .regex(/^\d{6}$/, 'OTP must contain only digits'),
    name: zod_1.z.string()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name must not exceed 100 characters')
        .optional(),
    username: zod_1.z.string()
        .min(3, 'Username must be at least 3 characters')
        .max(20, 'Username must not exceed 20 characters')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
        .optional(),
});
// Verify Login OTP schema
exports.verifyLoginOTPSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    otp: zod_1.z.string()
        .length(6, 'OTP must be exactly 6 digits')
        .regex(/^\d{6}$/, 'OTP must contain only digits'),
});
// Resend OTP schema
exports.resendOTPSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    type: zod_1.z.enum(['signup', 'login'], {
        errorMap: () => ({ message: 'Type must be either "signup" or "login"' }),
    }),
});
