const express = require("express");
const mongoose = require("mongoose");

const Order = require("../models/Order");
const SellerProduct = require("../models/SellerProduct");
const User = require("../models/User");

const authenticateToken =
    require("../middleware/authMiddleware");

const router = express.Router();


/*
=========================================================
HELPERS
=========================================================
*/

function isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id);
}


function cleanText(value) {
    return String(value ?? "").trim();
}


function getUserId(req) {
    return (
        req.user?.id ||
        req.user?.userId ||
        null
    );
}


/*
=========================================================
CREATE ORDER
=========================================================
POST /api/orders
=========================================================
*/

router.post(
    "/",
    authenticateToken,
    async function(req, res) {

        try {

            const buyerId =
                getUserId(req);

            if (!buyerId) {

                return res.status(401).json({
                    success: false,
                    message: "User authentication is required."
                });

            }


            const {
                productId,
                quantity,
                paymentMethod,
                shippingAddress,
                shippingPhone,
                buyerNote
            } = req.body;


            /*
            ---------------------------------------------
            VALIDATE PRODUCT ID
            ---------------------------------------------
            */

            if (!productId) {

                return res.status(400).json({
                    success: false,
                    message: "Product ID is required."
                });

            }


            if (!isValidObjectId(productId)) {

                return res.status(400).json({
                    success: false,
                    message: "Invalid product ID."
                });

            }


            /*
            ---------------------------------------------
            VALIDATE QUANTITY
            ---------------------------------------------
            */

            const orderQuantity =
                Number(quantity || 0);


            if (
                !Number.isInteger(orderQuantity) ||
                orderQuantity <= 0
            ) {

                return res.status(400).json({
                    success: false,
                    message: "Quantity must be a positive integer."
                });

            }


            /*
            ---------------------------------------------
            FIND BUYER
            ---------------------------------------------
            */

            const buyer =
                await User.findById(
                    buyerId
                );


            if (!buyer) {

                return res.status(404).json({
                    success: false,
                    message: "Buyer account not found."
                });

            }


            /*
            ---------------------------------------------
            FIND PRODUCT
            ---------------------------------------------
            */

            const product =
                await SellerProduct.findOne({
                    _id: productId,
                    status: "active"
                });


            if (!product) {

                return res.status(404).json({
                    success: false,
                    message: "Product not found."
                });

            }


            /*
            ---------------------------------------------
            CHECK STOCK
            ---------------------------------------------
            */

            if (
                Number(product.stock || 0) <
                orderQuantity
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        `Only ${Number(product.stock || 0)} item(s) remaining.`
                });

            }


            /*
            ---------------------------------------------
            RESERVE STOCK
            ---------------------------------------------
            */

            const reservedProduct =
                await SellerProduct.findOneAndUpdate(
                    {
                        _id: productId,
                        status: "active",
                        stock: {
                            $gte:
                                orderQuantity
                        }
                    },
                    {
                        $inc: {
                            stock:
                                -orderQuantity
                        }
                    },
                    {
                        new: true
                    }
                );


            if (!reservedProduct) {

                return res.status(400).json({
                    success: false,
                    message:
                        "สินค้าไม่เพียงพอสำหรับจำนวนที่สั่ง"
                });

            }


            /*
            ---------------------------------------------
            FIND SELLER
            ---------------------------------------------
            */

            const seller =
                await User.findById(
                    product.sellerId
                );


            if (!seller) {

                /*
                -----------------------------------------
                RETURN STOCK
                -----------------------------------------
                */

                await SellerProduct.findByIdAndUpdate(
                    productId,
                    {
                        $inc: {
                            stock:
                                orderQuantity
                        }
                    }
                );


                return res.status(404).json({
                    success: false,
                    message: "Seller account not found."
                });

            }


            /*
            ---------------------------------------------
            PRICE
            ---------------------------------------------
            */

            const unitPrice =
                Number(
                    product.salePrice || 0
                );


            const costPrice =
                Number(
                    product.costPrice || 0
                );


            const subtotal =
                orderQuantity *
                unitPrice;


            const profit =
                orderQuantity *
                (
                    unitPrice -
                    costPrice
                );


            /*
            ---------------------------------------------
            PAYMENT METHOD
            ---------------------------------------------
            */

            const cleanPaymentMethod =
                cleanText(
                    paymentMethod
                ) ||
                "wallet";


            /*
            ---------------------------------------------
            CREATE ORDER
            ---------------------------------------------
            */

            const order =
                await Order.create({

                    buyerId:
                        buyer._id,

                    buyerUsername:
                        buyer.username || "",

                    buyerName:
                        buyer.shopName ||
                        buyer.username ||
                        "Buyer",

                    buyerContact:
                        buyer.contact || "",


                    sellerId:
                        seller._id,

                    sellerUsername:
                        seller.username || "",

                    shopName:
                        seller.shopName ||
                        seller.username ||
                        "",


                    productId:
                        reservedProduct._id,

                    adminProductId:
                        reservedProduct.adminProductId ||
                        null,

                    productName:
                        reservedProduct.name ||
                        "",

                    productImage:
                        reservedProduct.image ||
                        "",

                    category:
                        reservedProduct.category ||
                        "",


                    quantity:
                        orderQuantity,

                    unitPrice:
                        unitPrice,

                    costPrice:
                        costPrice,

                    subtotal:
                        subtotal,

                    profit:
                        profit,


                    paymentMethod:
                        cleanPaymentMethod,

                    paymentStatus:
                        "pending",


                    shippingAddress:
                        cleanText(
                            shippingAddress
                        ),

                    shippingPhone:
                        cleanText(
                            shippingPhone
                        ),

                    buyerNote:
                        cleanText(
                            buyerNote
                        ),


                    status:
                        "pending",


                    statusHistory: [
                        {
                            status:
                                "pending",

                            changedBy:
                                "buyer",

                            note:
                                "Order created.",

                            changedAt:
                                new Date()
                        }
                    ]

                });


            /*
            ---------------------------------------------
            SUCCESS
            ---------------------------------------------
            */

            return res.status(201).json({

                success:
                    true,

                message:
                    "Order created successfully.",

                order:
                    order

            });


        } catch (error) {

            console.error(
                "Create order error:",
                error
            );


            return res.status(500).json({

                success:
                    false,

                message:
                    "Unable to create order."

            });

        }

    }
);


