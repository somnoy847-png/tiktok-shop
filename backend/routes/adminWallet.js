const express = require("express");

const User = require("../models/User");
const WalletAccount = require("../models/WalletAccount");
const WalletTransaction = require("../models/WalletTransaction");

const authenticateToken =
    require("../middleware/authMiddleware");

const requireAdmin =
    require("../middleware/adminMiddleware");

const router = express.Router();


// =====================================================
// ADMIN AUTH
// =====================================================

router.use(
    authenticateToken,
    requireAdmin
);


// =====================================================
// GET ALL WALLET TRANSACTIONS
// GET /api/admin/wallet/transactions
// =====================================================

router.get(
    "/transactions",
    async (req, res) => {

        try {

            const transactions =
                await WalletTransaction.find()
                    .populate(
                        "userId",
                        "username shopName displayName contact accountType role"
                    )
                    .populate(
                        "walletAccountId"
                    )
                    .populate(
                        "reviewedBy",
                        "username displayName"
                    )
                    .sort({
                        createdAt: -1
                    });


            return res.json({

                success: true,

                count:
                    transactions.length,

                transactions

            });

        }

        catch (error) {

            console.error(
                "Admin get wallet transactions error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to get wallet transactions."

            });

        }

    }
);


// =====================================================
// GET PENDING DEPOSITS
// GET /api/admin/wallet/deposits/pending
// =====================================================

router.get(
    "/deposits/pending",
    async (req, res) => {

        try {

            const transactions =
                await WalletTransaction.find({

                    type:
                        "deposit",

                    status: {
                        $in: [
                            "pending",
                            "account_assigned",
                            "awaiting_slip",
                            "under_review"
                        ]
                    }

                })
                .populate(
                    "userId",
                    "username shopName displayName contact"
                )
                .sort({
                    createdAt: -1
                });


            return res.json({

                success: true,

                count:
                    transactions.length,

                transactions

            });

        }

        catch (error) {

            console.error(
                "Admin get pending deposits error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to get pending deposits."

            });

        }

    }
);


// =====================================================
// GET PENDING WITHDRAWALS
// GET /api/admin/wallet/withdrawals/pending
// =====================================================

router.get(
    "/withdrawals/pending",
    async (req, res) => {

        try {

            const transactions =
                await WalletTransaction.find({

                    type:
                        "withdrawal",

                    status:
                        "pending"

                })
                .populate(
                    "userId",
                    "username shopName displayName contact"
                )
                .populate(
                    "walletAccountId"
                )
                .sort({
                    createdAt: -1
                });


            return res.json({

                success: true,

                count:
                    transactions.length,

                transactions

            });

        }

        catch (error) {

            console.error(
                "Admin get pending withdrawals error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to get pending withdrawals."

            });

        }

    }
);


// =====================================================
// GET SINGLE TRANSACTION
// GET /api/admin/wallet/transactions/:id
// =====================================================

router.get(
    "/transactions/:id",
    async (req, res) => {

        try {

            const transaction =
                await WalletTransaction.findById(
                    req.params.id
                )
                .populate(
                    "userId",
                    "username shopName displayName contact accountType role"
                )
                .populate(
                    "walletAccountId"
                )
                .populate(
                    "reviewedBy",
                    "username displayName"
                );


            if (!transaction) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Transaction not found."

                });

            }


            return res.json({

                success: true,

                transaction

            });

        }

        catch (error) {

            console.error(
                "Admin get transaction error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to get transaction."

            });

        }

    }
);


// =====================================================
// ASSIGN ADMIN PAYMENT ACCOUNT
// POST /api/admin/wallet/deposits/:id/account
// =====================================================
//
// Admin ใช้ส่งข้อมูลบัญชีธนาคาร / Crypto
// ให้ผู้ใช้สำหรับการฝากเงิน
//
// =====================================================

