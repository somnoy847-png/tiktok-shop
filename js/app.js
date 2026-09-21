/* =========================================
   INITIALIZE LUCIDE ICONS
========================================= */

document.addEventListener("DOMContentLoaded", () => {

    lucide.createIcons();

});


/* =========================================
   SIDEBAR
========================================= */

const sidebar = document.getElementById("sidebar");
const menuButton = document.getElementById("menuButton");
const closeSidebar = document.getElementById("closeSidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");


function openSidebar() {

    sidebar.classList.add("open");

    sidebarOverlay.classList.add("active");

}


function closeSidebarMenu() {

    sidebar.classList.remove("open");

    sidebarOverlay.classList.remove("active");

}


if (menuButton) {

    menuButton.addEventListener(
        "click",
        openSidebar
    );

}


if (closeSidebar) {

    closeSidebar.addEventListener(
        "click",
        closeSidebarMenu
    );

}


if (sidebarOverlay) {

    sidebarOverlay.addEventListener(
        "click",
        closeSidebarMenu
    );

}


/* =========================================
   SIDEBAR NAVIGATION
========================================= */

const navItems =
    document.querySelectorAll(".nav-item");


navItems.forEach(item => {

    item.addEventListener("click", function(event) {

        event.preventDefault();

        navItems.forEach(nav => {

            nav.classList.remove("active");

        });

        this.classList.add("active");

        if (window.innerWidth <= 760) {

            closeSidebarMenu();

        }

    });

});


/* =========================================
   SEARCH PRODUCTS
========================================= */

const searchInput =
    document.getElementById("searchInput");

const productCards =
    document.querySelectorAll(".product-card");


if (searchInput) {

    searchInput.addEventListener(
        "input",
        function() {

            const searchValue =
                this.value
                    .toLowerCase()
                    .trim();


            productCards.forEach(card => {

                const productName =
                    card.dataset.name
                        .toLowerCase();

                const category =
                    card.dataset.category
                        .toLowerCase();


                if (
                    productName.includes(searchValue) ||
                    category.includes(searchValue)
                ) {

                    card.style.display = "";

                } else {

                    card.style.display = "none";

                }

            });

        }
    );

}


/* =========================================
   PRODUCT CATEGORY TABS
========================================= */

const productTabs =
    document.querySelectorAll(".product-tab");


productTabs.forEach(tab => {

    tab.addEventListener("click", function() {

        productTabs.forEach(button => {

            button.classList.remove("active");

        });

        this.classList.add("active");


        const category =
            this.textContent
                .trim()
                .toLowerCase();


        productCards.forEach(card => {

            if (category === "all") {

                card.style.display = "";

                return;

            }


            const cardCategory =
                card.dataset.category
                    .toLowerCase();


            if (cardCategory === category) {

                card.style.display = "";

            } else {

                card.style.display = "none";

            }

        });

    });

});


/* =========================================
   FAVORITE BUTTON
========================================= */

const favoriteButtons =
    document.querySelectorAll(
        ".favorite-button"
    );


favoriteButtons.forEach(button => {

    button.addEventListener(
        "click",
        function(event) {

            event.preventDefault();

            event.stopPropagation();


            this.classList.toggle("liked");


            const icon =
                this.querySelector("svg");


            if (this.classList.contains("liked")) {

                this.style.color = "#e6334c";

                icon.setAttribute(
                    "fill",
                    "#e6334c"
                );

            } else {

                this.style.color = "#555";

                icon.setAttribute(
                    "fill",
                    "none"
                );

            }

        }
    );

});


/* =========================================
   HERO BUTTONS
========================================= */

const primaryButton =
    document.querySelector(".primary-button");


if (primaryButton) {

    primaryButton.addEventListener(
        "click",
        () => {

            document
                .querySelector(".products-section")
                .scrollIntoView({
                    behavior: "smooth"
                });

        }
    );

}


const exploreButton =
    document.querySelector(".secondary-button");


if (exploreButton) {

    exploreButton.addEventListener(
        "click",
        () => {

            document
                .querySelector(".explore-section")
                .scrollIntoView({
                    behavior: "smooth"
                });

        }
    );

}


/* =========================================
   SEARCH BUTTON
========================================= */

const searchButton =
    document.querySelector(".search-button");


if (searchButton) {

    searchButton.addEventListener(
        "click",
        () => {

            searchInput.focus();

        }
    );

}


/* =========================================
   WINDOW RESIZE
========================================= */

window.addEventListener(
    "resize",
    () => {

        if (window.innerWidth > 760) {

            sidebar.classList.remove("open");

            sidebarOverlay.classList.remove(
                "active"
            );

        }

    }
);