/*
=========================================================
GET BUYER ORDERS
=========================================================
GET /api/orders/buyer
=========================================================
*/

router.get(
    "/buyer",
    authenticateToken,
    async function(req, res) {

        try {

            const userId =
                getUserId(req);


            if (!userId) {

                return res.status(401).json({

                    success:
                        false,

                    message:
                        "Authentication required."

                });

            }


            const orders =
                await Order.find({
                    buyerId:
                        userId
                })
                .sort({
                    createdAt:
                        -1
                })
                .lean();


            return res.json({

                success:
                    true,

                orders:
                    orders

            });


        } catch (error) {

            console.error(
                "Get buyer orders error:",
                error
            );


            return res.status(500).json({

                success:
                    false,

                message:
                    "Unable to load buyer orders."

            });

        }

    }
);


/*
=========================================================
GET SELLER ORDERS
=========================================================
GET /api/orders/seller
=========================================================
*/

router.get(
    "/seller",
    authenticateToken,
    async function(req, res) {

        try {

            const userId =
                getUserId(req);


            if (!userId) {

                return res.status(401).json({

                    success:
                        false,

                    message:
                        "Authentication required."

                });

            }


            const user =
                await User.findById(
                    userId
                );


            if (!user) {

                return res.status(401).json({

                    success:
                        false,

                    message:
                        "User account not found."

                });

            }


            const accountType =
                String(
                    user.accountType || ""
                )
                .trim()
                .toLowerCase();


            if (
                accountType !==
                "seller"
            ) {

                return res.status(403).json({

                    success:
                        false,

                    message:
                        "Seller access is required."

                });

            }


            const orders =
                await Order.find({

                    sellerId:
                        userId

                })
                .sort({

                    createdAt:
                        -1

                })
                .lean();


            return res.json({

                success:
                    true,

                orders:
                    orders

            });


        } catch (error) {

            console.error(
                "Get seller orders error:",
                error
            );


            return res.status(500).json({

                success:
                    false,

                message:
                    "Unable to load seller orders."

            });

        }

    }
);


