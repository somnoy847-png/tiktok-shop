const express = require("express");

const User = require("../models/User");
const WalletAccount = require("../models/WalletAccount");
const WalletTransaction = require("../models/WalletTransaction");

const authenticateToken =
    require("../middleware/authMiddleware");


// =====================================================
// TELEGRAM WALLET NOTIFICATIONS
// =====================================================

const {
    notifyDepositAccountRequest,
    notifyWithdrawalRequest
} = require("../services/telegram");


const router = express.Router();


// =====================================================
// HELPERS
// =====================================================

function createTransactionId(prefix) {

    const timestamp =
        Date.now().toString(36).toUpperCase();

    const random =
        Math.random()
            .toString(36)
            .substring(2, 8)
            .toUpperCase();

    return `${prefix}-${timestamp}-${random}`;
}


function cleanString(value) {

    if (
        value === undefined ||
        value === null
    ) {

        return "";

    }

    return String(value).trim();

}


// =====================================================
// GET WALLET SUMMARY
// GET /api/wallet
// =====================================================

router.get(
    "/",
    authenticateToken,
    async (req, res) => {

        try {

            const user =
                await User.findById(
                    req.user.id
                );


            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found."

                });

            }


            return res.json({

                success: true,

                wallet: {

                    balance:
                        Number(
                            user.balance || 0
                        ),

                    totalAssets:
                        Number(
                            user.totalAssets || 0
                        ),

                    pendingAmount:
                        Number(
                            user.pendingAmount || 0
                        ),

                    totalDeposited:
                        Number(
                            user.totalDeposited || 0
                        ),

                    totalWithdrawn:
                        Number(
                            user.totalWithdrawn || 0
                        )

                }

            });

        }

        catch (error) {

            console.error(
                "Get wallet error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to get wallet."

            });

        }

    }
);


// =====================================================
// GET MY WITHDRAWAL / PAYMENT ACCOUNTS
// GET /api/wallet/accounts
// =====================================================

router.get(
    "/accounts",
    authenticateToken,
    async (req, res) => {

        try {

            const accounts =
                await WalletAccount.find({

                    userId:
                        req.user.id,

                    status:
                        "active"

                })
                .sort({
                    createdAt: -1
                });


            return res.json({

                success: true,

                count:
                    accounts.length,

                accounts

            });

        }

        catch (error) {

            console.error(
                "Get wallet accounts error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to get wallet accounts."

            });

        }

    }
);


// =====================================================
// ADD BANK ACCOUNT
// POST /api/wallet/accounts/bank
// =====================================================

router.post(
    "/accounts/bank",
    authenticateToken,
    async (req, res) => {

        try {

            const bankName =
                cleanString(
                    req.body.bankName
                );

            const accountName =
                cleanString(
                    req.body.accountName
                );

            const accountNumber =
                cleanString(
                    req.body.accountNumber
                );

            const branch =
                cleanString(
                    req.body.branch
                );

            const label =
                cleanString(
                    req.body.label
                );


            if (
                !bankName ||
                !accountName ||
                !accountNumber
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please provide bank name, account name and account number."

                });

            }


            const account =
                await WalletAccount.create({

                    userId:
                        req.user.id,

                    type:
                        "bank",

                    label:
                        label ||
                        `${bankName} Bank`,

                    bankName,

                    accountName,

                    accountNumber,

                    branch,

                    status:
                        "active"

                });


            return res.status(201).json({

                success: true,

                message:
                    "Bank account added successfully.",

                account

            });

        }

        catch (error) {

            console.error(
                "Add bank account error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to add bank account."

            });

        }

    }
);


// =====================================================
// ADD CRYPTO WALLET
// POST /api/wallet/accounts/crypto
// =====================================================

