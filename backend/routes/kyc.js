const express = require("express");
const path = require("path");
const fs = require("fs");

const KYC = require("../models/KYC");

const authenticateToken =
    require("../middleware/authMiddleware");

const requireAdmin =
    require("../middleware/adminMiddleware");

const router =
    express.Router();


/*
=========================================================
HELPER
=========================================================
*/

function getUserId(req) {

    return (
        req.user?.id ||
        req.user?.userId ||
        null
    );

}


/*
=========================================================
CHECK OBJECT ID
=========================================================
*/

function isValidObjectId(id) {

    return /^[a-fA-F0-9]{24}$/.test(
        String(id || "")
    );

}


/*
=========================================================
GET KYC STATUS
=========================================================

GET

/api/kyc/status

ใช้โดย account.html

ผลลัพธ์:

unverified
pending
verified
=========================================================
*/

router.get(
    "/status",
    authenticateToken,
    async (req, res) => {

        try {

            const userId =
                getUserId(req);


            if (!userId) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Authentication required."

                });

            }


            const kyc =
                await KYC.findOne({
                    userId: userId
                });


            // -----------------------------------------
            // ยังไม่มี KYC
            // -----------------------------------------

            if (!kyc) {

                return res.json({

                    success: true,

                    status: "unverified"

                });

            }


            // -----------------------------------------
            // มี KYC แล้ว
            // -----------------------------------------

            return res.json({

                success: true,

                status:
                    kyc.status || "unverified"

            });

        }

        catch (error) {

            console.error(
                "KYC status error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "ไม่สามารถตรวจสอบสถานะ KYC ได้"

            });

        }

    }
);


/*
=========================================================
SUBMIT KYC
=========================================================

POST

/api/kyc/submit

ใช้โดย kyc.html

รับ:

fullName
idNumber
nationality
imageData
=========================================================
*/

router.post(
    "/submit",
    authenticateToken,
    async (req, res) => {

        try {

            const userId =
                getUserId(req);


            if (!userId) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Authentication required."

                });

            }


            // =================================================
            // READ DATA
            // =================================================

            const fullName =
                String(
                    req.body.fullName || ""
                ).trim();


            const idNumber =
                String(
                    req.body.idNumber || ""
                ).trim();


            const nationality =
                String(
                    req.body.nationality || ""
                ).trim();


            const imageData =
                String(
                    req.body.imageData || ""
                ).trim();


            // =================================================
            // VALIDATE FULL NAME
            // =================================================

            if (!fullName) {

                return res.status(400).json({

                    success: false,

                    message:
                        "กรุณากรอกชื่อและนามสกุล"

                });

            }


            if (fullName.length > 120) {

                return res.status(400).json({

                    success: false,

                    message:
                        "ชื่อและนามสกุลยาวเกินไป"

                });

            }


            // =================================================
            // VALIDATE ID NUMBER
            // =================================================

            if (!idNumber) {

                return res.status(400).json({

                    success: false,

                    message:
                        "กรุณากรอกเลขบัตรประชาชน"

                });

            }


            if (
                idNumber.length < 5 ||
                idNumber.length > 40
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "เลขบัตรประชาชนไม่ถูกต้อง"

                });

            }


            // =================================================
            // VALIDATE NATIONALITY
            // =================================================

            if (!nationality) {

                return res.status(400).json({

                    success: false,

                    message:
                        "กรุณาเลือกสัญชาติ"

                });

            }


            // =================================================
            // VALIDATE IMAGE
            // =================================================

            if (!imageData) {

                return res.status(400).json({

                    success: false,

                    message:
                        "กรุณาอัปโหลดรูปบัตรประชาชน"

                });

            }


            // =================================================
            // DATA URL FORMAT
            // =================================================

            const match =
                imageData.match(
                    /^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/i
                );


            if (!match) {

                return res.status(400).json({

                    success: false,

                    message:
                        "รูปภาพไม่ถูกต้อง"

                });

            }


            const mimeType =
                match[1].toLowerCase();


            const base64Data =
                match[3];


            // =================================================
            // CONVERT IMAGE
            // =================================================

            let buffer;

            try {

                buffer =
                    Buffer.from(
                        base64Data,
                        "base64"
                    );

            }

            catch (error) {

                return res.status(400).json({

                    success: false,

                    message:
                        "ไม่สามารถอ่านรูปภาพได้"

                });

            }


            // =================================================
            // CHECK IMAGE SIZE
            // MAX 5 MB
            // =================================================

            const maxSize =
                5 * 1024 * 1024;


            if (
                !buffer ||
                buffer.length === 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "รูปภาพไม่ถูกต้อง"

                });

            }


            if (
                buffer.length >
                maxSize
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "รูปภาพต้องมีขนาดไม่เกิน 5 MB"

                });

            }


            // =================================================
            // CHECK EXISTING KYC
            // =================================================

            const existingKyc =
                await KYC.findOne({
                    userId: userId
                });


            // =================================================
            // ถ้ายืนยันแล้ว ห้ามส่งใหม่
            // =================================================

            if (
                existingKyc &&
                existingKyc.status === "verified"
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "บัญชีนี้ได้รับการยืนยัน KYC แล้ว"

                });

            }


            // =================================================
            // ถ้ากำลังรอตรวจ
            // =================================================

            if (
                existingKyc &&
                existingKyc.status === "pending"
            ) {

                return res.status(409).json({

                    success: false,

                    message:
                        "ข้อมูล KYC กำลังรอการตรวจสอบ"

                });

            }


            // =================================================
            // FILE EXTENSION
            // =================================================

            const extensionMap = {

                "image/png":
                    ".png",

                "image/jpeg":
                    ".jpg",

                "image/jpg":
                    ".jpg",

                "image/webp":
                    ".webp"

            };


            const extension =
                extensionMap[mimeType];


            if (!extension) {

                return res.status(400).json({

                    success: false,

                    message:
                        "ไม่รองรับรูปภาพประเภทนี้"

                });

            }


            // =================================================
            // CREATE UPLOAD DIRECTORY
            // =================================================

            const uploadDirectory =
                path.join(
                    __dirname,
                    "../../uploads/kyc"
                );


            await fs.promises.mkdir(
                uploadDirectory,
                {
                    recursive: true
                }
            );


            // =================================================
            // UNIQUE FILE NAME
            // =================================================

            const randomPart =
                Math.random()
                    .toString(36)
                    .slice(2, 10);


            const fileName =
                `${Date.now()}-${randomPart}${extension}`;


            const filePath =
                path.join(
                    uploadDirectory,
                    fileName
                );


            // =================================================
            // SAVE IMAGE
            // =================================================

            await fs.promises.writeFile(
                filePath,
                buffer
            );


            // =================================================
            // PUBLIC IMAGE URL
            // =================================================

            const imageUrl =
                `/uploads/kyc/${fileName}`;


            // =================================================
            // CREATE / UPDATE KYC
            // =================================================

            let kyc;


            if (existingKyc) {

                existingKyc.fullName =
                    fullName;

                existingKyc.idNumber =
                    idNumber;

                existingKyc.nationality =
                    nationality;

                existingKyc.idCardFront =
                    imageUrl;

                existingKyc.status =
                    "pending";

                existingKyc.submittedAt =
                    new Date();

                existingKyc.verifiedAt =
                    null;

                existingKyc.verifiedBy =
                    null;

                kyc =
                    await existingKyc.save();

            }

            else {

                kyc =
                    await KYC.create({

                        userId: userId,

                        fullName:
                            fullName,

                        idNumber:
                            idNumber,

                        nationality:
                            nationality,

                        idCardFront:
                            imageUrl,

                        status:
                            "pending",

                        submittedAt:
                            new Date(),

                        verifiedAt:
                            null,

                        verifiedBy:
                            null

                    });

            }


            // =================================================
            // RESPONSE
            // =================================================

            return res.status(201).json({

                success: true,

                message:
                    "ส่งข้อมูล KYC เรียบร้อยแล้ว",

                status:
                    kyc.status

            });

        }

        catch (error) {

            console.error(
                "KYC submit error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "ไม่สามารถส่งข้อมูล KYC ได้"

            });

        }

    }
);


