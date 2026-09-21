const express =
    require("express");

const mongoose =
    require("mongoose");

const Notification =
    require("../models/Notification");

const User =
    require("../models/User");

const authenticateToken =
    require("../middleware/authMiddleware");

const requireAdmin =
    require("../middleware/adminMiddleware");

const {
    createAdminNotification
} =
    require("../services/notificationService");


const router =
    express.Router();


/*
=========================================================
HELPERS
=========================================================
*/

function getUserId(req) {

    return (
        req.user?.id ||
        req.user?.userId ||
        null
    );

}


function isValidObjectId(id) {

    return mongoose.Types.ObjectId.isValid(
        id
    );

}


function cleanText(value) {

    return String(
        value ?? ""
    ).trim();

}


/*
=========================================================
USER
GET MY NOTIFICATIONS
=========================================================
GET /api/notifications
=========================================================
*/

router.get(
    "/",
    authenticateToken,
    async function(req, res) {

        try {

            const userId =
                getUserId(req);


            if (!userId) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Authentication required."

                });

            }


            const notifications =
                await Notification.find({

                    recipientId:
                        userId

                })
                .sort({

                    createdAt:
                        -1

                })
                .limit(100);


            return res.json({

                success: true,

                count:
                    notifications.length,

                notifications

            });


        }

        catch (error) {

            console.error(
                "Get notifications error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to load notifications."

            });

        }

    }
);


/*
=========================================================
USER
GET UNREAD COUNT
=========================================================
GET /api/notifications/unread-count
=========================================================
*/

router.get(
    "/unread-count",
    authenticateToken,
    async function(req, res) {

        try {

            const userId =
                getUserId(req);


            if (!userId) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Authentication required."

                });

            }


            const count =
                await Notification.countDocuments({

                    recipientId:
                        userId,

                    isRead:
                        false

                });


            return res.json({

                success: true,

                count

            });


        }

        catch (error) {

            console.error(
                "Unread notification count error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to get notification count."

            });

        }

    }
);


/*
=========================================================
USER
MARK ONE AS READ
=========================================================
PATCH /api/notifications/:id/read
=========================================================
*/

router.patch(
    "/:id/read",
    authenticateToken,
    async function(req, res) {

        try {

            const userId =
                getUserId(req);

            const notificationId =
                req.params.id;


            if (!userId) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Authentication required."

                });

            }


            if (
                !isValidObjectId(
                    notificationId
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid notification ID."

                });

            }


            const notification =
                await Notification.findOne({

                    _id:
                        notificationId,

                    recipientId:
                        userId

                });


            if (!notification) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Notification not found."

                });

            }


            notification.isRead =
                true;

            notification.readAt =
                new Date();


            await notification.save();


            return res.json({

                success: true,

                notification

            });

        }

        catch (error) {

            console.error(
                "Mark notification read error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to mark notification as read."

            });

        }

    }
);


/*
=========================================================
USER
MARK ALL AS READ
=========================================================
PATCH /api/notifications/read-all
=========================================================
*/

router.patch(
    "/read-all",
    authenticateToken,
    async function(req, res) {

        try {

            const userId =
                getUserId(req);


            if (!userId) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Authentication required."

                });

            }


            const result =
                await Notification.updateMany(

                    {
                        recipientId:
                            userId,

                        isRead:
                            false

                    },

                    {
                        $set: {

                            isRead:
                                true,

                            readAt:
                                new Date()

                        }

                    }

                );


            return res.json({

                success: true,

                modifiedCount:
                    result.modifiedCount

            });

        }

        catch (error) {

            console.error(
                "Mark all notifications read error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to mark notifications as read."

            });

        }

    }
);


/*
=========================================================
ADMIN
GET USERS FOR NOTIFICATION ROOMS
=========================================================
GET /api/notifications/admin/rooms
=========================================================
*/

