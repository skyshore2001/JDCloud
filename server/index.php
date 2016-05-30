<?php
// 缺省页
$DEF_PAGE = "m2/index.html";

@$pathInfo = $_SERVER["PATH_INFO"];
if (!isset($pathInfo) || $pathInfo === '/')
	header("Location: $DEF_PAGE");
else
	include('api.php');
