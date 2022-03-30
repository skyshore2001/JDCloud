<?php

/**
@key autoload 类文件按需加载

设置class目录为php类自动加载目录。
同时将class目录设置为默认库包含路径.

在api.php或app.php中包含本文件，且php类放在php/class目录下，即可支持类的按需加载。

	require_once("php/autoload.php");

特别地，对于AC类，统一按文件名"AC_{对象}"来查找，比如"AC0_Role", "AC_Role", "AC2_Role"都会找"AC_Role.php"文件。
(v6) 而且，"Role"类也会尝试在"AC_Role"中查找。
*/

set_include_path(get_include_path().PATH_SEPARATOR.__DIR__ . '/class');
spl_autoload_register(function ($cls) {
	$cls = preg_replace('/^AC\d_/', 'AC_', $cls);
	$path = __DIR__ . '/class/' . str_replace('\\', '/', $cls) . '.php';
	if (is_file($path)) {
		include_once($path);
	}
	else if (substr($cls, 0, 2) != "AC") {
		// 加AC前缀试试
		$path = preg_replace('/\/(\w+.php)$/', '/AC_$1', $path);
		if (is_file($path)) {
			include_once($path);
		}
	}
});
