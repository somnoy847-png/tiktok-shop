const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        // ===============================
        // Account Information
        // ===============================

        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            minlength: 3,
            maxlength: 30
        },

        shopName: {
            type: String,
            trim: true,
            maxlength: 60,
            default: ""
        },

        contact: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        password: {
            type: String,
            required: true
        },

        nationality: {
            type: String,
            required: true,
            trim: true
        },

        country: {
            type: String,
            required: true,
            trim: true
        },

        accountType: {
            type: String,
            enum: ["buyer", "seller"],
            required: true
        },


        // ===============================
        // Profile
        // ===============================

        // URL รูปโปรไฟล์ของร้าน/ผู้ใช้
        profileImage: {
            type: String,
            trim: true,
            default: ""
        },


        // ===============================
        // Account Status
        // ===============================

        status: {
            type: String,
            enum: ["active", "suspended"],
            default: "active"
        },


        // ===============================
        // Wallet / Financial Information
        // ===============================

        // ยอดเงินคงเหลือที่สามารถใช้งานได้
        balance: {
            type: Number,
            default: 0,
            min: 0
        },

        // ยอดสินทรัพย์รวม
        // = ยอดคงเหลือ
        // + เงินที่จ่ายไปกับออเดอร์
        // + กำไรจากออเดอร์ที่ยังรอรับ
        totalAssets: {
            type: Number,
            default: 0,
            min: 0
        },

        // ยอดรอดำเนินการ
        // = เงินที่จ่ายออเดอร์
        // + กำไรของออเดอร์นั้น
        pendingAmount: {
            type: Number,
            default: 0,
            min: 0
        },

        // ยอดฝากทั้งหมด
        totalDeposited: {
            type: Number,
            default: 0,
            min: 0
        },

        // ยอดถอนทั้งหมด
        totalWithdrawn: {
            type: Number,
            default: 0,
            min: 0
        },

        // ยอดที่ถอนออกไปแล้วในวันนี้
        dailyWithdrawn: {
            type: Number,
            default: 0,
            min: 0
        },

        // ยอดที่สามารถถอนได้สูงสุดต่อวัน
        dailyWithdrawLimit: {
            type: Number,
            default: 0,
            min: 0
        },

        // วันที่ใช้สำหรับตรวจสอบยอดถอนรายวัน
        dailyWithdrawDate: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);


// ===============================
// Create Model
// ===============================

const User = mongoose.model("User", userSchema);

module.exports = User;