export const headerNavTemplate = ({navItems}) =>
    `<div class="fw-container fw-nav-container">
    ${
    navItems.map(navItem =>
        `<p class="fw-nav-item ${
            navItem.active ?
                'active-menu-wrapper' :
                ''
        }">
                <a class="fw-header-navigation-text" href="${navItem.url}" title="${navItem.title}">
                    ${navItem.text}
                </a>
            </p>`
    ).join('')
}
    </div>`
