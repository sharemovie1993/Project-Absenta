"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var email, user, roleId, availablePerms, permIds, added, _i, permIds_1, pId, e_1;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    email = 'neple@gmail.com';
                    console.log("Mencari user dengan email: ".concat(email));
                    return [4 /*yield*/, prisma.user.findFirst({
                            where: { email: email },
                            include: { Role: true }
                        })];
                case 1:
                    user = _c.sent();
                    if (!user) {
                        console.log("User ".concat(email, " tidak ditemukan di database."));
                        return [2 /*return*/];
                    }
                    console.log("User ditemukan! ID: ".concat(user.id, ", Role: ").concat((_a = user.Role) === null || _a === void 0 ? void 0 : _a.name, ", Tenant ID: ").concat(user.tenant_id));
                    roleId = user.role_id;
                    return [4 /*yield*/, prisma.permission.findMany({
                            where: {
                                OR: [
                                    { id: { startsWith: 'cooperative.' } },
                                    { id: { startsWith: 'support.' } }
                                ]
                            }
                        })];
                case 2:
                    availablePerms = _c.sent();
                    permIds = availablePerms.map(function (p) { return p.id; });
                    console.log("Ditemukan ".concat(permIds.length, " kapabilitas (support & cooperative) di sistem."));
                    added = 0;
                    _i = 0, permIds_1 = permIds;
                    _c.label = 3;
                case 3:
                    if (!(_i < permIds_1.length)) return [3 /*break*/, 8];
                    pId = permIds_1[_i];
                    _c.label = 4;
                case 4:
                    _c.trys.push([4, 6, , 7]);
                    return [4 /*yield*/, prisma.rolePermission.upsert({
                            where: {
                                role_id_permission_id: {
                                    role_id: roleId,
                                    permission_id: pId
                                }
                            },
                            update: {},
                            create: {
                                role_id: roleId,
                                permission_id: pId
                            }
                        })];
                case 5:
                    _c.sent();
                    added++;
                    return [3 /*break*/, 7];
                case 6:
                    e_1 = _c.sent();
                    console.error("Gagal menambahkan ".concat(pId, ":"), e_1.message);
                    return [3 /*break*/, 7];
                case 7:
                    _i++;
                    return [3 /*break*/, 3];
                case 8:
                    console.log("Berhasil memberikan ".concat(added, " kapabilitas kepada Role ").concat((_b = user.Role) === null || _b === void 0 ? void 0 : _b.name, " milik ").concat(email, "."));
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(console.error).finally(function () { return prisma.$disconnect(); });
