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

export const basePreloginTemplate = ({contents, staticUrl, isFree, language}) => `
<div id="wait">
   <i class="fa fa-spinner fa-pulse"></i>
</div>
<header class="fw-header prelogin">
   <div class="fw-container">
      <h1 class="fw-login-logo"><span class="fw-logo-text"></span><img src="${staticUrl}svg/icon.svg?v=${process.env.TRANSPILE_VERSION}" /></h1>
      <nav class="fw-header-nav"></nav>
   </div>
   ${isFree ?
       `<div class="star" style="width:961px;position:relative;margin:0 auto;"><img src="${staticUrl}img/free_star.png?v=${process.env.TRANSPILE_VERSION}" style="position:absolute;top:0px;left:0px;z-index:3;height:73px;"></div>` :
       ''
   }
</header>
<div class="fw-contents prelogin">
    ${contents}
</div>
<footer id="footer-menu" class="prelogin">
    <div class="fw-container">
        <ul class="fw-footer-links">
            <li>
                <a href="/pages/terms/" target="_blank">
                    ${gettext("Terms and Conditions")}
                </a>
            </li>
            <li>
                <a href="/pages/privacy/" target="_blank">
                    ${gettext("Privacy policy")}
                </a>
            </li>
            <li>
                <a href="https://mathlive.io/" target="_blank">
                    ${gettext("Equations and Math with MathLive")}
                </a>
            </li>
            <li>
                <a href="https://citationstyles.org/" target="_blank">
                    ${gettext("Citations with Citation Style Language")}
                </a>
            </li>
            <li>
                <a href="https://prosemirror.net" target="_blank">
                    ${gettext("Editing with ProseMirror")}
                </a>
            </li>
        </ul>
        <select id="lang-selection">
            <option value="bg" ${language === 'bg' ? 'selected' : ''}>Български</option>
            <option value="de" ${language === 'de' ? 'selected' : ''}>Deutsch</option>
            <option value="en" ${language === 'en' ? 'selected' : ''}>English</option>
            <option value="es" ${language === 'es' ? 'selected' : ''}>Español</option>
            <option value="fr" ${language === 'fr' ? 'selected' : ''}>Français</option>
            <option value="it" ${language === 'it' ? 'selected' : ''}>Italiano</option>
            <option value="pt-br" ${language === 'pt-br' ? 'selected' : ''}>Portuguese (Brazil)</option>
        </select>
    </div>
</footer>`
