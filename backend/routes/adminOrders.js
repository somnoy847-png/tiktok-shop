// ============================================
// Admin Orders Routes
// ============================================

const express = require("express");
const mongoose = require("mongoose");

const Order = require("../models/Order");
const SellerProduct = require("../models/SellerProduct");
const User = require("../models/User");

const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();


// ============================================
// Helpers
// ============================================

function isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id);
}


function cleanText(value) {
    if (value === undefined || value === null) {
        return "";
    }

    return String(value).trim();
}


function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}


function getUserId(req) {
    return req.user?.id || req.user?.userId || null;
}


// ============================================
// Admin Authentication
// ============================================

async function requireAdmin(req, res, next) {
    try {

        const userId = getUserId(req);

        if (!userId || !isValidObjectId(userId)) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }


        const user = await User.findById(userId);


        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not found."
            });
        }


        if (
            String(user.status || "").toLowerCase() !==
            "active"
        ) {
            return res.status(403).json({
                success: false,
                message: "Your account is not active."
            });
        }


        if (
            String(user.accountType || "").toLowerCase() !==
            "admin"
        ) {
            return res.status(403).json({
                success: false,
                message: "Admin access required."
            });
        }


        req.adminUser = user;

        next();

    } catch (error) {

        console.error(
            "Admin authentication error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to verify admin access."
        });
    }
}


// ============================================
// Safe Order
// ============================================

function getSafeOrder(order) {

    if (!order) {
        return null;
    }


    return {

        id: order._id,

        orderId: order.orderId,


        buyerId: order.buyerId,

        buyerUsername:
            order.buyerUsername,

        buyerName:
            order.buyerName,

        buyerContact:
            order.buyerContact,


        sellerId:
            order.sellerId,

        sellerUsername:
            order.sellerUsername,

        shopName:
            order.shopName,


        productId:
            order.productId,

        adminProductId:
            order.adminProductId,


        productName:
            order.productName,

        productImage:
            order.productImage,

        category:
            order.category,


        quantity:
            order.quantity,


        unitPrice:
            order.unitPrice,

        costPrice:
            order.costPrice,

        subtotal:
            order.subtotal,

        profit:
            order.profit,


        paymentMethod:
            order.paymentMethod,

        paymentStatus:
            order.paymentStatus,

        paidAt:
            order.paidAt,


        status:
            order.status,


        shippingAddress:
            order.shippingAddress,

        shippingPhone:
            order.shippingPhone,


        trackingNumber:
            order.trackingNumber,

        courier:
            order.courier,


        buyerNote:
            order.buyerNote,

        sellerNote:
            order.sellerNote,

        adminNote:
            order.adminNote,


        statusHistory:
            order.statusHistory || [],


        cancelledAt:
            order.cancelledAt,

        cancelReason:
            order.cancelReason,


        refundedAt:
            order.refundedAt,

        refundAmount:
            order.refundAmount,


        createdAt:
            order.createdAt,

        updatedAt:
            order.updatedAt
    };
}


// ============================================
// Order Status Validation
// ============================================

const ORDER_STATUSES = [

    "pending",

    "confirmed",

    "processing",

    "shipping",

    "completed",

    "cancelled",

    "refunded"

];


const PAYMENT_STATUSES = [

    "pending",

    "paid",

    "failed",

    "refunded",

    "cancelled"

];


// ============================================
// Apply Refund
// ============================================

