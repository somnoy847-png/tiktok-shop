const express = require("express");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const ChatMessage = require("../models/ChatMessage");
const User = require("../models/User");

const authenticateToken =
    require("../middleware/authMiddleware");

const {
    notifyNewUserMessage,
    notifyNewUserImage
} = require("../services/telegram");

const router = express.Router();


// =====================================================
// Helpers
// =====================================================

function getUserId(req) {

    return (
        req.user?.id ||
        req.user?.userId ||
        null
    );

}


function isValidObjectId(id) {

    return mongoose.Types.ObjectId.isValid(id);

}


function cleanText(value) {

    if (
        value === undefined ||
        value === null
    ) {

        return "";

    }

    return String(value).trim();

}


// =====================================================
// Image Helper
// =====================================================

async function saveChatImage(imageData) {

    if (!imageData) {

        throw new Error(
            "Image data is required."
        );

    }


    // ---------------------------------------------
    // Check image format
    // ---------------------------------------------

    const match =
        imageData.match(
            /^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,(.+)$/i
        );


    if (!match) {

        throw new Error(
            "Invalid image format."
        );

    }


    const mimeType =
        match[1].toLowerCase();


    const base64Data =
        match[2];


    // ---------------------------------------------
    // Convert Base64 to Buffer
    // ---------------------------------------------

    let buffer;

    try {

        buffer =
            Buffer.from(
                base64Data,
                "base64"
            );

    }

    catch (error) {

        console.error(
            "Image decode error:",
            error
        );

        throw new Error(
            "Invalid image data."
        );

    }


    // ---------------------------------------------
    // Check image
    // ---------------------------------------------

    if (
        !buffer ||
        buffer.length === 0
    ) {

        throw new Error(
            "Invalid image data."
        );

    }


    // ---------------------------------------------
    // Max size = 5 MB
    // ---------------------------------------------

    const maxSize =
        5 * 1024 * 1024;


    if (
        buffer.length >
        maxSize
    ) {

        throw new Error(
            "Image must be 5 MB or smaller."
        );

    }


    // ---------------------------------------------
    // Extension
    // ---------------------------------------------

    const extensionMap = {

        "image/png":
            ".png",

        "image/jpeg":
            ".jpg",

        "image/jpg":
            ".jpg",

        "image/webp":
            ".webp",

        "image/gif":
            ".gif"

    };


    const extension =
        extensionMap[mimeType];


    if (!extension) {

        throw new Error(
            "Unsupported image format."
        );

    }


    // ---------------------------------------------
    // Upload directory
    // ---------------------------------------------

    const uploadDirectory =
        path.join(
            __dirname,
            "../../uploads/chat"
        );


    await fs.promises.mkdir(
        uploadDirectory,
        {
            recursive: true
        }
    );


    // ---------------------------------------------
    // Unique file name
    // ---------------------------------------------

    const randomPart =
        Math.random()
            .toString(36)
            .slice(2, 10);


    const fileName =
        `${Date.now()}-${randomPart}${extension}`;


    const filePath =
        path.join(
            uploadDirectory,
            fileName
        );


    // ---------------------------------------------
    // Save image
    // ---------------------------------------------

    await fs.promises.writeFile(
        filePath,
        buffer
    );


    // ---------------------------------------------
    // Public URL
    // ---------------------------------------------

    return `/uploads/chat/${fileName}`;

}


// =====================================================
// Check Admin
// =====================================================

async function requireAdmin(
    req,
    res,
    next
) {

    try {

        const userId =
            getUserId(req);


        if (
            !userId ||
            !isValidObjectId(userId)
        ) {

            return res.status(401).json({

                success: false,

                message:
                    "Authentication required."

            });

        }


        const user =
            await User.findById(userId);


        if (!user) {

            return res.status(401).json({

                success: false,

                message:
                    "User not found."

            });

        }


        if (
            String(user.status || "")
                .toLowerCase() !==
            "active"
        ) {

            return res.status(403).json({

                success: false,

                message:
                    "Your account is not active."

            });

        }


        if (
            String(user.accountType || "")
                .toLowerCase() !==
            "admin"
        ) {

            return res.status(403).json({

                success: false,

                message:
                    "Admin access required."

            });

        }


        req.adminUser = user;

        next();

    }

    catch (error) {

        console.error(
            "Chat admin authentication error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Failed to verify admin access."

        });

    }

}


