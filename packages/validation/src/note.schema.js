"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateNoteSchema = exports.createNoteSchema = void 0;
const zod_1 = require("zod");
exports.createNoteSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Note name is required'),
    type: zod_1.z.enum(['AUDIO', 'VIDEO', 'PDF', 'IMAGE', 'TEXT', 'YOUTUBE']),
    content: zod_1.z.string().optional(),
    folderId: zod_1.z.string().optional(),
});
exports.updateNoteSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    content: zod_1.z.string().optional(),
    formattedContent: zod_1.z.string().optional(),
    folderId: zod_1.z.string().optional(),
});
