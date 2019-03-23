<?php

/**
@key autoload 类文件按需加载

设置class目录为php类自动加载目录。
同时将class目录设置为默认库包含路径.

在api.php或app.php中包含本文件，且php类放在php/class目录下，即可支持类的按需加载。

	require_once("php/autoload.php");

*/

set_include_path(get_include_path().PATH_SEPARATOR.__DIR__ . '/class');
spl_autoload_register(function ($cls) {
	$path = __DIR__ . '/class/' . str_replace('\\', '/', $cls) . '.php';
	if (is_file($path)) {
		include($path);
	}
});