/*
=========================================================
ADMIN
GET ALL KYC
=========================================================

เมื่อ router นี้ถูก mount ที่:

/api/admin/kyc

จะกลายเป็น:

GET /api/admin/kyc
=========================================================
*/

router.get(
    "/",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            const records =
                await KYC.find()
                    .populate(
                        "userId",
                        "username shopName contact profileImage accountType status"
                    )
                    .populate(
                        "verifiedBy",
                        "username shopName"
                    )
                    .sort({
                        createdAt: -1
                    });


            return res.json({

                success: true,

                kyc: records

            });

        }

        catch (error) {

            console.error(
                "Admin KYC list error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "ไม่สามารถโหลดข้อมูล KYC ได้"

            });

        }

    }
);


/*
=========================================================
ADMIN
VERIFY KYC
=========================================================

POST

/api/admin/kyc/:id/verify

Admin กดยืนยัน
=========================================================
*/

router.post(
    "/:id/verify",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            const kycId =
                String(
                    req.params.id || ""
                );


            if (
                !isValidObjectId(kycId)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "KYC ID ไม่ถูกต้อง"

                });

            }


            const kyc =
                await KYC.findById(
                    kycId
                );


            if (!kyc) {

                return res.status(404).json({

                    success: false,

                    message:
                        "ไม่พบข้อมูล KYC"

                });

            }


            // =================================================
            // ถ้ายืนยันไปแล้ว
            // =================================================

            if (
                kyc.status === "verified"
            ) {

                return res.json({

                    success: true,

                    message:
                        "KYC นี้ได้รับการยืนยันแล้ว",

                    status:
                        "verified"

                });

            }


            // =================================================
            // VERIFY
            // =================================================

            kyc.status =
                "verified";

            kyc.verifiedAt =
                new Date();

            kyc.verifiedBy =
                getUserId(req);


            await kyc.save();


            return res.json({

                success: true,

                message:
                    "ยืนยัน KYC เรียบร้อยแล้ว",

                status:
                    "verified"

            });

        }

        catch (error) {

            console.error(
                "Admin KYC verify error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "ไม่สามารถยืนยัน KYC ได้"

            });

        }

    }
);


/*
=========================================================
EXPORT
=========================================================
*/

module.exports = router;