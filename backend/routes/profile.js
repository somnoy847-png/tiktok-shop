const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const User = require("../models/User");

const router = express.Router();


// =====================================================
// Upload folder
// =====================================================

const uploadDir = path.join(
    __dirname,
    "../../uploads/profiles"
);


// =====================================================
// Create upload folder
// =====================================================

if (!fs.existsSync(uploadDir)) {

    fs.mkdirSync(
        uploadDir,
        {
            recursive: true
        }
    );

}


// =====================================================
// Authentication
// =====================================================

function authenticateToken(
    req,
    res,
    next
) {

    try {

        const authHeader =
            req.headers.authorization;


        if (!authHeader) {

            return res.status(401).json({

                success: false,

                message:
                    "Authorization token is required"

            });

        }


        const parts =
            authHeader.split(" ");


        if (
            parts.length !== 2 ||
            parts[0] !== "Bearer"
        ) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid authorization format"

            });

        }


        const token =
            parts[1];


        const secret =
            process.env.JWT_SECRET ||
            "tiktok-shop-development-secret-change-this";


        const decoded =
            jwt.verify(
                token,
                secret
            );


        if (!decoded.userId) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid token"

            });

        }


        req.userId =
            decoded.userId;


        next();

    } catch (error) {

        console.error(
            "Profile authentication error:",
            error.message
        );


        return res.status(401).json({

            success: false,

            message:
                "Invalid or expired token"

        });

    }

}


// =====================================================
// Multer storage
// =====================================================

const storage =
    multer.diskStorage({

        destination:
            function (
                req,
                file,
                cb
            ) {

                cb(
                    null,
                    uploadDir
                );

            },


        filename:
            function (
                req,
                file,
                cb
            ) {

                const userId =
                    req.userId;


                const extension =
                    path.extname(
                        file.originalname
                    ).toLowerCase();


                const filename =
                    `user_${userId}${extension}`;


                cb(
                    null,
                    filename
                );

            }

    });


// =====================================================
// File filter
// =====================================================

const fileFilter =
    function (
        req,
        file,
        cb
    ) {

        const allowedTypes = [

            "image/jpeg",

            "image/jpg",

            "image/png",

            "image/webp",

            "image/gif"

        ];


        if (
            allowedTypes.includes(
                file.mimetype
            )
        ) {

            cb(
                null,
                true
            );

        } else {

            cb(
                new Error(
                    "Only JPG, JPEG, PNG, WEBP and GIF images are allowed"
                )
            );

        }

    };


// =====================================================
// Upload middleware
// =====================================================

const upload =
    multer({

        storage,

        fileFilter,

        limits: {

            fileSize:
                5 * 1024 * 1024

        }

    });


// =====================================================
// Profile data
// =====================================================

function getProfileData(user) {

    if (!user) {

        return null;

    }


    const displayName =
        user.shopName ||
        user.username ||
        "User";


    return {

        id:
            user._id,

        username:
            user.username || "",

        shopName:
            user.shopName || "",

        displayName,

        contact:
            user.contact || "",

        country:
            user.country || "",

        nationality:
            user.nationality || "",

        accountType:
            user.accountType || "",

        role:
            user.accountType || "",

        status:
            user.status || "active",

        profileImage:
            user.profileImage || "",

        balance:
            Number(
                user.balance || 0
            ),

        totalAssets:
            Number(
                user.totalAssets || 0
            ),

        pendingAmount:
            Number(
                user.pendingAmount || 0
            ),

        totalDeposited:
            Number(
                user.totalDeposited || 0
            ),

        totalWithdrawn:
            Number(
                user.totalWithdrawn || 0
            ),

        dailyWithdrawn:
            Number(
                user.dailyWithdrawn || 0
            ),

        dailyWithdrawLimit:
            Number(
                user.dailyWithdrawLimit || 0
            ),

        createdAt:
            user.createdAt,

        updatedAt:
            user.updatedAt

    };

}


// =====================================================
// GET PROFILE
// =====================================================

