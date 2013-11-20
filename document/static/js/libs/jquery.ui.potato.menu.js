/*!
 * jquery.ui.potato.menu
 * 
 * Copyright (c) 2009-2010 makoto_kw, http://www.makotokw.com
 * Licensed under the MIT license.
 * 
 * @author makoto_kw
 * @version 1.1
 */
(function($) {
	var defaults = {
		vertical:false,
		menuItemSelector: 'li',
		menuGroupSelector: 'ul',
		rootClass:'potato-menu',
		menuItemClass:'potato-menu-item',
		menuGroupClass:'potato-menu-group',
		verticalClass:'potato-menu-vertical',
		holizontalClass:'potato-menu-holizontal',
		hasVerticalClass:'potato-menu-has-vertical',
		hasHolizontalClass:'potato-menu-has-holizontal',
		hoverClass:'potato-menu-hover',
		showDuration: 350,
		hideDuration: 100
	}
	function menu() {
		var option = (typeof(arguments[0])!='string') ? $.extend(defaults,arguments[0]) : $.extend(defaults,{});
		var $menu = $(this).addClass(option.rootClass+' '+option.menuGroupClass).addClass((option.vertical) ? option.verticalClass : option.holizontalClass);
		var $menuItems = $menu.find(option.menuItemSelector).addClass(option.menuItemClass);
		var $menuGroups = $menu.find(option.menuGroupSelector).addClass(option.menuGroupClass);
		
		$menuItems.hover(
			function(e) {
				$(this).addClass(option.hoverClass);
			},
			function(e) {
				$(this).removeClass(option.hoverClass);
			}
		);
		$menuGroups.parent().each(function(index){
			var $parentMenuItem = $(this); // menu item that has menu group
			var displayDirection = ($parentMenuItem.parent().hasClass(option.holizontalClass)) ? 'bottom' : 'right';
			$parentMenuItem.addClass((displayDirection=='bottom') ? option.hasVerticalClass : option.hasHolizontalClass);
			var $menuGroup = $parentMenuItem.find(option.menuGroupSelector+':first').addClass(option.verticalClass);
			$parentMenuItem.hover(
				function(e) {
					var offset = (displayDirection=='bottom') ? {left:'0',top:''} : {left:$(this).width()+'px',top:'0'};
					$menuGroup.css({left:offset.left,top:offset.top}).fadeIn(option.showDuration);
				},
				function(e) {
					$menuGroup.fadeOut(option.hideDuration);
				}
			);
		});
		$menu.find('a[href^="#"]').click(function() {
			$menuGroups.fadeOut(option.hideDuration);
			return ($(this).attr('href') != '#');
		})
		return this;
	}
	$.fn.extend({
		ptMenu:menu
	});
})(jQuery);