router.post(
    "/accounts/crypto",
    authenticateToken,
    async (req, res) => {

        try {

            const network =
                cleanString(
                    req.body.network
                );

            const walletAddress =
                cleanString(
                    req.body.walletAddress
                );

            const label =
                cleanString(
                    req.body.label
                );


            if (
                !network ||
                !walletAddress
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please provide crypto network and wallet address."

                });

            }


            const account =
                await WalletAccount.create({

                    userId:
                        req.user.id,

                    type:
                        "crypto",

                    label:
                        label ||
                        `${network} Wallet`,

                    network,

                    walletAddress,

                    status:
                        "active"

                });


            return res.status(201).json({

                success: true,

                message:
                    "Crypto wallet added successfully.",

                account

            });

        }

        catch (error) {

            console.error(
                "Add crypto wallet error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to add crypto wallet."

            });

        }

    }
);


// =====================================================
// DELETE ACCOUNT
// DELETE /api/wallet/accounts/:id
// =====================================================

router.delete(
    "/accounts/:id",
    authenticateToken,
    async (req, res) => {

        try {

            const account =
                await WalletAccount.findOneAndUpdate(

                    {
                        _id:
                            req.params.id,

                        userId:
                            req.user.id

                    },

                    {
                        status:
                            "inactive"
                    },

                    {
                        new: true
                    }

                );


            if (!account) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Wallet account not found."

                });

            }


            return res.json({

                success: true,

                message:
                    "Wallet account removed successfully."

            });

        }

        catch (error) {

            console.error(
                "Delete wallet account error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to remove wallet account."

            });

        }

    }
);


// =====================================================
// CREATE DEPOSIT REQUEST
// POST /api/wallet/deposit
// =====================================================
//
// สำคัญ:
// เงินยังไม่เข้า balance ตอนสร้างรายการ
//
// Flow:
//
// pending
//    ↓
// account_assigned
//    ↓
// awaiting_slip
//    ↓
// under_review
//    ↓
// completed
//
// =====================================================

router.post(
    "/deposit",
    authenticateToken,
    async (req, res) => {

        try {

            const amount =
                Number(
                    req.body.amount
                );

            const method =
                cleanString(
                    req.body.method
                )
                .toLowerCase();


            if (
                !Number.isFinite(amount) ||
                amount <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Deposit amount must be greater than 0."

                });

            }


            if (
                amount > 1000000
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Deposit amount is too large."

                });

            }


            if (
                ![
                    "bank",
                    "crypto"
                ].includes(method)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid deposit method."

                });

            }


            const transactionId =
                createTransactionId(
                    "DP"
                );


            const transaction =
                await WalletTransaction.create({

                    userId:
                        req.user.id,

                    transactionId,

                    type:
                        "deposit",

                    method,

                    amount,

                    currency:
                        cleanString(
                            req.body.currency
                        ) ||
                        "USD",

                    network:
                        cleanString(
                            req.body.network
                        ),

                    status:
                        "pending",

                    userNote:
                        cleanString(
                            req.body.note
                        )

                });

                // =====================================================
// TELEGRAM - DEPOSIT ACCOUNT REQUEST
// =====================================================

notifyDepositAccountRequest({

    userId:
        req.user.id,

    transaction

}).catch((telegramError) => {

    console.error(
        "Telegram deposit request notification error:",
        telegramError.message
    );

});


            return res.status(201).json({

                success: true,

                message:
                    "Deposit request created. Waiting for admin payment account.",

                transaction

            });

        }

        catch (error) {

            console.error(
                "Create deposit error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to create deposit request."

            });

        }

    }
);


// =====================================================
// UPLOAD / SUBMIT DEPOSIT SLIP
// POST /api/wallet/deposit/:transactionId/slip
// =====================================================
//
// ตอนนี้รับ slip URL ก่อน
// ระบบ Upload จริงสามารถเชื่อมกับ /uploads ภายหลัง
//
// =====================================================

