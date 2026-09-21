/* =========================================================
   TikTok Shop - User Notifications
   ========================================================= */

(function () {

    "use strict";


    /* =====================================================
       CONFIG
    ===================================================== */

    const API_BASE_URL =
        "/api/notifications";

    const NOTIFICATIONS_PAGE =
        "notifications.html";

    const POLLING_INTERVAL =
        10000;


    /* =====================================================
       GET AUTH TOKEN
    ===================================================== */

    function getToken() {

        const keys = [

            "tiktokShopToken",

            "tiktokShopJWT",

            "authToken",

            "token"

        ];


        for (
            const key of keys
        ) {

            const token =
                localStorage.getItem(
                    key
                );


            if (token) {

                return token;

            }

        }


        return "";

    }


    /* =====================================================
       API REQUEST
    ===================================================== */

    async function apiFetch(
        url,
        options = {}
    ) {

        const token =
            getToken();


        if (!token) {

            throw new Error(
                "Authentication token not found."
            );

        }


        const headers = {

            ...(options.headers || {}),

            Authorization:
                `Bearer ${token}`

        };


        if (
            options.body &&
            typeof options.body === "string"
        ) {

            headers[
                "Content-Type"
            ] =
                "application/json";

        }


        const response =
            await fetch(
                url,
                {
                    ...options,
                    headers
                }
            );


        let data = {};


        try {

            data =
                await response.json();

        }

        catch {

            data = {};

        }


        if (!response.ok) {

            throw new Error(

                data.message ||
                `Request failed (${response.status})`

            );

        }


        return data;

    }


    /* =====================================================
       FIND BELL BUTTONS
       ===================================================== */

    function findBellButtons() {

        const buttons = [];


        /*
        -----------------------------------------
        วิธีที่ 1
        ปุ่มที่มี data-lucide="bell"
        -----------------------------------------
        */

        document
            .querySelectorAll(
                '[data-lucide="bell"]'
            )
            .forEach(
                function (icon) {

                    const button =
                        icon.closest(
                            "button"
                        );


                    if (
                        button &&
                        !buttons.includes(
                            button
                        )
                    ) {

                        buttons.push(
                            button
                        );

                    }

                }
            );


        /*
        -----------------------------------------
        วิธีที่ 2
        ถ้า icon อยู่ใน element อื่น
        -----------------------------------------
        */

        document
            .querySelectorAll(
                ".notification-button, .notification-icon, .bell-button, .header-notification"
            )
            .forEach(
                function (button) {

                    if (
                        !buttons.includes(
                            button
                        )
                    ) {

                        buttons.push(
                            button
                        );

                    }

                }
            );


        return buttons;

    }


    /* =====================================================
       CREATE BADGE
       ===================================================== */

    function createBadge(
        button
    ) {

        let badge =
            button.querySelector(
                ".notification-count-badge"
            );


        if (!badge) {

            /*
            -----------------------------------------
            ให้ปุ่มมีตำแหน่งอ้างอิง
            -----------------------------------------
            */

            const computed =
                window.getComputedStyle(
                    button
                );


            if (
                computed.position ===
                "static"
            ) {

                button.style.position =
                    "relative";

            }


            badge =
                document.createElement(
                    "span"
                );


            badge.className =
                "notification-count-badge";


            badge.setAttribute(
                "aria-hidden",
                "true"
            );


            button.appendChild(
                badge
            );


            /*
            -----------------------------------------
            CSS
            -----------------------------------------
            */

            badge.style.position =
                "absolute";

            badge.style.top =
                "-4px";

            badge.style.right =
                "-5px";

            badge.style.minWidth =
                "18px";

            badge.style.height =
                "18px";

            badge.style.padding =
                "0 5px";

            badge.style.borderRadius =
                "999px";

            badge.style.background =
                "#ef233c";

            badge.style.color =
                "#ffffff";

            badge.style.display =
                "none";

            badge.style.alignItems =
                "center";

            badge.style.justifyContent =
                "center";

            badge.style.fontSize =
                "10px";

            badge.style.fontWeight =
                "700";

            badge.style.lineHeight =
                "18px";

            badge.style.textAlign =
                "center";

            badge.style.zIndex =
                "10";

            badge.style.pointerEvents =
                "none";

            badge.style.boxSizing =
                "border-box";

        }


        return badge;

    }


    /* =====================================================
       UPDATE BADGE
       ===================================================== */

    function updateBadge(
        count
    ) {

        const buttons =
            findBellButtons();


        buttons.forEach(
            function (button) {

                const badge =
                    createBadge(
                        button
                    );


                const unreadCount =
                    Number(
                        count || 0
                    );


                if (
                    unreadCount <= 0
                ) {

                    badge.textContent =
                        "";

                    badge.style.display =
                        "none";

                    button.removeAttribute(
                        "data-notification-count"
                    );

                    return;

                }


                badge.textContent =
                    unreadCount > 99
                        ? "99+"
                        : String(
                            unreadCount
                        );


                badge.style.display =
                    "flex";


                button.setAttribute(
                    "data-notification-count",
                    String(
                        unreadCount
                    )
                );

            }
        );

    }


    /* =====================================================
       GET UNREAD COUNT
       ===================================================== */

    async function loadUnreadCount() {

        const token =
            getToken();


        /*
        -----------------------------------------
        ถ้ายังไม่ได้ Login
        ไม่ต้องทำอะไร
        -----------------------------------------
        */

        if (!token) {

            updateBadge(
                0
            );

            return 0;

        }


        try {

            const data =
                await apiFetch(
                    `${API_BASE_URL}/unread-count`
                );


            const count =
                Number(
                    data.count || 0
                );


            updateBadge(
                count
            );


            return count;

        }

        catch (error) {

            /*
            -----------------------------------------
            ไม่แสดง Error บนหน้า User
            -----------------------------------------
            */

            console.warn(
                "Notification count error:",
                error.message
            );


            return 0;

        }

    }


    /* =====================================================
       OPEN NOTIFICATIONS
       ===================================================== */

    function openNotifications() {

        window.location.href =
            NOTIFICATIONS_PAGE;

    }


    /* =====================================================
       CONNECT BELL BUTTON
       ===================================================== */

    function connectBellButtons() {

        const buttons =
            findBellButtons();


        buttons.forEach(
            function (button) {

                /*
                -----------------------------------------
                ป้องกัน bind ซ้ำ
                -----------------------------------------
                */

                if (
                    button.dataset
                        .notificationBound ===
                    "true"
                ) {

                    return;

                }


                button.dataset
                    .notificationBound =
                    "true";


                button.addEventListener(
                    "click",
                    function (event) {

                        /*
                        -----------------------------------------
                        ถ้าปุ่มเดิมมี link
                        ให้ใช้ notifications.html
                        -----------------------------------------
                        */

                        event.preventDefault();

                        event.stopPropagation();


                        openNotifications();

                    }
                );


                createBadge(
                    button
                );

            }
        );

    }


    /* =====================================================
       ADD PAGE LINK
       ===================================================== */

    function connectNotificationLinks() {

        document
            .querySelectorAll(
                '[data-notifications-link="true"]'
            )
            .forEach(
                function (element) {

                    if (
                        element.dataset
                            .notificationLinkBound ===
                        "true"
                    ) {

                        return;

                    }


                    element.dataset
                        .notificationLinkBound =
                        "true";


                    element.addEventListener(
                        "click",
                        function () {

                            window.location.href =
                                NOTIFICATIONS_PAGE;

                        }
                    );

                }
            );

    }


    /* =====================================================
       INITIALIZE
       ===================================================== */

    async function initialize() {

        /*
        -----------------------------------------
        รอ DOM
        -----------------------------------------
        */

        connectBellButtons();

        connectNotificationLinks();


        /*
        -----------------------------------------
        ดึงจำนวนแจ้งเตือน
        -----------------------------------------
        */

        await loadUnreadCount();


        /*
        -----------------------------------------
        Polling
        -----------------------------------------
        */

        setInterval(
            async function () {

                connectBellButtons();

                await loadUnreadCount();

            },
            POLLING_INTERVAL
        );

    }


    /* =====================================================
       DOM READY
       ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialize
        );

    }

    else {

        initialize();

    }


    /* =====================================================
       PUBLIC API
       ===================================================== */

    window.TikTokShopNotifications = {

        loadUnreadCount,

        updateBadge,

        openNotifications

    };


})();