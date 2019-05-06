import {escapeText} from "./basic"
import {getCsrfToken} from "./network"

export const baseBodyTemplate = ({username, contents, staticUrl}) => `
<div id="wait">
    <i class="fa fa-spinner fa-pulse"></i>
</div>
<header class="fw-header">

    <div class="fw-container">
        <h1 class="fw-logo"><span class="fw-logo-text"></span><img src="${staticUrl}svg/icon.svg?v=${process.env.TRANSPILE_VERSION}" /></h1>
        <nav id="header-nav"></nav>
        <div id="user-preferences" class="fw-user-preferences fw-header-text">
            <h3 class="fw-name">${escapeText(username)}</h3>
            <div id="preferences-btn" class="fw-button fw-small fw-green">
                <span class="fa fa-cog fw-button-icon"></span>
                <span class="fa fa-caret-down fw-button-icon"></span>
            </div>
        </div><!-- end user preference -->
    </div><!-- end container -->
 </header>

<div class="fw-contents">
    ${contents}
</div>

<div id="user-preferences-pulldown" class="fw-pulldown fw-right">
    <ul>
        <li>
            <a class="fw-pulldown-item" href="/user/profile/">
                ${gettext("Edit profile")}
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
</div>`
