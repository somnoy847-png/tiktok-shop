const express = require("express");
const Product = require("../models/Product");

const router = express.Router();


// ========================================
// GET ALL PRODUCTS
// ========================================

router.get("/", async (req, res) => {

    try {

        const products =
            await Product
                .find()
                .sort({
                    createdAt: -1
                });


        res.json({
            success: true,
            count: products.length,
            products
        });

    }

    catch (error) {

        console.error(
            "Get products error:",
            error
        );


        res.status(500).json({
            success: false,
            message: "Failed to get products"
        });

    }

});


// ========================================
// GET PRODUCT BY ID
// ========================================

router.get("/:id", async (req, res) => {

    try {

        const product =
            await Product.findById(
                req.params.id
            );


        if (!product) {

            return res.status(404).json({
                success: false,
                message: "Product not found"
            });

        }


        res.json({
            success: true,
            product
        });

    }

    catch (error) {

        console.error(
            "Get product error:",
            error
        );


        res.status(500).json({
            success: false,
            message: "Failed to get product"
        });

    }

});


// ========================================
// CREATE PRODUCT
// ========================================

router.post("/", async (req, res) => {

    try {

        const {
            image,
            name,
            sku,
            description,
            costPrice,
            salePrice,
            productPrice,
            category,
            stock,
            status
        } = req.body;


        // ----------------------------------------
        // Check required fields
        // ----------------------------------------

        if (
            !image ||
            !name ||
            costPrice === undefined ||
            salePrice === undefined ||
            !category
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Please provide image, name, cost price, sale price and category"
            });

        }


        // ----------------------------------------
        // Convert prices
        // ----------------------------------------

        const cost =
            Number(costPrice);

        const sale =
            Number(salePrice);


        // ----------------------------------------
        // Validate prices
        // ----------------------------------------

        if (
            Number.isNaN(cost) ||
            Number.isNaN(sale) ||
            cost < 0 ||
            sale < 0
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Cost price and sale price must be valid numbers"
            });

        }


        // ----------------------------------------
        // Stock
        // ----------------------------------------

        let productStock = 0;


        if (
            stock !== undefined
        ) {

            productStock =
                Number(stock);


            if (
                Number.isNaN(productStock) ||
                productStock < 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Stock must be a valid non-negative number"
                });

            }

        }


        // ----------------------------------------
        // Status
        // ----------------------------------------

        const productStatus =
            status
                ? String(status).toLowerCase()
                : "active";


        if (
            ![
                "active",
                "inactive"
            ].includes(
                productStatus
            )
        ) {

            return res.status(400).json({
                success: false,
                message: "Invalid product status"
            });

        }


        // ----------------------------------------
        // Calculate profit
        // ----------------------------------------

        const profit =
            sale - cost;


        // ----------------------------------------
        // Product price
        // ----------------------------------------

        const finalProductPrice =
            productPrice !== undefined
                ? Number(productPrice)
                : sale;


        if (
            Number.isNaN(
                finalProductPrice
            ) ||
            finalProductPrice < 0
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Product price must be a valid number"
            });

        }


        // ----------------------------------------
        // Create product
        // ----------------------------------------

        const product =
            await Product.create({

                image,

                name,

                sku:
                    sku || "",

                description:
                    description || "",

                costPrice:
                    cost,

                salePrice:
                    sale,

                productPrice:
                    finalProductPrice,

                profit,

                category,

                stock:
                    productStock,

                status:
                    productStatus

            });


        res.status(201).json({

            success: true,

            message:
                "Product created successfully",

            product

        });

    }

    catch (error) {

        console.error(
            "Create product error:",
            error
        );


        res.status(500).json({
            success: false,
            message:
                "Failed to create product"
        });

    }

});


// ========================================
// UPDATE PRODUCT
// ========================================

router.put("/:id", async (req, res) => {

    try {

        const {
            image,
            name,
            sku,
            description,
            costPrice,
            salePrice,
            productPrice,
            category,
            stock,
            status
        } = req.body;


        // ----------------------------------------
        // Find existing product
        // ----------------------------------------

        const existingProduct =
            await Product.findById(
                req.params.id
            );


        if (!existingProduct) {

            return res.status(404).json({
                success: false,
                message:
                    "Product not found"
            });

        }


        const updateData = {};


        // ----------------------------------------
        // Basic fields
        // ----------------------------------------

        if (
            image !== undefined
        ) {

            updateData.image =
                image;

        }


        if (
            name !== undefined
        ) {

            updateData.name =
                name;

        }


        if (
            sku !== undefined
        ) {

            updateData.sku =
                sku;

        }


        if (
            description !== undefined
        ) {

            updateData.description =
                description;

        }


        if (
            category !== undefined
        ) {

            updateData.category =
                category;

        }


        // ----------------------------------------
        // Cost price
        // ----------------------------------------

        let cost =
            existingProduct.costPrice;


        if (
            costPrice !== undefined
        ) {

            cost =
                Number(costPrice);


            if (
                Number.isNaN(cost) ||
                cost < 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid cost price"
                });

            }


            updateData.costPrice =
                cost;

        }


        // ----------------------------------------
        // Sale price
        // ----------------------------------------

        let sale =
            existingProduct.salePrice;


        if (
            salePrice !== undefined
        ) {

            sale =
                Number(salePrice);


            if (
                Number.isNaN(sale) ||
                sale < 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid sale price"
                });

            }


            updateData.salePrice =
                sale;

        }


        // ----------------------------------------
        // Product price
        // ----------------------------------------

        if (
            productPrice !== undefined
        ) {

            const newProductPrice =
                Number(productPrice);


            if (
                Number.isNaN(
                    newProductPrice
                ) ||
                newProductPrice < 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid product price"
                });

            }


            updateData.productPrice =
                newProductPrice;

        }


        // ----------------------------------------
        // Automatically recalculate profit
        // ----------------------------------------

        if (
            costPrice !== undefined ||
            salePrice !== undefined
        ) {

            updateData.profit =
                sale - cost;

        }


        // ----------------------------------------
        // Stock
        // ----------------------------------------

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


        // ----------------------------------------
        // Status
        // ----------------------------------------

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
                    message:
                        "Invalid product status"
                });

            }


            updateData.status =
                newStatus;

        }


        // ----------------------------------------
        // Update product
        // ----------------------------------------

        const product =
            await Product.findByIdAndUpdate(

                req.params.id,

                updateData,

                {
                    new: true,
                    runValidators: true
                }

            );


        res.json({

            success: true,

            message:
                "Product updated successfully",

            product

        });

    }

    catch (error) {

        console.error(
            "Update product error:",
            error
        );


        res.status(500).json({
            success: false,
            message:
                "Failed to update product"
        });

    }

});


// ========================================
// DELETE PRODUCT
// ========================================

router.delete("/:id", async (req, res) => {

    try {

        const product =
            await Product.findByIdAndDelete(
                req.params.id
            );


        if (!product) {

            return res.status(404).json({
                success: false,
                message:
                    "Product not found"
            });

        }


        res.json({

            success: true,

            message:
                "Product deleted successfully"

        });

    }

    catch (error) {

        console.error(
            "Delete product error:",
            error
        );


        res.status(500).json({
            success: false,
            message:
                "Failed to delete product"
        });

    }

});


module.exports = router;