async function processRefund(order, adminUser) {

    // ป้องกันการ Refund ซ้ำ

    if (
        order.paymentStatus ===
        "refunded"
    ) {

        return {

            alreadyRefunded: true,

            refundAmount:
                Number(
                    order.refundAmount || 0
                )
        };
    }


    const quantity =
        Number(
            order.quantity || 0
        );


    /*
    ========================================================
    กำหนดจำนวนเงิน Refund
    ========================================================

    seller_wallet:
    เงินถูกหักจาก Seller
    คืน costPrice x quantity

    wallet:
    เงินถูกหักจาก Buyer
    คืน subtotal

    ========================================================
    */


    let refundAmount = 0;


    if (
        order.paymentMethod ===
        "seller_wallet"
    ) {

        refundAmount =
            Number(
                order.costPrice || 0
            ) * quantity;

    } else {

        refundAmount =
            Number(
                order.subtotal || 0
            );
    }


    /*
    ========================================================
    คืนเงินเฉพาะ Order ที่ชำระแล้ว
    ========================================================
    */


    if (
        order.paymentStatus ===
        "paid" &&
        refundAmount > 0
    ) {

        // Seller Wallet

        if (
            order.paymentMethod ===
            "seller_wallet"
        ) {

            const seller =
                await User.findById(
                    order.sellerId
                );


            if (!seller) {

                throw new Error(
                    "Seller account not found for refund."
                );
            }


            seller.balance =
                Number(
                    seller.balance || 0
                ) + refundAmount;


            seller.totalAssets =
                Number(
                    seller.totalAssets || 0
                ) + refundAmount;


            await seller.save();


        }

        // Buyer Wallet

        else if (
            order.paymentMethod ===
            "wallet"
        ) {

            const buyer =
                await User.findById(
                    order.buyerId
                );


            if (!buyer) {

                throw new Error(
                    "Buyer account not found for refund."
                );
            }


            buyer.balance =
                Number(
                    buyer.balance || 0
                ) + refundAmount;


            buyer.totalAssets =
                Number(
                    buyer.totalAssets || 0
                ) + refundAmount;


            await buyer.save();
        }
    }


    /*
    ========================================================
    คืน Stock
    ========================================================
    */


    if (
        order.productId &&
        isValidObjectId(
            order.productId
        ) &&
        quantity > 0
    ) {

        await SellerProduct.updateOne(

            {
                _id:
                    order.productId,

                sellerId:
                    order.sellerId
            },

            {
                $inc: {
                    stock:
                        quantity
                }
            }
        );
    }


    /*
    ========================================================
    Update Order
    ========================================================
    */


    order.paymentStatus =
        "refunded";


    order.status =
        "refunded";


    order.refundedAt =
        new Date();


    order.refundAmount =
        refundAmount;


    order.statusHistory.push({

        status:
            "refunded",

        changedBy:
            adminUser.username ||
            "admin",

        note:
            `Refund amount: ${refundAmount}`,

        changedAt:
            new Date()
    });


    return {

        alreadyRefunded:
            false,

        refundAmount
    };
}


// ============================================
// Middleware
// ============================================

router.use(
    authenticateToken,
    requireAdmin
);


// ============================================
// GET /api/admin/orders/stats
// Order Statistics
// ============================================

