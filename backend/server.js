const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();


// =====================================================
// Configuration
// =====================================================

const PORT =
    process.env.PORT || 5000;

const MONGODB_URI =
    process.env.MONGODB_URI;


// =====================================================
// Frontend Path
// =====================================================

// server.js อยู่ใน:
// tiktok-shop/backend/server.js
//
// ดังนั้น .. คือ:
// tiktok-shop/

const FRONTEND_PATH =
    path.join(
        __dirname,
        ".."
    );


// =====================================================
// Middleware
// =====================================================

app.use(cors());

app.use(
    express.json({
        limit: "10mb"
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: "10mb"
    })
);


// =====================================================
// Static uploads
// =====================================================

app.use(
    "/uploads",
    express.static(
        path.join(
            __dirname,
            "../uploads"
        )
    )
);


// =====================================================
// API Routes
// =====================================================

const productRoutes =
    require("./routes/products");

const authRoutes =
    require("./routes/auth");

const profileRoutes =
    require("./routes/profile");

const sellerProductRoutes =
    require("./routes/sellerProducts");

const walletRoutes =
    require("./routes/wallet");

const adminWalletRoutes =
    require("./routes/adminWallet");

const adminUsersRoutes =
    require("./routes/adminUsers");

const orderRoutes =
    require("./routes/orders");

const adminOrdersRoutes =
    require("./routes/adminOrders");

const adminShopOrdersRoutes =
    require("./routes/adminShopOrders");

const chatRoutes = require("./routes/chat");

const notificationRoutes =
    require("./routes/notifications");

 const passwordResetRoutes =
    require("./routes/passwordReset");   

// =====================================================
// API Route Registration
// =====================================================

app.use(
    "/api/products",
    productRoutes
);

app.use(
    "/api/auth",
    authRoutes
);

app.use(
    "/api/profile",
    profileRoutes
);

app.use(
    "/api/seller/products",
    sellerProductRoutes
);

app.use(
    "/api/wallet",
    walletRoutes
);

app.use(
    "/api/admin/wallet",
    adminWalletRoutes
);

app.use(
    "/api/admin/users",
    adminUsersRoutes
);

app.use(
    "/api/orders",
    orderRoutes
);

app.use(
    "/api/admin/orders",
    adminOrdersRoutes
);

app.use(
    "/api/admin/shop-orders",
    adminShopOrdersRoutes
);

app.use("/api/chat", chatRoutes);

app.use(
    "/api/notifications",
    notificationRoutes
);

app.use(
    "/api/password-reset",
    passwordResetRoutes
);


// =====================================================
// Frontend Static Files
// =====================================================

// ทำให้ Express สามารถเปิด:
// index.html
// login.html
// register.html
// admin-dashboard.html
// admin-orders.html
// css/
// js/
// components/
// ฯลฯ

app.use(
    express.static(
        FRONTEND_PATH
    )
);


// =====================================================
// Main Website
// =====================================================

// เปิด:
// http://localhost:5000
//
// จะเข้าสู่ index.html

app.get(
    "/",
    (req, res) => {

        res.sendFile(
            path.join(
                FRONTEND_PATH,
                "index.html"
            )
        );

    }
);


// =====================================================
// 404 API
// =====================================================

app.use(
    "/api",
    (req, res) => {

        res.status(404).json({

            success: false,

            message:
                "API endpoint not found."

        });

    }
);


// =====================================================
// 404 Website
// =====================================================

app.use(
    (req, res) => {

        res.status(404).send(
            `
            <!DOCTYPE html>

            <html lang="th">

            <head>

                <meta charset="UTF-8">

                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1.0"
                >

                <title>404 - Page Not Found</title>

                <style>

                    * {
                        box-sizing: border-box;
                    }

                    body {
                        margin: 0;
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-family: Arial, sans-serif;
                        background: #f7f7f7;
                        color: #171717;
                    }

                    .box {
                        text-align: center;
                        background: white;
                        padding: 40px;
                        border-radius: 16px;
                        box-shadow:
                            0 10px 40px
                            rgba(0,0,0,.08);
                    }

                    h1 {
                        margin: 0 0 10px;
                        font-size: 48px;
                    }

                    p {
                        color: #737373;
                        margin-bottom: 25px;
                    }

                    a {
                        display: inline-block;
                        padding: 11px 18px;
                        background: #171717;
                        color: white;
                        text-decoration: none;
                        border-radius: 9px;
                        font-weight: 600;
                    }

                </style>

            </head>

            <body>

                <div class="box">

                    <h1>404</h1>

                    <p>
                        ไม่พบหน้าที่คุณกำลังค้นหา
                    </p>

                    <a href="/">
                        กลับหน้าหลัก
                    </a>

                </div>

            </body>

            </html>
            `
        );

    }
);


// =====================================================
// Check MongoDB URI
// =====================================================

if (!MONGODB_URI) {

    console.error(
        "❌ MONGODB_URI is missing in .env"
    );

    process.exit(1);
}


// =====================================================
// MongoDB Connection
// =====================================================

mongoose
    .connect(
        MONGODB_URI
    )

    .then(() => {

        console.log(
            "✅ MongoDB connected successfully"
        );


        // =================================================
        // Start Server
        // =================================================

        app.listen(
         PORT,
             "0.0.0.0",
                 () => {

                 console.log(
                  `🚀 Server running on port ${PORT}`
               );

                  console.log(
                  `🌐 Website running on port ${PORT}`
               );
   
         }
     );

    })

    .catch(
        (error) => {

            console.error(
                "❌ MongoDB connection failed"
            );

            console.error(
                error.message
            );

            process.exit(1);

        }
    );