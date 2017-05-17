<?php

Plugins::add([ "upload", "login", "syslog", "plugin1" ]);

if ($GLOBALS["TEST_MODE"]) {
	Plugins::add([ "test" ]);
}

