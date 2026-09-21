const mongoose = require("mongoose");

const SellerProductSchema = new mongoose.Schema(
    {
        sellerId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            index: true
        },

        adminProductId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
            index: true
        },

        name: {
            type: String,
            required: true,
            trim: true
        },

        sku: {
            type: String,
            default: ""
        },

        category: {
            type: String,
            required: true
        },

        description: {
            type: String,
            default: ""
        },

        image: {
            type: String,
            default: ""
        },

        productPrice: {
            type: Number,
            default: 0
        },

        costPrice: {
            type: Number,
            default: 0
        },

        salePrice: {
            type: Number,
            default: 0
        },

        profit: {
            type: Number,
            default: 0
        },

        stock: {
            type: Number,
            default: 0,
            min: 0
        },

        status: {
            type: String,
            enum: [
                "active",
                "inactive"
            ],
            default: "active"
        }
    },
    {
        timestamps: true
    }
);


/*
 * Seller คนเดียวกัน
 * ไม่สามารถเพิ่ม Admin Product ตัวเดิมซ้ำได้
 */
SellerProductSchema.index(
    {
        sellerId: 1,
        adminProductId: 1
    },
    {
        unique: true
    }
);


module.exports =
    mongoose.model(
        "SellerProduct",
        SellerProductSchema
    );