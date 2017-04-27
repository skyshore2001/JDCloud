(function() {
	var mCommon = jdModule("jdcloud.common");
	$.each([
		"enterWaiting",
		"leaveWaiting",
		"makeUrl",
		"makeLinkTo",
		"initPullList",
		"initPageList",
		"initPageDetail",
	], function () {
		window[this] = MUI[this];
	});
	window.initNavbarAndList = MUI.initPageList;

	$.extend(window, jdModule("jdcloud.common"));
}
})();
