<?php

class AC_Syslog extends AccessControl
{
	protected $allowedAc = ["add"];
	protected $requiredFields = ["module", "content"];
	protected $enableObjLog = false;

	protected function onValidate()
	{
		if ($this->ac == 'add') {
			$_POST['tm'] = date(FMT_DT);
			$_POST['apiLogId'] = ApiLog::$lastId;
			if (! issetval("pri"))
				$_POST['pri'] = "INF";
		}
	}
}

class AC2_Syslog extends AC_Syslog
{
}
