import {filterPrimaryEmail} from "./user_util"

export const baseBodyTemplate = ({user, contents, hasOverview}) => `
<div id="wait">
    <i class="fa fa-spinner fa-pulse"></i>
</div>
<header class="fw-header">
    <div class="fw-container">
        <a href="/">
            <h1 class="fw-logo">
                <span class="fw-logo-text"></span>
                <img src="${settings_STATIC_URL}svg/icon.svg?v=${transpile_VERSION}" />
            </h1>
        </a>
        <nav id="header-nav"></nav>
        <div id="user-preferences" class="fw-user-preferences fw-header-text">
            <div id="preferences-btn" class="fw-button">
                ${user.avatar.html}
            </div>
            <div id="user-preferences-pulldown" class="fw-pulldown fw-right">
                <div data-value="profile">
                    <span class='fw-avatar-card'>
                        <span class='fw-avatar-card-avatar'>${user.avatar.html}</span>
                        <span class='fw-avatar-card-name'>
                            ${user.username}
                            <span class='fw-avatar-card-email'>${filterPrimaryEmail(user.emails)}</span>
                        </span>
                    </span>
                </div>
                <div data-value="team">${gettext("Contacts")}</div>
                <div data-value="logout">${gettext("Log out")}</div>
            </div>
        </div><!-- end user preference -->
    </div><!-- end container -->
</header>
<div class="fw-contents-outer">
    ${hasOverview ? `<div class="fw-overview-menu-wrapper"><ul id="fw-overview-menu"></ul></div>` : ''}
    <div class="fw-contents">
        ${contents}
    </div>
</div>`