router.post(
    "/deposit/:transactionId/slip",
    authenticateToken,
    async (req, res) => {

        try {

            const slipUrl =
                cleanString(
                    req.body.url
                );

            const filename =
                cleanString(
                    req.body.filename
                );


            if (!slipUrl) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Payment slip is required."

                });

            }


            const transaction =
                await WalletTransaction.findOne({

                    transactionId:
                        req.params.transactionId,

                    userId:
                        req.user.id,

                    type:
                        "deposit"

                });


            if (!transaction) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Deposit transaction not found."

                });

            }


            if (
                ![
                    "account_assigned",
                    "awaiting_slip"
                ].includes(
                    transaction.status
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "This deposit is not waiting for a payment slip."

                });

            }


            transaction.slip = {

                url:
                    slipUrl,

                filename,

                uploadedAt:
                    new Date()

            };


            transaction.status =
                "under_review";


            await transaction.save();


            return res.json({

                success: true,

                message:
                    "Payment slip submitted. Waiting for admin review.",

                transaction

            });

        }

        catch (error) {

            console.error(
                "Submit deposit slip error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to submit payment slip."

            });

        }

    }
);


// =====================================================
// CREATE WITHDRAWAL REQUEST
// POST /api/wallet/withdraw
// =====================================================
//
// สำคัญ:
// ตอนสร้างคำขอ เงินยังไม่ถูกหัก
//
// Admin ต้องตรวจสอบและ Approve ก่อน
//
// =====================================================

router.post(
    "/withdraw",
    authenticateToken,
    async (req, res) => {

        try {

            const amount =
                Number(
                    req.body.amount
                );

            const walletAccountId =
                cleanString(
                    req.body.walletAccountId
                );


            if (
                !Number.isFinite(amount) ||
                amount <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Withdrawal amount must be greater than 0."

                });

            }


            if (!walletAccountId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please select a withdrawal account."

                });

            }


            const account =
                await WalletAccount.findOne({

                    _id:
                        walletAccountId,

                    userId:
                        req.user.id,

                    status:
                        "active"

                });


            if (!account) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Withdrawal account not found."

                });

            }


            const user =
                await User.findById(
                    req.user.id
                );


            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found."

                });

            }


            const balance =
                Number(
                    user.balance || 0
                );


            if (
                balance < amount
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Insufficient wallet balance."

                });

            }


            const transactionId =
                createTransactionId(
                    "WD"
                );


            const transaction =
                await WalletTransaction.create({

                    userId:
                        req.user.id,

                    transactionId,

                    type:
                        "withdrawal",

                    method:
                        account.type,

                    amount,

                    currency:
                        cleanString(
                            req.body.currency
                        ) ||
                        "USD",

                    network:
                        account.network || "",

                    walletAccountId:
                        account._id,

                    status:
                        "pending",

                    userNote:
                        cleanString(
                            req.body.note
                        )

                });

                // =====================================================
// TELEGRAM - WITHDRAWAL REQUEST
// =====================================================

notifyWithdrawalRequest({

    userId:
        req.user.id,

    transaction,

    account

}).catch((telegramError) => {

    console.error(
        "Telegram withdrawal request notification error:",
        telegramError.message
    );

});


            return res.status(201).json({

                success: true,

                message:
                    "Withdrawal request created. Waiting for admin review.",

                transaction,

                balance:

                    balance

            });

        }

        catch (error) {

            console.error(
                "Create withdrawal error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to create withdrawal request."

            });

        }

    }
);


// =====================================================
// GET TRANSACTION HISTORY
// GET /api/wallet/transactions
// =====================================================

router.get(
    "/transactions",
    authenticateToken,
    async (req, res) => {

        try {

            const transactions =
                await WalletTransaction.find({

                    userId:
                        req.user.id

                })
                .populate(
                    "walletAccountId"
                )
                .sort({
                    createdAt: -1
                })
                .limit(100);


            return res.json({

                success: true,

                count:
                    transactions.length,

                transactions

            });

        }

        catch (error) {

            console.error(
                "Get wallet transactions error:",
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
// GET SINGLE TRANSACTION
// GET /api/wallet/transactions/:transactionId
// =====================================================

router.get(
    "/transactions/:transactionId",
    authenticateToken,
    async (req, res) => {

        try {

            const transaction =
                await WalletTransaction.findOne({

                    transactionId:
                        req.params.transactionId,

                    userId:
                        req.user.id

                })
                .populate(
                    "walletAccountId"
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
                "Get transaction error:",
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


module.exports =
    router;