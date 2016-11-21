<?php

class AC_Syslog extends AccessControl
{
	protected $allowedAc = ["add"];
	protected $requiredFields = ["module", "pri", "content"];

	protected function onValidate()
	{
		if ($this->ac == 'add') {
			$now = time(0);
			$_POST['tm'] = date(FMT_DT, $now);
		}
	}
}

