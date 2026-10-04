const mongoose = require("mongoose");

/*
=========================================================
KYC MODEL
TikTok Shop

ใช้เก็บข้อมูลการยืนยันตัวตนของ User
โดยแยกออกจาก User.js
=========================================================
*/

const kycSchema = new mongoose.Schema(
    {

        // =================================================
        // USER
        // =================================================

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
            index: true
        },


        // =================================================
        // FULL NAME
        // =================================================

        fullName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120
        },


        // =================================================
        // ID CARD / IDENTIFICATION NUMBER
        // =================================================

        idNumber: {
            type: String,
            required: true,
            trim: true,
            maxlength: 40
        },


        // =================================================
        // NATIONALITY
        // =================================================

        nationality: {
            type: String,
            required: true,
            trim: true,
            maxlength: 60
        },


        // =================================================
        // FRONT OF ID CARD IMAGE
        // =================================================

        idCardFront: {
            type: String,
            required: true,
            trim: true
        },


        // =================================================
        // KYC STATUS
        //
        // unverified = ยังไม่ได้ส่ง
        // pending    = ส่งแล้ว รอ Admin ตรวจ
        // verified   = Admin ยืนยันแล้ว
        // =================================================

        status: {
            type: String,
            enum: [
                "unverified",
                "pending",
                "verified"
            ],
            default: "unverified",
            index: true
        },


        // =================================================
        // SUBMITTED DATE
        // =================================================

        submittedAt: {
            type: Date,
            default: null
        },


        // =================================================
        // VERIFIED DATE
        // =================================================

        verifiedAt: {
            type: Date,
            default: null
        },


        // =================================================
        // ADMIN WHO VERIFIED
        // =================================================

        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        }

    },

    {
        timestamps: true
    }
);


/*
=========================================================
EXPORT
=========================================================
*/

const KYC =
    mongoose.model(
        "KYC",
        kycSchema
    );

module.exports = KYC;