/*
=========================================================
PAY SELLER ORDERS
=========================================================
POST /api/orders/pay
=========================================================

Seller pays selected pending orders from seller wallet.

After payment:

- seller.balance is reduced
- seller.totalAssets is reduced
- paymentStatus = paid
- paymentMethod = seller_wallet
- paidAt is saved
- status = shipping
- statusHistory is updated

=========================================================
*/

router.post(
    "/pay",
    authenticateToken,
    async function(req, res) {

        const session =
            await mongoose.startSession();


        try {

            const userId =
                getUserId(req);


            if (!userId) {

                return res.status(401).json({

                    success:
                        false,

                    message:
                        "Authentication required."

                });

            }


            const orderIds =
                Array.isArray(
                    req.body.orderIds
                )
                    ? req.body.orderIds
                    : [];


            /*
            ---------------------------------------------
            VALIDATE ORDER IDS
            ---------------------------------------------
            */

            if (
                !orderIds.length
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "กรุณาเลือกออเดอร์ที่ต้องการชำระ"

                });

            }


            const invalidId =
                orderIds.find(
                    id =>
                        !isValidObjectId(
                            id
                        )
                );


            if (invalidId) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "พบ Order ID ที่ไม่ถูกต้อง"

                });

            }


            /*
            ---------------------------------------------
            REMOVE DUPLICATES
            ---------------------------------------------
            */

            const uniqueOrderIds =
                [
                    ...new Set(
                        orderIds.map(
                            id =>
                                String(id)
                        )
                    )
                ];


            let result =
                null;


            /*
            ---------------------------------------------
            TRANSACTION
            ---------------------------------------------
            */

            await session.withTransaction(
                async function() {

                    /*
                    -----------------------------------------
                    FIND SELLER
                    -----------------------------------------
                    */

                    const seller =
                        await User.findById(
                            userId
                        )
                        .session(
                            session
                        );


                    if (!seller) {

                        throw new Error(
                            "Seller account not found."
                        );

                    }


                    /*
                    -----------------------------------------
                    CHECK ACCOUNT TYPE
                    -----------------------------------------
                    */

                    const accountType =
                        String(
                            seller.accountType ||
                            ""
                        )
                        .trim()
                        .toLowerCase();


                    if (
                        accountType !==
                        "seller"
                    ) {

                        throw new Error(
                            "Seller access is required."
                        );

                    }


                    /*
                    -----------------------------------------
                    CHECK ACCOUNT STATUS
                    -----------------------------------------
                    */

                    if (
                        String(
                            seller.status ||
                            "active"
                        )
                        .trim()
                        .toLowerCase() !==
                        "active"
                    ) {

                        throw new Error(
                            "Seller account is not active."
                        );

                    }


                    /*
                    -----------------------------------------
                    FIND SELECTED ORDERS
                    -----------------------------------------
                    */

                    const ordersToPay =
                        await Order.find({

                            _id: {
                                $in:
                                    uniqueOrderIds
                            },

                            sellerId:
                                userId,

                            status:
                                "pending",

                            paymentStatus:
                                "pending"

                        })
                        .session(
                            session
                        );


                    /*
                    -----------------------------------------
                    CHECK ALL ORDERS EXIST
                    -----------------------------------------
                    */

                    if (
                        ordersToPay.length !==
                        uniqueOrderIds.length
                    ) {

                        throw new Error(
                            "บางออเดอร์ไม่อยู่ในสถานะรอชำระ หรือไม่ใช่ออเดอร์ของร้านนี้"
                        );

                    }


                    /*
                    -----------------------------------------
                    CALCULATE TOTAL COST
                    -----------------------------------------
                    */

                    const totalCost =
                        ordersToPay.reduce(
                            function(
                                sum,
                                order
                            ) {

                                const quantity =
                                    Number(
                                        order.quantity ||
                                        0
                                    );


                                const costPrice =
                                    Number(
                                        order.costPrice ||
                                        0
                                    );


                                const fallbackCost =
                                    Number(
                                        order.subtotal ||
                                        0
                                    );


                                const cost =
                                    costPrice > 0

                                        ? quantity *
                                          costPrice

                                        : fallbackCost;


                                return (
                                    sum +
                                    cost
                                );

                            },
                            0
                        );


                    /*
                    -----------------------------------------
                    VALIDATE TOTAL
                    -----------------------------------------
                    */

                    if (
                        !Number.isFinite(
                            totalCost
                        ) ||
                        totalCost <= 0
                    ) {

                        throw new Error(
                            "ยอดต้นทุนออเดอร์ไม่ถูกต้อง"
                        );

                    }


                    /*
                    -----------------------------------------
                    SELLER BALANCE
                    -----------------------------------------
                    */

                    const balance =
                        Number(
                            seller.balance ||
                            0
                        );


                    /*
                    -----------------------------------------
                    CHECK BALANCE
                    -----------------------------------------
                    */

                    if (
                        balance <
                        totalCost
                    ) {

                        throw new Error(

                            `เงินในกระเป๋าไม่พอ ต้องใช้ $${totalCost.toFixed(2)} แต่มี $${balance.toFixed(2)}`

                        );

                    }


                    const now =
                        new Date();


                    /*
                    -----------------------------------------
                    DEDUCT WALLET
                    -----------------------------------------
                    */

                    seller.balance =
                        balance -
                        totalCost;


                    /*
                    -----------------------------------------
                    DEDUCT TOTAL ASSETS
                    -----------------------------------------
                    */

                    seller.totalAssets =
                        Math.max(

                            0,

                            Number(
                                seller.totalAssets ||
                                0
                            ) -
                            totalCost

                        );


                    await seller.save({

                        session:
                            session

                    });


                    /*
                    -----------------------------------------
                    UPDATE ORDERS
                    -----------------------------------------
                    */

                    for (
                        const order
                        of ordersToPay
                    ) {

                        order.paymentMethod =
                            "seller_wallet";


                        order.paymentStatus =
                            "paid";


                        order.paidAt =
                            now;


                        order.status =
                            "shipping";


                        /*
                        -------------------------------------
                        STATUS HISTORY
                        -------------------------------------
                        */

                        if (
                            !Array.isArray(
                                order.statusHistory
                            )
                        ) {

                            order.statusHistory =
                                [];

                        }


                        order.statusHistory.push({

                            status:
                                "shipping",

                            changedBy:
                                "seller",

                            note:
                                "Seller paid the order from seller wallet.",

                            changedAt:
                                now

                        });


                        await order.save({

                            session:
                                session

                        });

                    }


                    /*
                    -----------------------------------------
                    RESULT
                    -----------------------------------------
                    */

                    result = {

                        totalCost:
                            totalCost,

                        orderCount:
                            ordersToPay.length,

                        paidAt:
                            now,

                        balance:
                            Number(
                                seller.balance ||
                                0
                            ),

                        totalAssets:
                            Number(
                                seller.totalAssets ||
                                0
                            ),

                        orders:
                            ordersToPay

                    };

                }
            );


            /*
            ---------------------------------------------
            RESPONSE
            ---------------------------------------------
            */

            return res.json({

                success:
                    true,

                message:
                    `ชำระออเดอร์สำเร็จ ${result.orderCount} รายการ`,

                totalCost:
                    result.totalCost,

                balance:
                    result.balance,

                totalAssets:
                    result.totalAssets,

                paidAt:
                    result.paidAt,

                orders:
                    result.orders

            });


        } catch (error) {

            console.error(
                "Pay seller orders error:",
                error
            );


            const message =
                error?.message ||
                "Unable to pay orders.";


            /*
            ---------------------------------------------
            SELLER ACCOUNT ERRORS
            ---------------------------------------------
            */

            if (

                message ===
                    "Seller account not found."

                ||

                message ===
                    "Seller access is required."

                ||

                message ===
                    "Seller account is not active."

            ) {

                return res.status(403).json({

                    success:
                        false,

                    message:
                        message

                });

            }


            /*
            ---------------------------------------------
            INSUFFICIENT BALANCE
            ---------------------------------------------
            */

            if (
                message.startsWith(
                    "เงินในกระเป๋าไม่พอ"
                )
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        message

                });

            }


            /*
            ---------------------------------------------
            OTHER ERRORS
            ---------------------------------------------
            */

            return res.status(400).json({

                success:
                    false,

                message:
                    message

            });

        } finally {

            await session.endSession();

        }

    }
);


