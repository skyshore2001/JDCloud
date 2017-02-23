#!/bin/perl
use strict;

while (<>) {
	s/^#+(?= )/f($&)/e;
	print;
}

sub f
{
	if ($_[0] eq '#') {
		return '%';
	}
	return substr($_[0], 1);
}