router.get(
    "/",
    authenticateToken,
    async (
        req,
        res
    ) => {

        try {

            if (
                !mongoose.Types.ObjectId.isValid(
                    req.userId
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid user ID"

                });

            }


            const user =
                await User.findById(
                    req.userId
                ).select(
                    "-password"
                );


            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found"

                });

            }


            if (
                user.status === "suspended"
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "This account has been suspended"

                });

            }


            return res.json({

                success: true,

                user:
                    getProfileData(
                        user
                    )

            });

        } catch (error) {

            console.error(
                "GET profile error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to load profile"

            });

        }

    }
);


// =====================================================
// UPDATE PROFILE
// =====================================================

router.put(
    "/",
    authenticateToken,
    async (
        req,
        res
    ) => {

        try {

            if (
                !mongoose.Types.ObjectId.isValid(
                    req.userId
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid user ID"

                });

            }


            const user =
                await User.findById(
                    req.userId
                );


            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found"

                });

            }


            if (
                user.status === "suspended"
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "This account has been suspended"

                });

            }


            const {
                username,
                shopName
            } = req.body;


            // =================================================
            // Username
            // =================================================

            if (
                username !== undefined
            ) {

                const cleanUsername =
                    String(
                        username
                    ).trim();


                if (
                    cleanUsername.length < 3 ||
                    cleanUsername.length > 30
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Username must be between 3 and 30 characters"

                    });

                }


                const usernamePattern =
                    /^[a-zA-Z0-9._]+$/;


                if (
                    !usernamePattern.test(
                        cleanUsername
                    )
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Username can only contain letters, numbers, dots and underscores"

                    });

                }


                const existingUser =
                    await User.findOne({

                        username:
                            cleanUsername,

                        _id: {
                            $ne:
                                user._id
                        }

                    });


                if (existingUser) {

                    return res.status(409).json({

                        success: false,

                        message:
                            "This username is already in use"

                    });

                }


                user.username =
                    cleanUsername;

            }


            // =================================================
            // Shop name
            // =================================================

            if (
                shopName !== undefined
            ) {

                const cleanShopName =
                    String(
                        shopName
                    ).trim();


                if (
                    cleanShopName.length > 60
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Shop name cannot exceed 60 characters"

                    });

                }


                user.shopName =
                    cleanShopName;

            }


            await user.save();


            return res.json({

                success: true,

                message:
                    "Profile updated successfully",

                user:
                    getProfileData(
                        user
                    )

            });

        } catch (error) {

            console.error(
                "UPDATE profile error:",
                error
            );


            if (
                error.code === 11000
            ) {

                if (
                    error.keyPattern?.username
                ) {

                    return res.status(409).json({

                        success: false,

                        message:
                            "This username is already in use"

                    });

                }


                return res.status(409).json({

                    success: false,

                    message:
                        "This information is already in use"

                });

            }


            return res.status(500).json({

                success: false,

                message:
                    "Unable to update profile"

            });

        }

    }
);


// =====================================================
// UPDATE SHOP NAME
// =====================================================

router.patch(
    "/shop",
    authenticateToken,
    async (
        req,
        res
    ) => {

        try {

            if (
                !mongoose.Types.ObjectId.isValid(
                    req.userId
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid user ID"

                });

            }


            const shopName =
                String(
                    req.body.shopName ?? ""
                ).trim();


            if (
                shopName.length > 60
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Shop name cannot exceed 60 characters"

                });

            }


            const user =
                await User.findByIdAndUpdate(

                    req.userId,

                    {
                        $set: {
                            shopName
                        }
                    },

                    {
                        new: true,

                        runValidators: true
                    }

                ).select(
                    "-password"
                );


            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found"

                });

            }


            return res.json({

                success: true,

                message:
                    "Shop name updated successfully",

                user:
                    getProfileData(
                        user
                    )

            });

        } catch (error) {

            console.error(
                "UPDATE shop name error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to update shop name"

            });

        }

    }
);


// =====================================================
// UPLOAD PROFILE IMAGE
// =====================================================