/*
=========================================================
GET SINGLE ORDER
=========================================================
GET /api/orders/:orderId
=========================================================
*/

router.get(
    "/:orderId",
    authenticateToken,
    async function(req, res) {

        try {

            const userId =
                getUserId(req);


            const {
                orderId
            } = req.params;


            if (!userId) {

                return res.status(401).json({

                    success:
                        false,

                    message:
                        "Authentication required."

                });

            }


            if (
                !isValidObjectId(
                    orderId
                )
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Invalid order ID."

                });

            }


            const order =
                await Order.findById(
                    orderId
                );


            if (!order) {

                return res.status(404).json({

                    success:
                        false,

                    message:
                        "Order not found."

                });

            }


            const user =
                await User.findById(
                    userId
                );


            if (!user) {

                return res.status(401).json({

                    success:
                        false,

                    message:
                        "User account not found."

                });

            }


            const accountType =
                String(
                    user.accountType ||
                    ""
                )
                .trim()
                .toLowerCase();


            const isBuyer =
                String(
                    order.buyerId
                ) ===
                String(
                    userId
                );


            const isSeller =
                String(
                    order.sellerId
                ) ===
                String(
                    userId
                );


            const isAdmin =
                accountType ===
                "admin";


            if (
                !isBuyer &&
                !isSeller &&
                !isAdmin
            ) {

                return res.status(403).json({

                    success:
                        false,

                    message:
                        "You are not allowed to view this order."

                });

            }


            return res.json({

                success:
                    true,

                order:
                    order

            });


        } catch (error) {

            console.error(
                "Get single order error:",
                error
            );


            return res.status(500).json({

                success:
                    false,

                message:
                    "Unable to load order."

            });

        }

    }
);


