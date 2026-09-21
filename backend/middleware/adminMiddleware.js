const User = require("../models/User");

/**
 * =========================================================
 * ADMIN AUTH MIDDLEWARE
 * =========================================================
 *
 * ใช้หลัง authenticateToken
 *
 * authenticateToken จะสร้าง:
 * req.user = {
 *     id,
 *     userId,
 *     username
 * }
 *
 * จากนั้น middleware นี้จะไปอ่าน User จาก MongoDB
 * แล้วตรวจ accountType === "admin"
 *
 * =========================================================
 */

async function requireAdmin(req, res, next) {
    try {
        // -------------------------------------------------
        // ตรวจว่ามี user จาก authenticateToken หรือไม่
        // -------------------------------------------------

        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        // -------------------------------------------------
        // อ่าน User ตัวจริงจาก MongoDB
        // -------------------------------------------------

        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User account not found."
            });
        }

        // -------------------------------------------------
        // ตรวจสถานะบัญชี
        // -------------------------------------------------

        if (
            String(user.status || "").toLowerCase() !==
            "active"
        ) {
            return res.status(403).json({
                success: false,
                message: "This account is suspended."
            });
        }

        // -------------------------------------------------
        // ตรวจสิทธิ์ Admin
        // -------------------------------------------------

        const accountType =
            String(
                user.accountType || ""
            ).trim().toLowerCase();

        if (accountType !== "admin") {
            console.warn(
                `Admin access denied for user: ${user.username || user._id}`
            );

            return res.status(403).json({
                success: false,
                message: "Admin access denied."
            });
        }

        // -------------------------------------------------
        // ใส่ข้อมูล User ที่ตรวจสอบแล้วลง req.user
        // -------------------------------------------------
        //
        // สำคัญ:
        // หลังจากนี้ route ต่าง ๆ สามารถใช้
        // req.user.role ได้
        //
        // -------------------------------------------------

        req.user = {
    ...req.user,

    id: user._id,
    userId: user._id,
    username: user.username,

    role: "admin",
    accountType: "admin",

    shopName:
        user.shopName || "",

    displayName:
        user.shopName ||
        user.username ||
        "Administrator"
};

// เก็บ User ตัวจริงจาก MongoDB
// สำหรับ Admin routes ที่ต้องใช้ _id และข้อมูลบัญชีอื่น ๆ
req.adminUser = user;

        // -------------------------------------------------
        // ผ่านการตรวจสอบ
        // -------------------------------------------------

        next();

    } catch (error) {

        console.error(
            "Admin middleware error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Admin authorization error."
        });
    }
}

module.exports = requireAdmin;