export const basePreloginTemplate = ({contents, language, headerLinks = [], footerLinks = []}) => `
<div id="wait">
   <i class="fa fa-spinner fa-pulse"></i>
</div>
<header class="fw-header prelogin">
   <div class="fw-container">
      <h1 class="fw-login-logo"><span class="fw-logo-text"></span><img src="${settings_STATIC_URL}svg/icon.svg?v=${transpile_VERSION}" /></h1>
      <nav id="header-nav">${
    headerLinks.map(hLink => {
        let returnValue
        switch (hLink.type) {
        case 'label':
            returnValue = `<label>${hLink.text}</label>`
            break
        case 'button':
            returnValue = `<a class="fw-button fw-orange fw-uppercase" href="${hLink.link}" title="${hLink.text}">${hLink.text}</a>`
            break
        default:
            returnValue = ''
        }
        return returnValue
    }).join('')
}</nav>
   </div>
   ${settings_IS_FREE ?
        `<div class="star" style="position:relative;margin:0 auto;"><img src="${settings_STATIC_URL}img/free_star.png?v=${transpile_VERSION}" style="position:absolute;top:0px;left:0px;z-index:3;height:73px;"></div>` :
        ''
}
</header>
<div class="fw-contents prelogin">
    ${contents}
</div>
<footer id="footer-menu" class="prelogin">
    <div class="fw-container">
        <ul class="fw-footer-links">
            ${
    footerLinks.map(
        fLink => `<li><a href="${fLink.link}" target="_blank"${ fLink.external ? ' rel="noreferrer"' : ''}>${fLink.text}</a></li>`
    ).join('')
}
        </ul>
        <select id="lang-selection" aria-label="${gettext('Select language')}">
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
