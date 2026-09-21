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


/* =====================================
   SELLER ONLY COUNTRIES
===================================== */

const sellerOnlyCountries = [
    "thailand",
    "laos",
    "vietnam",
    "myanmar",
    "cambodia",
    "china"
];


/* =====================================
   HELPERS
===================================== */

function normalizeText(value) {
    return String(value || "").trim();
}


function normalizeUsername(value) {
    return normalizeText(value).toLowerCase();
}


function normalizeContact(value) {
    return normalizeText(value).toLowerCase();
}


/* =====================================
   SAFE USER
===================================== */

function getSafeUser(user) {

    return {
        id: user._id,

        username: user.username,

        shopName: user.shopName || "",

        displayName:
            user.shopName ||
            user.username,

        contact: user.contact,

        nationality: user.nationality,

        country: user.country,

        accountType: user.accountType,

        role: user.accountType,

        status: user.status,

        profileImage: user.profileImage || "",

        /* Wallet */

        balance:
            user.balance || 0,

        totalAssets:
            user.totalAssets || 0,

        pendingAmount:
            user.pendingAmount || 0,

        totalDeposited:
            user.totalDeposited || 0,

        totalWithdrawn:
            user.totalWithdrawn || 0,

        dailyWithdrawn:
            user.dailyWithdrawn || 0,

        dailyWithdrawLimit:
            user.dailyWithdrawLimit || 0,

        dailyWithdrawDate:
            user.dailyWithdrawDate,

        createdAt:
            user.createdAt,

        updatedAt:
            user.updatedAt
    };
}


/* =====================================
   REGISTER
   POST /api/auth/register
===================================== */

router.post("/register", async (req, res) => {

    try {

        const {
            username,
            shopName,
            contact,
            password,
            nationality,
            country,
            accountType
        } = req.body;


        /* -----------------------------
           Normalize
        ----------------------------- */

        const cleanUsername =
            normalizeUsername(username);

        const cleanShopName =
            normalizeText(shopName);

        const cleanContact =
            normalizeContact(contact);

        const cleanNationality =
            normalizeText(nationality);

        const cleanCountry =
            normalizeText(country);

        const cleanAccountType =
            normalizeText(accountType)
                .toLowerCase();


        /* -----------------------------
           Required fields
        ----------------------------- */

        if (
            !cleanUsername ||
            !cleanContact ||
            !password ||
            !cleanNationality ||
            !cleanCountry ||
            !cleanAccountType
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Please complete all required fields."
            });

        }


        /* -----------------------------
           Username
        ----------------------------- */

        if (
            cleanUsername.length < 3 ||
            cleanUsername.length > 30
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Username must be between 3 and 30 characters."
            });

        }


        /* -----------------------------
           Password
        ----------------------------- */

        if (password.length < 6) {

            return res.status(400).json({
                success: false,
                message:
                    "Password must be at least 6 characters."
            });

        }


        /* -----------------------------
           Account type
        ----------------------------- */

        if (
            !["buyer", "seller"]
                .includes(cleanAccountType)
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid account type."
            });

        }


        /* -----------------------------
           Country restriction
        ----------------------------- */

        const normalizedCountry =
            cleanCountry.toLowerCase();

        if (
            sellerOnlyCountries.includes(
                normalizedCountry
            ) &&
            cleanAccountType !== "seller"
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Users from this country must register as a Seller."
            });

        }


        /* -----------------------------
           Seller shop name
        ----------------------------- */

        if (
            cleanAccountType === "seller" &&
            !cleanShopName
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Shop name is required for Seller accounts."
            });

        }


        /* -----------------------------
           Duplicate username
        ----------------------------- */

        const existingUsername =
            await User.findOne({
                username: cleanUsername
            });

        if (existingUsername) {

            return res.status(409).json({
                success: false,
                message:
                    "This username is already registered."
            });

        }


        /* -----------------------------
           Duplicate contact
        ----------------------------- */

        const existingContact =
            await User.findOne({
                contact: cleanContact
            });

        if (existingContact) {

            return res.status(409).json({
                success: false,
                message:
                    "This email or phone number is already registered."
            });

        }


        /* -----------------------------
           Hash password
        ----------------------------- */

        const hashedPassword =
            await bcrypt.hash(
                password,
                12
            );


        /* -----------------------------
           Create user
        ----------------------------- */

        const user = new User({

            username:
                cleanUsername,

            shopName:
                cleanShopName,

            contact:
                cleanContact,

            password:
                hashedPassword,

            nationality:
                cleanNationality,

            country:
                cleanCountry,

            accountType:
                cleanAccountType,

            status:
                "active",

            balance: 0,

            totalAssets: 0,

            pendingAmount: 0,

            totalDeposited: 0,

            totalWithdrawn: 0,

            dailyWithdrawn: 0,

            dailyWithdrawLimit: 0,

            dailyWithdrawDate: null

        });


        await user.save();


        /* -----------------------------
           Safe user
        ----------------------------- */

        const safeUser =
            getSafeUser(user);


        /* -----------------------------
           JWT
        ----------------------------- */

        const token =
            jwt.sign(
                {
                    userId: user._id.toString(),

                    username:
                        user.username
                },
                JWT_SECRET,
                {
                    expiresIn: "30d"
                }
            );


        return res.status(201).json({

            success: true,

            message:
                "Registration successful.",

            token,

            user:
                safeUser

        });

    }

    catch (error) {

        console.error(
            "❌ Registration error:"
        );

        console.error(error);

        return res.status(500).json({

            success: false,

            message:
                "Server error during registration."

        });

    }

});


