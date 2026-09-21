const mongoose = require("mongoose");


// =====================================================
// WALLET ACCOUNT SCHEMA
// =====================================================

const walletAccountSchema = new mongoose.Schema(
    {

        // =================================================
        // OWNER
        // =================================================

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },


        // =================================================
        // ACCOUNT TYPE
        // =================================================

        type: {
            type: String,
            enum: [
                "bank",
                "crypto"
            ],
            required: true
        },


        // =================================================
        // ACCOUNT LABEL
        // =================================================
        // ตัวอย่าง:
        // My Bank
        // My USDT Wallet
        // =================================================

        label: {
            type: String,
            default: "",
            trim: true,
            maxlength: 100
        },


        // =================================================
        // BANK INFORMATION
        // =================================================

        bankName: {
            type: String,
            default: "",
            trim: true
        },


        accountName: {
            type: String,
            default: "",
            trim: true
        },


        accountNumber: {
            type: String,
            default: "",
            trim: true
        },


        branch: {
            type: String,
            default: "",
            trim: true
        },


        // =================================================
        // CRYPTO INFORMATION
        // =================================================

        network: {
            type: String,
            default: "",
            trim: true
        },


        walletAddress: {
            type: String,
            default: "",
            trim: true
        },


        // =================================================
        // STATUS
        // =================================================

        status: {
            type: String,
            enum: [
                "active",
                "inactive"
            ],
            default: "active"
        }

    },

    {
        timestamps: true
    }

);


// =====================================================
// INDEX
// =====================================================

walletAccountSchema.index(
    {
        userId: 1,
        createdAt: -1
    }
);


// =====================================================
// MODEL
// =====================================================

const WalletAccount =
    mongoose.model(
        "WalletAccount",
        walletAccountSchema
    );


// =====================================================
// EXPORT
// =====================================================

module.exports =
    WalletAccount;