import {escapeText} from "./basic"
import {getCsrfToken} from "./network"
import {filterPrimaryEmail} from "./user_util"

export const baseBodyTemplate = ({user, contents, staticUrl}) => `
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
                        <form class="fw-pulldown-item" action="/account/logout/" method="post">
                            <input type="hidden" name="csrfmiddlewaretoken" value="${getCsrfToken()}">
                            <button class="fw-logout-button" type="submit">${gettext("Log out")}</button>
                        </form>
                    </li>
                </ul>
            </div>
        </div><!-- end user preference -->
    </div><!-- end container -->
 </header>

<div class="fw-contents">
    ${contents}
</div>`
