const express = require("express");
const mongoose = require("mongoose");

const User = require("../models/User");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();


// =====================================================
// ADMIN AUTHORIZATION
// =====================================================
//
// ต้อง Login และต้องมี role = admin
//
// auth.js ของระบบเราส่ง role มาจาก accountType
// ดังนั้น Admin จะต้องมี:
// accountType: "admin"
// =====================================================

function requireAdmin(req, res, next) {

    try {

        if (!req.user) {

            return res.status(401).json({

                success: false,

                message:
                    "Authentication required."

            });

        }


        // -------------------------------------------------
        // ตรวจจาก req.user ที่ middleware ใส่ไว้
        // -------------------------------------------------

        if (
            String(
                req.user.role || ""
            ).toLowerCase() === "admin"
        ) {

            return next();

        }


        // -------------------------------------------------
        // ถ้า middleware เก็บเฉพาะ id
        // ให้ตรวจจาก Database อีกครั้ง
        // -------------------------------------------------

        return User.findById(
            req.user.id
        )
            .then(user => {

                if (!user) {

                    return res.status(401).json({

                        success: false,

                        message:
                            "User account not found."

                    });

                }


                if (
                    String(
                        user.accountType || ""
                    ).toLowerCase() !== "admin"
                ) {

                    return res.status(403).json({

                        success: false,

                        message:
                            "Admin access required."

                    });

                }


                next();

            })
            .catch(error => {

                console.error(
                    "Admin authorization error:",
                    error
                );


                return res.status(500).json({

                    success: false,

                    message:
                        "Failed to verify admin access."

                });

            });

    }

    catch (error) {

        console.error(
            "Admin authorization error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Admin authorization failed."

        });

    }

}


// =====================================================
// SAFE USER
// =====================================================
//
// ไม่ส่ง password กลับไปเด็ดขาด
// =====================================================

function getSafeUser(user) {

    return {

        id:
            user._id,

        username:
            user.username || "",

        shopName:
            user.shopName || "",

        displayName:
            user.shopName ||
            user.displayName ||
            user.username ||
            "",

        contact:
            user.contact || "",

        nationality:
            user.nationality || "",

        country:
            user.country || "",

        accountType:
            user.accountType || "",

        role:
            user.accountType || "",

        status:
            user.status || "",

        profileImage:
            user.profileImage || "",


        // -------------------------------------------------
        // Wallet
        // -------------------------------------------------

        balance:
            Number(user.balance || 0),

        totalAssets:
            Number(user.totalAssets || 0),

        pendingAmount:
            Number(user.pendingAmount || 0),

        totalDeposited:
            Number(user.totalDeposited || 0),

        totalWithdrawn:
            Number(user.totalWithdrawn || 0),

        dailyWithdrawn:
            Number(user.dailyWithdrawn || 0),

        dailyWithdrawLimit:
            Number(user.dailyWithdrawLimit || 0),

        dailyWithdrawDate:
            user.dailyWithdrawDate || null,


        createdAt:
            user.createdAt,

        updatedAt:
            user.updatedAt

    };

}


// =====================================================
// NORMALIZE
// =====================================================

function cleanText(value) {

    return String(
        value ?? ""
    ).trim();

}


function cleanUsername(value) {

    return cleanText(
        value
    ).toLowerCase();

}


function cleanNumber(value) {

    const number =
        Number(value);


    if (
        !Number.isFinite(number)
    ) {

        return null;

    }


    return number;

}


// =====================================================
// VALIDATE OBJECT ID
// =====================================================

function isValidObjectId(id) {

    return mongoose.Types.ObjectId.isValid(
        id
    );

}


// =====================================================
// APPLY AUTH + ADMIN
// =====================================================

router.use(
    authenticateToken,
    requireAdmin
);


// =====================================================
// GET ALL USERS
// =====================================================
//
// GET /api/admin/users
//
// รองรับ:
//
// ?search=win
// ?accountType=seller
// ?status=active
//
// =====================================================

router.get(
    "/",
    async (req, res) => {

        try {

            const {
                search,
                accountType,
                status
            } = req.query;


            const query = {};


            // -------------------------------------------------
            // SEARCH
            // -------------------------------------------------

            if (
                search &&
                cleanText(search)
            ) {

                const keyword =
                    cleanText(search);


                query.$or = [

                    {
                        username: {
                            $regex:
                                keyword,
                            $options:
                                "i"
                        }
                    },

                    {
                        shopName: {
                            $regex:
                                keyword,
                            $options:
                                "i"
                        }
                    },

                    {
                        contact: {
                            $regex:
                                keyword,
                            $options:
                                "i"
                        }
                    }

                ];

            }


            // -------------------------------------------------
            // ACCOUNT TYPE
            // -------------------------------------------------

            if (
                accountType
            ) {

                query.accountType =
                    cleanText(
                        accountType
                    ).toLowerCase();

            }


            // -------------------------------------------------
            // STATUS
            // -------------------------------------------------

            if (
                status
            ) {

                query.status =
                    cleanText(
                        status
                    ).toLowerCase();

            }


            // -------------------------------------------------
            // GET USERS
            // -------------------------------------------------

            const users =
                await User.find(
                    query
                )
                    .select(
                        "-password"
                    )
                    .sort({
                        createdAt:
                            -1
                    });


            return res.status(200).json({

                success: true,

                count:
                    users.length,

                users:
                    users.map(
                        getSafeUser
                    )

            });

        }

        catch (error) {

            console.error(
                "Admin get users error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to get users."

            });

        }

    }
);


