<?php

class ConfBase
{
	static $enableApiLog = false;

	static function onApiInit()
	{
	}
}
class Conf extends ConfBase
{
	static function onApiInit()
	{
		$iosVer = getIosVersion();
		if ($iosVer !== false && $iosVer<=15) {
			throw new MyException(E_FORBIDDEN, "unsupport ios client version", "您使用的版本太低，请升级后使用!");
		}
	}
}
?>