router.get(
    "/stats",
    async (req, res) => {

        try {

            const totalOrders =
                await Order.countDocuments();


            const pendingOrders =
                await Order.countDocuments({
                    status: "pending"
                });


            const confirmedOrders =
                await Order.countDocuments({
                    status: "confirmed"
                });


            const processingOrders =
                await Order.countDocuments({
                    status: "processing"
                });


            const shippingOrders =
                await Order.countDocuments({
                    status: "shipping"
                });


            const completedOrders =
                await Order.countDocuments({
                    status: "completed"
                });


            const cancelledOrders =
                await Order.countDocuments({
                    status: "cancelled"
                });


            const refundedOrders =
                await Order.countDocuments({
                    status: "refunded"
                });


            const paidOrders =
                await Order.countDocuments({
                    paymentStatus: "paid"
                });


            const pendingPayments =
                await Order.countDocuments({
                    paymentStatus: "pending"
                });


            const refundedPayments =
                await Order.countDocuments({
                    paymentStatus: "refunded"
                });


            const revenueResult =
                await Order.aggregate([

                    {
                        $match: {
                            paymentStatus:
                                "paid"
                        }
                    },

                    {
                        $group: {

                            _id: null,

                            total: {
                                $sum:
                                    "$subtotal"
                            }
                        }
                    }

                ]);


            const profitResult =
                await Order.aggregate([

                    {
                        $match: {
                            paymentStatus:
                                "paid"
                        }
                    },

                    {
                        $group: {

                            _id: null,

                            total: {
                                $sum:
                                    "$profit"
                            }
                        }
                    }

                ]);


            const refundResult =
                await Order.aggregate([

                    {
                        $match: {
                            paymentStatus:
                                "refunded"
                        }
                    },

                    {
                        $group: {

                            _id: null,

                            total: {
                                $sum:
                                    "$refundAmount"
                            }
                        }
                    }

                ]);


            const totalRevenue =
                revenueResult.length > 0
                    ? Number(
                        revenueResult[0].total ||
                        0
                    )
                    : 0;


            const totalProfit =
                profitResult.length > 0
                    ? Number(
                        profitResult[0].total ||
                        0
                    )
                    : 0;


            const totalRefund =
                refundResult.length > 0
                    ? Number(
                        refundResult[0].total ||
                        0
                    )
                    : 0;


            return res.json({

                success: true,

                stats: {

                    totalOrders,

                    pendingOrders,

                    confirmedOrders,

                    processingOrders,

                    shippingOrders,

                    completedOrders,

                    cancelledOrders,

                    refundedOrders,

                    paidOrders,

                    pendingPayments,

                    refundedPayments,

                    totalRevenue,

                    totalProfit,

                    totalRefund
                }
            });


        } catch (error) {

            console.error(
                "Admin order stats error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to load order statistics."
            });
        }
    }
);


// ============================================
// GET /api/admin/orders
// Get All Orders
// ============================================

router.get(
    "/",
    async (req, res) => {

        try {

            const {

                search = "",

                status = "",

                paymentStatus = "",

                sellerId = "",

                buyerId = "",

                page = 1,

                limit = 20

            } = req.query;


            const currentPage =
                Math.max(
                    Number(page) || 1,
                    1
                );


            const perPage =
                Math.min(

                    Math.max(
                        Number(limit) || 20,
                        1
                    ),

                    100
                );


            const filter = {};


            // Search

            const searchText =
                cleanText(search);


            if (searchText) {

                const regex =
                    new RegExp(
                        escapeRegex(
                            searchText
                        ),
                        "i"
                    );


                filter.$or = [

                    {
                        orderId:
                            regex
                    },

                    {
                        buyerUsername:
                            regex
                    },

                    {
                        buyerName:
                            regex
                    },

                    {
                        buyerContact:
                            regex
                    },

                    {
                        sellerUsername:
                            regex
                    },

                    {
                        shopName:
                            regex
                    },

                    {
                        productName:
                            regex
                    },

                    {
                        trackingNumber:
                            regex
                    }

                ];
            }


            // Status

            if (

                status &&

                ORDER_STATUSES.includes(
                    String(
                        status
                    ).toLowerCase()
                )

            ) {

                filter.status =
                    String(
                        status
                    ).toLowerCase();
            }


            // Payment Status

            if (

                paymentStatus &&

                PAYMENT_STATUSES.includes(
                    String(
                        paymentStatus
                    ).toLowerCase()
                )

            ) {

                filter.paymentStatus =
                    String(
                        paymentStatus
                    ).toLowerCase();
            }


            // Seller

            if (

                sellerId &&

                isValidObjectId(
                    sellerId
                )

            ) {

                filter.sellerId =
                    sellerId;
            }


            // Buyer

            if (

                buyerId &&

                isValidObjectId(
                    buyerId
                )

            ) {

                filter.buyerId =
                    buyerId;
            }


            const total =
                await Order.countDocuments(
                    filter
                );


            const totalPages =
                Math.max(

                    Math.ceil(
                        total /
                        perPage
                    ),

                    1
                );


            const skip =
                (
                    currentPage - 1
                ) * perPage;


            const orders =
                await Order.find(
                    filter
                )

                .sort({
                    createdAt: -1
                })

                .skip(skip)

                .limit(perPage)

                .lean();


            return res.json({

                success: true,

                orders:
                    orders.map(
                        getSafeOrder
                    ),

                pagination: {

                    page:
                        currentPage,

                    limit:
                        perPage,

                    total,

                    totalPages
                }
            });


        } catch (error) {

            console.error(
                "Admin get orders error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to load orders."
            });
        }
    }
);


