const mongoose = require("mongoose");


const OrderSchema = new mongoose.Schema(
    {
        /*
        =========================================================
        ORDER IDENTIFICATION
        =========================================================
        */

        orderId: {
            type: String,
            required: true,
            unique: true,
            index: true
        },


        /*
        =========================================================
        BUYER
        =========================================================
        */

        buyerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        buyerUsername: {
            type: String,
            default: "",
            trim: true
        },

        buyerName: {
            type: String,
            default: "",
            trim: true
        },

        buyerContact: {
            type: String,
            default: "",
            trim: true
        },


        /*
        =========================================================
        SELLER
        =========================================================
        */

        sellerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        sellerUsername: {
            type: String,
            default: "",
            trim: true
        },

        shopName: {
            type: String,
            default: "",
            trim: true
        },


        /*
        =========================================================
        PRODUCT
        =========================================================
        */

        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SellerProduct",
            required: true,
            index: true
        },

        adminProductId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            default: null
        },

        productName: {
            type: String,
            required: true,
            trim: true
        },

        productImage: {
            type: String,
            default: ""
        },

        category: {
            type: String,
            default: "",
            trim: true
        },


        /*
        =========================================================
        PRICE
        =========================================================
        */

        quantity: {
            type: Number,
            required: true,
            min: 1,
            default: 1
        },

        unitPrice: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },

        costPrice: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },

        subtotal: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },

        profit: {
            type: Number,
            required: true,
            default: 0
        },


        /*
        =========================================================
        PAYMENT
        =========================================================
        */

        paymentMethod: {
            type: String,

            enum: [
                "wallet",
                "seller_wallet",
                "bank",
                "crypto",
                "cod",
                "other"
            ],

            default: "wallet"
        },

        paymentStatus: {
            type: String,

            enum: [
                "pending",
                "paid",
                "failed",
                "refunded",
                "cancelled"
            ],

            default: "pending"
        },

        paidAt: {
            type: Date,
            default: null
        },


        /*
        =========================================================
        ORDER STATUS
        =========================================================
        */

        status: {
            type: String,

            enum: [
                "pending",
                "confirmed",
                "processing",
                "shipping",
                "completed",
                "cancelled",
                "refunded"
            ],

            default: "pending",

            index: true
        },


        /*
        =========================================================
        SHIPPING
        =========================================================
        */

        shippingAddress: {
            type: String,
            default: "",
            trim: true
        },

        shippingPhone: {
            type: String,
            default: "",
            trim: true
        },

        trackingNumber: {
            type: String,
            default: "",
            trim: true
        },

        courier: {
            type: String,
            default: "",
            trim: true
        },


        /*
        =========================================================
        NOTES
        =========================================================
        */

        buyerNote: {
            type: String,
            default: "",
            trim: true
        },

        sellerNote: {
            type: String,
            default: "",
            trim: true
        },

        adminNote: {
            type: String,
            default: "",
            trim: true
        },


        /*
        =========================================================
        STATUS HISTORY
        =========================================================
        */

        statusHistory: [
            {
                status: {
                    type: String,
                    required: true
                },

                changedBy: {
                    type: String,
                    default: ""
                },

                note: {
                    type: String,
                    default: ""
                },

                changedAt: {
                    type: Date,
                    default: Date.now
                }
            }
        ],


        /*
        =========================================================
        CANCEL / REFUND
        =========================================================
        */

        cancelledAt: {
            type: Date,
            default: null
        },

        cancelReason: {
            type: String,
            default: "",
            trim: true
        },

        refundedAt: {
            type: Date,
            default: null
        },

        refundAmount: {
            type: Number,
            default: 0,
            min: 0
        }
    },

    {
        timestamps: true
    }
);


/*
=========================================================
INDEXES
=========================================================
*/

OrderSchema.index({
    buyerId: 1,
    createdAt: -1
});

OrderSchema.index({
    sellerId: 1,
    createdAt: -1
});

OrderSchema.index({
    status: 1,
    createdAt: -1
});

OrderSchema.index({
    paymentStatus: 1,
    createdAt: -1
});


/*
=========================================================
GENERATE ORDER ID
=========================================================
*/

OrderSchema.pre(
    "validate",
    function() {

        if (!this.orderId) {

            const timestamp =
                Date.now()
                    .toString(36)
                    .toUpperCase();

            const random =
                Math.random()
                    .toString(36)
                    .substring(2, 8)
                    .toUpperCase();

            this.orderId =
                `TS-${timestamp}-${random}`;
        }
    }
);


/*
=========================================================
CALCULATE TOTALS
=========================================================
*/

OrderSchema.pre(
    "validate",
    function() {

        const quantity =
            Number(
                this.quantity || 0
            );

        const unitPrice =
            Number(
                this.unitPrice || 0
            );

        const costPrice =
            Number(
                this.costPrice || 0
            );

        this.subtotal =
            quantity * unitPrice;

        this.profit =
            quantity *
            (unitPrice - costPrice);
    }
);


module.exports =
    mongoose.model(
        "Order",
        OrderSchema
    );