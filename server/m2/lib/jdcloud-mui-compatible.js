/*
老版本筋斗云前端框架将MUI.makeUrl, MUI.initPageList等很多函数直接暴露出去，
为了旧代码能正常运行，只需引入本文件。

新的代码不要引入本文件。
 */
(function() {
	var mCommon = jdModule("jdcloud.common");
	$.each([
		"enterWaiting",
		"leaveWaiting",
		"makeUrl",
		"initPullList",
		"initPageList",
		"initPageDetail",
	], function () {
		window[this] = MUI[this];
	});
	window.initNavbarAndList = MUI.initPageList;

	$.extend(window, jdModule("jdcloud.common"));
})();