// ============================================
// GET /api/admin/orders/:id
// Get Single Order
// ============================================

router.get(
    "/:id",
    async (req, res) => {

        try {

            const { id } =
                req.params;


            if (
                !isValidObjectId(id)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid order ID."
                });
            }


            const order =
                await Order.findById(id)
                    .lean();


            if (!order) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Order not found."
                });
            }


            return res.json({

                success: true,

                order:
                    getSafeOrder(order)
            });


        } catch (error) {

            console.error(
                "Admin get order error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to load order."
            });
        }
    }
);


// ============================================
// PATCH /api/admin/orders/:id
// Update Order Information
// ============================================

router.patch(
    "/:id",
    async (req, res) => {

        try {

            const { id } =
                req.params;


            if (
                !isValidObjectId(id)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid order ID."
                });
            }


            const order =
                await Order.findById(id);


            if (!order) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Order not found."
                });
            }


            const {

                trackingNumber,

                courier,

                adminNote,

                shippingAddress,

                shippingPhone,

                cancelReason

            } = req.body;


            if (
                trackingNumber !==
                undefined
            ) {

                order.trackingNumber =
                    cleanText(
                        trackingNumber
                    );
            }


            if (
                courier !==
                undefined
            ) {

                order.courier =
                    cleanText(
                        courier
                    );
            }


            if (
                adminNote !==
                undefined
            ) {

                order.adminNote =
                    cleanText(
                        adminNote
                    );
            }


            if (
                shippingAddress !==
                undefined
            ) {

                order.shippingAddress =
                    cleanText(
                        shippingAddress
                    );
            }


            if (
                shippingPhone !==
                undefined
            ) {

                order.shippingPhone =
                    cleanText(
                        shippingPhone
                    );
            }


            if (
                cancelReason !==
                undefined
            ) {

                order.cancelReason =
                    cleanText(
                        cancelReason
                    );
            }


            await order.save();


            return res.json({

                success: true,

                message:
                    "Order updated successfully.",

                order:
                    getSafeOrder(order)
            });


        } catch (error) {

            console.error(
                "Admin update order error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to update order."
            });
        }
    }
);


// ============================================
// PATCH /api/admin/orders/:id/status
// Change Order Status
// ============================================

