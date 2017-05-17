<?php

Plugins::add([ "login"]);

if ($GLOBALS["TEST_MODE"]) {
	Plugins::add([ "test" ]);
}

