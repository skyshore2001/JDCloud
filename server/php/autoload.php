<?php

/**
@key autoload 类文件按需加载

设置class目录为php类自动加载目录。

在api.php或app.php中包含本文件，且php类放在php/class目录下，即可支持类的按需加载。

	require_once("php/autoload.php");

*/

spl_autoload_register(function ($cls) {
	$path = __DIR__ . '/class/' . str_replace('\\', '/', $cls) . '.php';
	if (is_file($path)) {
		include($path);
	}
});