router.patch(
    "/:id/status",
    async (req, res) => {

        try {

            const { id } =
                req.params;


            const newStatus =
                String(
                    req.body.status ||
                    ""
                )
                .toLowerCase()
                .trim();


            const note =
                cleanText(
                    req.body.note
                );


            if (
                !isValidObjectId(id)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid order ID."
                });
            }


            if (
                !ORDER_STATUSES.includes(
                    newStatus
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid order status."
                });
            }


            const order =
                await Order.findById(id);


            if (!order) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Order not found."
                });
            }


            const oldStatus =
                String(
                    order.status ||
                    "pending"
                )
                .toLowerCase();


            /*
            ========================================================
            Allowed Admin Status Flow
            ========================================================

            pending
                -> confirmed
                -> cancelled

            confirmed
                -> processing
                -> shipping
                -> cancelled

            processing
                -> shipping
                -> cancelled

            shipping
                -> completed
                -> cancelled

            completed
                -> ไม่สามารถเปลี่ยนกลับ

            cancelled
                -> ไม่สามารถเปลี่ยนกลับ

            refunded
                -> ไม่สามารถเปลี่ยนกลับ

            ========================================================
            */


            const allowedTransitions = {

                pending: [

                    "confirmed",

                    "cancelled"

                ],


                confirmed: [

                    "processing",

                    "shipping",

                    "cancelled"

                ],


                processing: [

                    "shipping",

                    "cancelled"

                ],


                shipping: [

                    "completed",

                    "cancelled"

                ],


                completed: [],


                cancelled: [],


                refunded: []

            };


            /*
            ========================================================
            Same Status
            ========================================================
            */


            if (
                oldStatus ===
                newStatus
            ) {

                return res.json({

                    success: true,

                    message:
                        "Order status is already set.",

                    order:
                        getSafeOrder(order)
                });
            }


            /*
            ========================================================
            ตรวจสอบลำดับสถานะ
            ========================================================
            */


            if (
                !allowedTransitions[
                    oldStatus
                ] ||
                !allowedTransitions[
                    oldStatus
                ].includes(
                    newStatus
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        `ไม่สามารถเปลี่ยนสถานะจาก ${oldStatus} เป็น ${newStatus} ได้`
                });
            }


            /*
            ========================================================
            CANCEL ORDER
            ========================================================
            */


            if (
                newStatus ===
                "cancelled"
            ) {

                const quantity =
                    Number(
                        order.quantity ||
                        0
                    );


                /*
                ----------------------------------------------------
                คืน Stock
                ----------------------------------------------------
                */

                if (

                    order.productId &&

                    isValidObjectId(
                        order.productId
                    ) &&

                    quantity > 0

                ) {

                    await SellerProduct.updateOne(

                        {

                            _id:
                                order.productId,

                            sellerId:
                                order.sellerId

                        },

                        {

                            $inc: {

                                stock:
                                    quantity

                            }

                        }

                    );
                }


                /*
                ----------------------------------------------------
                ถ้า Seller จ่ายแล้ว
                คืนเงิน Seller Wallet
                ----------------------------------------------------
                */

                if (

                    order.paymentStatus ===
                        "paid" &&

                    order.paymentMethod ===
                        "seller_wallet"

                ) {

                    const refundAmount =
                        Number(
                            order.costPrice ||
                            0
                        ) * quantity;


                    if (
                        refundAmount > 0
                    ) {

                        const seller =
                            await User.findById(
                                order.sellerId
                            );


                        if (!seller) {

                            throw new Error(
                                "Seller account not found for refund."
                            );
                        }


                        seller.balance =
                            Number(
                                seller.balance ||
                                0
                            ) +
                            refundAmount;


                        seller.totalAssets =
                            Number(
                                seller.totalAssets ||
                                0
                            ) +
                            refundAmount;


                        await seller.save();


                        order.paymentStatus =
                            "refunded";


                        order.refundedAt =
                            new Date();


                        order.refundAmount =
                            refundAmount;


                        order.statusHistory.push({

                            status:
                                "refunded",

                            changedBy:
                                req.adminUser.username ||
                                "admin",

                            note:
                                `Seller payment refunded: ${refundAmount}`,

                            changedAt:
                                new Date()
                        });


                    } else {

                        order.paymentStatus =
                            "refunded";


                        order.refundedAt =
                            new Date();


                        order.refundAmount =
                            0;
                    }
                }


                /*
                ----------------------------------------------------
                ถ้า Buyer จ่ายด้วย Wallet แล้ว
                คืนเงิน Buyer
                ----------------------------------------------------
                */

                else if (

                    order.paymentStatus ===
                        "paid" &&

                    order.paymentMethod ===
                        "wallet"

                ) {

                    const refundAmount =
                        Number(
                            order.subtotal ||
                            0
                        );


                    if (
                        refundAmount > 0
                    ) {

                        const buyer =
                            await User.findById(
                                order.buyerId
                            );


                        if (!buyer) {

                            throw new Error(
                                "Buyer account not found for refund."
                            );
                        }


                        buyer.balance =
                            Number(
                                buyer.balance ||
                                0
                            ) +
                            refundAmount;


                        buyer.totalAssets =
                            Number(
                                buyer.totalAssets ||
                                0
                            ) +
                            refundAmount;


                        await buyer.save();


                        order.paymentStatus =
                            "refunded";


                        order.refundedAt =
                            new Date();


                        order.refundAmount =
                            refundAmount;


                        order.statusHistory.push({

                            status:
                                "refunded",

                            changedBy:
                                req.adminUser.username ||
                                "admin",

                            note:
                                `Buyer payment refunded: ${refundAmount}`,

                            changedAt:
                                new Date()
                        });


                    } else {

                        order.paymentStatus =
                            "refunded";


                        order.refundedAt =
                            new Date();


                        order.refundAmount =
                            0;
                    }
                }


                /*
                ----------------------------------------------------
                เปลี่ยน Order เป็น Cancelled
                ----------------------------------------------------
                */

                order.status =
                    "cancelled";


                order.cancelledAt =
                    new Date();


                order.cancelReason =
                    note ||
                    order.cancelReason ||
                    "Cancelled by admin.";


                order.statusHistory.push({

                    status:
                        "cancelled",

                    changedBy:
                        req.adminUser.username ||
                        "admin",

                    note:
                        note ||
                        "Cancelled by admin.",

                    changedAt:
                        new Date()
                });


                if (note) {

                    order.adminNote =
                        note;
                }


                await order.save();


                return res.json({

                    success: true,

                    message:
                        "Order cancelled successfully.",

                    order:
                        getSafeOrder(order)
                });
            }


            /*
            ========================================================
            REFUNDED
            ========================================================
            */

            if (
                newStatus ===
                "refunded"
            ) {

                if (
                    order.paymentStatus !==
                    "paid"
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "ไม่สามารถ Refund Order ที่ยังไม่ได้ชำระเงินได้"
                    });
                }


                const refundResult =
                    await processRefund(

                        order,

                        req.adminUser

                    );


                if (note) {

                    order.adminNote =
                        note;
                }


                await order.save();


                return res.json({

                    success: true,

                    message:
                        refundResult.alreadyRefunded

                            ? "Order was already refunded."

                            : "Order refunded successfully.",

                    refundAmount:
                        refundResult.refundAmount,

                    order:
                        getSafeOrder(order)
                });
            }


            /*
========================================================
COMPLETED
========================================================
*/

