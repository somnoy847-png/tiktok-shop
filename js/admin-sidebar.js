/*
=========================================================
TikTok Shop - Admin Sidebar
=========================================================

ใช้เฉพาะหน้า Admin

หน้าที่:
- โหลด components/admin-sidebar.html
- แสดงข้อมูล Admin
- ตั้ง Active Menu
- เปิด / ปิด Sidebar บนมือถือ
- Logout
- ไม่ยุ่งกับ User Sidebar
=========================================================
*/

(function () {

    "use strict";


    // =====================================================
    // CONFIG
    // =====================================================

    const ADMIN_SIDEBAR_SOURCE =
        "components/admin-sidebar.html";


    // =====================================================
    // HELPER
    // =====================================================

    function $(id) {

        return document.getElementById(id);

    }


    function getPageName() {

        return window.location.pathname
            .split("/")
            .pop()
            .toLowerCase() || "admin-dashboard.html";

    }


    function getCurrentUser() {

        try {

            return JSON.parse(
                localStorage.getItem(
                    "tiktokShopUser"
                ) || "null"
            );

        } catch (error) {

            console.error(
                "Admin Sidebar user error:",
                error
            );

            return null;

        }

    }


    function escapeHTML(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    // =====================================================
    // TOKEN
    // =====================================================

    function getToken() {

        return (
            localStorage.getItem(
                "tiktokShopToken"
            ) ||

            localStorage.getItem(
                "tiktokShopJWT"
            ) ||

            localStorage.getItem(
                "authToken"
            ) ||

            localStorage.getItem(
                "token"
            ) ||

            ""
        );

    }


    // =====================================================
    // UPDATE ADMIN USER
    // =====================================================

    function updateAdminUser() {

        const user =
            getCurrentUser();


        if (!user) {

            return;

        }


        const displayName =
            user.shopName ||
            user.displayName ||
            user.username ||
            "Admin";


        const avatarLetter =
            displayName
                .charAt(0)
                .toUpperCase();


        const profileImage =
            user.profileImage ||
            user.avatar ||
            "";


        // Username

        const username =
            $("sidebarUsername");


        if (username) {

            username.textContent =
                displayName;

        }


        // Role

        const role =
            $("sidebarRole");


        if (role) {

            role.textContent =
                "Administrator";

        }


        // Avatar

        const avatar =
            $("sidebarAvatar");


        if (avatar) {

            if (profileImage) {

                avatar.innerHTML = `

                    <img
                        src="${escapeHTML(profileImage)}"
                        alt="${escapeHTML(displayName)}"
                        style="
                            width:100%;
                            height:100%;
                            object-fit:cover;
                            border-radius:50%;
                            display:block;
                        "
                        onerror="
                            this.style.display='none';
                            this.parentElement.textContent='${escapeHTML(avatarLetter)}';
                        "
                    >

                `;

            } else {

                avatar.textContent =
                    avatarLetter;

            }

        }

    }


    // =====================================================
    // ACTIVE MENU
    // =====================================================

    function setActiveMenu() {

        const page =
            getPageName();


        document
            .querySelectorAll(
                ".admin-sidebar .nav-item"
            )
            .forEach(
                item => {

                    item.classList.remove(
                        "active"
                    );

                }
            );


        const pageMap = {

            "admin-dashboard.html":
                "navAdminDashboard",

            "admin-users.html":
                "navAdminUsers",

            "admin-wallet.html":
                "navAdminWallet",

            "admin-products.html":
                "navAdminProducts",

            "admin-orders.html":
                "navAdminOrders",

            "admin-shop-order.html":
                "navAdminShopOrder",    

            "admin-chat.html":
                "navAdminChat",

            "admin-notifications.html":
                "navAdminNotifications",

            "admin.html":
                "navAdminSettings"

        };


        const activeId =
            pageMap[page];


        if (!activeId) {

            return;

        }


        const active =
            $(activeId);


        if (active) {

            active.classList.add(
                "active"
            );

        }

    }


    // =====================================================
    // MOBILE SIDEBAR
    // =====================================================

    function openSidebar() {

        const sidebar =
            $("sidebar");

        const overlay =
            $("sidebarOverlay");


        if (sidebar) {

            sidebar.classList.add(
                "open"
            );

        }


        if (overlay) {

            overlay.classList.add(
                "active"
            );

        }


        document.body.classList.add(
            "sidebar-open"
        );

    }


    function closeSidebar() {

        const sidebar =
            $("sidebar");

        const overlay =
            $("sidebarOverlay");


        if (sidebar) {

            sidebar.classList.remove(
                "open"
            );

        }


        if (overlay) {

            overlay.classList.remove(
                "active"
            );

        }


        document.body.classList.remove(
            "sidebar-open"
        );

    }


    // =====================================================
    // CREATE MOBILE MENU BUTTON
    // =====================================================

    function setupMobileButton() {

        let menuButton =
            $("menuButton");


        if (!menuButton) {

            menuButton =
                document.createElement(
                    "button"
                );


            menuButton.id =
                "menuButton";


            menuButton.type =
                "button";


            menuButton.setAttribute(
                "aria-label",
                "Open menu"
            );


            menuButton.innerHTML = `

                <i data-lucide="menu"></i>

            `;


            menuButton.style.cssText = `

                position: fixed;
                top: 14px;
                left: 14px;
                z-index: 9998;

                width: 42px;
                height: 42px;

                border: 1px solid #e5e5e5;
                border-radius: 10px;

                background: #ffffff;
                color: #171717;

                display: none;
                align-items: center;
                justify-content: center;

                box-shadow:
                    0 4px 15px rgba(0,0,0,.08);

                cursor: pointer;

            `;


            menuButton.querySelector(
                "i"
            ).style.width =
                "19px";


            menuButton.querySelector(
                "i"
            ).style.height =
                "19px";


            document.body.appendChild(
                menuButton
            );

        }


        menuButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                event.stopPropagation();

                openSidebar();

            }
        );


        // Mobile CSS

        if (
            !document.getElementById(
                "adminSidebarMobileStyle"
            )
        ) {

            const style =
                document.createElement(
                    "style"
                );


            style.id =
                "adminSidebarMobileStyle";


            style.textContent = `

                @media (max-width: 900px) {

                    #menuButton {
                        display: flex !important;
                    }

                    .admin-sidebar {
                        position: fixed !important;
                        left: 0;
                        top: 0;
                        bottom: 0;

                        z-index: 10000;

                        transform:
                            translateX(-105%);

                        transition:
                            transform .25s ease;

                        width: 250px;

                    }

                    .admin-sidebar.open {
                        transform:
                            translateX(0);

                    }

                    .sidebar-overlay {
                        position: fixed !important;
                        inset: 0;

                        z-index: 9999;

                        background:
                            rgba(0,0,0,.45);

                        opacity: 0;
                        visibility: hidden;

                        transition:
                            opacity .25s ease,
                            visibility .25s ease;

                    }

                    .sidebar-overlay.active {
                        opacity: 1;
                        visibility: visible;
                    }

                    body.sidebar-open {
                        overflow: hidden;
                    }

                }

            `;


            document.head.appendChild(
                style
            );

        }

    }


    // =====================================================
    // EVENTS
    // =====================================================

    function setupEvents() {

        const closeButton =
            $("closeSidebar");


        if (closeButton) {

            closeButton.addEventListener(
                "click",
                function () {

                    closeSidebar();

                }
            );

        }


        const overlay =
            $("sidebarOverlay");


        if (overlay) {

            overlay.addEventListener(
                "click",
                function () {

                    closeSidebar();

                }
            );

        }


        document
            .querySelectorAll(
                ".admin-sidebar a"
            )
            .forEach(
                link => {

                    link.addEventListener(
                        "click",
                        function () {

                            closeSidebar();

                        }
                    );

                }
            );


        document.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key ===
                    "Escape"
                ) {

                    closeSidebar();

                }

            }
        );


        // =================================================
        // LOGOUT
        // =================================================

        const logoutButton =
            $("logoutButton");


        if (logoutButton) {

            logoutButton.addEventListener(
                "click",
                function () {

                    const confirmed =
                        confirm(
                            "ต้องการออกจากระบบ Admin หรือไม่?"
                        );


                    if (!confirmed) {

                        return;

                    }


                    const keys = [

                        "tiktokShopLoggedIn",

                        "tiktokShopUser",

                        "tiktokShopToken",

                        "tiktokShopJWT",

                        "authToken",

                        "token"

                    ];


                    keys.forEach(
                        key => {

                            localStorage.removeItem(
                                key
                            );

                        }
                    );


                    window.location.href =
                        "auth.html?mode=login";

                }
            );

        }

    }


    // =====================================================
    // LOAD ADMIN SIDEBAR
    // =====================================================

    async function loadAdminSidebar() {

        const container =
            $("sidebar-container");


        if (!container) {

            console.error(
                "Admin Sidebar: #sidebar-container not found"
            );

            return;

        }


        try {

            const response =
                await fetch(
                    ADMIN_SIDEBAR_SOURCE
                );


            if (!response.ok) {

                throw new Error(
                    `Admin Sidebar HTTP ${response.status}`
                );

            }


            const html =
                await response.text();


            container.innerHTML =
                html;


            updateAdminUser();

            setActiveMenu();

            setupMobileButton();

            setupEvents();


            if (
                window.lucide &&
                typeof window.lucide.createIcons ===
                    "function"
            ) {

                window.lucide.createIcons();

            }


            // แจ้งให้หน้า Admin รู้ว่า Sidebar โหลดแล้ว

            window.AdminSidebarReady =
                true;


            window.dispatchEvent(
                new CustomEvent(
                    "admin-sidebar-ready"
                )
            );


        } catch (error) {

            console.error(
                "Admin Sidebar loading error:",
                error
            );

        }

    }


    // =====================================================
    // START
    // =====================================================

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            loadAdminSidebar
        );

    } else {

        loadAdminSidebar();

    }


})();