// =====================================================
// GET USER BY ID
// =====================================================
//
// GET /api/admin/users/:id
//
// =====================================================

router.get(
    "/:id",
    async (req, res) => {

        try {

            const {
                id
            } = req.params;


            if (
                !isValidObjectId(id)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid user ID."

                });

            }


            const user =
                await User.findById(
                    id
                )
                    .select(
                        "-password"
                    );


            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found."

                });

            }


            return res.status(200).json({

                success: true,

                user:
                    getSafeUser(
                        user
                    )

            });

        }

        catch (error) {

            console.error(
                "Admin get user error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to get user."

            });

        }

    }
);


// =====================================================
// UPDATE USER
// =====================================================
//
// PATCH /api/admin/users/:id
//
// แก้:
//
// username
// shopName
// contact
// nationality
// country
// accountType
// status
// profileImage
// dailyWithdrawLimit
//
// =====================================================

router.patch(
    "/:id",
    async (req, res) => {

        try {

            const {
                id
            } = req.params;


            if (
                !isValidObjectId(id)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid user ID."

                });

            }


            const user =
                await User.findById(
                    id
                );


            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found."

                });

            }


            // =================================================
            // USERNAME
            // =================================================

            if (
                req.body.username !==
                undefined
            ) {

                const username =
                    cleanUsername(
                        req.body.username
                    );


                if (
                    !username
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Username cannot be empty."

                    });

                }


                const existingUser =
                    await User.findOne({

                        username,

                        _id: {
                            $ne: id
                        }

                    });


                if (
                    existingUser
                ) {

                    return res.status(409).json({

                        success: false,

                        message:
                            "Username is already in use."

                    });

                }


                user.username =
                    username;

            }


            // =================================================
            // SHOP NAME
            // =================================================

            if (
                req.body.shopName !==
                undefined
            ) {

                user.shopName =
                    cleanText(
                        req.body.shopName
                    );

            }


            // =================================================
            // CONTACT
            // =================================================

            if (
                req.body.contact !==
                undefined
            ) {

                const contact =
                    cleanText(
                        req.body.contact
                    ).toLowerCase();


                if (
                    contact
                ) {

                    const existingContact =
                        await User.findOne({

                            contact,

                            _id: {
                                $ne: id
                            }

                        });


                    if (
                        existingContact
                    ) {

                        return res.status(409).json({

                            success: false,

                            message:
                                "Contact is already in use."

                        });

                    }

                }


                user.contact =
                    contact;

            }


            // =================================================
            // NATIONALITY
            // =================================================

            if (
                req.body.nationality !==
                undefined
            ) {

                user.nationality =
                    cleanText(
                        req.body.nationality
                    );

            }


            // =================================================
            // COUNTRY
            // =================================================

            if (
                req.body.country !==
                undefined
            ) {

                user.country =
                    cleanText(
                        req.body.country
                    );

            }


            // =================================================
            // PROFILE IMAGE
            // =================================================

            if (
                req.body.profileImage !==
                undefined
            ) {

                user.profileImage =
                    cleanText(
                        req.body.profileImage
                    );

            }


            // =================================================
            // ACCOUNT TYPE / ROLE
            // =================================================

            if (
                req.body.accountType !==
                undefined
            ) {

                const accountType =
                    cleanText(
                        req.body.accountType
                    ).toLowerCase();


                const allowedTypes = [

                    "buyer",

                    "seller",

                    "admin"

                ];


                if (
                    !allowedTypes.includes(
                        accountType
                    )
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Invalid account type."

                    });

                }


                // -------------------------------------------------
                // Prevent admin from changing own role
                // -------------------------------------------------

                if (
                    String(
                        user._id
                    ) ===
                    String(
                        req.user.id
                    ) &&
                    accountType !== "admin"
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "You cannot remove your own admin role."

                    });

                }


                user.accountType =
                    accountType;

            }


            // =================================================
            // STATUS
            // =================================================

            if (
                req.body.status !==
                undefined
            ) {

                const status =
                    cleanText(
                        req.body.status
                    ).toLowerCase();


                const allowedStatuses = [

                    "active",

                    "suspended"

                ];


                if (
                    !allowedStatuses.includes(
                        status
                    )
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Invalid account status."

                    });

                }


                // -------------------------------------------------
                // Prevent admin from suspending own account
                // -------------------------------------------------

                if (
                    String(
                        user._id
                    ) ===
                    String(
                        req.user.id
                    ) &&
                    status !== "active"
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "You cannot suspend your own account."

                    });

                }


                user.status =
                    status;

            }


            // =================================================
            // DAILY WITHDRAW LIMIT
            // =================================================

            if (
                req.body.dailyWithdrawLimit !==
                undefined
            ) {

                const limit =
                    cleanNumber(
                        req.body.dailyWithdrawLimit
                    );


                if (
                    limit === null ||
                    limit < 0
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Invalid withdrawal limit."

                    });

                }


                user.dailyWithdrawLimit =
                    limit;

            }


            // =================================================
            // SAVE
            // =================================================

            await user.save();


            return res.status(200).json({

                success: true,

                message:
                    "User updated successfully.",

                user:
                    getSafeUser(
                        user
                    )

            });

        }

        catch (error) {

            console.error(
                "Admin update user error:",
                error
            );


            if (
                error.code ===
                11000
            ) {

                return res.status(409).json({

                    success: false,

                    message:
                        "Username or contact is already in use."

                });

            }


            return res.status(500).json({

                success: false,

                message:
                    "Failed to update user."

            });

        }

    }
);


