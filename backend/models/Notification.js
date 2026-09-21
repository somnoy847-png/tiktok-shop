const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
    {
        recipientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        senderType: {
            type: String,
            enum: [
                "system",
                "admin"
            ],
            default: "system"
        },

        type: {
            type: String,
            enum: [
                "manual",
                "order_new",
                "deposit_success",
                "withdrawal_success",
                "order_delivered"
            ],
            default: "manual",
            index: true
        },

        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200
        },

        message: {
            type: String,
            default: "",
            trim: true,
            maxlength: 5000
        },

        imageUrl: {
            type: String,
            default: ""
        },

        linkUrl: {
            type: String,
            default: ""
        },

        data: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },

        isRead: {
            type: Boolean,
            default: false,
            index: true
        },

        readAt: {
            type: Date,
            default: null
        }
    },

    {
        timestamps: true
    }
);


/*
=========================================================
INDEX
=========================================================
*/

NotificationSchema.index({
    recipientId: 1,
    createdAt: -1
});

NotificationSchema.index({
    recipientId: 1,
    isRead: 1
});


module.exports =
    mongoose.model(
        "Notification",
        NotificationSchema
    );