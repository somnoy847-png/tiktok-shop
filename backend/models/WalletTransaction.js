const mongoose = require("mongoose");


// =====================================================
// WALLET TRANSACTION SCHEMA
// =====================================================

const walletTransactionSchema = new mongoose.Schema(
    {

        // =================================================
        // USER
        // =================================================

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },


        // =================================================
        // TRANSACTION ID
        // =================================================

        transactionId: {
            type: String,
            required: true,
            unique: true,
            index: true
        },


        // =================================================
        // TYPE
        // =================================================

        type: {
            type: String,
            enum: [
                "deposit",
                "withdrawal"
            ],
            required: true,
            index: true
        },


        // =================================================
        // PAYMENT METHOD
        // =================================================

        method: {
            type: String,
            enum: [
                "bank",
                "crypto"
            ],
            required: true
        },


        // =================================================
        // AMOUNT
        // =================================================

        amount: {
            type: Number,
            required: true,
            min: 0
        },


        // =================================================
        // CURRENCY
        // =================================================

        currency: {
            type: String,
            default: "USD",
            trim: true
        },


        // =================================================
        // CRYPTO NETWORK
        // =================================================

        network: {
            type: String,
            default: "",
            trim: true
        },


        // =================================================
        // USER WITHDRAW ACCOUNT
        // =================================================

        walletAccountId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "WalletAccount",
            default: null
        },


        // =================================================
        // ADMIN PAYMENT ACCOUNT
        // =================================================
        // บัญชีที่ Admin ส่งให้ผู้ใช้สำหรับฝากเงิน
        // =================================================

        adminAccount: {

            bankName: {
                type: String,
                default: ""
            },

            accountName: {
                type: String,
                default: ""
            },

            accountNumber: {
                type: String,
                default: ""
            },

            branch: {
                type: String,
                default: ""
            },

            network: {
                type: String,
                default: ""
            },

            walletAddress: {
                type: String,
                default: ""
            }

        },


        // =================================================
        // PAYMENT SLIP
        // =================================================

        slip: {

            url: {
                type: String,
                default: ""
            },

            filename: {
                type: String,
                default: ""
            },

            uploadedAt: {
                type: Date,
                default: null
            }

        },


        // =================================================
        // STATUS
        // =================================================

        status: {
            type: String,
            enum: [
                "pending",
                "account_assigned",
                "awaiting_slip",
                "under_review",
                "completed",
                "rejected",
                "cancelled"
            ],
            default: "pending",
            index: true
        },


        // =================================================
        // USER NOTE
        // =================================================

        userNote: {
            type: String,
            default: "",
            trim: true,
            maxlength: 1000
        },


        // =================================================
        // ADMIN NOTE
        // =================================================

        adminNote: {
            type: String,
            default: "",
            trim: true,
            maxlength: 1000
        },


        // =================================================
        // BALANCE SNAPSHOT
        // =================================================
        // ใช้เก็บยอดก่อนและหลังธุรกรรม
        // =================================================

        balanceBefore: {
            type: Number,
            default: 0,
            min: 0
        },


        balanceAfter: {
            type: Number,
            default: 0,
            min: 0
        },


        // =================================================
        // ADMIN
        // =================================================

        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },


        reviewedAt: {
            type: Date,
            default: null
        },


        completedAt: {
            type: Date,
            default: null
        }

    },

    {

        timestamps: true

    }

);


// =====================================================
// INDEXES
// =====================================================

walletTransactionSchema.index(
    {
        userId: 1,
        createdAt: -1
    }
);


walletTransactionSchema.index(
    {
        type: 1,
        status: 1,
        createdAt: -1
    }
);


// =====================================================
// MODEL
// =====================================================

const WalletTransaction =
    mongoose.model(
        "WalletTransaction",
        walletTransactionSchema
    );


// =====================================================
// EXPORT
// =====================================================

module.exports =
    WalletTransaction;