const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

/* =====================================
   CONFIG
===================================== */

const JWT_SECRET =
    process.env.JWT_SECRET ||
    "tiktok-shop-development-secret-change-this";

const RESET_TOKEN_EXPIRES_IN = "10m";


/* =====================================
   HELPERS
===================================== */

function normalizeContact(value) {

    return String(value || "")
        .trim()
        .toLowerCase();

}


/* =====================================
   VERIFY CONTACT
   POST /api/password-reset/verify
===================================== */

router.post("/verify", async (req, res) => {

    try {

        const {
            contact
        } = req.body;


        /* -----------------------------
           Normalize
        ----------------------------- */

        const cleanContact =
            normalizeContact(contact);


        /* -----------------------------
           Validate
        ----------------------------- */

        if (!cleanContact) {

            return res.status(400).json({

                success: false,

                message:
                    "Please enter your email or phone number."

            });

        }


        /* -----------------------------
           Find user
        ----------------------------- */

        const user =
            await User.findOne({

                contact:
                    cleanContact

            });


        /* -----------------------------
           User not found
        ----------------------------- */

        if (!user) {

            return res.status(404).json({

                success: false,

                message:
                    "The email or phone number was not found."

            });

        }


        /* -----------------------------
           Check account status
        ----------------------------- */

        if (
            user.status !== "active"
        ) {

            return res.status(403).json({

                success: false,

                message:
                    "This account is currently suspended."

            });

        }


        /* -----------------------------
           Create temporary reset token
        ----------------------------- */

        const resetToken =
            jwt.sign(

                {
                    userId:
                        user._id.toString(),

                    purpose:
                        "password-reset"

                },

                JWT_SECRET,

                {
                    expiresIn:
                        RESET_TOKEN_EXPIRES_IN
                }

            );


        /* -----------------------------
           Response
        ----------------------------- */

        return res.status(200).json({

            success: true,

            message:
                "Account verified. You can now create a new password.",

            resetToken,

            user: {

                username:
                    user.username,

                contact:
                    user.contact

            }

        });

    }

    catch (error) {

        console.error(
            "❌ Password reset verification error:"
        );

        console.error(error);


        return res.status(500).json({

            success: false,

            message:
                "Server error while verifying account."

        });

    }

});


/* =====================================
   RESET PASSWORD
   POST /api/password-reset/reset
===================================== */

router.post("/reset", async (req, res) => {

    try {

        const {
            resetToken,
            newPassword,
            confirmPassword
        } = req.body;


        /* -----------------------------
           Validate fields
        ----------------------------- */

        if (
            !resetToken ||
            !newPassword ||
            !confirmPassword
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Please complete all password fields."

            });

        }


        /* -----------------------------
           Check password match
        ----------------------------- */

        if (
            newPassword !==
            confirmPassword
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Passwords do not match."

            });

        }


        /* -----------------------------
           Password length
        ----------------------------- */

        if (
            newPassword.length < 6
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Password must be at least 6 characters."

            });

        }


        /* -----------------------------
           Verify reset token
        ----------------------------- */

        let decoded;

        try {

            decoded =
                jwt.verify(
                    resetToken,
                    JWT_SECRET
                );

        }

        catch (error) {

            return res.status(401).json({

                success: false,

                message:
                    "This password reset session has expired. Please start again."

            });

        }


        /* -----------------------------
           Check token purpose
        ----------------------------- */

        if (
            decoded.purpose !==
            "password-reset"
        ) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid password reset request."

            });

        }


        /* -----------------------------
           Find user
        ----------------------------- */

        const user =
            await User.findById(
                decoded.userId
            );


        if (!user) {

            return res.status(404).json({

                success: false,

                message:
                    "User account not found."

            });

        }


        /* -----------------------------
           Check account status
        ----------------------------- */

        if (
            user.status !== "active"
        ) {

            return res.status(403).json({

                success: false,

                message:
                    "This account is currently suspended."

            });

        }


        /* -----------------------------
           Hash new password
        ----------------------------- */

        const hashedPassword =
            await bcrypt.hash(
                newPassword,
                12
            );


        /* -----------------------------
           Save new password
        ----------------------------- */

        user.password =
            hashedPassword;

        await user.save();


        /* -----------------------------
           Success
        ----------------------------- */

        return res.status(200).json({

            success: true,

            message:
                "Password changed successfully."

        });

    }

    catch (error) {

        console.error(
            "❌ Password reset error:"
        );

        console.error(error);


        return res.status(500).json({

            success: false,

            message:
                "Server error while changing password."

        });

    }

});


/* =====================================
   EXPORT
===================================== */

module.exports = router;