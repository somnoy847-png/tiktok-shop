const express = require("express");
const mongoose = require("mongoose");

const Product = require("../models/Product");
const SellerProduct = require("../models/SellerProduct");

const authenticateToken =
    require("../middleware/authMiddleware");

const router = express.Router();


// =====================================================
// GET MY SHOP PRODUCTS
// GET /api/seller/products
// =====================================================

router.get(
    "/",
    authenticateToken,
    async (req, res) => {

        try {

            // Get seller ID from JWT middleware
            const sellerId =
                req.user?.id ||
                req.user?.userId;


            if (!sellerId) {

                return res.status(401).json({
                    success: false,
                    message: "Authentication required"
                });

            }


            // Validate seller ID
            if (
                !mongoose.Types.ObjectId.isValid(
                    sellerId
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message: "Invalid seller ID"
                });

            }


            // Find products belonging to this seller
            const products =
                await SellerProduct
                    .find({
                        sellerId
                    })
                    .sort({
                        createdAt: -1
                    });


            return res.json({
                success: true,
                count: products.length,
                products
            });

        }

        catch (error) {

            console.error(
                "Get seller products error:",
                error
            );


            return res.status(500).json({
                success: false,
                message: "Failed to get seller products"
            });

        }

    }
);


// =====================================================
// ADD ADMIN PRODUCT TO MY SHOP
// POST /api/seller/products
// =====================================================

router.post(
    "/",
    authenticateToken,
    async (req, res) => {

        try {

            // Get seller ID from JWT middleware
            const sellerId =
                req.user?.id ||
                req.user?.userId;


            if (!sellerId) {

                return res.status(401).json({
                    success: false,
                    message: "Authentication required"
                });

            }


            // Validate seller ID
            if (
                !mongoose.Types.ObjectId.isValid(
                    sellerId
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message: "Invalid seller ID"
                });

            }


            const {
                adminProductId
            } = req.body;


            if (!adminProductId) {

                return res.status(400).json({
                    success: false,
                    message: "adminProductId is required"
                });

            }


            // Validate admin product ID
            if (
                !mongoose.Types.ObjectId.isValid(
                    adminProductId
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message: "Invalid product ID"
                });

            }


            // =================================================
            // FIND ADMIN PRODUCT
            // =================================================

            const product =
                await Product.findById(
                    adminProductId
                );


            if (!product) {

                return res.status(404).json({
                    success: false,
                    message: "Admin product not found"
                });

            }


            // =================================================
            // ONLY ACTIVE PRODUCTS
            // =================================================

            const status =
                String(
                    product.status ||
                    "active"
                ).toLowerCase();


            if (status !== "active") {

                return res.status(400).json({
                    success: false,
                    message: "This product is not active"
                });

            }


            // =================================================
            // CHECK DUPLICATE
            // =================================================

            const existing =
                await SellerProduct.findOne({

                    sellerId,

                    adminProductId

                });


            if (existing) {

                return res.status(409).json({
                    success: false,
                    message: "Product is already in your shop",
                    product: existing
                });

            }


            // =================================================
            // PRICE
            // =================================================

            const costPrice =
                Number(
                    product.costPrice || 0
                );


            const salePrice =
                Number(
                    product.salePrice || 0
                );


            const profit =
                Number(
                    product.profit ??
                    (salePrice - costPrice)
                );


            // =================================================
            // CREATE SELLER PRODUCT
            // =================================================

            const sellerProduct =
                await SellerProduct.create({

                    sellerId,

                    adminProductId:
                        product._id,

                    name:
                        product.name,

                    sku:
                        product.sku || "",

                    category:
                        product.category,

                    description:
                        product.description || "",

                    image:
                        product.image || "",

                    productPrice:
                        Number(
                            product.productPrice ??
                            product.price ??
                            salePrice
                        ),

                    costPrice,

                    salePrice,

                    profit,

                    // Seller starts with
                    // stock assigned by Admin
                    stock:
                        Number(
                            product.stock || 0
                        ),

                    status:
                        status

                });


            return res.status(201).json({
                success: true,
                message: "Product added to your shop",
                product: sellerProduct
            });

        }

        catch (error) {

            console.error(
                "Add seller product error:",
                error
            );


            // MongoDB duplicate key
            if (
                error.code === 11000
            ) {

                return res.status(409).json({
                    success: false,
                    message: "Product is already in your shop"
                });

            }


            return res.status(500).json({
                success: false,
                message: "Failed to add product to shop"
            });

        }

    }
);