router.post(
    "/deposits/:id/account",
    async (req, res) => {

        try {

            const transaction =
                await WalletTransaction.findById(
                    req.params.id
                );


            if (!transaction) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Deposit transaction not found."

                });

            }


            if (
                transaction.type !==
                "deposit"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "This transaction is not a deposit."

                });

            }


            if (
                transaction.status ===
                "completed"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "This deposit has already been completed."

                });

            }


            const method =
                req.body.method;


            if (
                ![
                    "bank",
                    "crypto"
                ].includes(
                    method
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid payment method."

                });

            }


            let adminAccount = {};


            // =================================================
            // BANK
            // =================================================

            if (
                method ===
                "bank"
            ) {

                if (
                    !req.body.bankName ||
                    !req.body.accountName ||
                    !req.body.accountNumber
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Please provide bank name, account name and account number."

                    });

                }


                adminAccount = {

                    bankName:
                        String(
                            req.body.bankName
                        ).trim(),

                    accountName:
                        String(
                            req.body.accountName
                        ).trim(),

                    accountNumber:
                        String(
                            req.body.accountNumber
                        ).trim(),

                    branch:
                        String(
                            req.body.branch || ""
                        ).trim(),

                    network:
                        "",

                    walletAddress:
                        ""

                };

            }


            // =================================================
            // CRYPTO
            // =================================================

            if (
                method ===
                "crypto"
            ) {

                if (
                    !req.body.network ||
                    !req.body.walletAddress
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Please provide crypto network and wallet address."

                    });

                }


                adminAccount = {

                    bankName:
                        "",

                    accountName:
                        "",

                    accountNumber:
                        "",

                    branch:
                        "",

                    network:
                        String(
                            req.body.network
                        ).trim(),

                    walletAddress:
                        String(
                            req.body.walletAddress
                        ).trim()

                };

            }


            transaction.adminAccount =
                adminAccount;


            transaction.method =
                method;


            transaction.status =
                "account_assigned";


            transaction.adminNote =
                String(
                    req.body.note || ""
                ).trim();


            await transaction.save();


            return res.json({

                success: true,

                message:
                    "Payment account sent to user successfully.",

                transaction

            });

        }

        catch (error) {

            console.error(
                "Admin assign payment account error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to assign payment account."

            });

        }

    }
);


// =====================================================
// APPROVE DEPOSIT
// POST /api/admin/wallet/deposits/:id/approve
// =====================================================
//
// เงินจะเข้า User.balance ตรงนี้เท่านั้น
//
// =====================================================

router.post(
    "/deposits/:id/approve",
    async (req, res) => {

        try {

            const transaction =
                await WalletTransaction.findById(
                    req.params.id
                );


            if (!transaction) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Deposit transaction not found."

                });

            }


            if (
                transaction.type !==
                "deposit"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "This transaction is not a deposit."

                });

            }


            if (
                transaction.status ===
                "completed"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "This deposit has already been completed."

                });

            }


            if (
                transaction.status !==
                "under_review"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Deposit must have a submitted slip before approval."

                });

            }


            const user =
                await User.findById(
                    transaction.userId
                );


            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found."

                });

            }


            const balanceBefore =
                Number(
                    user.balance || 0
                );


            const amount =
                Number(
                    transaction.amount
                );


            const balanceAfter =
                balanceBefore +
                amount;


            // =================================================
            // UPDATE USER BALANCE
            // =================================================

            user.balance =
                balanceAfter;


            user.totalAssets =
                balanceAfter;


            user.totalDeposited =
                Number(
                    user.totalDeposited || 0
                ) +
                amount;


            user.pendingAmount =
                Math.max(
                    0,
                    Number(
                        user.pendingAmount || 0
                    ) -
                    amount
                );


            await user.save();


            // =================================================
            // UPDATE TRANSACTION
            // =================================================

            transaction.balanceBefore =
                balanceBefore;


            transaction.balanceAfter =
                balanceAfter;


            transaction.status =
                "completed";


            transaction.reviewedBy =
                req.user.id;


            transaction.reviewedAt =
                new Date();


            transaction.completedAt =
                new Date();


            transaction.adminNote =
                String(
                    req.body.note || ""
                ).trim();


            await transaction.save();


            return res.json({

                success: true,

                message:
                    "Deposit approved. Money has been added to user's wallet.",

                transaction,

                wallet: {

                    balance:
                        balanceAfter

                }

            });

        }

        catch (error) {

            console.error(
                "Admin approve deposit error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to approve deposit."

            });

        }

    }
);


// =====================================================
// REJECT DEPOSIT
// POST /api/admin/wallet/deposits/:id/reject
// =====================================================