router.post(
    "/image",
    authenticateToken,
    upload.single(
        "profileImage"
    ),
    async (
        req,
        res
    ) => {

        let newFilePath = null;


        try {

            if (
                !mongoose.Types.ObjectId.isValid(
                    req.userId
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid user ID"

                });

            }


            // =================================================
            // Check uploaded file
            // =================================================

            if (!req.file) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please select an image"

                });

            }


            newFilePath =
                req.file.path;


            // =================================================
            // Find user
            // =================================================

            const user =
                await User.findById(
                    req.userId
                );


            if (!user) {

                if (
                    fs.existsSync(
                        newFilePath
                    )
                ) {

                    fs.unlinkSync(
                        newFilePath
                    );

                }


                return res.status(404).json({

                    success: false,

                    message:
                        "User not found"

                });

            }


            // =================================================
            // Save old image path
            // =================================================

            const oldProfileImage =
                user.profileImage || "";


            // =================================================
            // New image URL
            // =================================================

            const imageUrl =
                `/uploads/profiles/${req.file.filename}`;


            // =================================================
            // Save new image to MongoDB
            // =================================================

            user.profileImage =
                imageUrl;


            await user.save();


            // =================================================
            // Delete old image AFTER successful save
            // =================================================

            if (
                oldProfileImage &&
                oldProfileImage !== imageUrl
            ) {

                const oldImagePath =
                    path.join(
                        __dirname,
                        "../../",
                        oldProfileImage
                            .replace(
                                /^\/+/,
                                ""
                            )
                    );


                if (
                    fs.existsSync(
                        oldImagePath
                    )
                ) {

                    try {

                        fs.unlinkSync(
                            oldImagePath
                        );

                    } catch (deleteError) {

                        console.error(
                            "Unable to delete old profile image:",
                            deleteError.message
                        );

                    }

                }

            }


            // =================================================
            // Response
            // =================================================

            return res.json({

                success: true,

                message:
                    "Profile image uploaded successfully",

                user:
                    getProfileData(
                        user
                    )

            });

        } catch (error) {

            console.error(
                "UPLOAD profile image error:",
                error
            );


            // =================================================
            // Remove new file if database save failed
            // =================================================

            if (
                newFilePath &&
                fs.existsSync(
                    newFilePath
                )
            ) {

                try {

                    fs.unlinkSync(
                        newFilePath
                    );

                } catch (deleteError) {

                    console.error(
                        "Unable to remove uploaded file:",
                        deleteError.message
                    );

                }

            }


            return res.status(500).json({

                success: false,

                message:
                    "Unable to upload profile image"

            });

        }

    }
);


// =====================================================
// DELETE PROFILE IMAGE
// =====================================================

router.delete(
    "/image",
    authenticateToken,
    async (
        req,
        res
    ) => {

        try {

            if (
                !mongoose.Types.ObjectId.isValid(
                    req.userId
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid user ID"

                });

            }


            const user =
                await User.findById(
                    req.userId
                );


            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found"

                });

            }


            // =================================================
            // Delete physical image
            // =================================================

            if (
                user.profileImage
            ) {

                const imagePath =
                    path.join(
                        __dirname,
                        "../../",
                        user.profileImage
                            .replace(
                                /^\/+/,
                                ""
                            )
                    );


                if (
                    fs.existsSync(
                        imagePath
                    )
                ) {

                    try {

                        fs.unlinkSync(
                            imagePath
                        );

                    } catch (deleteError) {

                        console.error(
                            "Unable to delete profile image:",
                            deleteError.message
                        );

                    }

                }

            }


            // =================================================
            // Remove image path from database
            // =================================================

            user.profileImage =
                "";


            await user.save();


            return res.json({

                success: true,

                message:
                    "Profile image removed successfully",

                user:
                    getProfileData(
                        user
                    )

            });

        } catch (error) {

            console.error(
                "DELETE profile image error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to remove profile image"

            });

        }

    }
);


// =====================================================
// Multer error handler
// =====================================================

router.use(
    function (
        error,
        req,
        res,
        next
    ) {

        if (
            error instanceof multer.MulterError
        ) {

            if (
                error.code ===
                "LIMIT_FILE_SIZE"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Image size must not exceed 5MB"

                });

            }


            return res.status(400).json({

                success: false,

                message:
                    error.message

            });

        }


        if (error) {

            return res.status(400).json({

                success: false,

                message:
                    error.message ||
                    "Unable to upload image"

            });

        }


        next();

    }
);


// =====================================================
// Export
// =====================================================

module.exports =
    router;