if (
    newStatus ===
    "completed"
) {

    /*
    ----------------------------------------------------
    ต้องชำระเงินแล้วก่อน
    ----------------------------------------------------
    */

    if (
        order.paymentStatus !==
        "paid"
    ) {

        return res.status(400).json({

            success: false,

            message:
                "ไม่สามารถปิด Order เป็น completed ก่อนชำระเงินได้"
        });
    }


    /*
    ----------------------------------------------------
    Seller Wallet Order
    ----------------------------------------------------

    Seller จ่ายต้นทุนไปตอนชำระ Order

    ตัวอย่าง:

    ราคาขาย   = $55
    ต้นทุน     = $45
    กำไร       = $10

    ตอน Seller จ่าย:
    -$45

    ตอน Admin ส่งสำเร็จ:
    +$55

    เท่ากับ:
    +$45 ต้นทุน
    +$10 กำไร
    = +$55
    ----------------------------------------------------
    */

    if (
        order.paymentMethod ===
        "seller_wallet"
    ) {

        const seller =
            await User.findById(
                order.sellerId
            );


        if (!seller) {

            return res.status(404).json({

                success: false,

                message:
                    "ไม่พบข้อมูล Seller สำหรับรับเงิน Order"
            });
        }


        const saleAmount =
            Number(
                order.subtotal ||
                0
            );


        if (
            !Number.isFinite(
                saleAmount
            ) ||
            saleAmount <= 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "ยอดขายของ Order ไม่ถูกต้อง"
            });
        }


        /*
        ------------------------------------------------
        คืนเงินต้นทุน + กำไร
        ------------------------------------------------
        */

        seller.balance =
            Number(
                seller.balance ||
                0
            ) +
            saleAmount;


        seller.totalAssets =
            Number(
                seller.totalAssets ||
                0
            ) +
            saleAmount;


        await seller.save();


        /*
        ------------------------------------------------
        บันทึกประวัติการจ่ายเงิน
        ------------------------------------------------
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
                "completed",

            changedBy:
                req.adminUser.username ||
                "admin",

            note:
                `Seller settlement paid: ${saleAmount}. Cost: ${Number(order.costPrice || 0) * Number(order.quantity || 0)}. Profit: ${Number(order.profit || 0)}.`,

            changedAt:
                new Date()
        });
    }
}


            /*
========================================================
NORMAL STATUS UPDATE
========================================================
*/

