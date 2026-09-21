const jwt = require("jsonwebtoken");


// =====================================================
// JWT SECRET
// =====================================================

const JWT_SECRET =
    process.env.JWT_SECRET ||
    "tiktok-shop-development-secret-change-this";


// =====================================================
// AUTHENTICATE JWT
// =====================================================

function authenticateToken(req, res, next) {

    try {

        const authHeader =
            req.headers.authorization;


        // ---------------------------------------------
        // Check Authorization header
        // ---------------------------------------------

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


        // ---------------------------------------------
        // Get token
        // ---------------------------------------------

        const token =
            authHeader.split(" ")[1];


        if (!token) {

            return res.status(401).json({

                success: false,

                message:
                    "Authentication token is missing."

            });

        }


        // ---------------------------------------------
        // Verify JWT
        // ---------------------------------------------

        const decoded =
            jwt.verify(
                token,
                JWT_SECRET
            );


        // ---------------------------------------------
        // Save authenticated user
        // ---------------------------------------------

        req.user = {

            id:
                decoded.userId,

            userId:
                decoded.userId,

            username:
                decoded.username

        };


        next();

    }

    catch (error) {

        console.error(
            "Authentication error:",
            error
        );


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
                "Authentication error."

        });

    }

}


module.exports =
    authenticateToken;