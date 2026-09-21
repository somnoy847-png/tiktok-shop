// =====================================================
// Admin Shop Order Routes
// =====================================================
// Admin can browse any seller shop, view seller products,
// create an order for a selected seller, and send the order
// into the seller's order queue.
// =====================================================

const express = require("express");
const mongoose = require("mongoose");

const Order = require("../models/Order");
const SellerProduct = require("../models/SellerProduct");
const User = require("../models/User");

const authenticateToken = require("../middleware/authMiddleware");
const requireAdmin = require("../middleware/adminMiddleware");

const router = express.Router();

router.use(authenticateToken, requireAdmin);

function cleanText(value) {
    return String(value ?? "").trim();
}

function isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id);
}

function makeOrderId() {
    const stamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `ADM-${stamp}-${random}`;
}

function safeSeller(user, productCount = 0) {
    return {
        id: user._id,
        username: user.username || "",
        shopName: user.shopName || user.username || "",
        displayName: user.shopName || user.username || "",
        contact: user.contact || "",
        country: user.country || "",
        nationality: user.nationality || "",
        profileImage: user.profileImage || "",
        productCount
    };
}

// =====================================================
// GET /api/admin/shop-orders/shops
// List every active seller shop
// =====================================================
router.get("/shops", async (req, res) => {
    try {
        const sellers = await User.find({
            accountType: "seller",
            status: "active"
        })
            .select("username shopName contact country nationality profileImage")
            .sort({ shopName: 1, username: 1 })
            .lean();

        const sellerIds = sellers.map((seller) => seller._id);
        const counts = await SellerProduct.aggregate([
            {
                $match: {
                    sellerId: { $in: sellerIds },
                    status: "active"
                }
            },
            {
                $group: {
                    _id: "$sellerId",
                    count: { $sum: 1 }
                }
            }
        ]);

        const countMap = new Map(
            counts.map((item) => [String(item._id), item.count])
        );

        return res.json({
            success: true,
            shops: sellers.map((seller) =>
                safeSeller(seller, countMap.get(String(seller._id)) || 0)
            )
        });
    } catch (error) {
        console.error("Admin list shops error:", error);
        return res.status(500).json({
            success: false,
            message: "ไม่สามารถโหลดร้านค้าได้"
        });
    }
});

// =====================================================
// GET /api/admin/shop-orders/shops/:sellerId/products
// List active products belonging to one seller
// =====================================================
router.get("/shops/:sellerId/products", async (req, res) => {
    try {
        const { sellerId } = req.params;

        if (!isValidObjectId(sellerId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid seller ID."
            });
        }

        const seller = await User.findOne({
            _id: sellerId,
            accountType: "seller",
            status: "active"
        })
            .select("username shopName contact country nationality profileImage")
            .lean();

        if (!seller) {
            return res.status(404).json({
                success: false,
                message: "ไม่พบร้านค้าหรือร้านค้านี้ไม่พร้อมใช้งาน"
            });
        }

        const products = await SellerProduct.find({
            sellerId,
            status: "active"
        })
            .sort({ createdAt: -1 })
            .lean();

        return res.json({
            success: true,
            shop: safeSeller(seller, products.length),
            products
        });
    } catch (error) {
        console.error("Admin load seller products error:", error);
        return res.status(500).json({
            success: false,
            message: "ไม่สามารถโหลดสินค้าของร้านได้"
        });
    }
});