// =====================================================
// UPDATE SELLER PRODUCT
// PATCH /api/seller/products/:id
// =====================================================

router.patch(
    "/:id",
    authenticateToken,
    async (req, res) => {

        try {

            // Get seller ID from JWT middleware
            const sellerId =
                req.user?.id ||
                req.user?.userId;


            if (!sellerId) {

                return res.status(401).json({
                    success: false,
                    message: "Authentication required"
                });

            }


            // Validate seller ID
            if (
                !mongoose.Types.ObjectId.isValid(
                    sellerId
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message: "Invalid seller ID"
                });

            }


            // Validate seller product ID
            if (
                !mongoose.Types.ObjectId.isValid(
                    req.params.id
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message: "Invalid seller product ID"
                });

            }


            const {
                stock,
                status,
                salePrice
            } = req.body;


            const updateData = {};


            // =================================================
            // UPDATE STOCK
            // =================================================

            if (
                stock !== undefined
            ) {

                const newStock =
                    Number(stock);


                if (
                    Number.isNaN(newStock) ||
                    newStock < 0
                ) {

                    return res.status(400).json({
                        success: false,
                        message:
                            "Stock must be a valid non-negative number"
                    });

                }


                updateData.stock =
                    newStock;

            }


            // =================================================
            // UPDATE STATUS
            // =================================================

            if (
                status !== undefined
            ) {

                const newStatus =
                    String(status)
                        .toLowerCase();


                if (
                    ![
                        "active",
                        "inactive"
                    ].includes(
                        newStatus
                    )
                ) {

                    return res.status(400).json({
                        success: false,
                        message: "Invalid status"
                    });

                }


                updateData.status =
                    newStatus;

            }


            // =================================================
            // UPDATE SALE PRICE
            // =================================================

            if (
                salePrice !== undefined
            ) {

                const newSalePrice =
                    Number(salePrice);


                if (
                    Number.isNaN(newSalePrice) ||
                    newSalePrice < 0
                ) {

                    return res.status(400).json({
                        success: false,
                        message: "Invalid sale price"
                    });

                }


                updateData.salePrice =
                    newSalePrice;


                // Find current product
                // so we can calculate new profit
                const current =
                    await SellerProduct.findOne({

                        _id:
                            req.params.id,

                        sellerId

                    });


                if (!current) {

                    return res.status(404).json({
                        success: false,
                        message:
                            "Seller product not found"
                    });

                }


                updateData.profit =
                    newSalePrice -
                    Number(
                        current.costPrice || 0
                    );

            }


            // =================================================
            // UPDATE PRODUCT
            // =================================================

            const product =
                await SellerProduct.findOneAndUpdate(

                    {
                        _id:
                            req.params.id,

                        sellerId

                    },

                    updateData,

                    {
                        new: true,
                        runValidators: true
                    }

                );


            if (!product) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Seller product not found"
                });

            }


            return res.json({
                success: true,
                message: "Seller product updated",
                product
            });

        }

        catch (error) {

            console.error(
                "Update seller product error:",
                error
            );


            return res.status(500).json({
                success: false,
                message:
                    "Failed to update seller product"
            });

        }

    }
);


// =====================================================
// DELETE SELLER PRODUCT
// DELETE /api/seller/products/:id
// =====================================================

router.delete(
    "/:id",
    authenticateToken,
    async (req, res) => {

        try {

            // Get seller ID from JWT middleware
            const sellerId =
                req.user?.id ||
                req.user?.userId;


            if (!sellerId) {

                return res.status(401).json({
                    success: false,
                    message: "Authentication required"
                });

            }


            // Validate seller ID
            if (
                !mongoose.Types.ObjectId.isValid(
                    sellerId
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message: "Invalid seller ID"
                });

            }


            // Validate product ID
            if (
                !mongoose.Types.ObjectId.isValid(
                    req.params.id
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid seller product ID"
                });

            }


            // Delete only the product
            // belonging to this seller
            const product =
                await SellerProduct.findOneAndDelete({

                    _id:
                        req.params.id,

                    sellerId

                });


            if (!product) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Seller product not found"
                });

            }


            return res.json({
                success: true,
                message:
                    "Product removed from your shop"
            });

        }

        catch (error) {

            console.error(
                "Delete seller product error:",
                error
            );


            return res.status(500).json({
                success: false,
                message:
                    "Failed to remove seller product"
            });

        }

    }
);


// =====================================================
// EXPORT
// =====================================================

module.exports = router;