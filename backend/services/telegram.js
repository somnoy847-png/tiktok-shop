const TELEGRAM_BOT_TOKEN =
    process.env.TELEGRAM_BOT_TOKEN;

const TELEGRAM_CHAT_ID =
    process.env.TELEGRAM_CHAT_ID;


function isTelegramConfigured() {

    return Boolean(
        TELEGRAM_BOT_TOKEN &&
        TELEGRAM_CHAT_ID
    );

}


async function sendTelegramMessage(text) {

    if (!isTelegramConfigured()) {

        console.warn(
            "⚠️ Telegram is not configured. Check TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env"
        );

        return false;

    }


    const safeText =
        String(text || "")
            .slice(0, 3900);


    const response =
        await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    chat_id:
                        TELEGRAM_CHAT_ID,

                    text:
                        safeText
                })
            }
        );


    const data =
        await response.json();


    if (
        !response.ok ||
        !data.ok
    ) {

        throw new Error(
            data.description ||
            `Telegram API error (${response.status})`
        );

    }


    return true;

}


async function getUserForNotification(
    userId
) {

    const User =
        require("../models/User");


    return User.findById(userId)
        .select(
            "username shopName contact"
        )
        .lean();

}


async function notifyNewUserMessage({
    userId,
    message
}) {

    const user =
        await getUserForNotification(
            userId
        );


    const shopName =
        user?.shopName ||
        user?.username ||
        "ไม่ทราบชื่อ";


    const username =
        user?.username ||
        "-";


    const contact =
        user?.contact ||
        "-";


    const messageText =
        String(
            message?.messageText ||
            ""
        ).trim();


    const text =
        [
            "🔔 มีข้อความใหม่จากผู้ใช้",
            "",
            `🏪 ร้าน/ชื่อ: ${shopName}`,
            `👤 Username: ${username}`,
            `📞 ติดต่อ: ${contact}`,
            "",
            "💬 ข้อความ:",
            messageText
        ].join("\n");


    return sendTelegramMessage(text);

}


async function notifyNewUserImage({
    userId
}) {

    const user =
        await getUserForNotification(
            userId
        );


    const shopName =
        user?.shopName ||
        user?.username ||
        "ไม่ทราบชื่อ";


    const username =
        user?.username ||
        "-";


    const text =
        [
            "🖼️ ผู้ใช้ส่งรูปภาพใหม่",
            "",
            `🏪 ร้าน/ชื่อ: ${shopName}`,
            `👤 Username: ${username}`,
            "",
            "📱 เปิดหน้า Admin Chat เพื่อดูรูปภาพและตอบกลับผู้ใช้"
        ].join("\n");


    return sendTelegramMessage(text);

}


// =====================================================
// WALLET - DEPOSIT ACCOUNT REQUEST
// =====================================================

async function notifyDepositAccountRequest({
    userId,
    transaction
}) {

    const user =
        await getUserForNotification(
            userId
        );

    const shopName =
        user?.shopName ||
        user?.username ||
        "ไม่ทราบชื่อ";

    const username =
        user?.username ||
        "-";

    const contact =
        user?.contact ||
        "-";

    const method =
        String(
            transaction?.method ||
            "-"
        ).toLowerCase();

    const methodText =
        method === "crypto"
            ? "Crypto"
            : "Bank Account";

    const amount =
        Number(
            transaction?.amount ||
            0
        ).toFixed(2);

    const currency =
        transaction?.currency ||
        "USD";

    const transactionId =
        transaction?.transactionId ||
        "-";

    const text = [
        "💰 มีคำขอค้นหาบัญชีสำหรับฝากเงิน",
        "",
        `🏪 ร้าน: ${shopName}`,
        `👤 Username: ${username}`,
        `📞 ติดต่อ: ${contact}`,
        "",
        `💵 จำนวนเงิน: $${amount}`,
        `🏦 ช่องทาง: ${methodText}`,
        `💱 Currency: ${currency}`,
        "",
        "🧾 Transaction ID:",
        transactionId,
        "",
        "⏳ สถานะ: รอ Admin จัดบัญชี"
    ].join("\n");

    return sendTelegramMessage(text);
}


// =====================================================
// WALLET - WITHDRAW REQUEST
// =====================================================

async function notifyWithdrawalRequest({
    userId,
    transaction,
    account
}) {

    const user =
        await getUserForNotification(
            userId
        );

    const shopName =
        user?.shopName ||
        user?.username ||
        "ไม่ทราบชื่อ";

    const username =
        user?.username ||
        "-";

    const contact =
        user?.contact ||
        "-";

    const amount =
        Number(
            transaction?.amount ||
            0
        ).toFixed(2);

    const currency =
        transaction?.currency ||
        "USD";

    const transactionId =
        transaction?.transactionId ||
        "-";

    let accountText = [];

    if (
        account?.type ===
        "bank"
    ) {

        accountText = [
            "🏦 บัญชีปลายทาง",
            "ประเภท: Bank Account",
            `ธนาคาร: ${account.bankName || "-"}`,
            `ชื่อบัญชี: ${account.accountName || "-"}`,
            `เลขบัญชี: ${account.accountNumber || "-"}`,
            `สาขา: ${account.branch || "-"}`
        ];

    }

    else {

        accountText = [
            "₿ บัญชีปลายทาง",
            "ประเภท: Crypto",
            `Network: ${account.network || "-"}`,
            `Wallet Address: ${account.walletAddress || "-"}`,
            `ชื่อบัญชี: ${account.label || "-"}`
        ];

    }

    const text = [
        "🚨 มีคำขอถอนเงินใหม่",
        "",
        `🏪 ร้าน: ${shopName}`,
        `👤 Username: ${username}`,
        `📞 ติดต่อ: ${contact}`,
        "",
        `💸 จำนวนถอน: $${amount}`,
        `💱 Currency: ${currency}`,
        "",
        ...accountText,
        "",
        "🧾 Transaction ID:",
        transactionId,
        "",
        "⏳ สถานะ: รอ Admin ตรวจสอบ"
    ].join("\n");

    return sendTelegramMessage(text);
}

module.exports = {

    isTelegramConfigured,

    sendTelegramMessage,

    notifyNewUserMessage,

    notifyNewUserImage,

    notifyDepositAccountRequest,

    notifyWithdrawalRequest

};