order.status =
    newStatus;


/*
--------------------------------------------------------
บันทึก Status History

ถ้าเป็น completed และ seller_wallet
บันทึกประวัติไว้แล้วด้านบน
จึงไม่บันทึกซ้ำ
--------------------------------------------------------
*/

if (
    !(
        newStatus === "completed" &&
        order.paymentMethod === "seller_wallet"
    )
) {

    order.statusHistory.push({

        status:
            newStatus,

        changedBy:
            req.adminUser.username ||
            "admin",

        note:
            note ||
            `Status changed from ${oldStatus} to ${newStatus}.`,

        changedAt:
            new Date()
    });
}

            if (note) {

                order.adminNote =
                    note;
            }


            await order.save();


            return res.json({

                success: true,

                message:
                    "Order status updated successfully.",

                order:
                    getSafeOrder(order)
            });


        } catch (error) {

            console.error(
                "Admin change order status error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to change order status.",

                error:
                    error.message
            });
        }
    }
);


// ============================================
// PATCH /api/admin/orders/:id/payment
// Change Payment Status
// ============================================

router.patch(
    "/:id/payment",
    async (req, res) => {

        try {

            const { id } =
                req.params;

            const newPaymentStatus =
                String(
                    req.body.paymentStatus ||
                    ""
                )
                .toLowerCase()
                .trim();

            if (
                !isValidObjectId(id)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid order ID."
                });
            }

            if (
                !PAYMENT_STATUSES.includes(
                    newPaymentStatus
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid payment status."
                });
            }

            const order =
                await Order.findById(id);

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Order not found."
                });
            }

            // Refund
            if (
                newPaymentStatus ===
                "refunded"
            ) {
                if (
                    order.paymentStatus !==
                    "paid"
                ) {
                    return res.status(400).json({
                        success: false,
                        message:
                            "ไม่สามารถ Refund Order ที่ยังไม่ได้ชำระเงินได้"
                    });
                }

                const refundResult =
                    await processRefund(
                        order,
                        req.adminUser
                    );

                const note =
                    cleanText(req.body.note);

                if (note) {
                    order.adminNote = note;
                }

                await order.save();

                return res.json({
                    success: true,
                    message:
                        refundResult.alreadyRefunded
                            ? "Payment was already refunded."
                            : "Payment refunded successfully.",
                    refundAmount:
                        refundResult.refundAmount,
                    order:
                        getSafeOrder(order)
                });
            }

            // Paid
            if (
                newPaymentStatus ===
                "paid"
            ) {
                order.paymentStatus =
                    "paid";

                if (!order.paidAt) {
                    order.paidAt =
                        new Date();
                }
            }

            // Other payment statuses
            if (
                newPaymentStatus !==
                "paid"
            ) {
                order.paymentStatus =
                    newPaymentStatus;
            }

            const note =
                cleanText(
                    req.body.note
                );

            if (note) {
                order.adminNote =
                    note;
            }

            await order.save();

            return res.json({
                success: true,
                message:
                    "Payment status updated successfully.",
                order:
                    getSafeOrder(order)
            });

        } catch (error) {

            console.error(
                "Admin payment status error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to update payment status.",
                error:
                    error.message
            });
        }
    }
);


// ============================================
// DELETE
// ไม่ลบ Order จริง
// ============================================

router.delete(
    "/:id",
    async (req, res) => {

        return res.status(405).json({
            success: false,
            message:
                "Orders cannot be permanently deleted. Use cancel or refund instead."
        });
    }
);


// ============================================
// Export
// ============================================

module.exports = router;