// =====================================================
// UPDATE WALLET BALANCE
// =====================================================
//
// PATCH /api/admin/users/:id/wallet
//
// Body:
//
// {
//     "balance": 500
// }
//
// หรือ
//
// {
//     "amount": 100,
//     "operation": "add"
// }
//
// หรือ
//
// {
//     "amount": 100,
//     "operation": "subtract"
// }
//
// =====================================================

router.patch(
    "/:id/wallet",
    async (req, res) => {

        try {

            const {
                id
            } = req.params;


            if (
                !isValidObjectId(id)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid user ID."

                });

            }


            const user =
                await User.findById(
                    id
                );


            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found."

                });

            }


            // =================================================
            // DIRECT BALANCE
            // =================================================

            if (
                req.body.balance !==
                undefined
            ) {

                const balance =
                    cleanNumber(
                        req.body.balance
                    );


                if (
                    balance === null ||
                    balance < 0
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Balance must be a valid number greater than or equal to 0."

                    });

                }


                user.balance =
                    balance;


                user.totalAssets =
                    balance;

            }


            // =================================================
            // ADD / SUBTRACT
            // =================================================

            else if (
                req.body.amount !==
                undefined
            ) {

                const amount =
                    cleanNumber(
                        req.body.amount
                    );


                if (
                    amount === null ||
                    amount <= 0
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Amount must be greater than 0."

                    });

                }


                const operation =
                    cleanText(
                        req.body.operation
                    ).toLowerCase();


                const currentBalance =
                    Number(
                        user.balance || 0
                    );


                if (
                    operation ===
                    "add"
                ) {

                    user.balance =
                        currentBalance +
                        amount;

                }

                else if (
                    operation ===
                    "subtract"
                ) {

                    if (
                        currentBalance <
                        amount
                    ) {

                        return res.status(400).json({

                            success: false,

                            message:
                                "Insufficient wallet balance."

                        });

                    }


                    user.balance =
                        currentBalance -
                        amount;

                }

                else {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Operation must be 'add' or 'subtract'."

                    });

                }


                user.totalAssets =
                    Number(
                        user.balance || 0
                    );

            }


            else {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please provide balance or amount."

                });

            }


            // =================================================
            // SAVE
            // =================================================

            await user.save();


            return res.status(200).json({

                success: true,

                message:
                    "Wallet balance updated successfully.",

                user:
                    getSafeUser(
                        user
                    )

            });

        }

        catch (error) {

            console.error(
                "Admin wallet update error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to update wallet balance."

            });

        }

    }
);


// =====================================================
// DELETE USER
// =====================================================
//
// DELETE /api/admin/users/:id
//
// =====================================================

router.delete(
    "/:id",
    async (req, res) => {

        try {

            const {
                id
            } = req.params;


            if (
                !isValidObjectId(id)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid user ID."

                });

            }


            // =================================================
            // PREVENT SELF DELETE
            // =================================================

            if (
                String(id) ===
                String(req.user.id)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "You cannot delete your own account."

                });

            }


            const user =
                await User.findById(
                    id
                );


            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found."

                });

            }


            // =================================================
            // DELETE
            // =================================================

            await User.findByIdAndDelete(
                id
            );


            return res.status(200).json({

                success: true,

                message:
                    "User deleted successfully."

            });

        }

        catch (error) {

            console.error(
                "Admin delete user error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to delete user."

            });

        }

    }
);


// =====================================================
// EXPORT
// =====================================================

module.exports =
    router;