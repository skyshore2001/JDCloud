/*
老版本筋斗云前端框架将WUI.makeUrl等很多函数直接暴露出去，
为了旧代码能正常运行，只需引入本文件。

新的代码不要引入本文件。

需要手工修正之不兼容：

- WUI.showObjDlg(jdlg, formMode, id) 改成 WUI.showObjDlg(dlgRef, formMode, opt={id})
 */
(function() {
	var mCommon = jdModule("jdcloud.common");
	$.each([
		"enterWaiting",
		"leaveWaiting",
		"makeUrl",
		"makeLinkTo"
	], function () {
		window[this] = WUI[this];
	});

	$.extend(window, jdModule("jdcloud.common"));
})();