/* =====================================
   LOGIN
   POST /api/auth/login
===================================== */

router.post("/login", async (req, res) => {

    try {

        const {
            identifier,
            password
        } = req.body;


        /* -----------------------------
           Validate
        ----------------------------- */

        const cleanIdentifier =
            normalizeText(identifier);

        if (
            !cleanIdentifier ||
            !password
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Please enter your username/email/phone and password."

            });

        }


        /* -----------------------------
           Search user
           username OR contact
        ----------------------------- */

        const identifierLower =
            cleanIdentifier.toLowerCase();


        const user =
            await User.findOne({

                $or: [

                    {
                        username:
                            identifierLower
                    },

                    {
                        contact:
                            identifierLower
                    }

                ]

            });


        /* -----------------------------
           User not found
        ----------------------------- */

        if (!user) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid username/email/phone or password."

            });

        }


        /* -----------------------------
           Account status
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
           Compare password
        ----------------------------- */

        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password
            );


        if (!passwordMatch) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid username/email/phone or password."

            });

        }


        /* -----------------------------
           Safe user
        ----------------------------- */

        const safeUser =
            getSafeUser(user);


        /* -----------------------------
           Create JWT
        ----------------------------- */

        const token =
            jwt.sign(

                {
                    userId:
                        user._id.toString(),

                    username:
                        user.username
                },

                JWT_SECRET,

                {
                    expiresIn:
                        "30d"
                }

            );


        /* -----------------------------
           Response
        ----------------------------- */

        return res.status(200).json({

            success: true,

            message:
                "Login successful.",

            token,

            user:
                safeUser

        });

    }

    catch (error) {

        console.error(
            "❌ Login error:"
        );

        console.error(error);

        return res.status(500).json({

            success: false,

            message:
                "Server error during login."

        });

    }

});


/* =====================================
   GET CURRENT USER
   GET /api/auth/me
===================================== */

router.get("/me", async (req, res) => {

    try {

        const authHeader =
            req.headers.authorization;

        /* -----------------------------
           Check Authorization
        ----------------------------- */

        if (
            !authHeader ||
            !authHeader.startsWith("Bearer ")
        ) {

            return res.status(401).json({

                success: false,

                message:
                    "Authentication token is required."

            });

        }


        /* -----------------------------
           Get token
        ----------------------------- */

        const token =
            authHeader.split(" ")[1];


        if (!token) {

            return res.status(401).json({

                success: false,

                message:
                    "Authentication token is missing."

            });

        }


        /* -----------------------------
           Verify JWT
        ----------------------------- */

        const decoded =
            jwt.verify(
                token,
                JWT_SECRET
            );


        /* -----------------------------
           Find User
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
           Safe User
        ----------------------------- */

        const safeUser =
            getSafeUser(user);


        /* -----------------------------
           Response
        ----------------------------- */

        return res.status(200).json({

            success: true,

            user:
                safeUser

        });

    }

    catch (error) {

        console.error(
            "❌ Get current user error:"
        );

        console.error(error);


        /* Invalid / expired JWT */

        if (
            error.name ===
            "JsonWebTokenError" ||
            error.name ===
            "TokenExpiredError"
        ) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid or expired authentication token."

            });

        }


        return res.status(500).json({

            success: false,

            message:
                "Server error while loading user account."

        });

    }

});

/* =====================================
   EXPORT
===================================== */

module.exports = router;