// =====================================================
// Safe Message
// =====================================================

function getSafeMessage(message) {

    return {

        id:
            message._id,

        shopId:
            message.shopId,

        senderType:
            message.senderType,

        senderId:
            message.senderId,

        messageType:
            message.messageType,

        messageText:
            message.messageText,

        imageUrl:
            message.imageUrl,

        cardData:
            message.cardData,

        isRead:
            message.isRead,

        createdAt:
            message.createdAt,

        updatedAt:
            message.updatedAt

    };

}

// =====================================================
// USER
// Get unread message count
//
// GET /api/chat/unread-count
// =====================================================

router.get(
    "/unread-count",
    authenticateToken,
    async (req, res) => {

        try {

            const userId =
                getUserId(req);


            if (
                !userId ||
                !isValidObjectId(userId)
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Authentication required."

                });

            }


            const count =
                await ChatMessage.countDocuments({

                    shopId:
                        userId,

                    senderType:
                        "admin",

                    isRead:
                        false

                });


            return res.json({

                success: true,

                count:
                    count

            });

        }

        catch (error) {

            console.error(
                "Get unread chat count error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to get unread message count."

            });

        }

    }
);

// =====================================================
// USER
// Get current user's chat
// =====================================================

router.get(
    "/",
    authenticateToken,
    async (req, res) => {

        try {

            const userId =
                getUserId(req);


            if (
                !userId ||
                !isValidObjectId(userId)
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Authentication required."

                });

            }


            const messages =
                await ChatMessage.find({

                    shopId:
                        userId

                })
                .sort({

                    createdAt: 1

                })
                .lean();


            return res.json({

                success: true,

                count:
                    messages.length,

                messages:
                    messages.map(
                        getSafeMessage
                    )

            });

        }

        catch (error) {

            console.error(
                "Get user chat error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to load chat."

            });

        }

    }
);

// =====================================================
// USER
// Mark admin messages as read
//
// POST /api/chat/mark-read
// =====================================================

router.post(
    "/mark-read",
    authenticateToken,
    async (req, res) => {

        try {

            const userId =
                getUserId(req);


            if (
                !userId ||
                !isValidObjectId(userId)
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Authentication required."

                });

            }


            const result =
                await ChatMessage.updateMany(

                    {

                        shopId:
                            userId,

                        senderType:
                            "admin",

                        isRead:
                            false

                    },

                    {

                        $set: {

                            isRead:
                                true

                        }

                    }

                );


            return res.json({

                success: true,

                modifiedCount:
                    result.modifiedCount || 0

            });

        }

        catch (error) {

            console.error(
                "Mark chat messages as read error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to mark messages as read."

            });

        }

    }
);
// =====================================================
// USER
// Send text message
// =====================================================

router.post(
    "/message",
    authenticateToken,
    async (req, res) => {

        try {

            const userId =
                getUserId(req);


            if (
                !userId ||
                !isValidObjectId(userId)
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Authentication required."

                });

            }


            const messageText =
                cleanText(
                    req.body.messageText
                );


            if (!messageText) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Message is required."

                });

            }


            const message =
    await ChatMessage.create({

        shopId:
            userId,

        senderType:
            "user",

        senderId:
            userId,

        messageType:
            "text",

        messageText

    });


notifyNewUserMessage({
    userId,
    message
}).catch((telegramError) => {

    console.error(
        "Telegram notification error:",
        telegramError.message
    );

});


return res.status(201).json({

                success: true,

                message:
                    getSafeMessage(message)

            });

        }

        catch (error) {

            console.error(
                "Send user chat message error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to send message."

            });

        }

    }
);


