<?php

/**
@class BlackList

IP黑白名单。支持透过代理检查真实IP。（根据X_FORWARDED_FOR）
项目目录下blackip.txt为配置文件，每行一项，以"\t"分隔，格式为：

	# ip	reason	date
	1.1.1.1	no referer	2018-10-10 10:10:10
	!1.1.1.1	白名单项

以"#"开头是注释，将忽略。

以"!"开头为白名单项。白名单也可通过配置项whiteIpList设置。
特别地，REMOTE_IP为"127.0.0.1"或"::1"的情况当作白名单，立即返回true，也不检查代理。

示例：

	if (!BlackList::isWhiteReq() && BlackList::isBlackReq())
		return;
	if (checkSecure() === false) {
		BlackList::add(getRealIp(), "no referer");
	}

示例：设置白名单（在conf.user.php中）

	putenv("whiteIpList=192.168.1.14 192.168.1.114")

*/
class BlackList
{
	static $set = null;
	static $whiteSet = null;

	static function getFile() {
		return $GLOBALS['BASE_DIR'] . "/blackip.txt";
	}

	static function init() {
		if (self::$set === null) {
			self::$set = [];
			self::$whiteSet = [];

			$list = getenv("whiteIpList");
			if ($list) {
				$ips = preg_split('/\s+/', $list);
				foreach ($ips as $ip) {
					self::$whiteSet[$ip] = true;
				}
			}

			$f = self::getFile();
			$arr = @file($f) ?: [];
			foreach ($arr as $e) {
				$a = explode("\t", $e);
				$ip = trim($a[0]);
				if ($ip) {
					// "1.1.1.1" - black ip
					// "!1.1.1.1" - white ip
					// "#1.1.1.1" - ignore
					if ($ip[0] === "!") {
						self::$whiteSet[substr($ip, 1)] = true;
					}
					else if (ctype_digit($ip[0])) {
						self::$set[$ip] = true;
					}
				}
			}
		}
	}

	static function isBlack($ip) {
		self::init();
		return array_key_exists($ip, self::$set);
	}
	static function isWhite($ip) {
		self::init();
		return array_key_exists($ip, self::$whiteSet);
	}

	static function add($ip, $reason) {
		$dt = date(FMT_DT);
		self::$set[$ip] = true;
		$f = self::getFile();
		file_put_contents($f, "$ip	$reason	$dt\n", FILE_APPEND);
	}

	static function getReqIpArr() {
		static $ipArr;
		if (!is_array($ipArr)) {
			$ipArr = [];
			@$myIps = [$_SERVER["REMOTE_ADDR"], $_SERVER["HTTP_REMOTEIP"] ] + explode(',', $_SERVER["HTTP_X_FORWARDED_FOR"]);
			foreach ($myIps as $ip) {
				$ip = trim($ip);
				if ($ip)
					$ipArr[] = $ip;
			}
		}
		return $ipArr;
	}

	static function isWhiteReq() {
		@$addr = $_SERVER["REMOTE_ADDR"];
		if ($addr === "127.0.0.1" || $addr === "::1")
			return true;
	
		$myIps = self::getReqIpArr();
		foreach ($myIps as $ip) {
			if (self::isWhite($ip))
				return true;
		}
		return false;
	}
	static function isBlackReq() {
		$myIps = self::getReqIpArr();
		foreach ($myIps as $ip) {
			if (self::isBlack($ip))
				return true;
		}
		return false;
	}
}
// vi: foldmethod=marker
