const mongoose = require("mongoose");

const ChatMessageSchema = new mongoose.Schema(
    {
        // ห้องแชทของผู้ใช้/ร้าน
        shopId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        // ผู้ส่ง
        senderType: {
            type: String,
            enum: ["user", "admin"],
            required: true
        },

        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        // ประเภทข้อความ
        messageType: {
            type: String,
            enum: [
                "text",
                "image",
                "bank_card",
                "crypto_card"
            ],
            default: "text"
        },

        // ข้อความธรรมดา
        messageText: {
            type: String,
            default: "",
            trim: true
        },

        // รูปภาพ
        imageUrl: {
            type: String,
            default: ""
        },

        // ข้อมูล Card
        cardData: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },

        // อ่านแล้วหรือยัง
        isRead: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);


// ช่วยให้โหลดข้อความในห้องเร็วขึ้น
ChatMessageSchema.index({
    shopId: 1,
    createdAt: 1
});


module.exports =
    mongoose.model(
        "ChatMessage",
        ChatMessageSchema
    );