// =====================================================
// ADMIN
// Get chat rooms
// =====================================================

router.get(
    "/admin/rooms",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            const rooms =
                await ChatMessage.aggregate([

                    {
                        $sort: {

                            createdAt: -1

                        }

                    },

                    {
                        $group: {

                            _id:
                                "$shopId",

                            lastMessage: {

                                $first:
                                    "$$ROOT"

                            },

                            unreadCount: {

                                $sum: {

                                    $cond: [

                                        {
                                            $and: [

                                                {
                                                    $eq: [
                                                        "$senderType",
                                                        "user"
                                                    ]
                                                },

                                                {
                                                    $eq: [
                                                        "$isRead",
                                                        false
                                                    ]
                                                }

                                            ]
                                        },

                                        1,

                                        0

                                    ]

                                }

                            }

                        }

                    },

                    {

                        $sort: {

                            "lastMessage.createdAt":
                                -1

                        }

                    }

                ]);


            const result = [];


            for (
                const room of rooms
            ) {

                const user =
                    await User.findById(
                        room._id
                    )
                    .select(
                        "_id username shopName profileImage contact accountType"
                    )
                    .lean();


                if (!user) {

                    continue;

                }


                result.push({

                    user: {

                        id:
                            user._id,

                        username:
                            user.username,

                        shopName:
                            user.shopName || "",

                        profileImage:
                            user.profileImage || "",

                        contact:
                            user.contact || "",

                        accountType:
                            user.accountType

                    },

                    unreadCount:
                        room.unreadCount,

                    lastMessage:
                        getSafeMessage(
                            room.lastMessage
                        )

                });

            }


            return res.json({

                success: true,

                rooms:
                    result

            });

        }

        catch (error) {

            console.error(
                "Get admin chat rooms error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to load chat rooms."

            });

        }

    }
);


// =====================================================
// ADMIN
// Get messages from user
// =====================================================

router.get(
    "/admin/:userId",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            const userId =
                req.params.userId;


            if (
                !isValidObjectId(userId)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid user ID."

                });

            }


            const messages =
                await ChatMessage.find({

                    shopId:
                        userId

                })
                .sort({

                    createdAt: 1

                })
                .lean();


            // Mark user messages as read

            await ChatMessage.updateMany(

                {

                    shopId:
                        userId,

                    senderType:
                        "user",

                    isRead:
                        false

                },

                {

                    $set: {

                        isRead:
                            true

                    }

                }

            );


            return res.json({

                success: true,

                count:
                    messages.length,

                messages:
                    messages.map(
                        getSafeMessage
                    )

            });

        }

        catch (error) {

            console.error(
                "Get admin chat error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to load chat."

            });

        }

    }
);


// =====================================================
// ADMIN
// Send text
// =====================================================

router.post(
    "/admin/:userId/message",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            const userId =
                req.params.userId;


            if (
                !isValidObjectId(userId)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid user ID."

                });

            }


            const targetUser =
                await User.findById(
                    userId
                );


            if (!targetUser) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found."

                });

            }


            const messageText =
                cleanText(
                    req.body.messageText
                );


            if (!messageText) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Message is required."

                });

            }


            const adminId =
                getUserId(req);


            const message =
                await ChatMessage.create({

                    shopId:
                        targetUser._id,

                    senderType:
                        "admin",

                    senderId:
                        adminId,

                    messageType:
                        "text",

                    messageText

                });


            return res.status(201).json({

                success: true,

                message:
                    getSafeMessage(message)

            });

        }

        catch (error) {

            console.error(
                "Send admin chat message error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to send message."

            });

        }

    }
);


// =====================================================
// ADMIN
// Send Bank Card / Crypto Card
// =====================================================

