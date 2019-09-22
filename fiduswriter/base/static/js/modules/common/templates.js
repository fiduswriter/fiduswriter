import {filterPrimaryEmail} from "./user_util"

export const baseBodyTemplate = ({user, contents, staticUrl, hasOverview}) => `
<div id="wait">
    <i class="fa fa-spinner fa-pulse"></i>
</div>
<header class="fw-header">
    <div class="fw-container">
        <h1 class="fw-logo"><span class="fw-logo-text"></span><img src="${staticUrl}svg/icon.svg?v=${process.env.TRANSPILE_VERSION}" /></h1>
        <nav id="header-nav"></nav>
        <div id="user-preferences" class="fw-user-preferences fw-header-text">
            <div id="preferences-btn" class="fw-button">
                ${user.avatar.html}
            </div>
            <div id="user-preferences-pulldown" class="fw-pulldown fw-right">
                <ul>
                    <li>
                        <a class="fw-pulldown-item" href="/user/profile/">
                            <span class="fw-avatar-card">
                                <span class="fw-avatar-card-avatar">${user.avatar.html}</span>
                                <span class="fw-avatar-card-name">
                                    ${user.username}
                                    <span class="fw-avatar-card-email">${filterPrimaryEmail(user.emails)}</span>
                                </span>
                            </span>
                        </a>
                    </li>
                    <li>
                        <a class="fw-pulldown-item" href="/user/team/">
                            ${gettext("Contacts")}
                        </a>
                    </li>
                    <li>
                        <button class="fw-pulldown-item fw-logout-button" type="submit">${gettext("Log out")}</button>
                    </li>
                </ul>
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