// =====================================================
// POST /api/admin/shop-orders
// Create a pending order for a seller shop.
// Seller will pay this order from their wallet.
// =====================================================
router.post("/", async (req, res) => {
    let stockReserved = false;
    let reservedProductId = null;
    let reservedQuantity = 0;

    try {
        const admin = req.adminUser;
        const sellerId = cleanText(req.body.sellerId);
        const productId = cleanText(req.body.productId);
        const buyerName = cleanText(req.body.buyerName);
        const shippingAddress = cleanText(req.body.shippingAddress);
        const shippingPhone = cleanText(req.body.shippingPhone);
        const buyerNote = cleanText(req.body.buyerNote);
        const quantity = Number(req.body.quantity);

        if (!isValidObjectId(sellerId) || !isValidObjectId(productId)) {
            return res.status(400).json({
                success: false,
                message: "ข้อมูลร้านค้าหรือสินค้าไม่ถูกต้อง"
            });
        }

        if (!Number.isInteger(quantity) || quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: "จำนวนสินค้าต้องเป็นจำนวนเต็มมากกว่า 0"
            });
        }

        if (!shippingAddress) {
            return res.status(400).json({
                success: false,
                message: "กรุณากรอกข้อมูลจัดส่ง"
            });
        }

        const seller = await User.findOne({
            _id: sellerId,
            accountType: "seller",
            status: "active"
        });

        if (!seller) {
            return res.status(404).json({
                success: false,
                message: "ไม่พบร้านค้าที่เลือก"
            });
        }

        if (!buyerName) {

    return res.status(400).json({

        success: false,

        message:
            "กรุณากรอกชื่อผู้ซื้อ"

    });

}

        // Atomic stock reservation prevents two admin requests from
        // successfully buying the same last units at the same time.
        const product = await SellerProduct.findOneAndUpdate(
            {
                _id: productId,
                sellerId,
                status: "active",
                stock: { $gte: quantity }
            },
            {
                $inc: { stock: -quantity }
            },
            {
                new: true
            }
        );

        if (!product) {
            const current = await SellerProduct.findOne({
                _id: productId,
                sellerId
            }).select("stock status");

            if (!current) {
                return res.status(404).json({
                    success: false,
                    message: "ไม่พบสินค้าในร้านนี้"
                });
            }

            if (current.status !== "active") {
                return res.status(400).json({
                    success: false,
                    message: "สินค้านี้ไม่พร้อมจำหน่าย"
                });
            }

            return res.status(400).json({
                success: false,
                message: `สินค้าเหลือ ${Number(current.stock || 0)} ชิ้น`
            });
        }

        stockReserved = true;
        reservedProductId = product._id;
        reservedQuantity = quantity;

        const unitPrice = Number(product.salePrice || 0);
        const costPrice = Number(product.costPrice || 0);
        const subtotal = quantity * unitPrice;
        const profit = quantity * (unitPrice - costPrice);

        const order = await Order.create({
            orderId: makeOrderId(),

            // Admin is the order creator / buyer record.
           buyerId:
            admin._id,

buyerUsername:
    "",

buyerName:
    buyerName,

buyerContact:
    shippingPhone || "",

            sellerId: seller._id,
            sellerUsername: seller.username || "",
            shopName: seller.shopName || seller.username || "",

            productId: product._id,
            adminProductId: product.adminProductId || null,
            productName: product.name || "",
            productImage: product.image || "",
            category: product.category || "",

            quantity,
            unitPrice,
            costPrice,
            subtotal,
            profit,

            // The seller pays this admin-created order.
            paymentMethod: "seller_wallet",
            paymentStatus: "pending",
            paidAt: null,

            status: "pending",

            shippingAddress,
            shippingPhone,
            buyerNote,

            adminNote: "Admin created an order for this seller shop.",

            statusHistory: [
                {
                    status: "pending",
                    changedBy: admin.username || "admin",
                    note: "Admin created the order.",
                    changedAt: new Date()
                }
            ]
        });

        return res.status(201).json({
            success: true,
            message: "สร้างออเดอร์และส่งเข้าร้านเรียบร้อยแล้ว",
            order
        });
    } catch (error) {
        console.error("Admin create shop order error:", error);

        // If order creation failed after stock reservation, restore stock.
        if (stockReserved && reservedProductId) {
            try {
                await SellerProduct.updateOne(
                    { _id: reservedProductId },
                    { $inc: { stock: reservedQuantity } }
                );
            } catch (restoreError) {
                console.error("Stock restore error:", restoreError);
            }
        }

        return res.status(500).json({
            success: false,
            message: "ไม่สามารถสร้างออเดอร์ได้"
        });
    }
});

module.exports = router;
