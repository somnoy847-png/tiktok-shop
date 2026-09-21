require("dotenv").config();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TOKEN) {
    console.error("❌ ไม่พบ TELEGRAM_BOT_TOKEN");
    process.exit(1);
}

async function getChatId() {
    try {
        console.log("");
        console.log("================================");
        console.log("กำลังรอข้อความจาก Telegram...");
        console.log("================================");
        console.log("");
        console.log("ให้ไปที่ @loan_system_bot");
        console.log("แล้วส่งข้อความ: test123");
        console.log("");
        console.log("รอประมาณ 30 วินาที...");
        console.log("");

        const url =
            `https://api.telegram.org/bot${TOKEN}/getUpdates?timeout=30&allowed_updates=%5B%22message%22%5D`;

        const response = await fetch(url);

        const data = await response.json();

        if (!data.ok) {
            console.error("❌ Telegram API Error");
            console.error(data);
            return;
        }

        if (!data.result || data.result.length === 0) {
            console.log("❌ ยังไม่ได้รับข้อความ");
            console.log("");
            console.log("ลองรันคำสั่งอีกครั้ง แล้วส่ง test123");
            return;
        }

        console.log("");
        console.log("================================");
        console.log("🎉 พบข้อความจาก Telegram");
        console.log("================================");
        console.log("");

        for (const update of data.result) {

            const message = update.message;

            if (!message || !message.chat) {
                continue;
            }

            console.log("Chat ID:", message.chat.id);
            console.log("Chat Type:", message.chat.type);

            if (message.chat.username) {
                console.log(
                    "Username:",
                    "@" + message.chat.username
                );
            }

            if (message.chat.first_name) {
                console.log(
                    "ชื่อ:",
                    message.chat.first_name
                );
            }

            console.log(
                "ข้อความ:",
                message.text || "(ไม่มีข้อความ)"
            );

            console.log("");
            console.log("================================");
            console.log("ให้นำตัวเลขนี้ไปใส่ใน .env");
            console.log("================================");
            console.log("");
            console.log(
                `TELEGRAM_CHAT_ID=${message.chat.id}`
            );
            console.log("");
        }

    } catch (error) {
        console.error("");
        console.error("❌ เกิดข้อผิดพลาด");
        console.error(error.message);
    }
}

getChatId();