router.post(
    "/admin/:userId/card",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            const userId =
                req.params.userId;


            if (
                !isValidObjectId(userId)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid user ID."

                });

            }


            const targetUser =
                await User.findById(
                    userId
                );


            if (!targetUser) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found."

                });

            }


            const type =
                cleanText(
                    req.body.messageType
                );


            if (
                type !== "bank_card" &&
                type !== "crypto_card"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid card type."

                });

            }


            const cardData =
                req.body.cardData;


            if (
                !cardData ||
                typeof cardData !== "object"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Card data is required."

                });

            }


            const adminId =
                getUserId(req);


            const message =
                await ChatMessage.create({

                    shopId:
                        targetUser._id,

                    senderType:
                        "admin",

                    senderId:
                        adminId,

                    messageType:
                        type,

                    cardData:
                        cardData

                });


            return res.status(201).json({

                success: true,

                message:
                    getSafeMessage(message)

            });

        }

        catch (error) {

            console.error(
                "Send chat card error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to send card."

            });

        }

    }
);


// =====================================================
// USER
// Send image message
//
// POST /api/chat/image
// =====================================================

router.post(
    "/image",
    authenticateToken,
    async (req, res) => {

        try {

            const userId =
                getUserId(req);


            if (
                !userId ||
                !isValidObjectId(userId)
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Authentication required."

                });

            }


            const imageData =
                cleanText(
                    req.body.imageData
                );


            if (!imageData) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Image data is required."

                });

            }


            let imageUrl;

            try {

                imageUrl =
                    await saveChatImage(
                        imageData
                    );

            }

            catch (imageError) {

                return res.status(400).json({

                    success: false,

                    message:
                        imageError.message

                });

            }


            const message =
                await ChatMessage.create({

                    shopId:
                        userId,

                    senderType:
                        "user",

                    senderId:
                        userId,

                    messageType:
                        "image",

                    messageText:
                        "",

                    imageUrl:
                        imageUrl,

                    isRead:
                        false

                });

                notifyNewUserImage({
    userId,
    message
}).catch((telegramError) => {

    console.error(
        "Telegram image notification error:",
        telegramError.message
    );

});


            return res.status(201).json({

                success: true,

                message:
                    getSafeMessage(message)

            });

        }

        catch (error) {

            console.error(
                "Send user chat image error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to send image."

            });

        }

    }
);


// =====================================================
// ADMIN
// Send image message
//
// POST /api/chat/admin/:userId/image
// =====================================================

router.post(
    "/admin/:userId/image",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            // ---------------------------------------------
            // TARGET USER
            // ---------------------------------------------

            const userId =
                req.params.userId;


            if (
                !isValidObjectId(userId)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid user ID."

                });

            }


            // ---------------------------------------------
            // CHECK USER
            // ---------------------------------------------

            const targetUser =
                await User.findById(
                    userId
                );


            if (!targetUser) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found."

                });

            }


            // ---------------------------------------------
            // IMAGE DATA
            // ---------------------------------------------

            const imageData =
                cleanText(
                    req.body.imageData
                );


            if (!imageData) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Image data is required."

                });

            }


            // ---------------------------------------------
            // SAVE IMAGE
            // ---------------------------------------------

            let imageUrl;

            try {

                imageUrl =
                    await saveChatImage(
                        imageData
                    );

            }

            catch (imageError) {

                return res.status(400).json({

                    success: false,

                    message:
                        imageError.message

                });

            }


            // ---------------------------------------------
            // ADMIN ID
            // ---------------------------------------------

            const adminId =
                getUserId(req);


            // ---------------------------------------------
            // SAVE MESSAGE
            // ---------------------------------------------

            const message =
                await ChatMessage.create({

                    shopId:
                        targetUser._id,

                    senderType:
                        "admin",

                    senderId:
                        adminId,

                    messageType:
                        "image",

                    messageText:
                        "",

                    imageUrl:
                        imageUrl,

                    isRead:
                        false

                });


            // ---------------------------------------------
            // RESPONSE
            // ---------------------------------------------

            return res.status(201).json({

                success: true,

                message:
                    getSafeMessage(message)

            });

        }

        catch (error) {

            console.error(
                "Send admin chat image error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to send image."

            });

        }

    }
);


// =====================================================
// EXPORT
// =====================================================

module.exports = router;