router.post(
    "/deposits/:id/reject",
    async (req, res) => {

        try {

            const transaction =
                await WalletTransaction.findById(
                    req.params.id
                );


            if (!transaction) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Deposit transaction not found."

                });

            }


            if (
                transaction.type !==
                "deposit"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "This transaction is not a deposit."

                });

            }


            if (
                transaction.status ===
                "completed"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Completed deposit cannot be rejected."

                });

            }


            transaction.status =
                "rejected";


            transaction.reviewedBy =
                req.user.id;


            transaction.reviewedAt =
                new Date();


            transaction.adminNote =
                String(
                    req.body.note ||
                    "Deposit rejected by admin."
                ).trim();


            await transaction.save();


            return res.json({

                success: true,

                message:
                    "Deposit rejected.",

                transaction

            });

        }

        catch (error) {

            console.error(
                "Admin reject deposit error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to reject deposit."

            });

        }

    }
);


// =====================================================
// APPROVE WITHDRAWAL
// POST /api/admin/wallet/withdrawals/:id/approve
// =====================================================
//
// เงินจะถูกหักจริงตรงนี้
//
// =====================================================

router.post(
    "/withdrawals/:id/approve",
    async (req, res) => {

        try {

            const transaction =
                await WalletTransaction.findById(
                    req.params.id
                );


            if (!transaction) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Withdrawal transaction not found."

                });

            }


            if (
                transaction.type !==
                "withdrawal"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "This transaction is not a withdrawal."

                });

            }


            if (
                transaction.status !==
                "pending"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "This withdrawal has already been processed."

                });

            }


            const user =
                await User.findById(
                    transaction.userId
                );


            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found."

                });

            }


            const balanceBefore =
                Number(
                    user.balance || 0
                );


            const amount =
                Number(
                    transaction.amount
                );


            // =================================================
            // CHECK BALANCE AGAIN
            // =================================================

            if (
                balanceBefore <
                amount
            ) {

                transaction.status =
                    "rejected";


                transaction.reviewedBy =
                    req.user.id;


                transaction.reviewedAt =
                    new Date();


                transaction.adminNote =
                    "Insufficient wallet balance.";


                await transaction.save();


                return res.status(400).json({

                    success: false,

                    message:
                        "User wallet balance is insufficient."

                });

            }


            const balanceAfter =
                balanceBefore -
                amount;


            // =================================================
            // UPDATE USER BALANCE
            // =================================================

            user.balance =
                balanceAfter;


            user.totalAssets =
                balanceAfter;


            user.totalWithdrawn =
                Number(
                    user.totalWithdrawn || 0
                ) +
                amount;


            user.pendingAmount =
                Math.max(
                    0,
                    Number(
                        user.pendingAmount || 0
                    ) -
                    amount
                );


            await user.save();


            // =================================================
            // UPDATE TRANSACTION
            // =================================================

            transaction.balanceBefore =
                balanceBefore;


            transaction.balanceAfter =
                balanceAfter;


            transaction.status =
                "completed";


            transaction.reviewedBy =
                req.user.id;


            transaction.reviewedAt =
                new Date();


            transaction.completedAt =
                new Date();


            transaction.adminNote =
                String(
                    req.body.note || ""
                ).trim();


            await transaction.save();


            return res.json({

                success: true,

                message:
                    "Withdrawal approved. Money has been deducted from user's wallet.",

                transaction,

                wallet: {

                    balance:
                        balanceAfter

                }

            });

        }

        catch (error) {

            console.error(
                "Admin approve withdrawal error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to approve withdrawal."

            });

        }

    }
);


// =====================================================
// REJECT WITHDRAWAL
// POST /api/admin/wallet/withdrawals/:id/reject
// =====================================================

router.post(
    "/withdrawals/:id/reject",
    async (req, res) => {

        try {

            const transaction =
                await WalletTransaction.findById(
                    req.params.id
                );


            if (!transaction) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Withdrawal transaction not found."

                });

            }


            if (
                transaction.type !==
                "withdrawal"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "This transaction is not a withdrawal."

                });

            }


            if (
                transaction.status !==
                "pending"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "This withdrawal has already been processed."

                });

            }


            transaction.status =
                "rejected";


            transaction.reviewedBy =
                req.user.id;


            transaction.reviewedAt =
                new Date();


            transaction.adminNote =
                String(
                    req.body.note ||
                    "Withdrawal rejected by admin."
                ).trim();


            await transaction.save();


            return res.json({

                success: true,

                message:
                    "Withdrawal rejected.",

                transaction

            });

        }

        catch (error) {

            console.error(
                "Admin reject withdrawal error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to reject withdrawal."

            });

        }

    }
);


// =====================================================
// EXPORT
// =====================================================

module.exports =
    router;