/*
=========================================================
UPDATE ORDER STATUS
=========================================================
PATCH /api/orders/:orderId/status
=========================================================
*/

router.patch(
    "/:orderId/status",
    authenticateToken,
    async function(req, res) {

        try {

            const userId =
                getUserId(req);


            const {
                orderId
            } = req.params;


            const {
                status,
                note
            } = req.body;


            if (!userId) {

                return res.status(401).json({

                    success:
                        false,

                    message:
                        "Authentication required."

                });

            }


            if (
                !isValidObjectId(
                    orderId
                )
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Invalid order ID."

                });

            }


            /*
            ---------------------------------------------
            VALID STATUSES
            ---------------------------------------------
            */

            const allowedStatuses = [

                "pending",

                "confirmed",

                "processing",

                "shipping",

                "completed",

                "cancelled",

                "refunded"

            ];


            const newStatus =
                cleanText(
                    status
                )
                .toLowerCase();


            if (
                !allowedStatuses.includes(
                    newStatus
                )
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Invalid order status."

                });

            }


            /*
            ---------------------------------------------
            FIND ORDER
            ---------------------------------------------
            */

            const order =
                await Order.findById(
                    orderId
                );


            if (!order) {

                return res.status(404).json({

                    success:
                        false,

                    message:
                        "Order not found."

                });

            }


            /*
            ---------------------------------------------
            FIND USER
            ---------------------------------------------
            */

            const user =
                await User.findById(
                    userId
                );


            if (!user) {

                return res.status(401).json({

                    success:
                        false,

                    message:
                        "User account not found."

                });

            }


            /*
            ---------------------------------------------
            ACCOUNT TYPE
            ---------------------------------------------
            */

            const accountType =
                String(
                    user.accountType ||
                    ""
                )
                .trim()
                .toLowerCase();


            const isAdmin =
                accountType ===
                "admin";


            const isSeller =
                String(
                    order.sellerId
                ) ===
                String(
                    userId
                );


            const isBuyer =
                String(
                    order.buyerId
                ) ===
                String(
                    userId
                );


            /*
            ---------------------------------------------
            AUTHORIZATION
            ---------------------------------------------
            */

            if (
                !isAdmin &&
                !isSeller &&
                !isBuyer
            ) {

                return res.status(403).json({

                    success:
                        false,

                    message:
                        "You are not allowed to update this order."

                });

            }


            /*
            ---------------------------------------------
            SAVE OLD STATUS
            ---------------------------------------------
            */

            const oldStatus =
                order.status;


            /*
            ---------------------------------------------
            UPDATE STATUS
            ---------------------------------------------
            */

            order.status =
                newStatus;


            /*
            ---------------------------------------------
            SHIPPING
            ---------------------------------------------
            */

            if (
                newStatus ===
                "shipping"
            ) {

                /*
                -----------------------------------------
                PAYMENT
                -----------------------------------------
                */

                if (
                    order.paymentStatus ===
                    "pending"
                ) {

                    /*
                    -------------------------------------
                    IMPORTANT:
                    Do not automatically deduct seller
                    wallet here.

                    Seller payment is handled by:
                    POST /api/orders/pay
                    -------------------------------------
                    */

                }

            }


            /*
            ---------------------------------------------
            COMPLETED
            ---------------------------------------------
            */

            if (
                newStatus ===
                "completed"
            ) {

                if (
                    order.paymentStatus ===
                    "pending"
                ) {

                    order.paymentStatus =
                        "paid";


                    order.paidAt =
                        new Date();

                }

            }


            /*
            ---------------------------------------------
            CANCELLED
            ---------------------------------------------
            */

            if (
                newStatus ===
                "cancelled"
            ) {

                order.cancelledAt =
                    new Date();


                order.cancelReason =
                    cleanText(
                        note
                    ) ||
                    "Order cancelled.";

            }


            /*
            ---------------------------------------------
            REFUNDED
            ---------------------------------------------
            */

            if (
                newStatus ===
                "refunded"
            ) {

                order.refundedAt =
                    new Date();


                order.refundAmount =
                    Number(
                        order.subtotal ||
                        0
                    );

            }


            /*
            ---------------------------------------------
            ADD STATUS HISTORY
            ---------------------------------------------
            */

            let changedBy =
                "user";


            if (
                isAdmin
            ) {

                changedBy =
                    "admin";

            }

            else if (
                isSeller
            ) {

                changedBy =
                    "seller";

            }

            else if (
                isBuyer
            ) {

                changedBy =
                    "buyer";

            }


            if (
                !Array.isArray(
                    order.statusHistory
                )
            ) {

                order.statusHistory =
                    [];

            }


            order.statusHistory.push({

                status:
                    newStatus,

                changedBy:
                    changedBy,

                note:
                    cleanText(
                        note
                    ),

                changedAt:
                    new Date()

            });


            /*
            ---------------------------------------------
            SAVE
            ---------------------------------------------
            */

            await order.save();


            /*
            ---------------------------------------------
            RESPONSE
            ---------------------------------------------
            */

            return res.json({

                success:
                    true,

                message:
                    "Order status updated.",

                oldStatus:
                    oldStatus,

                newStatus:
                    newStatus,

                order:
                    order

            });


        } catch (error) {

            console.error(
                "Update order status error:",
                error
            );


            return res.status(500).json({

                success:
                    false,

                message:
                    "Unable to update order status."

            });

        }

    }
);


/*
=========================================================
EXPORT
=========================================================
*/

module.exports =
    router;