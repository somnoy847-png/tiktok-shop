/*
=========================================================
TikTok Shop - Shared Sidebar
=========================================================

หน้าที่ของไฟล์นี้

- โหลด components/sidebar.html
- ตั้งเมนู Active
- แสดงข้อมูล User
- ตรวจ role
- แสดงเมนู Admin เฉพาะ Admin
- ซ่อนเมนู Admin จาก Buyer / Seller
- Guest สามารถเข้า index.html ได้
- Guest แสดงปุ่ม "เข้าสู่ระบบ"
- Seller แสดง "My Shop"
- Buyer ไม่แสดง Seller Box
- Admin ไม่แสดง Seller Box
- เปิด / ปิด Sidebar มือถือ
- Logout
- รองรับ EN / TH
- Notification Count
- My Shop Order Count
- Chat Message Count
- Auto Refresh
- แจ้งให้หน้าเว็บอื่นรู้ว่า Sidebar โหลดเสร็จแล้ว
=========================================================
*/

(function () {

    "use strict";


    // =====================================================
    // CONFIG
    // =====================================================

    const SIDEBAR_SOURCE =
        "components/sidebar.html";


    // =====================================================
    // HELPER
    // =====================================================

    function $(id) {
        return document.getElementById(id);
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
    // PAGE NAME
    // =====================================================

    function getPageName() {

        const path =
            window.location.pathname
                .split("/")
                .pop()
                .toLowerCase();

        return path || "index.html";
    }


    // =====================================================
    // USER
    // =====================================================

    function getCurrentUser() {

        try {

            return JSON.parse(
                localStorage.getItem(
                    "tiktokShopUser"
                ) || "null"
            );

        } catch (error) {

            console.error(
                "Sidebar user parse error:",
                error
            );

            return null;
        }
    }


    // =====================================================
    // CHECK ADMIN
    // =====================================================

    function isAdmin(user) {

        if (!user) {
            return false;
        }

        return (
            String(user.role || "")
                .toLowerCase() === "admin"
            ||
            String(user.accountType || "")
                .toLowerCase() === "admin"
        );
    }


    // =====================================================
    // CHECK SELLER
    // =====================================================

    function isSeller(user) {

        if (!user) {
            return false;
        }

        return (
            String(user.accountType || "")
                .toLowerCase() === "seller"
            ||
            String(user.role || "")
                .toLowerCase() === "seller"
        );
    }


    // =====================================================
    // CHECK LOGIN
    // =====================================================

    function isLoggedIn() {

        const token =
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
            );

        return Boolean(token);
    }


    // =====================================================
    // GET AUTH TOKEN
    // =====================================================

    function getAuthToken() {

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
    // NOTIFICATION COUNT
    // =====================================================

    async function updateSidebarNotificationCount() {

        const element =
            $("notificationCount");

        if (!element) {
            return;
        }

        const token =
            getAuthToken();

        if (!token) {

            element.textContent = "0";
            element.style.display = "none";

            return;
        }


        try {

            const response =
                await fetch(
                    "/api/notifications/unread-count",
                    {
                        method: "GET",

                        headers: {
                            "Authorization":
                                `Bearer ${token}`
                        },

                        cache: "no-store"
                    }
                );


            if (!response.ok) {
                throw new Error(
                    `Notification API HTTP ${response.status}`
                );
            }


            const result =
                await response.json();


            const count =
                Number(result.count) || 0;


            element.textContent =
                count;


            element.style.display =
                count > 0
                    ? "inline-flex"
                    : "none";


        } catch (error) {

            console.error(
                "Sidebar notification count error:",
                error
            );

            element.textContent = "0";
            element.style.display = "none";
        }
    }


    // =====================================================
    // MY SHOP ORDER COUNT
    // =====================================================

    async function updateShopOrderNotificationCount() {

        const element =
            $("shopOrderCount");

        if (!element) {
            return;
        }


        const token =
            getAuthToken();


        if (!token) {

            element.textContent = "0";
            element.style.display = "none";

            return;
        }


        try {

            const response =
                await fetch(
                    "/api/orders/seller",
                    {
                        method: "GET",

                        headers: {
                            "Authorization":
                                `Bearer ${token}`
                        },

                        cache: "no-store"
                    }
                );


            if (!response.ok) {

                throw new Error(
                    `Orders API HTTP ${response.status}`
                );
            }


            const data =
                await response.json();


            const orders =
                Array.isArray(data.orders)
                    ? data.orders
                    : [];


            const pendingOrders =
                orders.filter(
                    order => {

                        const status =
                            String(
                                order.status || ""
                            )
                                .trim()
                                .toLowerCase();

                        return status === "pending";
                    }
                );


            const count =
                pendingOrders.length;


            element.textContent =
                count;


            element.style.display =
                count > 0
                    ? "inline-flex"
                    : "none";


        } catch (error) {

            console.error(
                "Sidebar order notification error:",
                error
            );

            element.textContent = "0";
            element.style.display = "none";
        }
    }


    // =====================================================
    // CHAT MESSAGE COUNT
    // =====================================================

    async function updateSidebarMessageCount() {

        const element =
            $("messageCount");

        if (!element) {
            return;
        }


        const token =
            getAuthToken();


        if (!token) {

            element.textContent = "0";
            element.style.display = "none";

            return;
        }


        try {

            const response =
                await fetch(
                    "/api/chat/unread-count",
                    {
                        method: "GET",

                        headers: {
                            "Authorization":
                                `Bearer ${token}`
                        },

                        cache: "no-store"
                    }
                );


            if (!response.ok) {

                throw new Error(
                    `Chat API HTTP ${response.status}`
                );
            }


            const result =
                await response.json();


            const count =
                Number(result.count) || 0;


            element.textContent =
                count;


            element.style.display =
                count > 0
                    ? "inline-flex"
                    : "none";


        } catch (error) {

            console.error(
                "Sidebar chat message count error:",
                error
            );

            element.textContent = "0";
            element.style.display = "none";
        }
    }


    // =====================================================
    // AUTO REFRESH
    // =====================================================

    let notificationTimer = null;
    let shopOrderTimer = null;
    let messageTimer = null;


    function startNotificationRefresh() {

        if (notificationTimer) {
            clearInterval(notificationTimer);
        }

        notificationTimer =
            setInterval(
                updateSidebarNotificationCount,
                10000
            );
    }


    function startShopOrderRefresh() {

        if (shopOrderTimer) {
            clearInterval(shopOrderTimer);
        }

        shopOrderTimer =
            setInterval(
                updateShopOrderNotificationCount,
                10000
            );
    }


    function startMessageRefresh() {

        if (messageTimer) {
            clearInterval(messageTimer);
        }

        messageTimer =
            setInterval(
                updateSidebarMessageCount,
                10000
            );
    }


    // =====================================================
    // ACTIVE MENU
    // =====================================================

    function setActiveMenu() {

        const page =
            getPageName();


        document
            .querySelectorAll(
                ".sidebar .nav-item"
            )
            .forEach(
                item => {

                    item.classList.remove(
                        "active"
                    );
                }
            );


        let activeId = null;


        // HOME

        if (
            page === "index.html" ||
            page === ""
        ) {

            activeId =
                "navHome";
        }


        // ADD PRODUCTS

        else if (
            page === "add-products.html"
        ) {

            activeId =
                "navAddProducts";

            if (!$(activeId)) {

                activeId =
                    "navProducts";
            }
        }


        // PRODUCTS

        else if (
            page === "products.html"
        ) {

            activeId =
                "navProducts";
        }


        // SELLER DASHBOARD

        else if (
            page === "seller-dashboard.html"
        ) {

            activeId =
                "navSellerDashboard";

            if (!$(activeId)) {

                activeId =
                    "navDashboard";
            }
        }


        // MY SHOP

        else if (
            page === "my-shop.html"
        ) {

            activeId =
                "navShop";

            if (!$(activeId)) {

                activeId =
                    "navMyShop";
            }

            if (!$(activeId)) {

                activeId =
                    "navFavorites";
            }
        }


        // WALLET

        else if (
            page === "wallet.html"
        ) {

            activeId =
                "navWallet";
        }


        // NOTIFICATIONS

        else if (
            page === "notifications.html"
        ) {

            activeId =
                "navNotifications";
        }


        // CHAT

        else if (
            page === "user-chat.html"
        ) {

            activeId =
                "navMessages";
        }


        // ACCOUNT

        else if (
            page === "account.html"
        ) {

            activeId =
                "navProfile";
        }


        // ADMIN DASHBOARD

        else if (
            page === "admin-dashboard.html"
        ) {

            activeId =
                "navAdminDashboard";
        }


        // ADMIN USERS

        else if (
            page === "admin-users.html"
        ) {

            activeId =
                "navAdminUsers";
        }


        // ADMIN WALLET

        else if (
            page === "admin-wallet.html"
        ) {

            activeId =
                "navAdminWallet";
        }


        // ADMIN PRODUCTS

        else if (
            page === "admin-products.html"
        ) {

            activeId =
                "navAdminProducts";
        }


        // ADMIN ORDERS

        else if (
            page === "admin-orders.html"
        ) {

            activeId =
                "navAdminOrders";
        }


        // ADMIN CHAT

        else if (
            page === "admin-chat.html"
        ) {

            activeId =
                "navAdminChat";
        }


        // ADMIN NOTIFICATIONS

        else if (
            page === "admin-notifications.html"
        ) {

            activeId =
                "navAdminNotifications";
        }


        // APPLY ACTIVE

        if (activeId) {

            const element =
                $(activeId);

            if (element) {

                element.classList.add(
                    "active"
                );
            }
        }
    }


    // =====================================================
    // ADMIN MENU
    // =====================================================

    function setupAdminMenu() {

        const sidebar =
            $("sidebar");

        if (!sidebar) {
            return;
        }


        const user =
            getCurrentUser();


        // Remove old admin menu

        document
            .querySelectorAll(
                ".admin-sidebar-section"
            )
            .forEach(
                element => {
                    element.remove();
                }
            );


        if (!isAdmin(user)) {
            return;
        }


        const nav =
            sidebar.querySelector(
                ".sidebar-nav"
            );

        if (!nav) {
            return;
        }


        const section =
            document.createElement(
                "div"
            );


        section.className =
            "admin-sidebar-section";


        section.innerHTML = `

            <div
                class="nav-title"
                style="margin-top:18px;"
            >
                ADMIN
            </div>


            <a
                href="admin-dashboard.html"
                class="nav-item"
                id="navAdminDashboard"
            >
                <i data-lucide="layout-dashboard"></i>
                <span>Admin Dashboard</span>
            </a>


            <a
                href="admin-users.html"
                class="nav-item"
                id="navAdminUsers"
            >
                <i data-lucide="users"></i>
                <span>จัดการผู้ใช้</span>
            </a>


            <a
                href="admin-wallet.html"
                class="nav-item"
                id="navAdminWallet"
            >
                <i data-lucide="wallet-cards"></i>
                <span>จัดการ Wallet</span>
            </a>


            <a
                href="admin-products.html"
                class="nav-item"
                id="navAdminProducts"
            >
                <i data-lucide="package"></i>
                <span>จัดการสินค้า</span>
            </a>


            <a
                href="admin-orders.html"
                class="nav-item"
                id="navAdminOrders"
            >
                <i data-lucide="shopping-cart"></i>
                <span>จัดการ Orders</span>
            </a>


            <a
                href="admin-chat.html"
                class="nav-item"
                id="navAdminChat"
            >
                <i data-lucide="messages-square"></i>
                <span>Live Chat</span>
            </a>


            <a
                href="admin-notifications.html"
                class="nav-item"
                id="navAdminNotifications"
            >
                <i data-lucide="bell-ring"></i>
                <span>Notifications</span>
            </a>

        `;


        const titles =
            nav.querySelectorAll(
                ".nav-title"
            );


        let accountTitle = null;


        titles.forEach(
            title => {

                if (
                    title.textContent
                        .trim()
                        .toUpperCase() ===
                    "ACCOUNT"
                ) {

                    accountTitle =
                        title;
                }
            }
        );


        if (accountTitle) {

            nav.insertBefore(
                section,
                accountTitle
            );

        } else {

            nav.appendChild(
                section
            );
        }


        // Admin ไม่ใช้ Seller Box

        const sellerBox =
            $("sellerBox");

        if (sellerBox) {
            sellerBox.style.display =
                "none";
        }


        const sidebarRole =
            $("sidebarRole");

        if (sidebarRole) {
            sidebarRole.textContent =
                "Administrator";
        }
    }


    // =====================================================
    // UPDATE USER UI
    // =====================================================

    function updateUserUI() {

        const user =
            getCurrentUser();


        const sidebarUsername =
            $("sidebarUsername");

        const sidebarRole =
            $("sidebarRole");

        const sidebarAvatar =
            $("sidebarAvatar");


        // =================================================
        // GUEST
        // =================================================

        if (!user) {

            if (sidebarUsername) {

                sidebarUsername.textContent =
                    "เข้าสู่ระบบ";
            }


            if (sidebarRole) {

                sidebarRole.textContent =
                    "Login to continue";
            }


            if (sidebarAvatar) {

                sidebarAvatar.innerHTML = `
                    <i data-lucide="log-in"></i>
                `;
            }


            const sellerBox =
                $("sellerBox");


            const sellerBoxTitle =
                $("sellerBoxTitle");


            const sellerBoxText =
                $("sellerBoxText");


            if (sellerBox) {

                sellerBox.style.display =
                    "";

                sellerBox.href =
                    "auth.html?mode=login";
            }


            if (sellerBoxTitle) {

                sellerBoxTitle.textContent =
                    "เข้าสู่ระบบ";
            }


            if (sellerBoxText) {

                sellerBoxText.textContent =
                    "Login to continue";
            }


            // Guest ไม่ควรเห็น Logout

            const logoutButton =
                $("logoutButton");

            if (logoutButton) {

                logoutButton.style.display =
                    "none";
            }


            if (
                typeof lucide !==
                "undefined"
            ) {

                lucide.createIcons();
            }


            return;
        }


        // =================================================
        // LOGGED IN
        // =================================================

        const displayName =
            user.shopName ||
            user.displayName ||
            user.username ||
            "User";


        const avatarLetter =
            displayName
                .charAt(0)
                .toUpperCase();


        const profileImage =
            user.profileImage ||
            user.avatar ||
            "";


        if (sidebarUsername) {

            sidebarUsername.textContent =
                displayName;
        }


        // =================================================
        // ROLE
        // =================================================

        if (sidebarRole) {

            if (isAdmin(user)) {

                sidebarRole.textContent =
                    "Administrator";

            }

            else if (isSeller(user)) {

                sidebarRole.textContent =
                    "Store Owner";

            }

            else {

                sidebarRole.textContent =
                    "Buyer Account";
            }
        }


        // =================================================
        // AVATAR
        // =================================================

        if (sidebarAvatar) {

            if (profileImage) {

                sidebarAvatar.innerHTML = `

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

            }

            else {

                sidebarAvatar.textContent =
                    avatarLetter;
            }
        }


        // =================================================
        // LOGOUT
        // =================================================

        const logoutButton =
            $("logoutButton");

        if (logoutButton) {

            logoutButton.style.display =
                "";
        }


        // =================================================
        // SELLER BOX
        // =================================================

        const sellerBox =
            $("sellerBox");

        const sellerBoxTitle =
            $("sellerBoxTitle");

        const sellerBoxText =
            $("sellerBoxText");


        if (sellerBox) {

            // ---------------------------------------------
            // ADMIN
            // ---------------------------------------------

            if (isAdmin(user)) {

                sellerBox.style.display =
                    "none";
            }


            // ---------------------------------------------
            // SELLER
            // ---------------------------------------------

            else if (isSeller(user)) {

                sellerBox.style.display =
                    "";

                sellerBox.href =
                    "my-shop.html";


                if (sellerBoxTitle) {

                    sellerBoxTitle.textContent =
                        user.shopName ||
                        user.username ||
                        "My Shop";
                }


                if (sellerBoxText) {

                    sellerBoxText.textContent =
                        "Manage your shop";
                }
            }


            // ---------------------------------------------
            // BUYER
            // ---------------------------------------------

            else {

                sellerBox.style.display =
                    "none";
            }
        }


        if (
            typeof lucide !==
            "undefined"
        ) {

            lucide.createIcons();
        }
    }


    // =====================================================
    // SELLER MENU
    // =====================================================

    function updateSellerMenu() {

        const user =
            getCurrentUser();


        const seller =
            isSeller(user);


        const admin =
            isAdmin(user);


        const sellerMenuIds = [

            "navSellerDashboard",

            "navAddProducts",

            "navSellerOrders",

            "navShop",

            "navDashboard",

            "navProducts",

            "navMyShop"

        ];


        sellerMenuIds.forEach(
            id => {

                const item =
                    $(id);

                if (!item) {
                    return;
                }


                item.style.display =
                    seller && !admin
                        ? ""
                        : "none";
            }
        );


        // =================================================
        // SELLER BOX
        // =================================================

        const sellerBox =
            $("sellerBox");


        if (!sellerBox) {
            return;
        }


        // =================================================
        // GUEST
        // =================================================

        if (!user) {

            sellerBox.style.display =
                "";

            sellerBox.href =
                "auth.html?mode=login";

            const title =
                $("sellerBoxTitle");

            const text =
                $("sellerBoxText");


            if (title) {
                title.textContent =
                    "เข้าสู่ระบบ";
            }


            if (text) {
                text.textContent =
                    "Login to continue";
            }


            return;
        }


        // =================================================
        // SELLER
        // =================================================

        if (seller && !admin) {

            sellerBox.style.display =
                "";

            sellerBox.href =
                "my-shop.html";

            const title =
                $("sellerBoxTitle");

            const text =
                $("sellerBoxText");


            if (title) {

                title.textContent =
                    user.shopName ||
                    user.username ||
                    "My Shop";
            }


            if (text) {

                text.textContent =
                    "Manage your shop";
            }


            return;
        }


        // =================================================
        // BUYER / ADMIN
        // =================================================

        sellerBox.style.display =
            "none";
    }


    // =====================================================
    // LANGUAGE
    // =====================================================

    function applyLanguage() {

        const language =
            localStorage.getItem(
                "tiktokShopLanguage"
            ) || "en";


        const translations = {

            en: {

                main: "MAIN",

                account: "ACCOUNT",

                other: "OTHER",

                home: "Home",

                products: "Products",

                dashboard: "Dashboard",

                myShop: "My Shop",

                wallet: "Wallet",

                notifications:
                    "Notifications",

                messages: "Messages",

                profile: "Profile",

                settings: "Settings",

                help: "Help Center",

                logout: "Log out"
            },


            th: {

                main: "MAIN",

                account: "ACCOUNT",

                other: "OTHER",

                home: "หน้าแรก",

                products: "สินค้า",

                dashboard: "แดชบอร์ด",

                myShop:
                    "ร้านค้าของฉัน",

                wallet:
                    "กระเป๋าเงิน",

                notifications:
                    "การแจ้งเตือน",

                messages:
                    "ข้อความ",

                profile:
                    "โปรไฟล์",

                settings:
                    "ตั้งค่า",

                help:
                    "ศูนย์ช่วยเหลือ",

                logout:
                    "ออกจากระบบ"
            }

        };


        const t =
            translations[language] ||
            translations.en;


        document
            .querySelectorAll(
                "[data-sidebar-text]"
            )
            .forEach(
                element => {

                    const key =
                        element.dataset.sidebarText;


                    if (t[key]) {

                        element.textContent =
                            t[key];
                    }
                }
            );
    }


    // =====================================================
    // MOBILE SIDEBAR
    // =====================================================

    function openMobileMenu() {

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


    function closeMobileMenu() {

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
    // EVENTS
    // =====================================================

    function setupEvents() {

        // -----------------------------------------------
        // CLOSE
        // -----------------------------------------------

        const closeButton =
            $("closeSidebar");


        if (closeButton) {

            closeButton.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    closeMobileMenu();
                }
            );
        }


        // -----------------------------------------------
        // OVERLAY
        // -----------------------------------------------

        const overlay =
            $("sidebarOverlay");


        if (overlay) {

            overlay.addEventListener(
                "click",
                closeMobileMenu
            );
        }


        // -----------------------------------------------
        // SIDEBAR LINKS
        // -----------------------------------------------

        document
            .querySelectorAll(
                ".sidebar a"
            )
            .forEach(
                link => {

                    link.addEventListener(
                        "click",
                        function () {

                            closeMobileMenu();
                        }
                    );
                }
            );


        // -----------------------------------------------
        // SELLER BOX
        // -----------------------------------------------

        const sellerBox =
            $("sellerBox");


        if (sellerBox) {

            sellerBox.addEventListener(
                "click",
                function (event) {

                    const user =
                        getCurrentUser();


                    // Guest

                    if (!user) {

                        event.preventDefault();

                        closeMobileMenu();

                        window.location.href =
                            "auth.html?mode=login";

                        return;
                    }


                    // Seller

                    if (isSeller(user)) {

                        event.preventDefault();

                        closeMobileMenu();

                        window.location.href =
                            "my-shop.html";

                        return;
                    }


                    // Buyer / Admin

                    event.preventDefault();
                }
            );
        }


        // -----------------------------------------------
        // ESC
        // -----------------------------------------------

        document.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key === "Escape"
                ) {

                    closeMobileMenu();
                }
            }
        );


        // -----------------------------------------------
        // LOGOUT
        // -----------------------------------------------

        const logoutButton =
            $("logoutButton");


        if (logoutButton) {

            logoutButton.addEventListener(
                "click",
                function () {

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
    // MOBILE MENU BUTTON
    // =====================================================

    document.addEventListener(
        "click",
        function (event) {

            const menuButton =
                event.target.closest(
                    "#menuButton"
                );


            if (!menuButton) {
                return;
            }


            event.preventDefault();

            event.stopPropagation();

            openMobileMenu();
        }
    );


    // =====================================================
    // LOAD SIDEBAR
    // =====================================================

    async function loadSidebar() {

        const container =
            $("sidebar-container");


        if (!container) {

            console.error(
                "Shared Sidebar: ไม่พบ #sidebar-container"
            );

            return;
        }


        try {

            // ---------------------------------------------
            // FETCH
            // ---------------------------------------------

            const response =
                await fetch(
                    SIDEBAR_SOURCE,
                    {
                        cache: "no-store"
                    }
                );


            if (!response.ok) {

                throw new Error(
                    `Sidebar HTTP ${response.status}`
                );
            }


            // ---------------------------------------------
            // HTML
            // ---------------------------------------------

            const html =
                await response.text();


            container.innerHTML =
                html;


            // ---------------------------------------------
            // UPDATE COUNTS
            // ---------------------------------------------

            updateSidebarNotificationCount();

            startNotificationRefresh();


            updateShopOrderNotificationCount();

            startShopOrderRefresh();


            updateSidebarMessageCount();

            startMessageRefresh();


            // ---------------------------------------------
            // USER
            // ---------------------------------------------

            updateUserUI();


            // ---------------------------------------------
            // SELLER
            // ---------------------------------------------

            updateSellerMenu();


            // ---------------------------------------------
            // ADMIN
            // ---------------------------------------------

            setupAdminMenu();


            // ---------------------------------------------
            // ACTIVE
            // ---------------------------------------------

            setActiveMenu();


            // ---------------------------------------------
            // LANGUAGE
            // ---------------------------------------------

            applyLanguage();


            // ---------------------------------------------
            // EVENTS
            // ---------------------------------------------

            setupEvents();


            // ---------------------------------------------
            // LUCIDE
            // ---------------------------------------------

            if (
                typeof lucide !==
                "undefined"
            ) {

                lucide.createIcons();
            }


            // ---------------------------------------------
            // NOTIFY PAGE
            // ---------------------------------------------

            window.dispatchEvent(
                new CustomEvent(
                    "sharedSidebarLoaded"
                )
            );


        } catch (error) {

            console.error(
                "Shared Sidebar โหลดไม่สำเร็จ:",
                error
            );


            container.innerHTML = `

                <div
                    style="
                        padding:20px;
                        color:#fff;
                        background:#111;
                        font-family:Arial,sans-serif;
                    "
                >

                    Sidebar loading error

                </div>

            `;
        }
    }


    // =====================================================
    // PUBLIC API
    // =====================================================

    window.TikTokSharedSidebar = {

        open:
            openMobileMenu,

        close:
            closeMobileMenu,

        reload:
            loadSidebar,

        isAdmin:
            function () {

                return isAdmin(
                    getCurrentUser()
                );
            },

        getUser:
            function () {

                return getCurrentUser();
            },

        ready:
            null
    };


    // =====================================================
    // READY PROMISE
    // =====================================================

    window.TikTokSharedSidebar.ready =
        new Promise(
            resolve => {

                window.addEventListener(
                    "sharedSidebarLoaded",
                    function () {

                        resolve();

                    },
                    {
                        once: true
                    }
                );
            }
        );


    // =====================================================
    // START
    // =====================================================

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            loadSidebar
        );

    }

    else {

        loadSidebar();
    }


})();