router.get(
    "/admin/rooms",
    authenticateToken,
    requireAdmin,
    async function(req, res) {

        try {

            const users =
                await User.find({

                    accountType: {

                        $in: [
                            "buyer",
                            "seller",
                            "admin"
                        ]

                    }

                })
                .select(
                    "_id username shopName displayName contact profileImage accountType"
                )
                .sort({

                    createdAt:
                        -1

                })
                .lean();


            const userIds =
                users.map(
                    user =>
                        user._id
                );


            const unreadCounts =
                await Notification.aggregate([

                    {
                        $match: {

                            recipientId: {

                                $in:
                                    userIds

                            },

                            isRead:
                                false

                        }

                    },

                    {
                        $group: {

                            _id:
                                "$recipientId",

                            count: {

                                $sum:
                                    1

                            }

                        }

                    }

                ]);


            const unreadMap =
                new Map();


            unreadCounts.forEach(
                item => {

                    unreadMap.set(

                        String(
                            item._id
                        ),

                        item.count

                    );

                }
            );


            const lastNotifications =
                await Notification.aggregate([

                    {
                        $match: {

                            recipientId: {

                                $in:
                                    userIds

                            }

                        }

                    },

                    {
                        $sort: {

                            createdAt:
                                -1

                        }

                    },

                    {
                        $group: {

                            _id:
                                "$recipientId",

                            notification: {

                                $first:
                                    "$$ROOT"

                            }

                        }

                    }

                ]);


            const lastMap =
                new Map();


            lastNotifications.forEach(
                item => {

                    lastMap.set(

                        String(
                            item._id
                        ),

                        item.notification

                    );

                }
            );


            const rooms =
                users.map(
                    user => {

                        const last =
                            lastMap.get(
                                String(
                                    user._id
                                )
                            );


                        return {

                            user,

                            unreadCount:
                                unreadMap.get(
                                    String(
                                        user._id
                                    )
                                ) || 0,

                            lastNotification:
                                last || null

                        };

                    }
                );


            return res.json({

                success: true,

                count:
                    rooms.length,

                rooms

            });

        }

        catch (error) {

            console.error(
                "Admin notification rooms error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to load notification rooms."

            });

        }

    }
);


/*
=========================================================
ADMIN
GET NOTIFICATION HISTORY FOR USER
=========================================================
GET /api/notifications/admin/:userId
=========================================================
*/

router.get(
    "/admin/:userId",
    authenticateToken,
    requireAdmin,
    async function(req, res) {

        try {

            const userId =
                req.params.userId;


            if (
                !isValidObjectId(
                    userId
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid user ID."

                });

            }


            const user =
                await User.findById(
                    userId
                )
                .select(
                    "_id username shopName displayName contact profileImage accountType"
                )
                .lean();


            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found."

                });

            }


            const notifications =
                await Notification.find({

                    recipientId:
                        userId

                })
                .sort({

                    createdAt:
                        1

                })
                .limit(200);


            return res.json({

                success: true,

                user,

                count:
                    notifications.length,

                notifications

            });

        }

        catch (error) {

            console.error(
                "Admin notification history error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to load notification history."

            });

        }

    }
);


/*
=========================================================
ADMIN
SEND NOTIFICATION
=========================================================
POST /api/notifications/admin/send
=========================================================
*/

router.post(
    "/admin/send",
    authenticateToken,
    requireAdmin,
    async function(req, res) {

        try {

            const adminId =
                getUserId(req);


            const {

                recipientId,

                title,

                message,

                imageData,

                linkUrl,

                type,

                data

            } =
                req.body;


            if (!recipientId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Recipient is required."

                });

            }


            if (
                !isValidObjectId(
                    recipientId
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid recipient ID."

                });

            }


            if (
                !cleanText(
                    title
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Notification title is required."

                });

            }


            const notification =
                await createAdminNotification({

                    adminId,

                    recipientId,

                    title:

                        cleanText(
                            title
                        ),

                    message:

                        cleanText(
                            message
                        ),

                    imageData:

                        imageData || "",

                    linkUrl:

                        cleanText(
                            linkUrl
                        ),

                    type:

                        type || "manual",

                    data:

                        data || null

                });


            return res.status(201).json({

                success: true,

                message:
                    "Notification sent successfully.",

                notification

            });

        }

        catch (error) {

            console.error(
                "Admin send notification error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    error.message ||
                    "Unable to send notification."

            });

        }

    }
);


module.exports =
    router;