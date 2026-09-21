const fs = require("fs");
const path = require("path");

const Notification =
    require("../models/Notification");

const User =
    require("../models/User");


/*
=========================================================
HELPERS
=========================================================
*/

function cleanText(value) {

    return String(
        value ?? ""
    ).trim();

}


/*
=========================================================
SAVE IMAGE
=========================================================
*/

async function saveNotificationImage(
    imageData
) {

    if (!imageData) {

        return "";

    }


    const value =
        String(imageData);


    /*
    -----------------------------------------
    ตรวจสอบ Data URL
    -----------------------------------------
    */

    const match =
        value.match(
            /^data:image\/(png|jpeg|jpg|webp|gif);base64,(.+)$/i
        );


    if (!match) {

        throw new Error(
            "Invalid notification image format."
        );

    }


    const extension =
        match[1]
            .toLowerCase()
            .replace(
                "jpeg",
                "jpg"
            );


    const base64Data =
        match[2];


    /*
    -----------------------------------------
    ตรวจขนาด
    สูงสุด 5 MB
    -----------------------------------------
    */

    const buffer =
        Buffer.from(
            base64Data,
            "base64"
        );


    if (
        buffer.length >
        5 * 1024 * 1024
    ) {

        throw new Error(
            "Notification image is too large. Maximum size is 5MB."
        );

    }


    /*
    -----------------------------------------
    Folder
    -----------------------------------------
    */

    const uploadDirectory =
        path.join(
            __dirname,
            "../../uploads/notifications"
        );


    if (
        !fs.existsSync(
            uploadDirectory
        )
    ) {

        fs.mkdirSync(
            uploadDirectory,
            {
                recursive: true
            }
        );

    }


    /*
    -----------------------------------------
    Filename
    -----------------------------------------
    */

    const fileName =
        `notification-${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 10)}.${extension}`;


    const filePath =
        path.join(
            uploadDirectory,
            fileName
        );


    await fs.promises.writeFile(
        filePath,
        buffer
    );


    return (
        `/uploads/notifications/${fileName}`
    );

}


/*
=========================================================
CREATE NOTIFICATION
=========================================================
*/

async function createNotification({
    recipientId,
    senderId = null,
    senderType = "system",
    type = "manual",
    title,
    message = "",
    imageUrl = "",
    linkUrl = "",
    data = null
}) {

    if (!recipientId) {

        throw new Error(
            "recipientId is required."
        );

    }


    const user =
        await User.findById(
            recipientId
        )
        .select("_id");


    if (!user) {

        throw new Error(
            "Notification recipient not found."
        );

    }


    const cleanTitle =
        cleanText(title);


    if (!cleanTitle) {

        throw new Error(
            "Notification title is required."
        );

    }


    const notification =
        await Notification.create({

            recipientId:

                recipientId,

            senderId:

                senderId,

            senderType:

                senderType,

            type:

                type,

            title:

                cleanTitle,

            message:

                cleanText(message),

            imageUrl:

                cleanText(imageUrl),

            linkUrl:

                cleanText(linkUrl),

            data:

                data

        });


    return notification;

}


/*
=========================================================
CREATE ADMIN NOTIFICATION
=========================================================
*/

async function createAdminNotification({
    adminId,
    recipientId,
    title,
    message = "",
    imageData = "",
    linkUrl = "",
    type = "manual",
    data = null
}) {

    let imageUrl = "";


    if (imageData) {

        imageUrl =
            await saveNotificationImage(
                imageData
            );

    }


    return createNotification({

        recipientId,

        senderId:
            adminId,

        senderType:
            "admin",

        type,

        title,

        message,

        imageUrl,

        linkUrl,

        data

    });

}


/*
=========================================================
CREATE SYSTEM NOTIFICATION
=========================================================
*/

async function createSystemNotification({
    recipientId,
    type,
    title,
    message = "",
    imageUrl = "",
    linkUrl = "",
    data = null
}) {

    return createNotification({

        recipientId,

        senderId:
            null,

        senderType:
            "system",

        type,

        title,

        message,

        imageUrl,

        linkUrl,

        data

    });

}


/*
=========================================================
ORDER NEW
=========================================================
*/

async function notifyNewOrder({
    recipientId,
    order
}) {

    return createSystemNotification({

        recipientId,

        type:
            "order_new",

        title:
            "มีคำสั่งซื้อใหม่",

        message:
            `คุณมีคำสั่งซื้อใหม่ ${order?._id ? `#${order._id}` : ""}`,

        linkUrl:
            "seller-orders.html",

        data: {

            orderId:
                order?._id || null

        }

    });

}


/*
=========================================================
DEPOSIT SUCCESS
=========================================================
*/

async function notifyDepositSuccess({
    recipientId,
    amount,
    transactionId
}) {

    return createSystemNotification({

        recipientId,

        type:
            "deposit_success",

        title:
            "เติมเงินสำเร็จ",

        message:
            `เติมเงินจำนวน $${Number(amount || 0).toFixed(2)} เข้ากระเป๋าเงินสำเร็จ`,

        linkUrl:
            "account.html",

        data: {

            transactionId:
                transactionId || null,

            amount:
                Number(amount || 0)

        }

    });

}


/*
=========================================================
WITHDRAWAL SUCCESS
=========================================================
*/

async function notifyWithdrawalSuccess({
    recipientId,
    amount,
    transactionId
}) {

    return createSystemNotification({

        recipientId,

        type:
            "withdrawal_success",

        title:
            "ถอนเงินสำเร็จ",

        message:
            `การถอนเงินจำนวน $${Number(amount || 0).toFixed(2)} ดำเนินการสำเร็จ`,

        linkUrl:
            "account.html",

        data: {

            transactionId:
                transactionId || null,

            amount:
                Number(amount || 0)

        }

    });

}


/*
=========================================================
ORDER DELIVERED
=========================================================
*/

async function notifyOrderDelivered({
    recipientId,
    order
}) {

    return createSystemNotification({

        recipientId,

        type:
            "order_delivered",

        title:
            "ออเดอร์จัดส่งสำเร็จ",

        message:
            `คำสั่งซื้อ ${order?._id ? `#${order._id}` : ""} จัดส่งสำเร็จแล้ว`,

        linkUrl:
            "account.html",

        data: {

            orderId:
                order?._id || null

        }

    });

}


/*
=========================================================
EXPORT
=========================================================
*/

module.exports = {

    saveNotificationImage,

    createNotification,

    createAdminNotification,

    createSystemNotification,

    notifyNewOrder,

    notifyDepositSuccess,

    notifyWithdrawalSuccess,

    notifyOrderDelivered

};